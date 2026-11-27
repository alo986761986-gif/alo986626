'use strict';
// Cumulative distinct installation + authenticated-account counter.
// Guests are pseudonymous installations, not provably unique physical people.
// Verified Firebase accounts are recorded once even across multiple devices.
const crypto=require('node:crypto');
const social=require('./social70.js');
const VALID_ID=/^[0-9a-f]{32}$/i;
let initialized=null;

function httpError(status,message){const e=new Error(message);e.status=status;return e;}
function hashId(value){return crypto.createHash('sha256').update(value,'utf8').digest('hex');}
async function setup(){
 if(!initialized)initialized=(async()=>{
  await social.initialize();
  const p=social.db();
  await p.query(`CREATE TABLE IF NOT EXISTS nc_audience_devices (
    visitor_hash char(64) PRIMARY KEY,
    registered_at timestamptz,
    first_seen timestamptz NOT NULL DEFAULT now(),
    last_seen timestamptz NOT NULL DEFAULT now()
   )`);
  await p.query(`CREATE TABLE IF NOT EXISTS nc_audience_accounts (
    uid text PRIMARY KEY,
    first_seen timestamptz NOT NULL DEFAULT now(),
    last_seen timestamptz NOT NULL DEFAULT now()
   )`);
 })();
 try{await initialized;}catch(e){initialized=null;throw e;}
}
async function summary(){
 const p=social.db();
 const q=await p.query(`SELECT
   (SELECT COUNT(*)::integer FROM (SELECT uid FROM nc_social_users UNION SELECT uid FROM nc_audience_accounts) AS distinct_accounts) AS registered,
   (SELECT COUNT(*)::integer FROM nc_audience_devices WHERE registered_at IS NULL) AS guests`);
 const registered=Number(q.rows[0].registered),guests=Number(q.rows[0].guests);
 return {registered,guests,total:registered+guests,kind:'cumulative_observed',updatedAt:new Date().toISOString()};
}
async function readJson(req){
 const chunks=[];let length=0;
 for await(const chunk of req){
  length+=Buffer.byteLength(chunk);
  if(length>1024)throw httpError(413,'Dati troppo grandi');
  chunks.push(chunk);
 }
 try{
  const data=JSON.parse(Buffer.concat(chunks.map(x=>Buffer.from(x))).toString('utf8')||'{}');
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid');
  return data;
 }catch(e){throw httpError(400,'Dati non validi');}
}
async function route(req,send,path){
 try{
  if(path==='/audience/summary'){
   if(req.method!=='GET')throw httpError(405,'Metodo non consentito');
   await setup();
   return send(200,await summary());
  }
  if(path!=='/audience/visit')return send(404,{error:'Endpoint sconosciuto'});
  if(req.method!=='POST')throw httpError(405,'Metodo non consentito');
  const payload=await readJson(req);
  if(typeof payload.visitorId!=='string'||!VALID_ID.test(payload.visitorId)){
   throw httpError(400,'Identificatore installazione non valido');
  }
  const token=req.headers['x-firebase-token'];
  if(token && typeof token!=='string')throw httpError(401,'Token non valido');
  // The UID is NEVER accepted from the request body: Firebase verifies it server-side.
  const uid=token?await social.firebase(req):null;
  await setup();
  const p=social.db(),visitorHash=hashId(payload.visitorId.toLowerCase());
  await p.query(`INSERT INTO nc_audience_devices(visitor_hash,registered_at)
    VALUES($1,CASE WHEN $2::boolean THEN now() ELSE NULL END)
    ON CONFLICT(visitor_hash) DO UPDATE SET
      registered_at=COALESCE(nc_audience_devices.registered_at,EXCLUDED.registered_at),
      last_seen=now()`,[visitorHash,!!uid]);
  if(uid){
   await p.query(`INSERT INTO nc_audience_accounts(uid) VALUES($1)
     ON CONFLICT(uid) DO UPDATE SET last_seen=now()`,[uid]);
  }
  return send(200,await summary());
 }catch(e){
  const status=Number.isInteger(e.status)&&e.status>=400&&e.status<600?e.status:503;
  if(status===503)console.warn('Audience counter unavailable:',String(e.message||e).slice(0,120));
  return send(status,{error:status>=500?'Contatore temporaneamente non disponibile':e.message});
 }
}
module.exports={route};
