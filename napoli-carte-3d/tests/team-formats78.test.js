'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../backend/engine.js');
test('six games support explicit individual and pairs with real server scoring mode',()=>{
 for(const game of ['scopa','scopone','briscola','sette','asso','ruba']){
  const teams=engine.join({game,seats:4,format:'pairs',bot:true,name:'QA Squadra'});
  const state=engine.state(teams.token);
  assert.equal(state.format,'pairs',game+' must be pairs');
  assert.deepEqual(state.players.map(p=>p.team),[0,1,0,1],game+' team placement');
  engine.leave(teams.token);
  if(game==='scopone')continue;
  const solo=engine.join({game,seats:4,format:'individual',bot:true,name:'QA Individuale'});
  const s=engine.state(solo.token);
  assert.equal(s.format,'individual',game+' must support individual scoring');
  assert.ok(s.players.every(p=>p.team===null),'Individual game must not show team score');
  engine.leave(solo.token);
 }
});
test('public matchmaking separates individual tables from paired tables',()=>{
 const first=engine.join({game:'scopa',seats:4,format:'individual',name:'QA A'});
 const second=engine.join({game:'scopa',seats:4,format:'pairs',name:'QA B'});
 const third=engine.join({game:'scopa',seats:4,format:'pairs',name:'QA C'});
 assert.notEqual(first.roomId,second.roomId,'Other format must use different room');
 assert.equal(second.roomId,third.roomId,'Same format must join the same room');
 assert.equal(engine.state(first.token).status,'waiting');
 assert.equal(engine.state(second.token).status,'waiting');
 for(const x of [first,second,third])engine.leave(x.token);
});
test('pairs require four players and Scopone enforces pairs',()=>{
 assert.throws(()=>engine.join({game:'scopa',seats:2,format:'pairs',bot:true}),/Modalità/);
 assert.equal(engine.state(engine.join({game:'scopone',seats:4,format:'individual',bot:true}).token).format,'pairs');
});
