const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('mkposSecureStorage',{
  get:key=>ipcRenderer.invoke('mkpos-secure-get',String(key)),
  set:(key,value)=>ipcRenderer.invoke('mkpos-secure-set',String(key),String(value)),
  remove:key=>ipcRenderer.invoke('mkpos-secure-remove',String(key))
});
