(()=>{
  try{
    if(typeof state!=='undefined')window.state=state;
    if(typeof api==='function')window.api=api;
    if(typeof boot==='function')window.boot=boot;
    if(typeof render==='function')window.render=render;
    if(typeof sync==='function')window.sync=sync;
    if(typeof queue==='function')window.queue=queue;
    window.addEventListener('mkpos:refresh',()=>typeof boot==='function'&&boot());
  }catch{}
})();
