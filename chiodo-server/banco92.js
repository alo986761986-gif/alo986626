'use strict';
// IL BANCO ONLINE 9.2 — authenticated, server-authoritative Tombola.
// Public: 12; Quick: 6; Private: 2–12. No wagers or coin deductions.
const crypto=require('node:crypto');
const social=require('./social70.js'),core=require('./banco92-core.js');
const MAX_PLAYERS=12,MIN_PLAYERS=2,INTERVAL_MS=6000,WAIT_MS=30000;
const INVITE='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const fail=(status,message)=>Object.assign(new Error(message),{status});
let setupPromise;
const rand=()=>crypto.randomInt(4294967296)/4294967296;
const newId=()=>crypto.randomBytes(16).toString('hex');
const code=()=>Array.from({length:6},()=>INVITE[crypto.randomInt(INVITE.length)]).join('');
const obj=x=>typeof x==='string'?JSON.parse(x):x||{};
function validId(id){if(typeof id!=='string'||!/^[0-9a-f]{32}$/.test(id))throw fail(400,'Sala non valida');return id;}
function viewRoom(r){return {id:r.id,mode:r.mode,code:r.mode==='private'?r.code:undefined,capacity:r.capacity,status:r.status};}
async function setup(){
 if(!setupPromise)setupPromise=(async()=>{
  await social.initialize();const p=social.db();
  await p.query("CREATE TABLE IF NOT EXISTS nc_banco92_rooms(id char(32) PRIMARY KEY, mode varchar(8) NOT NULL CHECK(mode IN ('quick','public','private')), code varchar(6) UNIQUE, capacity integer NOT NULL CHECK(capacity BETWEEN 2 AND 12), host_uid text NOT NULL, status varchar(8) NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','playing','finished')), state jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
  await p.query("CREATE TABLE IF NOT EXISTS nc_banco92_members(room_id char(32) NOT NULL REFERENCES nc_banco92_rooms(id) ON DELETE CASCADE, uid text NOT NULL, nickname varchar(24) NOT NULL, tickets jsonb NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(), seen_at timestamptz NOT NULL DEFAULT now(), left_at timestamptz, PRIMARY KEY(room_id,uid))");
  await p.query('CREATE INDEX IF NOT EXISTS nc_banco92_member_lookup ON nc_banco92_members(uid,joined_at DESC)');
  await p.query('CREATE INDEX IF NOT EXISTS nc_banco92_room_search ON nc_banco92_rooms(mode,status,updated_at DESC)');
 })().catch(e=>{setupPromise=null;throw e;});
 await setupPromise;
}
async function transaction(fn){
 const p=await social.db().connect();let open=false;
 try{await p.query('BEGIN');open=true;const result=await fn(p);await p.query('COMMIT');return result;}
 catch(e){if(open)await p.query('ROLLBACK').catch(()=>{});throw e}
 finally{p.release()}
}
async function members(p,id){
 const r=await p.query('SELECT uid,nickname,tickets,left_at FROM nc_banco92_members WHERE room_id=$1 ORDER BY joined_at,uid',[id]);
 return r.rows.map(x=>({...x,tickets:obj(x.tickets)}));
}
async function roomLock(p,id){
 const r=await p.query('SELECT * FROM nc_banco92_rooms WHERE id=$1 FOR UPDATE',[id]);
 if(!r.rowCount)throw fail(404,'Sala non trovata');
 return r.rows[0];
}
function snapshot(room,people,uid){
 const state=obj(room.state),active=people.filter(x=>!x.left_at),own=active.find(x=>x.uid===uid);
 return {room:viewRoom(room),joined:active.length,players:people.map(x=>({nickname:x.nickname,active:!x.left_at,host:x.uid===room.host_uid})),
  isHost:uid===room.host_uid,member:!!own,tickets:own?.tickets||[],drawn:state.drawn||[],
  lastNumber:state.drawn?.at(-1)||null,awards:state.awards||{},serverNow:Date.now(),
  nextDrawAt:state.nextAt||0,waitUntil:state.waitUntil||0,startedAt:state.startedAt||0,finished:room.status==='finished'};
}
function start(room,people,now){
 if(room.status!=='waiting'||people.filter(x=>!x.left_at).length<MIN_PLAYERS)return false;
 room.status='playing';room.state={deck:core.shuffled(Array.from({length:90},(_,i)=>i+1),rand),drawn:[],awards:{},startedAt:now,nextAt:now+INTERVAL_MS};
 return true;
}
function simulate(room,people,now){
 if(room.status==='waiting'){
  const n=people.filter(x=>!x.left_at).length,s=obj(room.state);
  if(n>=MIN_PLAYERS&&(n>=room.capacity||(s.waitUntil&&now>=s.waitUntil)))return start(room,people,now);
  if(n>=MIN_PLAYERS&&!s.waitUntil){s.waitUntil=now+WAIT_MS;room.state=s;return true}
  if(n<MIN_PLAYERS&&s.waitUntil){delete s.waitUntil;room.state=s;return true}
  return false;
 }
 if(room.status!=='playing')return false;
 const s=obj(room.state);
 if(!s.deck?.length){room.status='finished';room.state=s;return true}
 if(now<s.nextAt)return false;
 const n=s.deck.pop();
 if(!Number.isInteger(n)||s.drawn.includes(n))throw fail(503,'Estrazione non disponibile');
 s.drawn.push(n);
 const hits=new Map();
 for(const person of people){
  if(person.left_at)continue;
  const earned=new Set();
  for(const grid of person.tickets){
   const marked=grid.flat().filter(x=>x!==null&&s.drawn.includes(x));
   for(const award of core.scan({tickets:[{grid,marked}]}))earned.add(award);
  }
  for(const award of earned)if(!s.awards[award]){
   if(!hits.has(award))hits.set(award,[]);
   hits.get(award).push(person.nickname);
  }
 }
 for(const award of core.AWARDS)if(hits.has(award))s.awards[award]=hits.get(award);
 s.nextAt=now+INTERVAL_MS;
 if(s.awards.Tombola||!s.deck.length)room.status='finished';
 room.state=s;
 return true;
}
async function advance(p,id,uid){
 const room=await roomLock(p,id),people=await members(p,id);
 if(!people.some(x=>x.uid===uid&&!x.left_at))throw fail(403,'Non fai parte della sala');
 if(simulate(room,people,Date.now()))await p.query('UPDATE nc_banco92_rooms SET state=$2::jsonb,status=$3,updated_at=now() WHERE id=$1',[id,JSON.stringify(room.state),room.status]);
 return snapshot(room,people,uid);
}
async function getState(uid,id){
 await setup();return transaction(async p=>{
  const result=await advance(p,validId(id),uid);
  await p.query('UPDATE nc_banco92_members SET seen_at=now() WHERE room_id=$1 AND uid=$2',[id,uid]);
  return result;
 });
}
async function join(uid,input){
 await setup();
 const mode=String(input.mode||'public');
 if(!['public','quick','private','code'].includes(mode))throw fail(400,'Modalità non valida');
 const ticketCount=Number(input.tickets??2),capacity=mode==='private'?Number(input.capacity??12):mode==='quick'?6:12;
 if(!Number.isInteger(ticketCount)||ticketCount<1||ticketCount>3||!Number.isInteger(capacity)||capacity<2||capacity>MAX_PLAYERS)throw fail(400,'Numero giocatori o cartelle non valido');
 const invite=String(input.code||'').trim().toUpperCase();
 if(mode==='code'&&!/^[A-HJ-NP-Z2-9]{6}$/.test(invite))throw fail(400,'Codice invito non valido');
 return transaction(async p=>{
  await p.query('SELECT pg_advisory_xact_lock(920012)');
  const existing=await p.query("SELECT r.id FROM nc_banco92_rooms r JOIN nc_banco92_members m ON m.room_id=r.id WHERE m.uid=$1 AND m.left_at IS NULL AND r.status IN ('waiting','playing') AND r.updated_at>now()-interval '60 minutes' ORDER BY r.created_at DESC LIMIT 1",[uid]);
  if(existing.rowCount)return {...await advance(p,existing.rows[0].id,uid),reconnected:true};
  const user=await p.query('SELECT nickname FROM nc_social_users WHERE uid=$1',[uid]);
  if(!user.rowCount)throw fail(409,'Imposta prima un nickname nella sezione Amici');
  let target=null;
  if(mode==='code'){
   const r=await p.query("SELECT * FROM nc_banco92_rooms WHERE mode='private' AND code=$1 AND status='waiting' FOR UPDATE",[invite]);
   if(!r.rowCount)throw fail(404,'Invito scaduto o non valido');
   target=r.rows[0];
  }else if(mode!=='private'){
   const r=await p.query("SELECT r.* FROM nc_banco92_rooms r WHERE r.mode=$1 AND r.status='waiting' AND r.capacity=$2 AND r.created_at>now()-interval '60 minutes' AND (SELECT COUNT(*) FROM nc_banco92_members m WHERE m.room_id=r.id AND m.left_at IS NULL)<r.capacity ORDER BY r.created_at LIMIT 1 FOR UPDATE",[mode,capacity]);
   target=r.rows[0]||null;
  }
  if(!target){
   const r=await p.query("INSERT INTO nc_banco92_rooms(id,mode,code,capacity,host_uid) VALUES($1,$2,$3,$4,$5) RETURNING *",[newId(),mode==='private'?'private':mode,mode==='private'?code():null,capacity,uid]);
   target=r.rows[0];
  }
  const group=await members(p,target.id);
  if(target.status!=='waiting'||group.filter(x=>!x.left_at).length>=target.capacity)throw fail(409,'Sala al completo');
  const tickets=Array.from({length:ticketCount},()=>core.createTicket(rand));
  await p.query('INSERT INTO nc_banco92_members(room_id,uid,nickname,tickets) VALUES($1,$2,$3,$4::jsonb)',[target.id,uid,user.rows[0].nickname,JSON.stringify(tickets)]);
  return advance(p,target.id,uid);
 });
}
async function begin(uid,id){
 await setup();return transaction(async p=>{
  const rid=validId(id),room=await roomLock(p,rid),people=await members(p,rid);
  if(!people.some(x=>x.uid===uid&&!x.left_at))throw fail(403,'Non sei nella sala');
  if(room.host_uid!==uid)throw fail(403,'Solo il creatore può iniziare');
  if(!start(room,people,Date.now()))throw fail(409,'Servono almeno due partecipanti in attesa');
  await p.query('UPDATE nc_banco92_rooms SET status=$2,state=$3::jsonb,updated_at=now() WHERE id=$1',[rid,room.status,JSON.stringify(room.state)]);
  return snapshot(room,people,uid);
 });
}
async function leave(uid,id){
 await setup();return transaction(async p=>{
  const rid=validId(id),room=await roomLock(p,rid),people=await members(p,rid);
  if(!people.some(x=>x.uid===uid&&!x.left_at))throw fail(403,'Non sei nella sala');
  await p.query('UPDATE nc_banco92_members SET left_at=now() WHERE room_id=$1 AND uid=$2',[rid,uid]);
  const others=people.filter(x=>x.uid!==uid&&!x.left_at);
  if(!others.length)await p.query('DELETE FROM nc_banco92_rooms WHERE id=$1',[rid]);
  else if(room.host_uid===uid)await p.query('UPDATE nc_banco92_rooms SET host_uid=$2 WHERE id=$1',[rid,others[0].uid]);
  return {ok:true};
 });
}
async function rooms(){
 await setup();
 const r=await social.db().query("SELECT r.id,r.mode,r.capacity,r.status,(SELECT COUNT(*)::integer FROM nc_banco92_members m WHERE m.room_id=r.id AND m.left_at IS NULL) AS joined FROM nc_banco92_rooms r WHERE r.mode IN ('quick','public') AND r.status='waiting' AND r.created_at>now()-interval '60 minutes' ORDER BY r.created_at DESC LIMIT 30");
 return {rooms:r.rows};
}
async function body(req){
 let raw='';for await(const c of req){raw+=c;if(raw.length>2048)throw fail(413,'Dati troppo grandi')}
 try{const value=JSON.parse(raw||'{}');if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value}
 catch(e){throw fail(400,'Dati non validi')}
}
async function route(req,send,path){
 const methods={'/banco92/rooms':'GET','/banco92/state':'GET','/banco92/join':'POST','/banco92/start':'POST','/banco92/leave':'POST'};
 if(!methods[path])return send(404,{error:'Endpoint sconosciuto'});
 if(req.method!==methods[path])return send(405,{error:'Metodo non consentito'});
 try{
  const uid=await social.firebase(req);
  if(path==='/banco92/rooms')return send(200,await rooms());
  if(path==='/banco92/state'){const id=new URL(req.url,'http://localhost').searchParams.get('roomId');return send(200,await getState(uid,id));}
  const input=await body(req);
  if(path==='/banco92/join')return send(200,await join(uid,input));
  if(path==='/banco92/start')return send(200,await begin(uid,input.roomId));
  return send(200,await leave(uid,input.roomId));
 }catch(e){const status=e.status||503;if(status>=500)console.warn('banco92',e.message);return send(status,{error:status>=500?'Sala momentaneamente non disponibile':e.message});}
}
module.exports={MAX_PLAYERS,MIN_PLAYERS,INTERVAL_MS,WAIT_MS,setup,route,join,getState,begin,leave,rooms,simulate,start,snapshot};
