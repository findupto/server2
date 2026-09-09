const express=require('express');
const jwt=require('jsonwebtoken');
const Database=require('better-sqlite3');
const path=require('path');

const SECRET=process.env.JWT_SECRET||'mkpos-change-this-secret';
const originalListen=express.application.listen;
const db=new Database(process.env.DB_PATH||path.join(__dirname,'mkpos.db'));
const q=(sql,...args)=>db.prepare(sql).get(...args);
const all=(sql,...args)=>db.prepare(sql).all(...args);

function auth(req,res,next){
  const h=req.headers.authorization||'';
  if(!h.startsWith('Bearer ')) return res.status(401).json({error:'Login required'});
  try{req.user=jwt.verify(h.slice(7),SECRET);next()}catch{return res.status(401).json({error:'Invalid session'})}
}

async function ollama(pathname,body,timeoutMs=45000){
  const base=(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(base+pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});
    const text=await r.text();let data={};try{data=JSON.parse(text)}catch{}
    if(!r.ok)throw new Error(data.error||`Ollama HTTP ${r.status}`);
    return data;
  }finally{clearTimeout(timer)}
}

async function ollamaStatus(){
  const base=(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
  try{const r=await fetch(base+'/api/tags');if(!r.ok)return {available:false,models:[]};const d=await r.json();return {available:true,models:(d.models||[]).map(x=>x.name)};}catch{return {available:false,models:[]}}
}

function catalog(){
  return {
    products:all('SELECT id,name,category,price,unit FROM products WHERE active=1 ORDER BY name LIMIT 2500'),
    variants:all('SELECT id,product_id,name,price FROM product_variants WHERE active=1 ORDER BY name LIMIT 5000'),
    orders:all("SELECT order_no,type,status,total,payment_status,created_at FROM orders ORDER BY created_at DESC LIMIT 100"),
    inventory:all('SELECT name,unit,current_stock,reorder_level,cost FROM inventory_items WHERE active=1 ORDER BY name LIMIT 2500'),
    tables:all('SELECT table_no,capacity,status FROM tables ORDER BY CAST(table_no AS INTEGER)'),
    staff:all('SELECT name,username,role,active FROM users ORDER BY role,name')
  };
}

function localInterpret(command){
  const text=String(command||'').trim();const low=text.toLowerCase();const data=catalog();
  if(!text)return {confidence:0,reply:'Tell me what you want me to do.',intent:'clarify'};
  const qtyMatch=low.match(/\b(\d+)\b/);const qty=qtyMatch?Number(qtyMatch[1]):1;
  const product=data.products.find(p=>low.includes(String(p.name).toLowerCase()));
  if(/\b(add|put|order|sell|sale|make)\b/.test(low)&&product)return {confidence:.96,intent:'create_sale',reply:`I understood ${qty} × ${product.name}. Added to the ticket.`,items:[{product_name:product.name,qty}],safety:{financial:true}};
  if(/\b(low stock|stock low|inventory low|running low)\b/.test(low)){const lowItems=data.inventory.filter(x=>Number(x.current_stock)<=Number(x.reorder_level));return {confidence:.99,intent:'inventory',reply:lowItems.length?`${lowItems.length} inventory items are at or below reorder level.`:'No inventory items are currently below reorder level.',items:lowItems,safety:{inventory:true}}}
  if(/\b(sales|revenue|turnover)\b/.test(low)){const today=new Date().toISOString().slice(0,10);const rows=data.orders.filter(o=>String(o.created_at||'').startsWith(today));const total=rows.filter(o=>o.payment_status==='paid').reduce((s,o)=>s+Number(o.total||0),0);return {confidence:.98,intent:'sales_summary',reply:`Today has ${rows.length} orders and ${total.toLocaleString()} in paid sales.`,data:{orders:rows.length,paidSales:total}}}
  const table=low.match(/table\s*(\d+)/);if(table&&/\b(available|free|open|occup|busy|close)\b/.test(low)){const t=data.tables.find(x=>String(x.table_no)===table[1]);if(!t)return {confidence:.98,intent:'table',reply:`Table ${table[1]} was not found.`};const wanted=/\b(available|free|open)\b/.test(low)?'available':'occupied';db.prepare('UPDATE tables SET status=? WHERE id=(SELECT id FROM tables WHERE table_no=?)').run(wanted,table[1]);return {confidence:.98,intent:'table',reply:`Table ${table[1]} is now ${wanted}.`,changed:true,safety:{operational:true}}}
  const order=low.match(/order\s*#?\s*(\d+)/);if(order){const o=data.orders.find(x=>Number(x.order_no)===Number(order[1]));return {confidence:.99,intent:'order_lookup',reply:o?`Order #${o.order_no} is ${o.status}, total ${o.total}, payment ${o.payment_status}.`:`Order #${order[1]} was not found.`,data:o||null}}
  if(/\b(help|what can you do|commands)\b/.test(low))return {confidence:1,intent:'help',reply:'I can add products to the ticket, read sales, inspect low stock, look up orders, change table status, and—when a local model is installed—answer natural-language POS questions.'};
  return null;
}

function register(app){
  const router=express.Router();router.use(auth);
  router.get('/status',async(req,res)=>res.json({ok:true,local:true,engine:'MK Local AI',apiKeyRequired:false,ollama:await ollamaStatus(),voiceSupported:true}));
  router.get('/context',(req,res)=>res.json({ok:true,user:req.user,data:catalog()}));
  router.post('/command',async(req,res)=>{const command=String(req.body?.command||'').trim();if(!command)return res.status(400).json({error:'Command required'});const quick=localInterpret(command);if(quick)return res.json({ok:true,source:'local-rules',...quick});const status=await ollamaStatus();if(!status.available)return res.json({ok:true,source:'local-rules',confidence:.2,intent:'unavailable',reply:'Local AI is ready, but no language model is installed. Install Ollama and a local model, then try again. No API key is required for local Ollama.'});const model=process.env.OLLAMA_MODEL||status.models[0];if(!model)return res.json({ok:true,source:'local-rules',confidence:.2,intent:'unavailable',reply:'Ollama is running but has no local model. Install a model and try again.'});const context=JSON.stringify(catalog());const system=`You are MK POS Local AI. You run locally and must never invent POS facts. Use only the supplied live data. You may explain sales, products, orders, inventory, tables and staff. For money, stock or destructive actions, ask for explicit confirmation. User role: ${req.user.role}. Live data: ${context}`;try{const out=await ollama('/api/chat',{model,messages:[{role:'system',content:system},{role:'user',content:command}],stream:false,options:{temperature:.15}});res.json({ok:true,source:'ollama',model,confidence:.9,intent:'chat',reply:String(out?.message?.content||'No response returned.')})}catch(e){res.json({ok:true,source:'local-rules',confidence:.2,intent:'unavailable',reply:`Local model could not answer: ${e.message}`})}});
  router.post('/settings',(req,res)=>{const allowed=['restaurant','currency','tax','phone','address','ai_model','ai_provider','ai_voice_language','ai_auto_start'];for(const key of allowed)if(Object.prototype.hasOwnProperty.call(req.body||{},key))db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(key,String(req.body[key]));res.json({ok:true,settings:Object.fromEntries(all('SELECT key,value FROM settings').map(x=>[x.key,x.value]))})});
  router.get('/settings',(req,res)=>res.json({ok:true,settings:Object.fromEntries(all('SELECT key,value FROM settings').map(x=>[x.key,x.value]))}));
  const stack=app._router?.stack||[];const before=stack.length;app.use('/api/ai/local',router);const added=stack.splice(before);let insert=stack.length;for(let i=0;i<stack.length;i++){const r=stack[i]?.route;if(r&&((r.path==='*')||r.path==='/*'||String(r.path).includes('*'))){insert=i;break}}stack.splice(insert,0,...added);
}
express.application.listen=function(...args){const app=this;try{register(app)}catch(e){console.error('Local AI bootstrap failed:',e)}return originalListen.apply(app,args)};
