'use strict';
// Authenticated social table invites. No access is granted from a nickname alone.
const crypto=require('node:crypto');
const social=require('./social70.js');
const expansion=require('./expansion.js');
const push=require('./push82.js');
const TYPES=new Set(['join','watch','takeover']);
const AUDIENCES=new Set(['friends','friends_of_friends','everyone']);
const err=(code,message)=>Object.assign(new Error(message),{status:code});
let initPromise;
async function setup(){
 if(!initPromise)initPromise=(async()=>{
  await social.initialize();
  const p=social.db();
  await p.query(`CREATE TABLE IF NOT EXISTS nc94_invite_prefs(
    uid text PRIMARY KEY REFERENCES nc_social_users(uid) ON DELETE CASCADE,
    direct boolean NOT NULL DEFAULT true, second_degree boolean NOT NULL DEFAULT false,
    public_invites boolean NOT NULL DEFAULT false, allow_watch boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now())`);
  await p.query(`CREATE TABLE IF NOT EXISTS nc94_invites(
    id uuid PRIMARY KEY, sender text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,
    recipient text REFERENCES nc_social_users(uid) ON DELETE CASCADE,
    room_id text NOT NULL, game text NOT NULL, audience text NOT NULL,
    kind text NOT NULL, status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL, responded_at timestamptz,
    CHECK (audience IN ('friends','friends_of_friends','everyone')),
    CHECK (kind IN ('join','watch','takeover')),
    CHECK (status IN ('pending','accepted','declined','cancelled','used')))`);
  await p.query('CREATE INDEX IF NOT EXISTS nc94_invite_recipient ON nc94_invites(recipient,created_at DESC)');
  await p.query('CREATE INDEX IF NOT EXISTS nc94_invite_room ON nc94_invites(room_id,expires_at)');
 })();
 try{await initPromise;}catch(e){initPromise=null;throw e;}
}
async function body(req){
 let value='';for await(const chunk of req){value+=chunk;if(value.length>8192)throw err(413,'Richiesta troppo grande');}
 let a;try{a=JSON.parse(value||'{}');}catch(_){throw err(400,'JSON non valido');}
 if(!a||typeof a!=='object'||Array.isArray(a))throw err(400,'Richiesta non valida');
 return a;
}
async function mutual(p,a,b){
 const r=await p.query(`SELECT EXISTS(
 SELECT 1 FROM nc_social_friends f WHERE f.status='accepted'
 AND ((f.requester=$1 AND f.recipient=$2) OR (f.requester=$2 AND f.recipient=$1))
 ) AS yes`,[a,b]);return r.rows[0].yes===true;
}
async function secondDegree(p,a,b){
 const r=await p.query(`SELECT EXISTS(
 SELECT 1 FROM nc_social_friends x JOIN nc_social_friends y ON
 (CASE WHEN x.requester=$1 THEN x.recipient ELSE x.requester END)=
 (CASE WHEN y.requester=$2 THEN y.recipient ELSE y.requester END)
 WHERE x.status='accepted' AND y.status='accepted'
 AND (x.requester=$1 OR x.recipient=$1) AND (y.requester=$2 OR y.recipient=$2)
 ) AS yes`,[a,b]);return r.rows[0].yes===true;
}
async function blocked(p,a,b){
 const r=await p.query('SELECT 1 FROM nc_social_blocks WHERE (owner=$1 AND blocked=$2) OR (owner=$2 AND blocked=$1)',[a,b]);
 return r.rowCount>0;
}
async function ownPrefs(p,uid){
 await p.query('INSERT INTO nc94_invite_prefs(uid) VALUES($1) ON CONFLICT DO NOTHING',[uid]);
 const r=await p.query('SELECT direct,second_degree,public_invites,allow_watch FROM nc94_invite_prefs WHERE uid=$1',[uid]);
 return r.rows[0];
}
async function validateRecipient(p,uid,to,audience,kind){
 if(to===uid)throw err(400,'Non puoi invitare te stesso');
 const u=await p.query('SELECT uid,nickname FROM nc_social_users WHERE uid=$1',[to]);
 if(!u.rowCount)throw err(404,'Giocatore non trovato');
 if(await blocked(p,uid,to))throw err(403,'Utente bloccato');
 const prefs=await ownPrefs(p,to);
 if(kind==='watch'&&!prefs.allow_watch)throw err(403,'Il giocatore non accetta inviti come spettatore');
 if(audience==='friends'){
  if(!prefs.direct||!(await mutual(p,uid,to)))throw err(403,'Invita soltanto amici che accettano inviti');
 }else if(audience==='friends_of_friends'){
  if(!prefs.second_degree||!(await secondDegree(p,uid,to)))throw err(403,'Amici di amici non autorizzati');
 }else {
  if(!prefs.public_invites)throw err(403,'Il giocatore non ha attivato gli inviti pubblici');
 }
 return u.rows[0];
}
function context(token){
 const c=expansion.service.invitationContext(token);
 if(!c.owner)throw err(403,'Solo il creatore del tavolo può invitare');
 return c;
}
function validateKind(c,kind){
 if(!TYPES.has(kind))throw err(400,'Tipo di invito non valido');
 if(kind==='join'&&c.status!=='waiting')throw err(409,'Partita già iniziata: scegli spettatore o subentro');
 if(kind==='watch'&&c.status!=='playing')throw err(409,'Puoi invitare spettatori solo durante una partita');
 if(kind==='takeover'&&(c.status!=='playing'||c.vacantSeats<1))throw err(409,'Nessun posto liberato da un giocatore');
}
async function route(req,send,path){
 try{
  if(!['GET','POST'].includes(req.method))return send(405,{error:'Metodo non supportato'});
  const uid=await social.firebase(req);
  await setup(); const p=social.db();await social.initialize();
  const account=await p.query('SELECT nickname FROM nc_social_users WHERE uid=$1',[uid]);
  if(!account.rowCount)throw err(409,'Configura prima il nickname');
  if(path==='/invites94/preferences'){
   if(req.method==='GET')return send(200,{preferences:await ownPrefs(p,uid)});
   const a=await body(req);const fields=['direct','second_degree','public_invites','allow_watch'];
   if(fields.some(x=>typeof a[x]!=='boolean'))throw err(400,'Preferenze non valide');
   const r=await p.query(`INSERT INTO nc94_invite_prefs(uid,direct,second_degree,public_invites,allow_watch)
 VALUES($1,$2,$3,$4,$5) ON CONFLICT(uid) DO UPDATE SET direct=EXCLUDED.direct,
 second_degree=EXCLUDED.second_degree,public_invites=EXCLUDED.public_invites,
 allow_watch=EXCLUDED.allow_watch,updated_at=now()
 RETURNING direct,second_degree,public_invites,allow_watch`,[uid,...fields.map(x=>a[x])]);
   return send(200,{preferences:r.rows[0]});
  }
  if(path==='/invites94/list'&&req.method==='GET'){
   const r=await p.query(`SELECT i.id,i.game,i.kind,i.audience,i.status,i.room_id,
 i.expires_at,i.created_at,u.nickname sender_nickname
 FROM nc94_invites i JOIN nc_social_users u ON u.uid=i.sender
 WHERE i.recipient=$1 AND i.expires_at>now() AND i.status IN ('pending','accepted')
 AND NOT EXISTS(SELECT 1 FROM nc_social_blocks b WHERE (b.owner=$1 AND b.blocked=i.sender) OR (b.owner=i.sender AND b.blocked=$1))
 ORDER BY i.created_at DESC LIMIT 60`,[uid]);
   return send(200,{invites:r.rows});
  }
  if(path==='/invites94/friends-of-friends'&&req.method==='GET'){
   const prefs=await ownPrefs(p,uid); // People opt into discovery explicitly.
   const r=await p.query(`SELECT u.uid,u.nickname FROM nc_social_users u
 WHERE u.uid<>$1 AND u.searchable=true AND EXISTS(
 SELECT 1 FROM nc_social_friends x JOIN nc_social_friends y ON
 (CASE WHEN x.requester=$1 THEN x.recipient ELSE x.requester END)=
 (CASE WHEN y.requester=u.uid THEN y.recipient ELSE y.requester END)
 WHERE x.status='accepted' AND y.status='accepted'
 AND (x.requester=$1 OR x.recipient=$1)
 AND (y.requester=u.uid OR y.recipient=u.uid))
 AND NOT EXISTS(SELECT 1 FROM nc_social_blocks b WHERE (b.owner=$1 AND b.blocked=u.uid) OR (b.owner=u.uid AND b.blocked=$1))
 AND EXISTS(SELECT 1 FROM nc94_invite_prefs pr WHERE pr.uid=u.uid AND pr.second_degree=true)
 ORDER BY u.nickname LIMIT 40`,[uid]);
   return send(200,{users:r.rows});
  }
  if(path==='/invites94/publish'&&req.method==='POST'){
   const a=await body(req),c=context(String(a.tableToken||''));
   if(c.status!=='waiting'||c.private)throw err(409,'Solo tavoli pubblici in attesa possono essere pubblicati');
   const recent=await p.query(`SELECT COUNT(*)::integer n FROM nc94_invites WHERE sender=$1
 AND audience='everyone' AND created_at>now()-interval '1 hour'`,[uid]);
   if(recent.rows[0].n>=5)throw err(429,'Limite di pubblicazione dei tavoli raggiunto');
   const published=await p.query(`SELECT 1 FROM nc94_invites WHERE sender=$1 AND room_id=$2
 AND audience='everyone' AND status='pending' AND expires_at>now()`,[uid,c.roomId]);
   if(published.rowCount)return send(200,{ok:true,roomId:c.roomId});
   await p.query(`INSERT INTO nc94_invites(id,sender,room_id,game,audience,kind,expires_at)
 VALUES($1,$2,$3,$4,'everyone','join',now()+interval '3 minutes')`,
 [crypto.randomUUID(),uid,c.roomId,c.game]);
   return send(200,{ok:true,roomId:c.roomId});
  }
  if(path==='/invites94/browse'&&req.method==='GET'){
   const r=await p.query(`SELECT DISTINCT ON(i.room_id) i.id,i.room_id,i.game,u.nickname AS host
 FROM nc94_invites i JOIN nc_social_users u ON u.uid=i.sender
 WHERE i.recipient IS NULL AND i.audience='everyone' AND i.kind='join'
 AND i.status='pending' AND i.expires_at>now() AND i.sender<>$1
 AND NOT EXISTS(SELECT 1 FROM nc_social_blocks b WHERE (b.owner=$1 AND b.blocked=i.sender) OR (b.owner=i.sender AND b.blocked=$1))
 ORDER BY i.room_id,i.created_at DESC LIMIT 40`,[uid]);
   return send(200,{rooms:r.rows.filter(x=>{try{const c=expansion.service.publicRoom(x.room_id);return c.status==='waiting'&&!c.private;}catch(_){return false;}})});
  }
  if(path==='/invites94/send'&&req.method==='POST'){
   const a=await body(req),c=context(String(a.tableToken||'')),kind=String(a.kind||''),audience=String(a.audience||''),to=String(a.recipientUid||'');
   validateKind(c,kind);
   if(!AUDIENCES.has(audience)||!to||to.length>128)throw err(400,'Destinatario non valido');
   const target=await validateRecipient(p,uid,to,audience,kind);
   const recent=await p.query(`SELECT COUNT(*)::integer n FROM nc94_invites
 WHERE sender=$1 AND created_at>now()-interval '1 hour'`,[uid]);
   if(recent.rows[0].n>=30)throw err(429,'Limite di 30 inviti ogni ora');
   const duplicate=await p.query(`SELECT 1 FROM nc94_invites WHERE sender=$1 AND recipient=$2
 AND room_id=$3 AND kind=$4 AND status='pending' AND expires_at>now()`,[uid,to,c.roomId,kind]);
   if(duplicate.rowCount)throw err(409,'Invito già inviato');
   const id=crypto.randomUUID();
   await p.query(`INSERT INTO nc94_invites(id,sender,recipient,room_id,game,audience,kind,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '10 minutes')`,[id,uid,to,c.roomId,c.game,audience,kind]);
   Promise.resolve().then(()=>push.notify(to,'game_invite',{senderUid:uid,senderNickname:account.rows[0].nickname,game:c.game,inviteId:id})).catch(()=>{});
   return send(200,{ok:true,id,expiresInSeconds:600,recipientNickname:target.nickname});
  }
  if(path==='/invites94/respond'&&req.method==='POST'){
   const a=await body(req);
   if(!/^[0-9a-f-]{36}$/i.test(String(a.id||''))||typeof a.accept!=='boolean')throw err(400,'Invito non valido');
   const r=await p.query(`SELECT * FROM nc94_invites WHERE id=$1 AND recipient=$2 AND status IN ('pending','accepted') AND expires_at>now()`,[a.id,uid]);
   if(!r.rowCount)throw err(404,'Invito scaduto');
   const inv=r.rows[0];
   if(await blocked(p,uid,inv.sender))throw err(403,'Giocatore bloccato');
   if(!a.accept){
    await p.query("UPDATE nc94_invites SET status='declined',responded_at=now() WHERE id=$1 AND recipient=$2",[a.id,uid]);
    return send(200,{ok:true,status:'declined'});
   }
   const c=expansion.service.publicRoom(inv.room_id);
   if(inv.kind==='join'&&c.status!=='waiting'||inv.kind!=='join'&&c.status!=='playing')throw err(409,'Il tavolo non è più disponibile');
   if(inv.kind==='takeover'&&c.vacantSeats<1)throw err(409,'Posto non più disponibile');
   await p.query(`UPDATE nc94_invites SET status='accepted',responded_at=now(),
     expires_at=CASE WHEN kind='watch' THEN now()+interval '30 minutes' ELSE expires_at END
     WHERE id=$1 AND recipient=$2`,[a.id,uid]);
   return send(200,{ok:true,status:'accepted',kind:inv.kind,id:inv.id,game:inv.game});
  }
  if(path==='/invites94/enter'&&req.method==='POST'){
   const a=await body(req);
   const r=await p.query(`SELECT * FROM nc94_invites WHERE id=$1 AND recipient=$2 AND status='accepted' AND expires_at>now()`,[String(a.id||''),uid]);
   if(!r.rowCount)throw err(403,'Accetta prima un invito valido');
   const inv=r.rows[0];
   if(await blocked(p,uid,inv.sender))throw err(403,'Giocatore bloccato');
   const c=expansion.service.publicRoom(inv.room_id);
   if(inv.kind==='join'){
    if(c.status!=='waiting')throw err(409,'Partita già iniziata');
    if(c.private){
     // Only an approved recipient can retrieve the private join code.
     const active=await p.query('SELECT status FROM nc94_invites WHERE id=$1',[inv.id]);
     if(active.rows[0].status!=='accepted')throw err(403,'Invito non autorizzato');
     // Code is scoped to room and cannot be obtained from public listings.
     const live=expansion.service.invitationCodeForRoom(inv.room_id);
     return send(200,{kind:'join',game:inv.game,code:live});
    }
    return send(200,{kind:'join',game:inv.game,roomId:inv.room_id});
   }
   if(inv.kind==='watch')return send(200,{kind:'watch',state:expansion.service.spectatorView(inv.room_id)});
   if(inv.kind==='takeover'){
    const used=await p.query(`UPDATE nc94_invites SET status='used' WHERE id=$1
      AND recipient=$2 AND status='accepted' AND expires_at>now() RETURNING id`,[inv.id,uid]);
    if(!used.rowCount)throw err(409,'Invito di subentro già utilizzato');
    let taken;
    try{taken=expansion.service.takeover(inv.room_id,account.rows[0].nickname);}
    catch(e){
      await p.query("UPDATE nc94_invites SET status='accepted' WHERE id=$1 AND status='used'",[inv.id]);
      throw e;
    }
    return send(200,{kind:'takeover',game:inv.game,joined:taken});
   }
  }
  if(path==='/invites94/watch'&&req.method==='GET'){
   const id=new URL(req.url,'http://localhost').searchParams.get('id');
   const r=await p.query(`SELECT * FROM nc94_invites WHERE id=$1 AND recipient=$2 AND kind='watch' AND status='accepted' AND expires_at>now()`,[id,uid]);
   if(!r.rowCount)throw err(403,'Accesso spettatore non autorizzato');
   if(await blocked(p,uid,r.rows[0].sender))throw err(403,'Giocatore bloccato');
   return send(200,{state:expansion.service.spectatorView(r.rows[0].room_id)});
  }
  return send(404,{error:'Funzione inviti non disponibile'});
 }catch(e){if(!e.status)console.error('Invites94 error:',e.message);
  return send(e.status||503,{error:e.status?e.message:'Servizio inviti temporaneamente non disponibile'});}
}
module.exports={route,setup,mutual,secondDegree};
