const express=require('express');
const path=require('path');
const register=require(path.join(__dirname,'ai-language-enterprise-routes.js'));
const original=express.application.listen;
if(!express.application.__mkLanguageEnterprise){express.application.__mkLanguageEnterprise=true;express.application.listen=function(...args){const router=this._router;const before=router?.stack?.length||0;register(this);if(router?.stack){const added=router.stack.splice(before);const firstRoute=router.stack.findIndex(layer=>layer&&layer.route);router.stack.splice(firstRoute<0?router.stack.length:firstRoute,0,...added)}return original.apply(this,args)}}
