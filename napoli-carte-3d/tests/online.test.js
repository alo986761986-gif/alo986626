'use strict';
const assert=require('node:assert/strict');
const e=require('../backend/engine');
for(const game of ['scopa','scopone','briscola','sette','asso','ruba']){
 const seats=game==='scopone'?4:2;
 const a=e.join({game,seats,name:'Alice',private:true});
 assert.match(a.code,/^[A-Z0-9]{6}$/);
 assert.equal(e.state(a.token).status,'waiting');
 for(let i=1;i<seats;i++){
  const b=e.join({game:'ruba',seats:2,name:'Guest '+i,invite:a.code});
  assert.equal(b.roomId,a.roomId);
 }
 assert.equal(e.state(a.token).status,'playing');
 console.log('ROOM OK',game,seats,a.code);
}
const a=e.join({game:'scopa',seats:2,name:'Public A'});
const b=e.join({game:'scopa',seats:2,name:'Public B'});
assert.equal(a.roomId,b.roomId);
assert.equal(e.state(a.token).status,'playing');
console.log('ONLINE MATCHMAKING PASSED');
