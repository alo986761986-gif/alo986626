'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),os=require('node:os'),moduleLoader=require('node:module');
const mainPath=path.join(__dirname,'../main.cjs');
const source=fs.readFileSync(mainPath,'utf8');
function startMock(){
 const channels=new Map(),events=new Map(),stored={protocol:null,win:null,permissions:{}};
 const userData=fs.mkdtempSync(path.join(os.tmpdir(),'nc3d-desktop-test-'));
 const electron={
  app:{isPackaged:false,requestSingleInstanceLock:()=>true,whenReady:()=>Promise.resolve(),getPath:()=>userData,on:(name,fn)=>events.set(name,fn),quit:()=>{}},
  BrowserWindow:class{constructor(){this.webContents={setWindowOpenHandler:()=>{},on:()=>{},executeJavaScript:async()=>{},getURL:()=>this.url};this._prevUnread=0;stored.win=this;}
   once(){}loadURL(url){this.url=url;return Promise.resolve();}isDestroyed(){return false;}},
  ipcMain:{handle:(name,fn)=>channels.set(name,fn),on:(name,fn)=>channels.set(name,fn)},
  protocol:{registerSchemesAsPrivileged:()=>{},handle:(scheme,fn)=>{stored.protocol=fn;}},
  net:{},shell:{openExternal:async()=>{}},dialog:{showErrorBox:(title,message)=>{throw Error(title+': '+message);}},
  session:{defaultSession:{setPermissionRequestHandler:fn=>stored.permissions.request=fn,setPermissionCheckHandler:fn=>stored.permissions.check=fn}},
  safeStorage:{isEncryptionAvailable:()=>false},
  Menu:{buildFromTemplate:x=>x,setApplicationMenu:()=>{}},
  Notification:class{static isSupported(){return false;}}
 };
 const req=moduleLoader.createRequire(mainPath);
 const context={__dirname:path.dirname(mainPath),process,console,Buffer,URL,URLSearchParams,Response,AbortSignal,
  setInterval:()=>42,clearInterval:()=>{},setTimeout,clearTimeout,fetch:async()=>{throw Error('Network disabled in test');},
  require:p=>p==='electron'?electron:req(p)};
 vm.runInNewContext(source,context,{filename:mainPath});
 return {channels,events,stored,userData};
}
test('Electron launcher shows studio splash before login',async()=>{
 const host=startMock();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(host.stored.win.url,'napoli://game/desktop/splash.html');
 assert.equal(typeof host.stored.protocol,'function');
 await host.channels.get('napoli:boot-done')({senderFrame:{url:'napoli://game/desktop/splash.html'}});
 assert.equal(host.stored.win.url,'napoli://game/desktop/login.html');
 fs.rmSync(host.userData,{recursive:true,force:true});
});
test('guest enters game but unauthorized origin cannot use desktop IPC',async()=>{
 const host=startMock();await new Promise(resolve=>setImmediate(resolve));
 await host.channels.get('napoli:guest')({senderFrame:{url:'napoli://game/desktop/login.html'}});
 assert.equal(host.stored.win.url,'napoli://game/index.html');
 await assert.rejects(host.channels.get('napoli:guest')({senderFrame:{url:'https://attacker.example/'}}),/Non autorizzato/);
 fs.rmSync(host.userData,{recursive:true,force:true});
});
test('screen sharing is denied and media permission requires trusted origin',async()=>{
 const host=startMock();await new Promise(resolve=>setImmediate(resolve));
 const check=host.stored.permissions.check;
 assert.equal(check({},'media','napoli://game/index.html'),true);
 assert.equal(check({},'display-capture','napoli://game/index.html'),false);
 assert.equal(check({},'media','https://attacker.example/'),false);
 fs.rmSync(host.userData,{recursive:true,force:true});
});
test('untrusted website cannot invoke expansion transport',async()=>{
 const host=startMock();await new Promise(resolve=>setImmediate(resolve));
 const fn=host.channels.get('napoli:remote');
 assert.equal(typeof fn,'function');
 await assert.rejects(fn({senderFrame:{url:'https://attacker.example/'}},{url:'https://napoli-chiodo-121.onrender.com/expansion/state'}),/Non autorizzato/);
 await assert.rejects(fn({senderFrame:{url:'napoli://game/index.html'}},{url:'https://attacker.example/expansion/state'}),/consentita/);
 fs.rmSync(host.userData,{recursive:true,force:true});
});
