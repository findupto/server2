const express=require('express');const app=express.Router();const jwt=require('jsonwebtoken');
const SECRET=process.env.JWT_SECRET||'mkpos-change-this-secret';
function auth(req,res,next){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'Login required'});try{req.user=jwt.verify(h.slice(7),SECRET);next()}catch{return res.status(401).json({error:'Invalid session'})}}

// Compatibility endpoint. Standalone voice is browser-native and never creates a cloud session.
app.post('/api/ai/realtime/token',auth,(req,res)=>res.json({ok:true,mode:'browser-native',engine:'MK Standalone AI Voice',apiKeyRequired:false,model:null,role:req.user.role}));
app.get('/api/ai/realtime/status',auth,(req,res)=>res.json({ok:true,mode:'browser-native',engine:'MK Standalone AI Voice',apiKeyRequired:false,cloud:false}));
module.exports=app;
