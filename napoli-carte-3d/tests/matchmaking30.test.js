'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const e=require('../backend/engine');
const types=[['scopa',2],['scopone',4],['briscola',2],['sette',2],['asso',2],['ruba',2]];
test('public matchmaking timeout is exactly thirty seconds',()=>assert.equal(e.MATCH_WAIT,30000));
for(const [game,seats] of types){
 test(game+': real players can join throughout 30 sec, CPU fills only after deadline',()=>{
  const a=e.join({game,seats,name:'Human first',bot:false});
  const sess=e.lookupSession(a.token),r=sess.r;
  try{
   const deadline=r.matchDeadline;assert.equal(deadline-r.created,30000);
   e.matchTick(deadline-1);assert.equal(r.status,'waiting');assert.equal(r.players.length,1);
   let b=null;if(seats===2){b=e.join({game,seats,name:'Human second',bot:false});assert.equal(b.roomId,a.roomId);assert.equal(r.status,'playing');assert.equal(r.players.filter(p=>p.bot).length,0);}
   else{e.matchTick(deadline);assert.equal(r.status,'playing');assert.equal(r.players.filter(p=>p.bot).length,3);}
   if(b)e.leave(b.token);
  }finally{if(e.lookupSession(a.token))e.leave(a.token);}
 });
 test(game+': after 30 sec public room fills automatically',()=>{
  const a=e.join({game,seats,name:'Human',bot:false});const r=e.lookupSession(a.token).r;
  try{
   e.matchTick(r.matchDeadline);
   const s=e.state(a.token);assert.equal(s.status,'playing');assert.equal(s.players.length,seats);assert.equal(s.players.filter(p=>p.bot).length,seats-1);assert.equal(s.matchDeadline,0);
  }finally{e.leave(a.token);}
 });
}
test('private invited room waits for humans without CPU after timeout',()=>{
 const a=e.join({game:'scopa',seats:2,name:'Private',private:true});const r=e.lookupSession(a.token).r;
 try{e.matchTick(r.matchDeadline+60000);assert.equal(r.status,'waiting');assert.equal(e.state(a.token).matchDeadline,0);assert.equal(r.players.length,1);}finally{e.leave(a.token);}
});
