'use strict';
const {app,BrowserWindow,ipcMain,protocol,net,shell,dialog,session,safeStorage,Menu,Notification} = require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {URLS,socialRequest,fileIn,paths,firebaseKey}=require('./settings.cjs');
const {clientConfigured,openGoogleOAuth}=require('./google-auth.cjs');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.mp3':'audio/mpeg','.wav':'audio/wav','.webp':'image/webp','.woff2':'font/woff2'};
protocol.registerSchemesAsPrivileged([{scheme:'napoli',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,codeCache:true}}]);
const BASE='napoli://game';
const isLocal=url=>url===BASE || url.startsWith(BASE+'/');
let window,identity=null,apiKey='',appPaths,notificationTimer,googleBusy=false;
const googleDesktopClient=process.env.NAPOLI_GOOGLE_DESKTOP_CLIENT_ID||'';
function screenFile(){return BASE+'/desktop/login.html';}
function splashFile(){return BASE+'/desktop/splash.html';}
function emitScript(name,...args){
 if(!window||window.isDestroyed()||!/^NC[A-Z0-9_]+$/.test(name))return;
 const payload=args.map(x=>JSON.stringify(x)).join(',');
 window.webContents.executeJavaScript(`if(typeof window.${name}==='function')window.${name}(${payload})`).catch(()=>{});
}
function sessionFile(){return path.join(app.getPath('userData'),'firebase-session.bin');}
function saveSession(){try{const file=sessionFile();if(!identity){fs.rmSync(file,{force:true});return;}if(!safeStorage.isEncryptionAvailable())return;const secured=safeStorage.encryptString(JSON.stringify({uid:identity.uid,email:identity.email,displayName:identity.displayName,providers:identity.providers,refreshToken:identity.refreshToken}));fs.writeFileSync(file,secured,{mode:0o600});}catch(e){console.warn('Session persistence disabled',e.message);}}
function loadSession(){try{if(!safeStorage.isEncryptionAvailable())return;const data=JSON.parse(safeStorage.decryptString(fs.readFileSync(sessionFile())));if(typeof data.uid==='string'&&typeof data.refreshToken==='string')identity=data;}catch{identity=null;}}
async function limitedFetch(url,options={},max=512000){
 const res=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(options.timeout||30000),cache:'no-store'});
 const len=Number(res.headers.get('content-length')||0);if(len>max)throw Error('Risposta troppo grande');
 const reader=res.body?.getReader();if(!reader)return {status:res.status,body:''};
 let bytes=0,chunks=[];
 try{while(true){const x=await reader.read();if(x.done)break;bytes+=x.value.length;if(bytes>max)throw Error('Risposta troppo grande');chunks.push(Buffer.from(x.value));}}finally{reader.releaseLock();}
 return {status:res.status,body:Buffer.concat(chunks).toString('utf8')};
}
async function firebaseCall(resource,body){
 if(!apiKey)throw Error('Configura la chiave web Firebase del progetto');
 return limitedFetch(`https://identitytoolkit.googleapis.com/v1/accounts:${resource}?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},128000);
}
function firebaseError(payload){let code='';try{code=JSON.parse(payload).error?.message||'';}catch{}return ({EMAIL_NOT_FOUND:'Email non registrata',INVALID_PASSWORD:'Password errata',INVALID_LOGIN_CREDENTIALS:'Credenziali non valide',EMAIL_EXISTS:'Email già utilizzata',WEAK_PASSWORD:'Password troppo breve',OPERATION_NOT_ALLOWED:'Accesso email non abilitato nel progetto Firebase',API_KEY_INVALID:'Chiave Firebase non valida'}[code]||code||'Accesso non riuscito');}
async function refresh(){
 if(!identity)return null;
 if(identity.idToken&&identity.expiresAt>Date.now()+60000)return identity.idToken;
 if(!identity.refreshToken)return null;
 const res=await limitedFetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:identity.refreshToken}).toString()},128000);
 if(res.status!==200){identity=null;saveSession();return null;}
 const data=JSON.parse(res.body);
 identity={...identity,uid:data.user_id,idToken:data.id_token,refreshToken:data.refresh_token,expiresAt:Date.now()+Number(data.expires_in||3500)*1000};saveSession();return identity.idToken;
}
async function authenticate(mode,email,password){
 if(!['login','register'].includes(mode))throw Error('Azione non valida');
 if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('Indirizzo email non valido');
 if(typeof password!=='string'||password.length<6||password.length>200)throw Error('Password non valida');
 const res=await firebaseCall(mode==='register'?'signUp':'signInWithPassword',{email,password,returnSecureToken:true});
 if(res.status!==200)throw Error(firebaseError(res.body));
 const data=JSON.parse(res.body);
 identity={uid:data.localId,email:data.email||email,displayName:data.displayName||'',idToken:data.idToken,refreshToken:data.refreshToken,expiresAt:Date.now()+Number(data.expiresIn||3500)*1000,providers:['password']};saveSession();
 navigate(BASE+'/index.html');return {ok:true};
}
function navigate(url){if(window&&!window.isDestroyed())window.loadURL(url);}
function assertLocal(event){if(!isLocal(event.senderFrame?.url||''))throw Error('Non autorizzato');}
async function chiodoRequest(args){
 if(!args||!/^(join|state|move|realtime|leave|profile)$/.test(args.op||''))throw Error('Operazione Chiodo non valida');
 if(typeof args.token!=='string'||args.token.length>80||args.token&&!/^[a-f0-9]{48}$/.test(args.token))throw Error('Token partita non valido');
 const data=typeof args.data==='string'?args.data:'{}';if(data.length>(args.op==='profile'?104000:8192))throw Error('Richiesta eccessiva');
 try{return await limitedFetch(URLS.chiodo+'/chiodo/'+args.op,{method:args.op==='state'?'GET':'POST',headers:{accept:'application/json',...(args.token?{authorization:'Bearer '+args.token}:{}),...(args.op==='state'?{}:{'content-type':'application/json'})},...(args.op==='state'?{}:{body:data}),timeout:75000},524288);}catch(e){return {status:0,error:e.message||'Connessione non riuscita',body:''};}
}
async function socialCall(args){
 if(!args||typeof args.op!=='string'||typeof args.data!=='string'||args.data.length>375000)throw Error('Richiesta non valida');
 const token=await refresh();if(!token)return {status:401,body:JSON.stringify({error:'Accedi con email per utilizzare amici, profili e bonus'})};
 let data;try{data=JSON.parse(args.data);}catch{throw Error('JSON non valido');}
 const {url,method,body}=socialRequest(args.op,data);
 try{return await limitedFetch(url,{method,headers:{'X-Firebase-Token':token,'Accept':'application/json',...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body}:{}),timeout:22000},args.op.startsWith('chat')?480000:args.op==='pPhoto'?140000:65536);}catch{return {status:0,body:JSON.stringify({error:'Connessione non disponibile'})};}
}
async function classicFetch(args){
 if(!args||typeof args.url!=='string')throw Error('URL non valido');
 const url=new URL(args.url);
 if(url.origin!==URLS.classic||!/^\/api\/[a-zA-Z0-9/_-]+$/.test(url.pathname))throw Error('Endpoint non consentito');
 const method=args.method||'GET';if(!['GET','POST'].includes(method))throw Error('Metodo non consentito');
 const body=typeof args.body==='string'?args.body:'';if(body.length>50000)throw Error('Payload eccessivo');
 return limitedFetch(url.toString(),{method,headers:{accept:'application/json',...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body}:{}),timeout:35000},1024000);
}
function showAuthDialog(){navigate(screenFile());}
function enterGuest(){identity=null;saveSession();if(window)window._prevUnread=0;navigate(BASE+'/index.html');return {ok:true};}
async function googleLogin(){
 if(googleBusy)throw Error('Accesso Google gia in corso');
 if(!clientConfigured(googleDesktopClient))throw Error('Il client OAuth Desktop Google non e configurato.');
 googleBusy=true;
 try{
  const session=await openGoogleOAuth({clientId:googleDesktopClient,openExternal:url=>shell.openExternal(url)});
  const googleRes=await limitedFetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:session.clientId,redirect_uri:session.redirectUri,code:session.code,code_verifier:session.verifier,grant_type:'authorization_code'}).toString()},128000);
  if(googleRes.status!==200)throw Error('Google non ha autorizzato la sessione Desktop.');
  const googleData=JSON.parse(googleRes.body);
  if(typeof googleData.id_token!=='string'||googleData.id_token.length>16000)throw Error('ID token Google mancante');
  const exchange=await firebaseCall('signInWithIdp',{requestUri:'http://localhost',postBody:new URLSearchParams({id_token:googleData.id_token,providerId:'google.com'}).toString(),returnSecureToken:true,returnIdpCredential:false});
  if(exchange.status!==200)throw Error(firebaseError(exchange.body));
  const user=JSON.parse(exchange.body);
  identity={uid:user.localId,email:user.email||'',displayName:user.displayName||'',providers:['google.com'],idToken:user.idToken,refreshToken:user.refreshToken,expiresAt:Date.now()+Number(user.expiresIn||3500)*1000};
  saveSession();navigate(BASE+'/index.html');return {ok:true};
 }finally{googleBusy=false;}
}
function startNotifications(){
 if(notificationTimer)clearInterval(notificationTimer);
 notificationTimer=setInterval(async()=>{if(!identity||!window||window.isDestroyed())return;
  try{const r=await socialCall({op:'pNotifications',data:'{}'});if(r.status!==200)return;
   const data=JSON.parse(r.body),unread=Number(data.unreadCount||0);if(unread>0 && Notification.isSupported() && unread!==window._prevUnread){new Notification({title:'NAPOLI CARTE 3D',body:`Hai ${unread} notifiche da leggere`}).show();window._prevUnread=unread;}}
  catch{}},60000);
}
function buildMenu(){return Menu.buildFromTemplate([
 {label:'Gioco',submenu:[{label:'Menu dei giochi',click:()=>navigate(BASE+'/index.html')},{label:'Cambia account',click:showAuthDialog},{label:'Esci dall’account',click:()=>{identity=null;saveSession();navigate(screenFile());}},{type:'separator'},{role:'quit',label:'Esci'}]},
 {label:'Visualizza',submenu:[{role:'reload',label:'Ricarica'},{role:'togglefullscreen',label:'Schermo intero'},{role:'resetZoom',label:'Zoom normale'}]},
 {label:'Aiuto',submenu:[{label:'Privacy',click:()=>shell.openExternal(URLS.classic+'/privacy')},{label:'Richiedi eliminazione account',click:()=>shell.openExternal(URLS.classic+'/account-deletion')}]}]);}
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
if(!app.requestSingleInstanceLock()){app.quit();}else app.whenReady().then(async()=>{
 appPaths=paths(path.resolve(__dirname,'..'),process.resourcesPath,app.isPackaged);
 apiKey=process.env.NAPOLI_FIREBASE_WEB_API_KEY||firebaseKey(appPaths.google);
 loadSession();
 protocol.handle('napoli',async request=>{
  try{
   const url=new URL(request.url);if(url.host!=='game')return new Response('Forbidden',{status:403});
   const prefix=url.pathname.startsWith('/desktop/')?'desktop/':'';
   const relative=url.pathname.replace(/^\//,'');
   const base=prefix?path.join(__dirname):appPaths.assets;
   const local=prefix?relative.slice(8):relative;
   const file=fileIn(base,local||'index.html');
   if(prefix && !['login.html','splash.html','compat.js'].includes(local))return new Response('Not found',{status:404});
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Not found',{status:404});
   let body=fs.readFileSync(file),mime=MIME[path.extname(file).toLowerCase()]||'application/octet-stream';
   if(relative==='index.html'){
    let html=body.toString('utf8');
    // Android still carries a second 4.5-second studio intro. Windows shows it
    // only once in splash.html, before login, so remove the entire legacy block.
    const bootStart=html.indexOf('<style>#nc-studio-boot{');
    if(bootStart>=0){const bootEnd=html.indexOf('</script>',bootStart);if(bootEnd>=0)html=html.slice(0,bootStart)+html.slice(bootEnd+9);}
    html=html.replace(/<head([^>]*)>/i,'<head$1><script src="/desktop/compat.js"></script>');
    body=Buffer.from(html,'utf8');
   }
   return new Response(body,{status:200,headers:{'content-type':mime,'cache-control':'no-store','x-content-type-options':'nosniff'}});
  }catch{return new Response('Invalid path',{status:400});}
 });
 ipcMain.on('napoli:identity',(event)=>{assertLocal(event);event.returnValue={uid:identity?.uid||'',email:identity?.email||'',displayName:identity?.displayName||'',providers:identity?.providers||[]};});
 ipcMain.handle('napoli:login',async(event,mode,email,password)=>{assertLocal(event);return authenticate(mode,email,password);});
 ipcMain.handle('napoli:google-available',async event=>{assertLocal(event);return clientConfigured(googleDesktopClient);});
 ipcMain.handle('napoli:google-login',async event=>{assertLocal(event);return googleLogin();});
 ipcMain.handle('napoli:guest',async event=>{assertLocal(event);return enterGuest();});
 ipcMain.handle('napoli:reset',async(event,email)=>{assertLocal(event);if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('Inserisci una email valida');const r=await firebaseCall('sendOobCode',{requestType:'PASSWORD_RESET',email});if(r.status!==200)throw Error(firebaseError(r.body));return {ok:true};});
 ipcMain.handle('napoli:boot-done',async event=>{assertLocal(event);navigate(identity?BASE+'/index.html':screenFile());return true;});
 ipcMain.handle('napoli:logout',async event=>{assertLocal(event);identity=null;saveSession();navigate(screenFile());return true;});
 ipcMain.handle('napoli:chiodo',async(event,args)=>{assertLocal(event);return chiodoRequest(args);});
 ipcMain.handle('napoli:social',async(event,args)=>{assertLocal(event);return socialCall(args);});
 ipcMain.handle('napoli:classic',async(event,args)=>{assertLocal(event);return classicFetch(args);});
 ipcMain.handle('napoli:external',async(event,which)=>{assertLocal(event);const urls={privacy:URLS.classic+'/privacy',delete:URLS.classic+'/account-deletion'};if(!urls[which])return false;await shell.openExternal(urls[which]);return true;});
 ipcMain.handle('napoli:notify',async(event,{title,body})=>{assertLocal(event);if(Notification.isSupported()){new Notification({title:String(title).slice(0,90),body:String(body).slice(0,300)}).show();return true;}return false;});
 window=new BrowserWindow({width:1280,height:830,minWidth:800,minHeight:560,backgroundColor:'#082c59',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false}});
 window.once('ready-to-show',()=>window.show());
 window.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://')&&/^https:\/\/(napoli-carte-3d-global\.onrender\.com|napoli-chiodo-121\.onrender\.com)\//.test(url))shell.openExternal(url);return {action:'deny'};});
 window.webContents.on('will-navigate',(event,url)=>{if(!isLocal(url))event.preventDefault();});
 const allowedPermissions=new Set(['media','notifications','fullscreen']);
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>{
  const source=details?.requestingUrl||contents.getURL();
  callback(isLocal(source)&&allowedPermissions.has(permission));
 });
 session.defaultSession.setPermissionCheckHandler((contents,permission,origin,details)=>
  allowedPermissions.has(permission) && isLocal(details?.requestingUrl||origin||contents?.getURL()||''));
 Menu.setApplicationMenu(buildMenu());startNotifications();
 if(identity){try{await refresh();}catch{identity=null;}}
 navigate(splashFile());
}).catch(e=>{dialog.showErrorBox('NAPOLI CARTE 3D - Errore',e.message);app.quit();});
app.on('window-all-closed',()=>{if(notificationTimer)clearInterval(notificationTimer);app.quit();});
