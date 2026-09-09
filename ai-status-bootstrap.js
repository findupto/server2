const express=require('express');
const jwt=require('jsonwebtoken');
const original=express.application.listen;
if(!express.application.__mkAiStatus){
  express.application.__mkAiStatus=true;
  express.application.listen=function(...args){
    const app=this;
    const router=app._router;
    const before=router?.stack?.length||0;
    app.get('/api/ai/status',(req,res)=>{
      const h=req.headers.authorization||'';
      if(!h.startsWith('Bearer '))return res.status(401).json({error:'Login required'});
      try{jwt.verify(h.slice(7),process.env.JWT_SECRET||'mkpos-change-this-secret')}catch{return res.status(401).json({error:'Invalid session'})}
      res.json({ok:true,configured:Boolean(process.env.OPENAI_API_KEY),provider:process.env.OPENAI_API_KEY?'openai':'not-configured',model:process.env.OPENAI_COMMAND_MODEL||'configured default'});
    });
    if(router?.stack){
      const added=router.stack.splice(before);
      const firstRoute=router.stack.findIndex(layer=>layer&&layer.route);
      router.stack.splice(firstRoute<0?router.stack.length:firstRoute,0,...added);
    }
    return original.apply(this,args);
  };
}
