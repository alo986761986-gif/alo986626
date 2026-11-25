'use strict';
const crypto=require('node:crypto');
let cache=new Map(), expires=0, pool, init;
async function db(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL missing');
 if(!pool){const {Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5000});pool.on('error',()=>{});}
 if(!init)init=pool.query("CREATE TABLE IF NOT EXISTS nc_admob_rewards (transaction_id text PRIMARY KEY, firebase_uid text NOT NULL, amount integer NOT NULL CHECK(amount=350), received_at timestamptz NOT NULL DEFAULT now())").catch(e=>{init=null;throw e;});
 await init;return pool;
}
async function firebaseUser(req){
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!token||token.length>8192)return null;
 const url='https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(process.env.FIREBASE_WEB_API_KEY||'');
 if(!process.env.FIREBASE_WEB_API_KEY)throw Error('Firebase configuration missing');
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)return null;
 const j=await r.json();return j.users?.[0]?.localId||null;
}
async function rewards(req,send){
 if(req.method!=='GET')return send(405,{error:'method'});
 try{const uid=await firebaseUser(req);if(!uid)return send(401,{error:'Authentication required'});const d=await db();const q=await d.query('SELECT transaction_id,amount FROM nc_admob_rewards WHERE firebase_uid=$1 ORDER BY received_at,transaction_id',[uid]);return send(200,{rewards:q.rows});}catch(e){return send(503,{error:'Rewards unavailable'});}
}
async function health(send){try{const d=await db();await d.query('SELECT 1');return send(200,{database:true,identityConfigured:!!process.env.FIREBASE_WEB_API_KEY,ready:!!process.env.FIREBASE_WEB_API_KEY});}catch(e){return send(503,{database:false,ready:false});}}
async function keys(force=false){
 if(!force&&Date.now()<expires&&cache.size)return cache;
 const res=await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(8000)});
 if(!res.ok)throw Error('key service unavailable');
 const body=await res.json(), next=new Map();
 for(const k of body.keys||[])next.set(String(k.keyId),crypto.createPublicKey(k.pem));
 if(!next.size)throw Error('no keys');
 cache=next;expires=Date.now()+3600000;return cache;
}
async function verify(raw){
 const m=/^(.+)&signature=([A-Za-z0-9_%=-]+)&key_id=([0-9]+)$/.exec(raw);
 if(!m||raw.length>8192)return null;
 const p=new URLSearchParams(raw), seen=new Set();
 for(const [k] of p){if(seen.has(k))return null;seen.add(k);}
 let signature;try{signature=decodeURIComponent(m[2]);}catch(e){return null;}
 if(!/^[A-Za-z0-9_-]+={0,2}$/.test(signature))return null;
 let key=(await keys()).get(m[3]);if(!key)key=(await keys(true)).get(m[3]);if(!key)return null;
 const sig=Buffer.from(signature,'base64url');
 if(!crypto.verify('sha256',Buffer.from(m[1],'utf8'),key,sig)){
  // Google/Tink uses URI.getQuery(): percent-decoded UTF-8, in the original order.
  // Keep raw-signature compatibility, but never reinterpret encoded delimiters,
  // form-style pluses or percent escapes a second time in the decoded fallback.
  const decoded=[];
  for(const part of m[1].split('&')){
   const i=part.indexOf('='), name=part.slice(0,i);
   if(i<1||!/^[a-z_]+$/.test(name))return null;
   let value;try{value=decodeURIComponent(part.slice(i+1));}catch(e){return null;}
   if(/[&=%+]/.test(value))return null;
   decoded.push(name+'='+value);
  }
  if(!crypto.verify('sha256',Buffer.from(decoded.join('&'),'utf8'),key,sig))return null;
 }
 return p;
}
async function callback(req,send){
 if(req.method!=='GET')return send(405,{error:'method'});
 const raw=req.url.split('?').slice(1).join('?');
 if(!raw)return send(400,{error:'Signed callback required'});
 let p;try{p=await verify(raw);}catch(e){return send(503,{error:'Verification unavailable'});}
 if(!p)return send(403,{error:'Invalid signature'});
 const consoleTest=p.get('user_id')==='nc_admob_ssv_verification_20261125'&&p.get('custom_data')==='nc_admob_console_verify_v1';
 const syntheticProbe=consoleTest&&p.get('ad_unit')==='1234567890'&&p.get('transaction_id')==='123456789';
 if((!['3818748399','ca-app-pub-3210480040948197/3818748399'].includes(p.get('ad_unit'))&&!syntheticProbe)||p.get('reward_amount')!=='350'||!p.get('transaction_id'))return send(400,{error:'Unexpected reward'});
 const uid=p.get('user_id'), tx=p.get('transaction_id');
 if(!uid||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||tx.length>256)return send(400,{error:'Missing account or invalid transaction'});
 // The signed AdMob console verification must not create a reward ledger entry.
 if(consoleTest)return send(200,{ok:true,test:true,credited:false});
 try{const d=await db();await d.query('INSERT INTO nc_admob_rewards(transaction_id,firebase_uid,amount) VALUES($1,$2,350) ON CONFLICT(transaction_id) DO NOTHING',[tx,uid]);return send(200,{ok:true});}catch(e){return send(503,{error:'Reward storage unavailable'});}
}
module.exports={callback,verify,rewards,health};
