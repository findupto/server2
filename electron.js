const {app,BrowserWindow,ipcMain,safeStorage}=require('electron');
const {spawn}=require('child_process');
const path=require('path');
const fs=require('fs');
let server;
const store=()=>path.join(app.getPath('userData'),'mkpos-secure.bin');
function readStore(){try{return JSON.parse(safeStorage.decryptString(fs.readFileSync(store)))}catch{return {}}}
function writeStore(v){fs.mkdirSync(path.dirname(store()),{recursive:true});fs.writeFileSync(store(),safeStorage.encryptString(JSON.stringify(v)))}
ipcMain.handle('mkpos-secure-get',(_,key)=>{if(!safeStorage.isEncryptionAvailable())return null;return readStore()[key]??null});
ipcMain.handle('mkpos-secure-set',(_,key,value)=>{if(!safeStorage.isEncryptionAvailable())return false;const v=readStore();v[key]=value;writeStore(v);return true});
ipcMain.handle('mkpos-secure-remove',(_,key)=>{if(!safeStorage.isEncryptionAvailable())return false;const v=readStore();delete v[key];writeStore(v);return true});
function create(){const w=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,backgroundColor:'#f6f7fb',webPreferences:{contextIsolation:true,preload:path.join(__dirname,'electron-preload.js')}});w.loadURL('http://127.0.0.1:4173')}
const bootstraps=['production-upgrades.js','smart-premium-bootstrap.js','ai-understanding-bootstrap.js','ai-status-bootstrap.js','ai-premium-bootstrap.js','ai-language-enterprise-bootstrap.js','enterprise-hardening-bootstrap.js','enterprise-intelligence-bootstrap.js','enterprise-backup-bootstrap.js','financial-hardening-bootstrap.js','ai-model-policy.js','premium-bootstrap.js','ai-bootstrap.js','ai-monitor-bootstrap.js','ai-autonomous-bootstrap.js','ai-agent-bootstrap.js','ai-vision-bootstrap.js','ai-realtime-bootstrap.js','ai-supervisor-bootstrap.js','realtime-sync-bootstrap.js','api-security-bootstrap.js'];
app.whenReady().then(()=>{const args=['migrate.js'];server=spawn(process.execPath,['-e',`require('./migrate.js')`],{cwd:__dirname,env:{...process.env,PORT:'4173'},stdio:'ignore'});const wait=()=>{const child=spawn(process.execPath,[...bootstraps.flatMap(x=>['-r',path.join(__dirname,x)]),path.join(__dirname,'server.js')],{cwd:__dirname,env:{...process.env,PORT:'4173'},stdio:'ignore'});server=child;setTimeout(create,1800)};setTimeout(wait,700)});
app.on('window-all-closed',()=>{if(server)server.kill();if(process.platform!=='darwin')app.quit()});
