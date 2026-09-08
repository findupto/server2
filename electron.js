const {app,BrowserWindow}=require('electron');const {spawn}=require('child_process');const path=require('path');let server;
function create(){const w=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,webPreferences:{contextIsolation:true}});w.loadURL('http://127.0.0.1:4173')}
app.whenReady().then(()=>{server=spawn(process.execPath,[path.join(__dirname,'server-v2.js')],{env:{...process.env,PORT:'4173'},stdio:'ignore'});setTimeout(create,1200)});
app.on('window-all-closed',()=>{if(server)server.kill();if(process.platform!=='darwin')app.quit()});