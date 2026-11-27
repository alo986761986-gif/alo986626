'use strict';
// Desktop OAuth with the system browser, a one-use loopback callback, state and PKCE.
// A DESKTOP OAuth client belonging to the same Firebase project is required.
const crypto=require('node:crypto');
const http=require('node:http');
const {URL}=require('node:url');
const CLIENT_RE=/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;
function clientConfigured(clientId){return typeof clientId==='string'&&CLIENT_RE.test(clientId);}
function pkce(){
 const verifier=crypto.randomBytes(64).toString('base64url');
 const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
 return {verifier,challenge,state:crypto.randomBytes(24).toString('base64url')};
}
function openGoogleOAuth({clientId,openExternal,timeoutMs=180000}){
 if(!clientConfigured(clientId))return Promise.reject(Error('Configura NAPOLI_GOOGLE_DESKTOP_CLIENT_ID con il client OAuth Desktop del progetto Firebase.'));
 if(typeof openExternal!=='function')return Promise.reject(Error('Browser di sistema non disponibile'));
 const {verifier,challenge,state}=pkce();
 return new Promise((resolve,reject)=>{
  let complete=false, timer, server, redirectUri;
  const settle=(error,result)=>{if(complete)return;complete=true;clearTimeout(timer);server?.close();error?reject(error):resolve(result);};
  server=http.createServer((req,res)=>{
   const reply=(code,body)=>{res.writeHead(code,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end('<!doctype html><html lang="it"><meta charset="utf-8"><title>NAPOLI CARTE 3D</title><body style="background:#082c59;color:#ffe7a5;font:18px Segoe UI,sans-serif;text-align:center;padding:50px"><h2>'+body+'</h2><p>Puoi chiudere questa scheda e tornare al gioco.</p></body></html>');};
   try{
    const u=new URL(req.url,'http://127.0.0.1');
    if(req.method!=='GET'||u.pathname!=='/oauth2callback'){reply(404,'Pagina non trovata');return;}
    if(u.searchParams.get('state')!==state){reply(403,'Controllo di sicurezza non riuscito');settle(Error('Stato OAuth non valido'));return;}
    const error=u.searchParams.get('error');
    if(error){reply(400,'Accesso annullato');settle(Error('Accesso Google non completato: '+error.slice(0,80)));return;}
    const code=u.searchParams.get('code');
    if(!code||code.length>4096){reply(400,'Codice non valido');settle(Error('Codice OAuth mancante'));return;}
    reply(200,'Accesso Google ricevuto');settle(null,{code,clientId,redirectUri,verifier});
   }catch{reply(400,'Richiesta non valida');settle(Error('Risposta OAuth non valida'));}
  });
  server.once('error',err=>settle(err));
  server.listen(0,'127.0.0.1',async()=>{
   const port=server.address().port;
   redirectUri='http://127.0.0.1:'+port+'/oauth2callback';
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
   for(const [k,v] of Object.entries({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256',access_type:'online',prompt:'select_account'}))url.searchParams.set(k,v);
   timer=setTimeout(()=>settle(Error('Accesso Google scaduto')),timeoutMs);
   timer.unref?.();
   try{await openExternal(url.toString());}catch(e){settle(e);}
  });
 });
}
module.exports={clientConfigured,pkce,openGoogleOAuth};
