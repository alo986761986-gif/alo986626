'use strict';
const assert=require('node:assert/strict');
const e=require('../backend/engine');
for(const game of ['scopa','scopone','asso']){
 const {token,roomId}=e.join({game,seats:game==='scopone'?4:2,name:'Tester',bot:true});
 const room=e.rooms.get(roomId);
 const card={id:'0-7',s:0,v:7};
 room.players[0].hand=[card];
 room.table=[{id:'3-3',s:3,v:3},{id:'0-4',s:0,v:4},{id:'2-2',s:2,v:2},{id:'1-5',s:1,v:5}];
 room.turn=0;room.status='playing';
 const options=e.getChoices(room,0,card.id);
 assert.equal(options.length,2);
 assert.throws(()=>e.action(token,{card:card.id,type:'table',picks:['3-3']}),/Presa non valida/);
 assert.equal(room.players[0].hand.length,1);
 e.action(token,{card:card.id,...options[0]});
 console.log('VALID CHOICE',game);
}
const a=e.join({game:'asso',seats:2,name:'Tester',bot:true});
const r=e.rooms.get(a.roomId);
r.players[0].hand=[{id:'0-1',s:0,v:1}];r.table=[{id:'1-2',s:1,v:2},{id:'1-3',s:1,v:3}];
assert.equal(e.getChoices(r,0,'0-1')[0].picks.length,2);
const b=e.join({game:'ruba',seats:2,name:'Tester',bot:true});const x=e.rooms.get(b.roomId);
x.players[0].hand=[{id:'0-2',s:0,v:2}];x.table=[{id:'1-2',s:1,v:2}];
x.players[1].pile=[{id:'2-2',s:2,v:2}];
assert(e.getChoices(x,0,'0-2').some(o=>o.type==='steal'));
assert(e.getChoices(x,0,'0-2').some(o=>o.type==='table'));
const fs=require('fs');
assert(fs.readFileSync('frontend/capture27.js','utf8').includes('window.NC27_CAPTURE_READY'));
console.log('CAPTURE27 RULES TEST PASS');
