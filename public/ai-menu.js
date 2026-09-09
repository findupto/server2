(()=>{
  const $=s=>document.querySelector(s);
  function role(){try{return typeof state!=='undefined'&&state.user?state.user.role:''}catch{return localStorage.getItem('role')||''}}
  function api(path,options={}){
    try{if(typeof window.api==='function')return window.api(path,options)}catch{}
    const token=localStorage.token||'';
    options.headers={...(options.headers||{}),'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
    return fetch(path,options).then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||r.statusText);return data});
  }
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function mount(){
    if(!['admin','owner'].includes(role())||document.getElementById('aiMenuBtn'))return;
    const host=$('main')||$('#main');
    if(!host)return;
    const bar=document.createElement('div');
    bar.className='ai-menu-launch';
    bar.innerHTML='<button id="aiMenuBtn" class="ai-menu-btn"><span>✦</span><span><b>AI Menu Studio</b><small>Camera or image → organized POS menu</small></span></button>';
    host.prepend(bar);
    $('#aiMenuBtn').onclick=()=>openStudio();
  }
  async function openStudio(){
    if(document.getElementById('aiMenuModal'))return;
    const modal=document.createElement('div');
    modal.id='aiMenuModal';modal.className='ai-modal';
    modal.innerHTML=`<div class="ai-sheet"><div class="ai-head"><div><span class="ai-kicker">AI VISION</span><h2>Menu Studio</h2><p>Import a menu image, review detected records, then distribute them into POS data.</p></div><button class="ai-close" id="aiClose">×</button></div><div class="ai-drop"><div class="ai-icon">◎</div><h3>Drop menu image here</h3><p>or choose from PC / phone camera</p><input id="aiFile" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"><button id="aiPick">Choose image</button><div id="aiPreview"></div></div><div class="ai-actions"><button id="aiScan" class="primary" disabled>Scan with AI</button></div><div id="aiResult"></div></div>`;
    document.body.appendChild(modal);
    $('#aiClose').onclick=()=>modal.remove();
    const input=$('#aiFile'),preview=$('#aiPreview'),scan=$('#aiScan');let image='';
    input.onchange=()=>{const file=input.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{image=reader.result;preview.innerHTML=`<img src="${image}" alt="Menu preview">`;scan.disabled=false};reader.readAsDataURL(file)};
    $('#aiPick').onclick=()=>input.click();
    scan.onclick=async()=>{scan.disabled=true;scan.textContent='Reading menu…';try{renderPreview(await api('/api/premium/ai/menu-from-image',{method:'POST',body:JSON.stringify({image,filename:input.files?.[0]?.name||'camera-menu'})}))}catch(e){renderError(e.message)}finally{scan.disabled=false;scan.textContent='Scan with AI'}};
    function renderError(message){$('#aiResult').innerHTML=`<div class="ai-error">${esc(message)}</div>`}
    function section(title,rows,render){return `<section><h4>${title} <em>${rows.length}</em></h4>${rows.map(render).join('')||'<small>None detected</small>'}</section>`}
    function renderPreview(data){
      const products=data.products||[],variants=data.variants||[],deals=data.deals||[],coupons=data.coupons||[];
      const count=products.length+variants.length+deals.length+coupons.length;
      $('#aiResult').innerHTML=`<div class="ai-confidence"><b>${Math.round((data.confidence||0)*100)}% confidence</b><span>${count} records detected</span></div><div class="ai-grid">${section('Products',products,p=>`<div class="ai-row"><b>${esc(p.name)}</b><span>${esc(p.category||'Other')} · ${esc(p.price)}</span></div>`)}${section('Variants',variants,v=>`<div class="ai-row"><b>${esc(v.product_name)} / ${esc(v.name)}</b><span>${esc(v.price)}</span></div>`)}${section('Deals',deals,d=>`<div class="ai-row"><b>${esc(d.name)}</b><span>${esc(d.price)} · ${(d.items||[]).length} components</span></div>`)}${section('Coupons',coupons,c=>`<div class="ai-row"><b>${esc(c.code)}</b><span>${esc(c.discount_type)} ${esc(c.discount_value)}</span></div>`)}</div><div class="ai-notes">${(data.notes||[]).map(n=>`<div>• ${esc(n)}</div>`).join('')}</div><div class="ai-apply"><button id="aiApply" class="primary">Apply & distribute everything</button><button id="aiCancel">Review later</button></div>`;
      $('#aiCancel').onclick=()=>modal.remove();
      $('#aiApply').onclick=async()=>{const button=$('#aiApply');button.disabled=true;button.textContent='Applying…';try{const result=await api('/api/premium/ai/menu-apply',{method:'POST',body:JSON.stringify({id:data.id})});$('#aiResult').innerHTML=`<div class="ai-success"><b>Menu distributed successfully.</b><span>${result.products||0} products · ${result.variants||0} variants · ${result.deals||0} deals · ${result.coupons||0} coupons</span></div>`;setTimeout(()=>{modal.remove();if(typeof boot==='function')boot()},900)}catch(e){renderError(e.message);button.disabled=false;button.textContent='Apply & distribute everything'}};
    }
  }
  const css='.ai-menu-launch{margin:0 0 14px}.ai-menu-btn{width:100%;display:flex;gap:14px;align-items:center;text-align:left;padding:15px 18px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:linear-gradient(135deg,#171f2a,#10151d);color:inherit;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.14)}.ai-menu-btn span:first-child{font-size:26px}.ai-menu-btn small{display:block;opacity:.65;margin-top:3px}.ai-modal{position:fixed;inset:0;z-index:9999;background:rgba(4,7,11,.72);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px}.ai-sheet{width:min(980px,96vw);max-height:92vh;overflow:auto;background:#111820;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.4)}.ai-head{display:flex;justify-content:space-between;gap:20px}.ai-kicker{font-size:11px;letter-spacing:2px;opacity:.6}.ai-head h2{margin:5px 0}.ai-head p{opacity:.7}.ai-close{font-size:26px;background:transparent;border:0;color:inherit;cursor:pointer}.ai-drop{border:1px dashed rgba(255,255,255,.22);border-radius:20px;padding:30px;text-align:center}.ai-drop input{display:none}.ai-icon{font-size:40px;opacity:.7}.ai-drop button{margin-top:10px}.ai-drop img{max-width:100%;max-height:260px;border-radius:14px;margin-top:16px}.ai-actions,.ai-apply{display:flex;gap:10px;margin-top:16px}.ai-actions button{width:100%}.ai-confidence{display:flex;justify-content:space-between;margin:18px 0;padding:14px;border-radius:14px;background:rgba(255,255,255,.05)}.ai-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ai-grid section{padding:15px;border:1px solid rgba(255,255,255,.08);border-radius:16px}.ai-grid h4{margin:0 0 10px}.ai-grid em{font-style:normal;opacity:.55}.ai-row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06);font-size:13px}.ai-row span{opacity:.65;text-align:right}.ai-notes{margin-top:14px;padding:12px;border-radius:12px;background:rgba(255,180,0,.07);font-size:13px}.ai-error,.ai-success{margin-top:16px;padding:15px;border-radius:14px}.ai-error{background:rgba(255,70,70,.1)}.ai-success{background:rgba(60,210,130,.1);display:flex;justify-content:space-between;gap:10px}@media(max-width:700px){.ai-modal{padding:8px}.ai-sheet{padding:16px}.ai-grid{grid-template-columns:1fr}.ai-row{flex-direction:column}.ai-success{flex-direction:column}}';
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  const mo=new MutationObserver(()=>mount());mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(mount,300);
})();
