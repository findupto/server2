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
function create(){const w=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,webPreferences:{contextIsolation:true,preload:path.join(__dirname,'electron-preload.js')}});w.loadURL('http://127.0.0.1:4173')}
app.whenReady().then(()=>{server=spawn(process.execPath,['-r',path.join(__dirname,'ai-model-policy.js'),'-r',path.join(__dirname,'realtime-sync-bootstrap.js'),'-r',path.join(__dirname,'api-security-bootstrap.js'),path.join(__dirname,'server.js')],{env:{...process.env,PORT:'4173'},stdio:'ignore'});setTimeout(create,1800)});
app.on('window-all-closed',()=>{if(server)server.kill();if(process.platform!=='darwin')app.quit()});
