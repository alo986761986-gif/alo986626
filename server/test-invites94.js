'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const ServerSession=require('../chiodo-server/games/expansion-session.js');
const BrowserSession=require('../app/src/main/assets/expansion-session.js');
function fixture(Session=ServerSession){
 let serial=1,clock=1000000;
 const service=Session.createService({
  now:()=>clock,
  token:()=>(serial++).toString(16).padStart(8,'0')+'a'.repeat(40),
  random:()=>0.471,botDelay:700
 });
 return {service,advance:n=>clock+=n,join:(a={})=>service.join({game:'tressette',seats:2,name:'Test',...a})};
}
for(const Session of [ServerSession,BrowserSession]){
 const label=Session===ServerSession?'server':'browser';
 test(label+': private room join code is never returned by spectator view',()=>{
  const f=fixture(Session),first=f.join({private:true}),code=first.state.code;
  assert.equal(f.service.invitationContext(first.token).owner,true);
  assert.equal(f.service.invitationContext(first.token).code,code);
  assert.equal(f.service.invitationCodeForRoom(first.state.roomId),code);
  const second=f.join({invite:code,name:'Guest'});
  assert.equal(f.service.invitationContext(second.token).owner,false);
  assert.equal(f.service.publicRoom(first.state.roomId).private,true);
  const watched=f.service.spectatorView(first.state.roomId);
  assert.equal(watched.players.length,2);
  assert.equal(watched.roomId,first.state.roomId);
  for(const forbidden of ['hand','actions','code','privateRole','extraHands','token','partner','calledCard','result']){
   assert.equal(Object.hasOwn(watched,forbidden),false,forbidden);
  }
  assert.ok(!JSON.stringify(watched).includes(first.token));
  assert.ok(!JSON.stringify(watched).includes(second.token));
  assert.ok(!JSON.stringify(watched).includes(code));
  assert.throws(()=>f.service.spectatorView('invalid'),/La partita non è ancora iniziata/);
 });
 test(label+': exact public room join does not create or select another table',()=>{
  const f=fixture(Session),a=f.join({seats:4}),b=f.join({game:'cucu',seats:2});
  assert.throws(()=>f.join({roomId:'bad'}),/Identificativo/);
  assert.throws(()=>f.join({roomId:b.state.roomId+'x'}),/Identificativo/);
  const c=f.join({game:'tressette',seats:2,roomId:a.state.roomId});
  assert.equal(c.state.roomId,a.state.roomId);
  assert.equal(c.state.game,'tressette');
  assert.equal(c.state.seats,4);
  assert.notEqual(c.state.roomId,b.state.roomId);
  const privateRoom=f.join({private:true,seats:4});
  assert.throws(()=>f.join({roomId:privateRoom.state.roomId}),/pubblico/);
 });
 test(label+': takeover replaces only departed human, not the original CPU',()=>{
  const f=fixture(Session),host=f.join(),guest=f.join({name:'Leaving'});
  assert.equal(f.service.spectatorView(host.state.roomId).status,'playing');
  assert.equal(f.service.publicRoom(host.state.roomId).vacantSeats,0);
  assert.throws(()=>f.service.takeover(host.state.roomId,'Intruso'),/Non ci sono posti/);
  f.service.leave(guest.token);
  assert.equal(f.service.publicRoom(host.state.roomId).vacantSeats,1);
  assert.equal(f.service.state(host.token).vacantSeats,1);
  const resumed=f.service.takeover(host.state.roomId,'Nuovo giocatore');
  assert.equal(resumed.state.seat,1);
  assert.equal(resumed.state.players[1].name,'Nuovo giocatore');
  assert.equal(resumed.state.vacantSeats,0);
  assert.equal(resumed.state.humanCount,2);
  assert.throws(()=>f.service.state(guest.token),e=>e.status===401);
  assert.throws(()=>f.service.takeover(host.state.roomId,'Ancora'),/Non ci sono posti/);
  assert.ok(!JSON.stringify(f.service.spectatorView(host.state.roomId)).includes(resumed.token));
  const other=fixture(Session),cpu=other.join({bot:true});
  assert.equal(other.service.publicRoom(cpu.state.roomId).vacantSeats,0);
  assert.throws(()=>other.service.takeover(cpu.state.roomId,'Non ammesso'),/Non ci sono posti/);
 });
}
