(()=>{
  const read=()=>JSON.parse(localStorage.cart||'[]');
  const save=x=>{localStorage.cart=JSON.stringify(x)};
  window.addCart=(pid)=>{
    const p=(window.state&&state.products||[]).find(x=>x.id===pid); if(!p)return;
    const r=document.querySelector(`input[name="variant-${CSS.escape(pid)}"]:checked`);
    let variant='',variant_id='',price=Number(p.price||0);
    if(r){const z=r.value.split('|');variant_id=z[0];price=Number(z[1]);variant=z.slice(2).join('|')}
    const key=pid+'|'+variant_id,x=read(),found=x.find(i=>i.key===key);
    if(found)found.qty=Number(found.qty||0)+1; else x.push({key,product_id:pid,variant_id,name:p.name,variant,price,qty:1});
    save(x); if(window.state)state.cart=x;
    let toast=document.getElementById('cartToast'); if(!toast){toast=document.createElement('div');toast.id='cartToast';toast.className='cart-toast';document.body.appendChild(toast)}
    toast.textContent=`Added ${p.name}${variant?' · '+variant:''} to cart`;toast.classList.add('show');clearTimeout(window.__cartToast);window.__cartToast=setTimeout(()=>toast.classList.remove('show'),1400);
  };
  function riderTracking(){
    if(!window.state?.user||state.user.role!=='rider'||!navigator.geolocation||!state.token)return;
    if(window.__riderWatch)return;
    const send=pos=>fetch('/api/sync/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${state.token}`},body:JSON.stringify({events:[{entity:'rider_location',entity_id:state.user.id,operation:'upsert',payload:{rider_id:state.user.id,name:state.user.name,lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:new Date().toISOString()}}]})}).catch(()=>{});
    window.__riderWatch=navigator.geolocation.watchPosition(send,()=>{}, {enableHighAccuracy:true,maximumAge:30000,timeout:15000});
  }
  window.addEventListener('online',()=>setTimeout(riderTracking,1000));setTimeout(riderTracking,2500);
})();