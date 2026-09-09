const express=require('express');
const smart=require('./smart-premium-layer');
const original=express.application.listen;
express.application.listen=function(...args){
  const router=this._router; const before=router?.stack?.length||0;
  try{smart.register(this)}catch(e){console.error('[smart-premium]',e)}
  if(router?.stack&&router.stack.length>before){const added=router.stack.splice(before);router.stack.unshift(...added)}
  return original.apply(this,args);
};
