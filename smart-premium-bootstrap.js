const express=require('express');
const smart=require('./smart-premium-layer');
const original=express.application.listen;
express.application.listen=function(...args){const router=this._router;const before=router?.stack?.length||0;try{smart.register(this)}catch(e){console.error('[smart-premium]',e)}if(router?.stack){const added=router.stack.splice(before);const firstRoute=router.stack.findIndex(layer=>layer&&layer.route);router.stack.splice(firstRoute<0?router.stack.length:firstRoute,0,...added)}return original.apply(this,args)};
