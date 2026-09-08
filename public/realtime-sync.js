(()=>{
  let ws=null,retry=1000,cursor=Number(localStorage.mkposSyncCursor||0),refreshTimer=0;
  const token=()=>localStorage.token||'';
  const base=()=>location.protocol==='https:'?'wss://':'ws://';
  function refresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{window.location.reload()},350)}
  async function recover(){const t=token();if(!t)return;try{const r=await fetch(`/api/sync/events?after=${encodeURIComponent(cursor)}&limit=200`,{headers:{Authorization:`Bearer ${t}`}});if(!r.ok)return;const x=await r.json();for(const e of x.events||[])cursor=Math.max(cursor,Number(e.seq||0));if((x.events||[]).length){localStorage.mkposSyncCursor=String(cursor);refresh()}}catch{}}
  function connect(){const t=token();if(!t)return;try{ws=new WebSocket(`${base()}${location.host}/ws`);ws.onopen=()=>{retry=1000;ws.send(JSON.stringify({type:'auth',token:t}))};ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='ready'){cursor=Math.max(cursor,Number(m.cursor||0));localStorage.mkposSyncCursor=String(cursor);recover()}else if(m.type==='sync'){cursor=Math.max(cursor,Number(m.seq||0));localStorage.mkposSyncCursor=String(cursor);refresh()}}catch{}};ws.onclose=()=>{setTimeout(connect,retry);retry=Math.min(retry*2,15000)};ws.onerror=()=>{try{ws.close()}catch{}}}catch{setTimeout(connect,retry)}}
  window.addEventListener('online',()=>{retry=1000;recover();connect()});
  if(token())connect();
})();
