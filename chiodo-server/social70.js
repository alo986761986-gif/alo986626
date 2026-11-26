'use strict';
// Napoli Carte 3D social layer. All public operations require a verified Firebase ID token.
const crypto=require('node:crypto');
let pool,ready;
const GAME_IDS=['scopa','scopone','briscola','setteemezzo','assopigliatutto','rubamazzetto','chiodo121'];
function error(status,message){const e=new Error(message);e.status=status;return e;}
function db(){if(!process.env.DATABASE_URL)throw error(503,'Database non configurato');if(!pool){const {Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:8000});pool.on('error',()=>{});}return pool;}
async function initialize(){if(!ready)ready=(async()=>{const p=db();await p.query(`CREATE TABLE IF NOT EXISTS nc_social_users (
 uid text PRIMARY KEY, nickname varchar(24) NOT NULL, nickname_key varchar(24) NOT NULL UNIQUE,
 searchable boolean NOT NULL DEFAULT true, show_online boolean NOT NULL DEFAULT true,
 heartbeat_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now())`);
await p.query(`CREATE TABLE IF NOT EXISTS nc_social_friends (
 requester text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
 recipient text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('pending','accepted')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(requester,recipient), CHECK(requester<>recipient))`);
await p.query(`CREATE TABLE IF NOT EXISTS nc_social_blocks (
 owner text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
 blocked text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
 PRIMARY KEY(owner,blocked), CHECK(owner<>blocked))`);
await p.query(`CREATE TABLE IF NOT EXISTS nc_social_stats (
 uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
 game text NOT NULL, played integer NOT NULL DEFAULT 0, wins integer NOT NULL DEFAULT 0,
 losses integer NOT NULL DEFAULT 0, draws integer NOT NULL DEFAULT 0,
 score bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(uid,game))`);
await p.query(`CREATE TABLE IF NOT EXISTS nc_social_progress (
 uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
 game text NOT NULL, saved_state jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(uid,game))`);})();
try{await ready;}catch(e){ready=null;throw e;}}
async function firebase(req){
 const token=(req.headers['x-firebase-token']||'').trim();
 if(!token||token.length>5000)throw error(401,'Accedi con email o Google');
 const key=process.env.FIREBASE_WEB_API_KEY;
 if(!key)throw error(503,'Verifica Firebase non configurata');
 const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(key),{
 method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw error(401,'Sessione scaduta: ripeti accesso');
 const data=await r.json(),u=data.users&&data.users[0];if(!u||!u.localId||u.disabled)throw error(401,'Account non valido');
 return u.localId;
}
function nick(value){const n=String(value||'').trim().normalize('NFKC');if(!/^[\p{L}\p{N}_. -]{3,24}$/u.test(n)||!/[\p{L}\p{N}]/u.test(n))throw error(400,'Nickname da 3 a 24 caratteri, senza simboli speciali');return n;}
function game(value){if(!GAME_IDS.includes(value))throw error(400,'Gioco non valido');return value;}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)throw error(413,'Dati troppo grandi');}try{return JSON.parse(raw||'{}');}catch(e){throw error(400,'JSON non valido');}}
async function account(p,uid){const q=await p.query('SELECT uid,nickname,searchable,show_online FROM nc_social_users WHERE uid=$1',[uid]);if(!q.rowCount)throw error(409,'Scegli prima il tuo nickname');return q.rows[0];}
async function route(req,send,path){
 try{
  if(!['GET','POST'].includes(req.method))return send(405,{error:'Metodo non valido'});
  const uid=await firebase(req);await initialize();const p=db();
  if(path==='/social/profile'&&req.method==='POST'){
   const a=await body(req),nickname=nick(a.nickname);
   try{const r=await p.query(`INSERT INTO nc_social_users(uid,nickname,nickname_key,searchable,show_online,heartbeat_at)
 VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(uid) DO UPDATE SET nickname=EXCLUDED.nickname,
 nickname_key=EXCLUDED.nickname_key,searchable=EXCLUDED.searchable,show_online=EXCLUDED.show_online,
 heartbeat_at=now(),updated_at=now() RETURNING nickname,searchable,show_online`,[uid,nickname,nickname.toLocaleLowerCase('und'),a.searchable!==false,a.showOnline!==false]);return send(200,r.rows[0]);}
   catch(e){if(e.code==='23505')throw error(409,'Nickname già occupato');throw e;}
  }
  if(path==='/social/me'&&req.method==='GET'){
   const a=await p.query('SELECT nickname,searchable,show_online FROM nc_social_users WHERE uid=$1',[uid]);
   return send(200,{registered:!!a.rowCount,profile:a.rows[0]||null,games:GAME_IDS});
  }
  await account(p,uid);
  if(path==='/social/heartbeat'&&req.method==='POST'){await p.query('UPDATE nc_social_users SET heartbeat_at=now() WHERE uid=$1',[uid]);return send(200,{ok:true});}
  if(path==='/social/search'&&req.method==='GET'){
   const query=String(new URL(req.url,'http://localhost').searchParams.get('q')||'').trim().normalize('NFKC');
   if(query.length<2||query.length>24)throw error(400,'Inserisci almeno 2 caratteri');
   const r=await p.query(`SELECT u.uid,u.nickname,
  (u.show_online AND u.heartbeat_at>now()-interval '90 seconds') AS online,
  EXISTS(SELECT 1 FROM nc_social_friends f WHERE f.status='accepted' AND
  ((f.requester=$1 AND f.recipient=u.uid) OR (f.recipient=$1 AND f.requester=u.uid))) AS friend
  FROM nc_social_users u WHERE u.uid<>$1 AND u.searchable=true AND u.nickname_key LIKE $2
  AND NOT EXISTS(SELECT 1 FROM nc_social_blocks b WHERE (b.owner=$1 AND b.blocked=u.uid) OR (b.owner=u.uid AND b.blocked=$1))
  ORDER BY CASE WHEN u.nickname_key=$3 THEN 0 ELSE 1 END,u.nickname_key LIMIT 30`,
 [uid,'%'+query.toLocaleLowerCase('und').replace(/[%_\\]/g,'\\$&')+'%',query.toLocaleLowerCase('und')]);
   return send(200,{users:r.rows});
  }
  if(path==='/social/friends'&&req.method==='GET'){
   const r=await p.query(`SELECT f.requester,f.recipient,f.status,u.nickname,
    (u.show_online AND u.heartbeat_at>now()-interval '90 seconds') AS online
   FROM nc_social_friends f JOIN nc_social_users u ON u.uid=CASE WHEN f.requester=$1 THEN f.recipient ELSE f.requester END
   WHERE f.requester=$1 OR f.recipient=$1 ORDER BY f.updated_at DESC LIMIT 250`,[uid]);
   return send(200,{friends:r.rows.map(x=>({uid:x.requester===uid?x.recipient:x.requester,nickname:x.nickname,status:x.status,direction:x.requester===uid?'sent':'received',online:x.online}))});
  }
  if(['/social/request','/social/accept','/social/remove','/social/block'].includes(path)&&req.method==='POST'){
   const a=await body(req),other=String(a.uid||'');if(other===uid||other.length>128||!other)throw error(400,'Utente non valido');
   const target=await p.query('SELECT uid FROM nc_social_users WHERE uid=$1',[other]);if(!target.rowCount)throw error(404,'Utente non trovato');
   if(path==='/social/block'){await p.query('INSERT INTO nc_social_blocks(owner,blocked) VALUES($1,$2) ON CONFLICT DO NOTHING',[uid,other]);await p.query('DELETE FROM nc_social_friends WHERE (requester=$1 AND recipient=$2) OR (requester=$2 AND recipient=$1)',[uid,other]);return send(200,{ok:true});}
   if(path==='/social/remove'){await p.query('DELETE FROM nc_social_friends WHERE (requester=$1 AND recipient=$2) OR (requester=$2 AND recipient=$1)',[uid,other]);return send(200,{ok:true});}
   const blocked=await p.query('SELECT 1 FROM nc_social_blocks WHERE (owner=$1 AND blocked=$2) OR (owner=$2 AND blocked=$1)',[uid,other]);if(blocked.rowCount)throw error(403,'Amicizia non disponibile');
   if(path==='/social/accept'){
    const r=await p.query("UPDATE nc_social_friends SET status='accepted',updated_at=now() WHERE requester=$1 AND recipient=$2 AND status='pending' RETURNING requester",[other,uid]);
    if(!r.rowCount)throw error(404,'Nessuna richiesta ricevuta');return send(200,{ok:true});
   }
   const n=await p.query('SELECT 1 FROM nc_social_friends WHERE (requester=$1 AND recipient=$2) OR (requester=$2 AND recipient=$1)',[uid,other]);if(n.rowCount)throw error(409,'Richiesta o amicizia già presente');
   const limit=await p.query('SELECT COUNT(*)::integer AS n FROM nc_social_friends WHERE requester=$1 AND status=\'pending\'',[uid]);if(limit.rows[0].n>=100)throw error(429,'Troppe richieste in sospeso');
   await p.query("INSERT INTO nc_social_friends(requester,recipient,status) VALUES($1,$2,'pending')",[uid,other]);
   // Notification delivery must never turn a successfully saved request into HTTP 500.
   Promise.resolve().then(async()=>{
    const sender=await p.query('SELECT nickname FROM nc_social_users WHERE uid=$1',[uid]);
    return require('./push82.js').notify(other,'friend_request',{senderUid:uid,senderNickname:sender.rows[0]?.nickname});
   }).catch(e=>console.warn('Friend push unavailable',e.message));
   return send(200,{ok:true});
  }
  if(path==='/social/stats'&&req.method==='GET'){
   const rows=await p.query('SELECT game,played,wins,losses,draws,score FROM nc_social_stats WHERE uid=$1',[uid]);
   return send(200,{games:GAME_IDS.map(g=>rows.rows.find(x=>x.game===g)||{game:g,played:0,wins:0,losses:0,draws:0,score:0}),verified:false, note:"Raccolta risultati certificati in attesa di collegamento ai motori partita"});
  }
  if(path==='/social/progress'&&req.method==='GET'){
   const r=await p.query('SELECT game,saved_state,updated_at FROM nc_social_progress WHERE uid=$1',[uid]);return send(200,{progress:r.rows});
  }
  if(path==='/social/progress'&&req.method==='POST'){
   const a=await body(req),g=game(a.game);if(!a.state||Array.isArray(a.state)||typeof a.state!=='object')throw error(400,'Salvataggio non valido');
   // Personal progress only, not authoritative win/loss totals or live multiplayer state.
   const encoded=JSON.stringify(a.state);if(encoded.length>8192)throw error(413,'Salvataggio troppo grande');
   const r=await p.query(`INSERT INTO nc_social_progress(uid,game,saved_state) VALUES($1,$2,$3)
     ON CONFLICT(uid,game) DO UPDATE SET saved_state=EXCLUDED.saved_state,updated_at=now() RETURNING updated_at`,[uid,g,encoded]);
   return send(200,{saved:true,updatedAt:r.rows[0].updated_at});
  }
  return send(404,{error:'Endpoint sconosciuto'});
 }catch(e){const status=e.status|| (e.code==='23505'?409:500);if(status===500)console.error('social error',e.message);return send(status,{error:status===500?'Servizio amici temporaneamente non disponibile':e.message});}
}
module.exports={route,GAME_IDS,nick,db,initialize,firebase};
