(()=>{
  const KEY='voiceTableOrder';
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const api=async(p,o={})=>{
    o.headers={...(o.headers||{}),'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.token||'')};
    const r=await fetch(p,o),d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||'Request failed');
    return d;
  };
  const speak=t=>{try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-PK';speechSynthesis.speak(u)}catch{}};
  async function start(){
    if(!localStorage.token||document.getElementById('voiceTableOrder'))return;
    const b=await api('/api/bootstrap');
    const tables=(b.tables||[]).filter(t=>norm(t.status)==='available');
    const wrap=document.createElement('div');
    wrap.id='voiceTableOrder';
    wrap.style='position:fixed;left:18px;bottom:18px;z-index:99998';
    const btn=document.createElement('button');
    btn.textContent='🗣️ Order by Voice';
    btn.style='padding:14px 18px;border:0;border-radius:999px;font-weight:800;box-shadow:0 8px 30px #0004;cursor:pointer';
    wrap.appendChild(btn);document.body.appendChild(wrap);
    btn.onclick=async()=>{
      if(!tables.length){speak('Sorry, all tables are currently occupied. Please wait for the next available table.');return}
      const names=tables.map(t=>t.table_no).join(', ');
      speak(`Welcome. Available tables are ${names}. Please say your table number, or say dine in and I will help you choose a table.`);
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){alert('Voice recognition is not supported.');return}
      const r=new SR();r.lang='en-PK';r.interimResults=false;r.maxAlternatives=1;
      r.onresult=async e=>{
        try{
          const text=e.results[0][0].transcript;
          const m=text.match(/\b(?:table|number)\s*(\d+)\b/i)||text.match(/\b(\d+)\b/);
          if(!m){speak('I did not understand the table number. Please say table and the number.');return}
          const no=String(Number(m[1]));
          const t=tables.find(x=>String(x.table_no)===no);
          if(!t){speak(`Table ${no} is not available. Please choose one of these tables: ${names}.`);return}
          localStorage.setItem(KEY,JSON.stringify({table_no:t.table_no,at:Date.now()}));
          speak(`Table ${no} selected. Now tell me your order.`);
          listenOrder(t,b);
        }catch(err){alert(err.message)}
      };
      r.start();
    };
  }
  function listenOrder(table,b){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert('Voice recognition is not supported.');return}
    const r=new SR();r.lang='en-PK';r.interimResults=false;r.maxAlternatives=1;
    r.onresult=async e=>{
      const command=e.results[0][0].transcript;
      try{
        const plan=await api('/api/ai/voice/interpret',{method:'POST',body:JSON.stringify({command})});
        if(plan.intent!=='create_sale'||Number(plan.confidence||0)<.82){speak('I need you to repeat that order more clearly.');return}
        const cart=[];
        for(const x of plan.items||[]){
          const p=(b.products||[]).find(z=>norm(z.name)===norm(x.product_name));
          if(!p)throw Error(`Product not found: ${x.product_name}`);
          const v=x.variant_name?(b.variants||[]).find(z=>z.product_id===p.id&&norm(z.name)===norm(x.variant_name)):null;
          if(x.variant_name&&!v)throw Error(`Variant not found: ${x.variant_name}`);
          cart.push({key:p.id+'|'+(v?.id||''),product_id:p.id,variant_id:v?.id||'',name:p.name,variant:v?.name||'',price:v?Number(v.price):Number(p.price),qty:Number(x.qty||1)});
        }
        const summary=cart.map(x=>`${x.qty} ${x.name}${x.variant?' '+x.variant:''}`).join(', ');
        speak(`I heard ${summary}. Please say confirm order, or say change order.`);
        const c=new SR();c.lang='en-PK';c.interimResults=false;c.maxAlternatives=1;
        c.onresult=async ev=>{
          const answer=norm(ev.results[0][0].transcript);
          if(!/confirm|yes|place|submit/.test(answer)){speak('Order cancelled. You can start again when ready.');return}
          localStorage.cart=JSON.stringify(cart);
          localStorage.setItem('ai:cartSync',String(Date.now()));
          localStorage.setItem('ai:tableNo',table.table_no);
          if(window.go)window.go('cart');else location.reload();
          speak(`Order added for table ${table.table_no}. Please review the total and place the order.`);
        };
        c.start();
      }catch(err){speak(err.message||'I could not process that order.')}
    };
    r.start();
  }
  new MutationObserver(()=>{if(localStorage.token)start()}).observe(document.documentElement,{childList:true,subtree:true});
  start().catch(()=>{});
})();
