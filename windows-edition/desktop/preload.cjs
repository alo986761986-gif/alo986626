'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('NCDesktop',Object.freeze({
 identity:()=>ipcRenderer.sendSync('napoli:identity'),
 bootDone:()=>ipcRenderer.invoke('napoli:boot-done'),
 login:(mode,email,password)=>ipcRenderer.invoke('napoli:login',mode,email,password),
 googleAvailable:()=>ipcRenderer.invoke('napoli:google-available'),
 googleLogin:()=>ipcRenderer.invoke('napoli:google-login'),
 guest:()=>ipcRenderer.invoke('napoli:guest'),
 logout:()=>ipcRenderer.invoke('napoli:logout'),
 reset:email=>ipcRenderer.invoke('napoli:reset',email),
 chiodo:args=>ipcRenderer.invoke('napoli:chiodo',args),
 social:args=>ipcRenderer.invoke('napoli:social',args),
 classic:args=>ipcRenderer.invoke('napoli:classic',args),
 remote:args=>ipcRenderer.invoke('napoli:remote',args),
 external:kind=>ipcRenderer.invoke('napoli:external',kind),
 notify:(title,body)=>ipcRenderer.invoke('napoli:notify',{title,body})
}));
