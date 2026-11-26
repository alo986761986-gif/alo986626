'use strict';
// Private per-account FCM push delivery. Tokens and credentials never enter the WebView.
const social=require('./social70.js');
let initialized=null, messagingInstance;
let lastConfigurationWarning=0;
const VALID_TYPES=new Set(['friend_request','chat_message','daily_bonus']);
function messaging(){
 if(messagingInstance)return messagingInstance;
 if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON){
  if(Date.now()-lastConfigurationWarning>3600000){console.warn('FCM not configured: FIREBASE_SERVICE_ACCOUNT_JSON missing');lastConfigurationWarning=Date.now();}
  return null;
 }
 const admin=require('firebase-admin');
 if(!admin.apps.length){
  const service=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({credential:admin.credential.cert(service)});
 }
 messagingInstance=admin.messaging();return messagingInstance;
}
async function setup(){
 if(!initialized)initialized=(async()=>{
  await social.initialize();
  const db=social.db();
  await db.query("CREATE TABLE IF NOT EXISTS nc_push_devices (token text PRIMARY KEY,uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,updated_at timestamptz NOT NULL DEFAULT now())");
  await db.query("CREATE INDEX IF NOT EXISTS nc_push_devices_uid ON nc_push_devices(uid)");
  await db.query("CREATE TABLE IF NOT EXISTS nc_push_daily_sent (uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,day date NOT NULL,PRIMARY KEY(uid,day))");
 })();
 try{await initialized;}catch(e){initialized=null;throw e;}
}
async function route(req,send,path){
 try{
  if(path==='/push/health'&&req.method==='GET')return send(200,{ok:true,deliveryConfigured:!!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,databaseConfigured:!!process.env.DATABASE_URL});
  if(!['/push/register','/push/unregister','/push/status'].includes(path))return send(404,{error:'Endpoint sconosciuto'});
  if(req.method!==(path==='/push/status'?'GET':'POST'))return send(405,{error:'Metodo non consentito'});
  const uid=await social.firebase(req);
  await setup();
  if(path==='/push/status'){
   const deviceCount=await social.db().query('SELECT COUNT(*)::integer AS total FROM nc_push_devices WHERE uid=$1',[uid]);
   return send(200,{ok:true,devices:deviceCount.rows[0].total,deliveryConfigured:!!process.env.FIREBASE_SERVICE_ACCOUNT_JSON});
  }
  let raw='';
  for await(const chunk of req){raw+=chunk;if(raw.length>4096)return send(413,{error:'Dati troppo grandi'});}
  const data=JSON.parse(raw||'{}'),token=data.token;
  if(typeof token!=='string'||token.length<40||token.length>2048||!/^[a-zA-Z0-9:_-]+$/.test(token))return send(400,{error:'Token dispositivo non valido'});
  const db=social.db();
  if(path==='/push/unregister'){
   await db.query('DELETE FROM nc_push_devices WHERE uid=$1 AND token=$2',[uid,token]);
  }else{
   const u=await db.query('SELECT uid FROM nc_social_users WHERE uid=$1',[uid]);
   if(!u.rowCount)return send(409,{error:'Configura prima il nickname'});
   await db.query("INSERT INTO nc_push_devices(token,uid) VALUES($1,$2) ON CONFLICT(token) DO UPDATE SET uid=EXCLUDED.uid,updated_at=now()",[token,uid]);
  }
  return send(200,{ok:true});
 }catch(e){console.error('push registration:',e.message);return send(e.status||503,{error:e.status===401?e.message:'Notifiche temporaneamente non disponibili'});}
}
async function notify(uid,type,details={}){
 if(!VALID_TYPES.has(type)||!uid||!messaging())return false;
 try{
  await setup();
  const db=social.db();
  const rows=(await db.query('SELECT token FROM nc_push_devices WHERE uid=$1 ORDER BY updated_at DESC LIMIT 500',[uid])).rows;
  if(!rows.length)return false;
  const tokens=rows.map(x=>x.token);
  // Target UID ensures old-device tokens cannot display data for a different account.
  const data={type,recipientUid:String(uid)};
  if((type==='chat_message'||type==='friend_request')&&details.senderUid)data.senderUid=String(details.senderUid).slice(0,128);
  if(details.senderNickname)data.senderNickname=String(details.senderNickname).slice(0,24);
  // Data-only messages let the Android service control channel, privacy and deeplink.
  const out=await messaging().sendEachForMulticast({tokens,data,android:{priority:type==='daily_bonus'?'normal':'high'}});
  const expired=[];
  out.responses.forEach((r,i)=>{
   if(!r.success&&['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code))expired.push(tokens[i]);
  });
  if(expired.length)await db.query('DELETE FROM nc_push_devices WHERE token = ANY($1::text[])',[expired]);
  return out.successCount>0;
 }catch(e){console.error('FCM delivery:',e.message);return false;}
}
let dailyRunning=false;
async function dailyTick(){
 if(dailyRunning||!messaging()||!process.env.DATABASE_URL)return;
 const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',hourCycle:'h23'}).format(new Date());
 if(Number(local)<10)return;
 dailyRunning=true;
 try{
  await setup();await require('./daily71.js').setup();const db=social.db();
  // Daily rewards follow the backend's UTC day, not the handset's editable clock.
  const today=new Date().toISOString().slice(0,10);
  const users=(await db.query(
   "SELECT DISTINCT d.uid FROM nc_push_devices d WHERE NOT EXISTS (SELECT 1 FROM nc_daily_rewards r WHERE r.uid=d.uid AND r.claim_date=$1::date) AND NOT EXISTS (SELECT 1 FROM nc_push_daily_sent s WHERE s.uid=d.uid AND s.day=$1::date) LIMIT 1000",[today])).rows;
  for(const {uid} of users){
   const claim=await db.query("INSERT INTO nc_push_daily_sent(uid,day) VALUES($1,$2::date) ON CONFLICT DO NOTHING RETURNING uid",[uid,today]);
   if(!claim.rowCount)continue;
   if(!await notify(uid,'daily_bonus'))await db.query('DELETE FROM nc_push_daily_sent WHERE uid=$1 AND day=$2::date',[uid,today]);
  }
 }catch(e){console.error('Daily push:',e.message);}
 finally{dailyRunning=false;}
}
async function checkFirebaseCredentials(){
 const json=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!json){console.warn('FCM validation: credentials missing');return false;}
 try{
  const account=JSON.parse(json);
  if(account.project_id!=='napoli-carte-3d'){
   console.warn('FCM validation: wrong Firebase project');
   return false;
  }
  const sender=messaging();
  if(!sender)throw new Error('FCM unavailable');
  const admin=require('firebase-admin');
  const credential=admin.app().options.credential;
  const token=await credential.getAccessToken();
  if(!token||typeof token.access_token!=='string'||!token.access_token)throw new Error('Invalid auth token');
  console.info('FCM validation: Firebase Admin authenticated for napoli-carte-3d');
  return true;
 }catch(_){
  // Do not log credentials, private key material, access tokens, or raw provider responses.
  console.warn('FCM validation: service-account authentication failed');
  return false;
 }
}
function startDailySchedule(){
 const t=setInterval(()=>{dailyTick().catch(()=>{});},15*60*1000);
 t.unref?.();
 dailyTick().catch(()=>{});
 checkFirebaseCredentials().catch(()=>{});
}
module.exports={route,notify,startDailySchedule,dailyTick,setup};