'use strict';
// Private friendship-only messages. The server verifies Firebase identity for every request.
const social=require('./social70.js');
const MAX_AUDIO_BYTES=262144,MAX_TEXT_CHARS=2000,MAX_SECONDS=60;
const AUDIO_TYPES=new Set(['audio/webm','audio/ogg','audio/mp4','audio/aac']);
let initialized=null;
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
async function setup(){
 if(!initialized)initialized=(async()=>{
  await social.initialize();
  const db=social.db();
  await db.query("CREATE TABLE IF NOT EXISTS nc_chat_messages (id bigserial PRIMARY KEY,sender text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,recipient text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,kind varchar(8) NOT NULL CHECK(kind IN ('text','voice')),body text,audio bytea,audio_mime varchar(32),duration integer,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz,CHECK(sender<>recipient))");
  await db.query("CREATE INDEX IF NOT EXISTS nc_chat_pair_idx ON nc_chat_messages(sender,recipient,id DESC)");
  await db.query("CREATE INDEX IF NOT EXISTS nc_chat_inbox_idx ON nc_chat_messages(recipient,sender,read_at,id DESC)");
 })();
 try{await initialized}catch(e){initialized=null;throw e;}
}
function peerId(value,uid){const peer=String(value||'').trim();if(!peer||peer.length>128||peer===uid)fail(400,'Giocatore non valido');return peer;}
function cursor(value){if(value===undefined||value===null||value==='')return null;value=String(value);if(!/^[1-9][0-9]{0,14}$/.test(value)||!Number.isSafeInteger(Number(value)))fail(400,'Messaggio non valido');return value;}
function textMessage(value){const message=String(value??'').trim();if(!message||[...message].length>MAX_TEXT_CHARS)fail(400,'Messaggio da 1 a 2000 caratteri');return message;}
function parseAudio(data,mime,duration){
 if(typeof data!=='string'||!data||data.length>Math.ceil(MAX_AUDIO_BYTES*4/3)+10||!(/^[A-Za-z0-9+/]+={0,2}$/.test(data)))fail(413,'Vocale troppo grande');
 const bytes=Buffer.from(data,'base64');
 if(bytes.length>MAX_AUDIO_BYTES)fail(413,'Vocale troppo grande');
 if(bytes.length<100||bytes.toString('base64')!==data)fail(400,'Registrazione non valida');
 const type=String(mime||'').toLowerCase().split(';')[0].trim();
 if(!AUDIO_TYPES.has(type))fail(415,'Formato vocale non supportato');
 const seconds=Number(duration);
 if(!Number.isInteger(seconds)||seconds<1||seconds>MAX_SECONDS)fail(400,'Durata vocale non valida');
 return{bytes,mime:type,seconds};
}
async function readBody(req){
 let content='';
 for await(const part of req){content+=part;if(content.length>375000)fail(413,'Messaggio troppo grande');}
 try{const data=JSON.parse(content||'{}');if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Dati non validi');return data}
 catch(e){if(e.status)throw e;fail(400,'JSON non valido')}
}
async function requireFriend(db,uid,peer){
 const r=await db.query("SELECT 1 FROM nc_social_friends f WHERE f.status='accepted' AND ((f.requester=$1 AND f.recipient=$2) OR (f.requester=$2 AND f.recipient=$1)) AND NOT EXISTS (SELECT 1 FROM nc_social_blocks b WHERE (b.owner=$1 AND b.blocked=$2) OR (b.owner=$2 AND b.blocked=$1)) LIMIT 1",[uid,peer]);
 if(!r.rowCount)fail(403,'Chat disponibile soltanto tra amici che hanno accettato la richiesta');
}
const fields='id::text AS id,sender,recipient,kind,body,audio_mime,duration,created_at,read_at';
async function route(req,send,path){
 try{
  const methods={'/chat/threads':'GET','/chat/messages':'GET','/chat/audio':'GET','/chat/send':'POST','/chat/read':'POST'};
  if(!Object.hasOwn(methods,path))return send(404,{error:'Endpoint sconosciuto'});
  if(req.method!==methods[path])return send(405,{error:'Metodo non consentito'});
  const uid=await social.firebase(req);await setup();const db=social.db();
  const self=await db.query('SELECT uid FROM nc_social_users WHERE uid=$1',[uid]);
  if(!self.rowCount)fail(409,'Crea il tuo nickname in Area personale per usare la chat');
  const url=new URL(req.url,'http://localhost');
  if(path==='/chat/threads'){
   const result=await db.query(
    "SELECT u.uid,u.nickname,(u.show_online AND u.heartbeat_at>now()-interval '90 seconds') AS online,"+
    "last.kind AS last_kind,last.body AS last_text,last.created_at AS last_at,COALESCE(unread.n,0)::integer AS unread "+
    "FROM nc_social_friends f JOIN nc_social_users u ON u.uid=CASE WHEN f.requester=$1 THEN f.recipient ELSE f.requester END "+
    "LEFT JOIN LATERAL (SELECT m.kind,m.body,m.created_at FROM nc_chat_messages m "+
    "WHERE (m.sender=$1 AND m.recipient=u.uid) OR (m.recipient=$1 AND m.sender=u.uid) "+
    "ORDER BY m.id DESC LIMIT 1) last ON true "+
    "LEFT JOIN LATERAL (SELECT COUNT(*) AS n FROM nc_chat_messages m "+
    "WHERE m.sender=u.uid AND m.recipient=$1 AND m.read_at IS NULL) unread ON true "+
    "WHERE f.status='accepted' AND (f.requester=$1 OR f.recipient=$1) "+
    "AND NOT EXISTS (SELECT 1 FROM nc_social_blocks b WHERE (b.owner=$1 AND b.blocked=u.uid) OR (b.owner=u.uid AND b.blocked=$1)) "+
    "ORDER BY last.created_at DESC NULLS LAST,u.nickname LIMIT 250",[uid]);
   return send(200,{threads:result.rows});
  }
  if(path==='/chat/audio'){
   const id=cursor(url.searchParams.get('id'));if(!id)fail(400,'Identificativo mancante');
   const result=await db.query('SELECT sender,recipient,audio,audio_mime FROM nc_chat_messages WHERE id=$1 AND kind=$2',[id,'voice']);
   if(!result.rowCount)fail(404,'Vocale non trovato');
   const msg=result.rows[0];if(msg.sender!==uid&&msg.recipient!==uid)fail(403,'Vocale non autorizzato');
   await requireFriend(db,uid,msg.sender===uid?msg.recipient:msg.sender);
   return send(200,{mime:msg.audio_mime,base64:msg.audio.toString('base64')});
  }
  const payload=req.method==='POST'?await readBody(req):Object.fromEntries(url.searchParams);
  const peer=peerId(payload.peer,uid);await requireFriend(db,uid,peer);
  if(path==='/chat/messages'){
   const before=cursor(payload.before),after=cursor(payload.after);
   let query='SELECT '+fields+' FROM nc_chat_messages WHERE ((sender=$1 AND recipient=$2) OR (sender=$2 AND recipient=$1))';
   const args=[uid,peer];
   if(after){args.push(after);query+=' AND id>$'+args.length;}
   else if(before){args.push(before);query+=' AND id<$'+args.length;}
   query+=' ORDER BY nc_chat_messages.id '+(after?'ASC':'DESC')+' LIMIT 50';
   const result=await db.query(query,args);
   return send(200,{messages:after?result.rows:result.rows.reverse()});
  }
  if(path==='/chat/read'){
   const result=await db.query('UPDATE nc_chat_messages SET read_at=now() WHERE sender=$1 AND recipient=$2 AND read_at IS NULL',[peer,uid]);
   return send(200,{ok:true,marked:result.rowCount});
  }
  if(path==='/chat/send'){
   if(payload.kind!=='text'&&payload.kind!=='voice')fail(400,'Tipo di messaggio non valido');
   const recent=await db.query("SELECT COUNT(*)::integer AS n FROM nc_chat_messages WHERE sender=$1 AND created_at>now()-interval '60 seconds'",[uid]);
   if(recent.rows[0].n>=25)fail(429,'Troppi messaggi. Riprova tra un minuto');
   let body=null,voice=null;
   if(payload.kind==='text')body=textMessage(payload.text);
   else{
    const count=await db.query("SELECT COUNT(*)::integer AS n FROM nc_chat_messages WHERE sender=$1 AND kind='voice' AND created_at>now()-interval '10 minutes'",[uid]);
    if(count.rows[0].n>=12)fail(429,'Troppi vocali. Riprova tra qualche minuto');
    voice=parseAudio(payload.base64,payload.mime,payload.duration);
   }
   const result=await db.query(
    'INSERT INTO nc_chat_messages(sender,recipient,kind,body,audio,audio_mime,duration) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING '+fields,
    [uid,peer,payload.kind,body,voice?.bytes||null,voice?.mime||null,voice?.seconds||null]);
   return send(200,{message:result.rows[0]});
  }
 }catch(e){
  const status=e.status||(e.code==='23503'?409:500);
  if(status===500)console.error('Private chat:',e.message);
  return send(status,{error:status===500?'Chat momentaneamente non disponibile':e.message});
 }
}
module.exports={route,setup,requireFriend,textMessage,parseAudio,MAX_AUDIO_BYTES,MAX_SECONDS};
