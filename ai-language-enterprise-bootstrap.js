const express=require('express');
const path=require('path');
const modPath=path.join(__dirname,'ai-language-enterprise-routes.js');
const register=require(modPath);
const original=express.application.listen;
if(!express.application.__mkLanguageEnterprise){express.application.__mkLanguageEnterprise=true;express.application.listen=function(...args){register(this);return original.apply(this,args)}}
