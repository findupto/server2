(()=>{
  const read=()=>JSON.parse(localStorage.cart||'[]');
  const save=x=>{localStorage.cart=JSON.stringify(x)};
  const appState=()=>{try{return state}catch{return null}};
  window.addCart=(pid)=>{
    const s=appState(),p=(s?.products||[]).find(x=>x.id===pid);if(!p)return;
    const r=document.querySelector(`input[name="variant-${CSS.escape(pid)}"]:checked`);
    let variant='',variant_id='',price=Number(p.price||0);
    if(r){const z=r.value.split('|');variant_id=z[0];price=Number(z[1]);variant=z.slice(2).join('|')}
    const key=pid+'|'+variant_id,x=read(),found=x.find(i=>i.key===key);
    if(found)found.qty=Number(found.qty||0)+1;else x.push({key,product_id:pid,variant_id,name:p.name,variant,price,qty:1});
    save(x);if(s)s.cart=x;
    let toast=document.getElementById('cartToast');if(!toast){toast=document.createElement('div');toast.id='cartToast';toast.className='cart-toast';document.body.appendChild(toast)}
    toast.textContent=`Added ${p.name}${variant?' · '+variant:''} to cart`;toast.classList.add('show');clearTimeout(window.__cartToast);window.__cartToast=setTimeout(()=>toast.classList.remove('show'),1400);
  };
  function riderTracking(){
    const s=appState();if(!s?.user||s.user.role!=='rider'||!navigator.geolocation||!s.token||window.__riderWatch)return;
    const send=pos=>fetch('/api/sync/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.token}`},body:JSON.stringify({events:[{entity:'rider_location',entity_id:s.user.id,operation:'upsert',payload:{rider_id:s.user.id,name:s.user.name,lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:new Date().toISOString()}}]})}).catch(()=>{});
    window.__riderWatch=navigator.geolocation.watchPosition(send,()=>{},{enableHighAccuracy:true,maximumAge:30000,timeout:15000});
  }
  function managementLink(){
    const s=appState();if(!s?.user||!['admin','owner'].includes(s.user.role)||document.getElementById('bcLink'))return;
    const host=document.querySelector('.top .row');if(!host)return;
    const a=document.createElement('a');a.id='bcLink';a.href='/business-center.html';a.textContent='Business Center';a.style.cssText='display:inline-block;padding:7px 10px;border-radius:9px;background:#fff2;color:inherit;text-decoration:none;font-weight:800';host.prepend(a);
  }
  window.addEventListener('online',()=>setTimeout(riderTracking,1000));setTimeout(riderTracking,2500);setInterval(()=>{riderTracking();managementLink()},1200);
})();