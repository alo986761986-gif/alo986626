'use strict';
// Google Play one-time consumables. No entitlement is granted without a verified
// Google Play purchase AND an authenticated Firebase user. No test purchases are made here.
const crypto=require('node:crypto');
const PACKAGE='it.napolicarte.game';
const PRODUCTS=Object.freeze({
  coins_1000:1000,
  coins_2200:2200,
  coins_6000:6000,
  coins_13000:13000,
  coins_28000:28000,
  coins_75000:75000
});
const PER_MINUTE=15, attempts=new Map();
let tableReady=null,oauth=null;
class PurchaseError extends Error {constructor(code,message){super(message);this.code=code;}}
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const obfuscate=uid=>digest('NAPOLI_CARTE_3D:'+uid);
function configured(){return !!(process.env.PLAY_BILLING_ENABLED==='true'&&process.env.DATABASE_URL&&process.env.FIREBASE_WEB_API_KEY&&process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);}
function validate(v2,productId,uid){
  if(!v2||v2.purchaseStateContext?.purchaseState!=='PURCHASED')throw new PurchaseError(409,'Pagamento non completato');
  const lines=v2.productLineItem;
  if(!Array.isArray(lines)||lines.length!==1||lines[0]?.productId!==productId)throw new PurchaseError(403,'Prodotto non corrispondente');
  const q=Number(lines[0].productOfferDetails?.quantity||1);
  if(!Number.isSafeInteger(q)||q!==1)throw new PurchaseError(409,'Quantita multipla non abilitata');
  if(v2.obfuscatedExternalAccountId!==obfuscate(uid))throw new PurchaseError(403,'Account di acquisto non corrispondente');
  if(lines[0].productOfferDetails?.refundableQuantity===0)throw new PurchaseError(409,'Acquisto rimborsato');
  const state=lines[0].productOfferDetails?.consumptionState;
  if(!['CONSUMPTION_STATE_YET_TO_BE_CONSUMED','CONSUMPTION_STATE_CONSUMED'].includes(state))
    throw new PurchaseError(409,'Stato del consumo non valido');
  return {alreadyConsumed:state==='CONSUMPTION_STATE_CONSUMED'};
}
async function database(){
  const d=await require('./admob-ssv.js').db();
  if(!tableReady)tableReady=d.query(
    "CREATE TABLE IF NOT EXISTS nc_play_purchases (token_hash varchar(64) PRIMARY KEY, firebase_uid text NOT NULL, product_id text NOT NULL, credits integer NOT NULL CHECK(credits>0), order_id text, consumed_at timestamptz, received_at timestamptz NOT NULL DEFAULT now())"
  ).catch(e=>{tableReady=null;throw e;});
  await tableReady;return d;
}
async function accessToken(){
 if(oauth&&oauth.expires>Date.now()+60000)return oauth.token;
 let key;try{key=JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON||'');}catch(e){throw new PurchaseError(503,'Credenziali Play non configurate');}
 if(!key.client_email||!key.private_key||key.token_uri!=='https://oauth2.googleapis.com/token')throw new PurchaseError(503,'Account di servizio Play non valido');
 const now=Math.floor(Date.now()/1000);
 const head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
 const body=Buffer.from(JSON.stringify({iss:key.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:key.token_uri,iat:now,exp:now+3300})).toString('base64url');
 const sign=crypto.sign('RSA-SHA256',Buffer.from(head+'.'+body),key.private_key).toString('base64url');
 const r=await fetch(key.token_uri,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+body+'.'+sign}).toString(),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new PurchaseError(503,'Autorizzazione Play non disponibile');
 const j=await r.json();if(!j.access_token)throw new PurchaseError(503,'Token Play assente');
 oauth={token:j.access_token,expires:Date.now()+Math.min(3000,Number(j.expires_in)||3000)*1000};return oauth.token;
}
async function google(method,path){
 const r=await fetch('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PACKAGE+path,{
  method,headers:{Authorization:'Bearer '+await accessToken(),Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new PurchaseError(r.status===404?409:503,'Google Play non ha confermato il pagamento ('+r.status+')');
 return method==='GET'?r.json():null;
}
const pack=uid=>({uid});
function rateLimit(uid){
 const now=Date.now(),a=(attempts.get(uid)||[]).filter(t=>now-t<60000);
 if(a.length>=PER_MINUTE)throw new PurchaseError(429,'Troppi tentativi; riprova fra un minuto');
 a.push(now);attempts.set(uid,a);if(attempts.size>2000)for(const [k,v] of attempts)if(v.at(-1)<now-60000)attempts.delete(k);
}
async function firebase(req){
 const uid=await require('./admob-ssv.js').firebaseUser(req);
 if(!uid)throw new PurchaseError(401,'Accesso Firebase richiesto');
 return uid;
}
async function status(req,send){
 if(req.method!=='GET')return send(405,{error:'Metodo non valido'});
 let ready=false;
 if(configured())try{const d=await database();await d.query('SELECT 1');ready=true;}catch(e){}
 return send(200,{ready,products:Object.keys(PRODUCTS),accountRequired:true,consumable:true});
}
async function credits(req,send){
 if(req.method!=='GET')return send(405,{error:'Metodo non valido'});
 try{
  const uid=await firebase(req),d=await database();
  const r=await d.query('SELECT token_hash AS transaction_id,product_id,credits AS amount FROM nc_play_purchases WHERE firebase_uid=$1 ORDER BY received_at,token_hash',[uid]);
  return send(200,{purchases:r.rows});
 }catch(e){return send(e.code||503,{error:e.code===401?e.message:'Crediti Play non disponibili'});}
}
async function verify(req,send,payload){
 if(req.method!=='POST')return send(405,{error:'Metodo non valido'});
 try{
  const uid=await firebase(req);
  if(!configured())throw new PurchaseError(503,'Pagamento Play in preparazione');
  const productId=payload?.productId,token=payload?.purchaseToken;
  if(!Object.hasOwn(PRODUCTS,productId)||typeof token!=='string'||token.length<16||token.length>4096||!/^[A-Za-z0-9._~-]+$/.test(token))throw new PurchaseError(400,'Dati acquisto non validi');
  rateLimit(uid);
  const d=await database(),hash=digest(token);
  const find=()=>d.query('SELECT firebase_uid,product_id,credits,consumed_at FROM nc_play_purchases WHERE token_hash=$1',[hash]);
  let old=(await find()).rows[0];
  if(old&&(old.firebase_uid!==uid||old.product_id!==productId))throw new PurchaseError(403,'Acquisto gia associato a un altro account');
  if(!old){
   const v2=await google('GET','/purchases/productsv2/tokens/'+encodeURIComponent(token));
   const check=validate(v2,productId,uid);
   if(check.alreadyConsumed)throw new PurchaseError(409,'Acquisto gia consumato fuori da questa sessione');
   await d.query('INSERT INTO nc_play_purchases(token_hash,firebase_uid,product_id,credits,order_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(token_hash) DO NOTHING',[hash,uid,productId,PRODUCTS[productId],typeof v2.orderId==='string'?v2.orderId.slice(0,256):null]);
   old=(await find()).rows[0];
   if(!old||old.firebase_uid!==uid||old.product_id!==productId)throw new PurchaseError(409,'Transazione duplicata');
  }
  // The backend grants credits once. Attempt to consume the Play product so it
  // is acknowledged and may be bought again. Native client also retries consume.
  let consumed=!!old.consumed_at;
  if(!consumed)try{
    await google('POST','/purchases/products/'+productId+'/tokens/'+encodeURIComponent(token)+':consume');
    consumed=true;
    await d.query('UPDATE nc_play_purchases SET consumed_at=now() WHERE token_hash=$1',[hash]);
  }catch(e){/* Android BillingClient consumes after confirmed grant; retry on resume */ }
  return send(200,{verified:true,transactionId:hash,productId,credits:PRODUCTS[productId],consumed});
 }catch(e){return send(e.code||503,{error:e.code?e.message:'Verifica Google Play non disponibile'});}
}
module.exports={PRODUCTS,PACKAGE,obfuscate,validate,configured,status,credits,verify};
