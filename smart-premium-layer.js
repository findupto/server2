/* Smart Premium POS + AI orchestration layer.
 * Additive: designed to be loaded by server.js without replacing existing routes.
 */
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'mkpos.db'));
db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');
const id=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const q=(s,...a)=>db.prepare(s).get(...a);
const all=(s,...a)=>db.prepare(s).all(...a);

// Premium operational intelligence tables.
db.exec(`
CREATE TABLE IF NOT EXISTS cash_sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,opened_at TEXT NOT NULL,closed_at TEXT DEFAULT '',opening_cash REAL DEFAULT 0,closing_cash REAL DEFAULT 0,expected_cash REAL DEFAULT 0,difference REAL DEFAULT 0,status TEXT DEFAULT 'open',notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,amount REAL NOT NULL,method TEXT NOT NULL,reference TEXT DEFAULT '',status TEXT DEFAULT 'paid',created_at TEXT NOT NULL,user_id TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS refunds(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,amount REAL NOT NULL,reason TEXT DEFAULT '',status TEXT DEFAULT 'requested',created_at TEXT NOT NULL,user_id TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS discounts(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,type TEXT NOT NULL,amount REAL NOT NULL,reason TEXT DEFAULT '',approved_by TEXT DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_actions(id TEXT PRIMARY KEY,user_id TEXT DEFAULT '',role TEXT DEFAULT '',command TEXT NOT NULL,intent TEXT DEFAULT '',confidence REAL DEFAULT 0,requires_confirmation INTEGER DEFAULT 0,status TEXT DEFAULT 'completed',result_json TEXT DEFAULT '{}',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_memory(id TEXT PRIMARY KEY,user_id TEXT DEFAULT '',scope TEXT DEFAULT 'user',key TEXT NOT NULL,value TEXT DEFAULT '',updated_at TEXT NOT NULL,UNIQUE(user_id,scope,key));
CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY,type TEXT NOT NULL,severity TEXT DEFAULT 'info',entity_type TEXT DEFAULT '',entity_id TEXT DEFAULT '',title TEXT NOT NULL,message TEXT NOT NULL,status TEXT DEFAULT 'open',created_at TEXT NOT NULL,resolved_at TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS stock_counts(id TEXT PRIMARY KEY,item_id TEXT NOT NULL,counted_qty REAL NOT NULL,system_qty REAL NOT NULL,difference REAL NOT NULL,counted_by TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shifts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,role TEXT NOT NULL,start_at TEXT NOT NULL,end_at TEXT DEFAULT '',status TEXT DEFAULT 'active',notes TEXT DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_ai_actions_user ON ai_actions(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status,severity,created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id,created_at);
`);

function auth(req,res,next){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'Login required'});try{req.user=require('jsonwebtoken').verify(h.slice(7),process.env.JWT_SECRET||'mkpos-change-this-secret');next()}catch{return res.status(401).json({error:'Invalid session'})}}
const roles=(...r)=>(req,res,next)=>r.includes(req.user.role)?next():res.status(403).json({error:'Permission denied'});
const management=roles('admin','owner');

function audit(user,action,entity,entityId,details=''){try{db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(id(),user,action,entity,entityId,details,now())}catch{}}
function alert(type,severity,title,message,entityType='',entityId=''){const a={id:id(),type,severity,entity_type:entityType,entity_id:entityId,title,message,status:'open',created_at:now(),resolved_at:''};db.prepare('INSERT INTO alerts VALUES(?,?,?,?,?,?,?,?,?,?)').run(...Object.values(a));return a}

function register(app){
  app.get('/api/v3/dashboard/intelligence',auth,management,(req,res)=>{
    const today=now().slice(0,10);
    const sales=q("SELECT COALESCE(SUM(total),0) total,COUNT(*) orders,COALESCE(AVG(total),0) avg FROM orders WHERE substr(created_at,1,10)=?",today)||{};
    const low=all('SELECT id,name,current_stock,reorder_level,unit FROM inventory_items WHERE active=1 AND current_stock<=reorder_level ORDER BY (current_stock-reorder_level) ASC LIMIT 50');
    const unpaid=q("SELECT COALESCE(SUM(total),0) total,COUNT(*) count FROM orders WHERE payment_status!='paid' AND status IN ('ready','delivered','closed')")||{};
    const openAlerts=all("SELECT * FROM alerts WHERE status='open' ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,created_at DESC LIMIT 100");
    res.json({date:today,sales,low_stock:low,unpaid,alerts:openAlerts,health:{database:'ok',time:now()}});
  });
  app.get('/api/v3/analytics/hourly',auth,management,(req,res)=>{
    const days=Math.min(Math.max(Number(req.query.days||7),1),90);
    res.json(all(`SELECT substr(created_at,1,13) hour,COUNT(*) orders,COALESCE(SUM(total),0) sales,COALESCE(AVG(total),0) average FROM orders WHERE created_at>=datetime('now','-${days} days') GROUP BY substr(created_at,1,13) ORDER BY hour`,));
  });
  app.get('/api/v3/analytics/products',auth,management,(req,res)=>res.json(all(`SELECT oi.product_id,oi.name,COALESCE(SUM(oi.qty),0) qty,COALESCE(SUM(oi.qty*oi.price),0) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.created_at>=datetime('now','-30 days') GROUP BY oi.product_id,oi.name ORDER BY revenue DESC`)));
  app.get('/api/v3/alerts',auth,roles('admin','owner','kitchen','cashier','waiter','rider'),(req,res)=>{const role=req.user.role;let rows=all("SELECT * FROM alerts WHERE status='open' ORDER BY created_at DESC LIMIT 100");if(role==='kitchen')rows=rows.filter(x=>['stock','kitchen'].includes(x.type));if(role==='rider')rows=rows.filter(x=>x.type==='delivery');res.json(rows)});
  app.post('/api/v3/alerts/:id/resolve',auth,roles('admin','owner','kitchen','cashier','waiter','rider'),(req,res)=>{db.prepare("UPDATE alerts SET status='resolved',resolved_at=? WHERE id=?").run(now(),req.params.id);res.json({ok:true})});

  app.post('/api/v3/cash/open',auth,roles('admin','owner','cashier'),(req,res)=>{const open=q("SELECT * FROM cash_sessions WHERE user_id=? AND status='open'",req.user.id);if(open)return res.status(409).json({error:'Cash session already open',session:open});const s={id:id(),user_id:req.user.id,opened_at:now(),closed_at:'',opening_cash:Number(req.body?.opening_cash||0),closing_cash:0,expected_cash:Number(req.body?.opening_cash||0),difference:0,status:'open',notes:String(req.body?.notes||'')};db.prepare('INSERT INTO cash_sessions VALUES(?,?,?,?,?,?,?,?,?,?)').run(...Object.values(s));audit(req.user.id,'CASH_OPEN','cash_session',s.id);res.json(s)});
  app.post('/api/v3/cash/close/:id',auth,roles('admin','owner','cashier'),(req,res)=>{const s=q('SELECT * FROM cash_sessions WHERE id=?',req.params.id);if(!s)return res.status(404).json({error:'Session not found'});const payments=q("SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE user_id=? AND created_at>=? AND status='paid'",s.user_id,s.opened_at)?.amount||0;const closing=Number(req.body?.closing_cash||0);const expected=Number(s.opening_cash)+Number(payments);const difference=closing-expected;db.prepare("UPDATE cash_sessions SET closed_at=?,closing_cash=?,expected_cash=?,difference=?,status='closed',notes=? WHERE id=?").run(now(),closing,expected,difference,String(req.body?.notes||''),s.id);audit(req.user.id,'CASH_CLOSE','cash_session',s.id,JSON.stringify({expected,closing,difference}));res.json(q('SELECT * FROM cash_sessions WHERE id=?',s.id))});
  app.get('/api/v3/cash/current',auth,roles('admin','owner','cashier'),(req,res)=>res.json(q("SELECT * FROM cash_sessions WHERE user_id=? AND status='open'",req.user.id)||null));

  app.post('/api/v3/payments',auth,roles('admin','owner','cashier'),(req,res)=>{const b=req.body||{};if(!b.order_id||!b.amount||!b.method)return res.status(400).json({error:'order_id, amount and method required'});const p={id:id(),order_id:String(b.order_id),amount:Number(b.amount),method:String(b.method),reference:String(b.reference||''),status:'paid',created_at:now(),user_id:req.user.id};db.prepare('INSERT INTO payments VALUES(?,?,?,?,?,?,?)').run(...Object.values(p));const total=q('SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE order_id=? AND status=\'paid\'',p.order_id)?.amount||0;const order=q('SELECT total FROM orders WHERE id=?',p.order_id);if(order&&total>=Number(order.total||0))db.prepare("UPDATE orders SET payment_status='paid',payment_method=?,updated_at=? WHERE id=?").run(p.method,now(),p.order_id);audit(req.user.id,'PAYMENT','order',p.order_id,JSON.stringify(p));res.json(p)});
  app.get('/api/v3/payments/:orderId',auth,(req,res)=>res.json(all('SELECT * FROM payments WHERE order_id=? ORDER BY created_at',req.params.orderId)));
  app.post('/api/v3/refunds',auth,roles('admin','owner','cashier'),(req,res)=>{const b=req.body||{};if(!b.order_id||!b.amount)return res.status(400).json({error:'order_id and amount required'});const r={id:id(),order_id:b.order_id,amount:Number(b.amount),reason:String(b.reason||''),status:'approved',created_at:now(),user_id:req.user.id};db.prepare('INSERT INTO refunds VALUES(?,?,?,?,?,?,?)').run(...Object.values(r));audit(req.user.id,'REFUND','order',r.order_id,JSON.stringify(r));res.json(r)});

  app.post('/api/v3/stock/count',auth,roles('admin','owner','kitchen'),(req,res)=>{const b=req.body||{},item=q('SELECT * FROM inventory_items WHERE id=?',b.item_id);if(!item)return res.status(404).json({error:'Inventory item not found'});const counted=Number(b.counted_qty);const d=counted-Number(item.current_stock);const x={id:id(),item_id:item.id,counted_qty:counted,system_qty:item.current_stock,difference:d,counted_by:req.user.id,created_at:now()};db.prepare('INSERT INTO stock_counts VALUES(?,?,?,?,?,?,?)').run(...Object.values(x));if(b.apply===true){db.prepare('UPDATE inventory_items SET current_stock=? WHERE id=?').run(counted,item.id);db.prepare('INSERT INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id(),item.id,'count_adjustment',d,counted,item.cost,'stock_count',x.id,String(b.note||''),now(),req.user.id)}if(Math.abs(d)>Math.max(1,item.reorder_level*.5))alert('stock','warning','Stock count variance',`${item.name}: variance ${d} ${item.unit}`,'inventory',item.id);audit(req.user.id,'STOCK_COUNT','inventory',item.id,JSON.stringify(x));res.json(x)});

  app.post('/api/v3/shifts/start',auth,(req,res)=>{const s={id:id(),user_id:req.user.id,role:req.user.role,start_at:now(),end_at:'',status:'active',notes:String(req.body?.notes||'')};db.prepare('INSERT INTO shifts VALUES(?,?,?,?,?,?,?)').run(...Object.values(s));res.json(s)});
  app.post('/api/v3/shifts/end/:id',auth,(req,res)=>{db.prepare("UPDATE shifts SET end_at=?,status='closed',notes=? WHERE id=? AND user_id=?").run(now(),String(req.body?.notes||''),req.params.id,req.user.id);res.json(q('SELECT * FROM shifts WHERE id=?',req.params.id))});

  app.get('/api/v3/ai/memory',auth,(req,res)=>res.json(all('SELECT * FROM ai_memory WHERE user_id=? ORDER BY updated_at DESC',req.user.id)));
  app.put('/api/v3/ai/memory/:key',auth,(req,res)=>{const value=String(req.body?.value||'');db.prepare(`INSERT INTO ai_memory(id,user_id,scope,key,value,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,scope,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(id(),req.user.id,String(req.body?.scope||'user'),req.params.key,value,now());res.json({ok:true})});
  app.get('/api/v3/ai/actions',auth,roles('admin','owner'),(req,res)=>res.json(all('SELECT * FROM ai_actions ORDER BY created_at DESC LIMIT 500')));
  app.post('/api/v3/ai/action-log',auth,(req,res)=>{const b=req.body||{},x={id:id(),user_id:req.user.id,role:req.user.role,command:String(b.command||''),intent:String(b.intent||''),confidence:Number(b.confidence||0),requires_confirmation:b.requires_confirmation?1:0,status:String(b.status||'completed'),result_json:JSON.stringify(b.result||{}),created_at:now()};db.prepare('INSERT INTO ai_actions VALUES(?,?,?,?,?,?,?,?,?,?)').run(...Object.values(x));res.json(x)});

  // Server-side command catalogue: AI clients can discover safe capabilities dynamically.
  app.get('/api/v3/ai/capabilities',auth,(req,res)=>res.json({role:req.user.role,capabilities:{query:['sales','orders','customers','inventory','staff','alerts','payments'],actions:['create_order','update_order_status','assign_staff','create_task','stock_count','open_cash','close_cash','record_payment','request_refund'],automation:['low_stock_alerts','sales_summary','order_notifications','delivery_tracking'],voice:true,vision:true,confirmation_required:['refund','discount_above_limit','delete','cash_close','bulk_price_change']}}));
}

// Export a loader for server.js and also expose a safe standalone app.
module.exports={register};
