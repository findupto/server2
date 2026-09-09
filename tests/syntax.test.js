const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync,spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

function jsFiles(dir){
  const out=[];
  for(const name of fs.readdirSync(dir,{withFileTypes:true})){
    if(name.name==='node_modules'||name.name==='.git'||name.name==='android')continue;
    const full=path.join(dir,name.name);
    if(name.isDirectory())out.push(...jsFiles(full));
    else if(name.isFile()&&name.name.endsWith('.js'))out.push(full);
  }
  return out;
}

test('all repository JavaScript files parse successfully',()=>{
  for(const file of jsFiles(process.cwd()))assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',file],{stdio:'pipe'}),file);
});

test('package manifest is valid JSON and includes required production scripts',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.name,'mk-pizza-ice-bar-pos');
  assert.equal(typeof pkg.scripts.start,'string');
  assert.equal(typeof pkg.scripts.test,'string');
  assert.equal(typeof pkg.scripts.dist,'string');
  assert.match(pkg.scripts.start,/api-security-bootstrap/);
});

const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(url,child){
  const deadline=Date.now()+30000;
  let last;
  while(Date.now()<deadline){
    if(child.exitCode!==null)throw new Error(`server exited with code ${child.exitCode}`);
    try{const r=await fetch(url);if(r.ok)return r}catch(e){last=e}
    await wait(250);
  }
  throw last||new Error('server did not become ready');
}
async function jsonFetch(url,options={}){
  const r=await fetch(url,options);
  const text=await r.text();
  let data={};try{data=JSON.parse(text)}catch{}
  return {r,data,text};
}
function deviceHeaders(secret,deviceId,token,method,url,body=''){
  const ts=String(Date.now()),nonce=crypto.randomUUID();
  const bodyHash=crypto.createHash('sha256').update(body).digest('hex');
  const key=crypto.createHash('sha256').update(secret).digest();
  const message=`${ts}.${nonce}.${method}.${url}.${bodyHash}`;
  const signature=crypto.createHmac('sha256',key).update(message).digest('hex');
  return {authorization:`Bearer ${token}`,'x-mkpos-device-id':deviceId,'x-mkpos-device-ts':ts,'x-mkpos-device-nonce':nonce,'x-mkpos-device-signature':signature};
}

test('production server starts and trusted-device authentication works end-to-end',async t=>{
  const port=4180+Math.floor(Math.random()*100);
  const dbPath=path.join(process.cwd(),`.test-mkpos-${process.pid}-${port}.db`);
  const npmCommand=process.platform==='win32'?'npm.cmd':'npm';
  const child=spawn(npmCommand,['start'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DB_PATH:dbPath,JWT_SECRET:'test-secret-'+crypto.randomBytes(12).toString('hex'),REQUIRE_TRUSTED_DEVICE:'1',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  let logs='';
  child.stdout.on('data',b=>{logs+=b.toString()});
  child.stderr.on('data',b=>{logs+=b.toString()});
  t.after(async()=>{
    if(child.exitCode===null)child.kill('SIGTERM');
    await wait(250);
    for(const suffix of ['', '-shm', '-wal'])try{fs.unlinkSync(dbPath+suffix)}catch{}
  });

  const base=`http://127.0.0.1:${port}`;
  await waitFor(`${base}/api/health`,child);
  const health=await jsonFetch(`${base}/api/health`);
  assert.equal(health.r.status,200);
  assert.equal(health.data.ok,true);

  const login=await jsonFetch(`${base}/api/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'admin',password:'1122'})});
  assert.equal(login.r.status,200,logs);
  const token=login.data.token;
  assert.ok(token);

  const noDevice=await jsonFetch(`${base}/api/bootstrap`,{headers:{authorization:`Bearer ${token}`}});
  assert.equal(noDevice.r.status,401);
  assert.equal(noDevice.data.error,'Trusted app device authentication required');

  const registered=await jsonFetch(`${base}/api/device/register`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({device_name:'CI device',device_type:'test'})});
  assert.equal(registered.r.status,200,logs);
  assert.ok(registered.data.device_id);
  assert.ok(registered.data.device_secret);

  const listed=await jsonFetch(`${base}/api/device/list`,{headers:{authorization:`Bearer ${token}`}});
  assert.equal(listed.r.status,200,logs);
  assert.ok(listed.data.some(x=>x.id===registered.data.device_id));

  const headers=deviceHeaders(registered.data.device_secret,registered.data.device_id,token,'GET','/api/bootstrap');
  const protectedResponse=await jsonFetch(`${base}/api/bootstrap`,{headers});
  assert.equal(protectedResponse.r.status,200,logs);
  assert.equal(protectedResponse.data.user.role,'admin');
});
