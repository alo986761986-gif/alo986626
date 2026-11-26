'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const social=require('./social70.js');
const feedback=require('./feedback78.js');
const {Game,join,state,leave}=require('./http.js');
assert.deepEqual(feedback.validate({category:'online',game:'scopa',description:'Non riesco ad entrare nel tavolo mondiale',version:'7.8.0'}),{category:'online',game:'scopa',description:'Non riesco ad entrare nel tavolo mondiale',version:'7.8.0'});
assert.throws(()=>feedback.validate({category:'altro',game:'generale',description:'breve'}),/15 caratteri/);
assert.throws(()=>feedback.validate({category:'falso',game:'generale',description:'Segnalazione sufficientemente lunga'}),/validi/);
const solo=join(4,'Singolo','individual');
const pairs=join(4,'Squadra','pairs');
assert.notEqual(state(solo.token).id,state(pairs.token).id,'Different formats must never share a matchmaking room');
assert.equal(state(solo.token).format,'individual');
assert.equal(state(pairs.token).format,'pairs');
const pairMate=join(4,'Compagno','pairs');
assert.equal(state(pairMate.token).id,state(pairs.token).id,'Same format and size should share a waiting room');
assert.throws(()=>join(2,'Impossibile','pairs'),/Modalita non valida/);
leave(solo.token);leave(pairs.token);leave(pairMate.token);
const game=new Game(4,'pairs');
// A winning pair is final only when a combined team total reaches 121.
// Fixed hands keep this regression independent of the shuffled opening deal.
for(let i=0;i<4;i++){
 game.players[i].score=[10,58,20,58][i];
 game.players[i].hand=i?[{id:'fixture-'+i,s:i,v:3}]:[];
}
game.pending={i:0,c:{v:4},calls:[]};
game.resolve([]);
assert.equal(game.matchFinished,true);
assert.deepEqual(game.teamScores,[33,122]);
assert.deepEqual(game.winners,[0,2],'Partners must be credited with the lower team score');
async function call(uid,payload){
 const req=Readable.from([JSON.stringify(payload)]);
 req.method='POST';req.headers=uid?{'x-qa-user':uid}:{};req.socket={remoteAddress:'127.0.0.1'};
 let result;
 await feedback.route(req,(status,data)=>{result={status,data};},'/feedback/report');
 return result;
}
(async()=>{
 if(!process.env.DATABASE_URL||!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL))throw Error('Use only a local disposable PostgreSQL instance');
 social.firebase=async req=>{
  const uid=req.headers['x-qa-user'];
  if(!uid){const e=new Error('Accedi con email o Google');e.status=401;throw e;}
  return uid;
 };
 const base={category:'online',game:'briscola',description:'Il tasto cerca giocatori non trova nessuno',version:'7.8.0'};
 try{
  assert.equal((await call(null,base)).status,401,'Unauthenticated users cannot report');
  for(let i=0;i<5;i++){const r=await call('qa-reporter-1',base);assert.equal(r.status,201,JSON.stringify(r));assert.match(r.data.reference,/^NC-[0-9]+$/);}
  assert.equal((await call('qa-reporter-1',base)).status,429,'Daily anti-spam limit must be enforced');
  assert.equal((await call('qa-reporter-2',base)).status,201,'A separate user should still be able to report');
  const db=social.db(),result=await db.query("SELECT COUNT(*)::integer AS n FROM nc_feedback_reports WHERE uid=$1",['qa-reporter-1']);
  assert.equal(result.rows[0].n,5);
  console.log('PASS: Chiodo solo/coppie matchmaking & winners, authenticated support reports, PostgreSQL persistence, rate limiting');
 }finally{const db=social.db();await db.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});

