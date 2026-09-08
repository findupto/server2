const express=require('express');
const Database=require('better-sqlite3');
const jwt=require('jsonwebtoken');
const path=require('path');
const {WebSocketServer,WebSocket}=require('ws');

const PORT=Number(process.env.PORT||4173);
const DB_PATH=process.env.DB_PATH||path.join(__dirname,'mkpos.db');
const JWT_SECRET=process.env.JWT_SECRET||'mkpos-change-this-secret';
const db=new Database(DB_PATH);
const clients=new Set();
let lastRowid=0;

function userFromToken(token){try{return jwt.verify(String(token||''),JWT_SECRET)}catch{return null}}
function canSee(user,e){
  if(!user)return false;
  if(['admin','owner'].includes(user.role))return true;
  if(['product','variant','deal','coupon','table'].includes(e.entity))return true;
  if(e.entity==='order'||e.entity==='order_items'){
    const o=db.prepare('SELECT customer_id,waiter_id,rider_id FROM orders WHERE id=?').get(e.entity==='order'?e.entity_id:e.order_id||e.entity_id);
    if(!o)return false;
    return (user.role==='waiter'&&o.waiter_id===user.id)||(user.role==='rider'&&o.rider_id===user.id)||(user.role==='customer'&&o.customer_id===user.id);
  }
  return false;
}
function broadcast(e){
  for(const c of clients){
    if(c.readyState!==WebSocket.OPEN||!c.user||!canSee(c.user,e))continue;
    try{c.send(JSON.stringify({type:'sync',...e}))}catch{}
  }
}
function ensureTriggers(){
  const tables=['orders','order_items','tables','products','product_variants','deals','deal_items','coupons','customers','inventory_items','suppliers','recipes','recipe_items','stock_movements','wastage','production','expenses','approvals'];
  for(const t of tables){
    const safe=t.replace(/[^a-z0-9_]/gi,'');
    for(const op of ['insert','update','delete']){
      const name=`mkpos_sync_${safe}_${op}`;
      const ref=op==='delete'?'OLD':'NEW';
      const entityId=t==='order_items'?`COALESCE(${ref}.order_id,'')`:`COALESCE(${ref}.id,'')`;
      db.exec(`CREATE TRIGGER IF NOT EXISTS ${name} AFTER ${op.toUpperCase()} ON ${safe} BEGIN INSERT INTO sync_events(id,entity,entity_id,operation,payload,updated_at) VALUES(lower(hex(randomblob(16))),'${safe}',${entityId},'${op}',json('{}'),datetime('now')); END`);
    }
  }
}
function startSync(app,server){
  try{ensureTriggers()}catch(e){console.error('Realtime trigger setup:',e.message)}
  app.get('/api/sync/events',(req,res)=>{
    const auth=String(req.headers.authorization||'');
    const user=userFromToken(auth.startsWith('Bearer ')?auth.slice(7):'');
    if(!user)return res.status(401).json({error:'Invalid session'});
    const after=Math.max(0,Number(req.query.after||0));
    const limit=Math.min(500,Math.max(1,Number(req.query.limit||200)));
    const rows=db.prepare('SELECT rowid AS seq,id,entity,entity_id,operation,payload,updated_at FROM sync_events WHERE rowid>? ORDER BY rowid ASC LIMIT ?').all(after,limit).filter(e=>canSee(user,e));
    const max=db.prepare('SELECT COALESCE(MAX(rowid),0) seq FROM sync_events').get().seq;
    res.json({events:rows.map(e=>({...e,payload:JSON.parse(e.payload||'{}')})),cursor:max});
  });
  const wss=new WebSocketServer({server,path:'/ws'});
  wss.on('connection',(ws,req)=>{
    ws.isAlive=true;ws.user=null;clients.add(ws);
    ws.on('pong',()=>{ws.isAlive=true});
    ws.on('message',raw=>{
      try{
        const m=JSON.parse(String(raw));
        if(m.type==='auth'){
          const u=userFromToken(m.token);
          if(!u){ws.close(1008,'Unauthorized');return}
          ws.user=u;
          ws.send(JSON.stringify({type:'ready',cursor:Number(db.prepare('SELECT COALESCE(MAX(rowid),0) seq FROM sync_events').get().seq)}));
        }
      }catch{}
    });
    ws.on('close',()=>clients.delete(ws));
    ws.on('error',()=>clients.delete(ws));
  });
  const timer=setInterval(()=>{
    for(const c of clients){if(c.isAlive===false){try{c.terminate()}catch{};clients.delete(c);continue}c.isAlive=false;try{c.ping()}catch{}}
    const rows=db.prepare('SELECT rowid AS seq,id,entity,entity_id,operation,payload,updated_at FROM sync_events WHERE rowid>? ORDER BY rowid ASC LIMIT 500').all(lastRowid);
    for(const e of rows){lastRowid=Math.max(lastRowid,e.seq);broadcast({...e,payload:JSON.parse(e.payload||'{}')})}
  },250);
  timer.unref();
  lastRowid=Number(db.prepare('SELECT COALESCE(MAX(rowid),0) seq FROM sync_events').get().seq);
  server.on('close',()=>{clearInterval(timer);try{wss.close()}catch{};db.close()});
  console.log(`Realtime sync enabled: ws://0.0.0.0:${PORT}/ws`);
}

const original=express.application.listen;
express.application.listen=function(...args){
  const server=original.apply(this,args);
  setTimeout(()=>startSync(this,server),100);
  return server;
};
