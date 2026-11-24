'use strict';
const crypto=require('node:crypto');
let cache=new Map(), expires=0;
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
 let key=(await keys()).get(m[3]);if(!key)key=(await keys(true)).get(m[3]);if(!key)return null;
 const sig=Buffer.from(decodeURIComponent(m[2]),'base64url');
 if(!crypto.verify('sha256',Buffer.from(decodeURIComponent(m[1]),'utf8'),key,sig))return null;
 return p;
}
async function callback(req,send){
 if(req.method!=='GET')return send(405,{error:'method'});
 const raw=req.url.split('?').slice(1).join('?');
 if(!raw)return send(503,{ready:false,reason:'Persistent reward ledger not connected'});
 let p;try{p=await verify(raw);}catch(e){return send(503,{error:'Verification unavailable'});}
 if(!p)return send(403,{error:'Invalid signature'});
 if(!['3818748399','ca-app-pub-3210480040948197/3818748399'].includes(p.get('ad_unit'))||p.get('reward_amount')!=='350'||!p.get('transaction_id'))return send(400,{error:'Unexpected reward'});
 // Fail closed: no success acknowledgement until a durable, authenticated ledger exists.
 return send(503,{error:'Reward ledger not connected'});
}
module.exports={callback,verify};
