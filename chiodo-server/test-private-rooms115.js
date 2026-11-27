'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {join,leave,verifyPrivateInvite}=require('./http.js');
test('Private Chiodo room creates code, preserves public matchmaking and admits invited friend',()=>{
 const host=join(2,'Host',{private:true,format:'individual'});
 assert.equal(host.state.private,true);assert.match(host.state.code,/^[A-HJ-NP-Z2-9]{6}$/);
 const publicPlayer=join(2,'Pubblico',{format:'individual'});
 assert.notEqual(publicPlayer.state.id,host.state.id);assert.equal(publicPlayer.state.private,false);
 assert.equal(verifyPrivateInvite(host.token,host.state.code).code,host.state.code);
 assert.throws(()=>verifyPrivateInvite(publicPlayer.token,host.state.code));
 const friend=join(2,'Amico',{invite:host.state.code,format:'individual'});
 assert.equal(friend.state.id,host.state.id);assert.equal(friend.state.status,'playing');
 leave(friend.token);leave(host.token);leave(publicPlayer.token);
});
test('Private Chiodo accepts pairs with 4 players only',()=>{
 const h=join(4,'Capitano',{private:true,format:'pairs'});
 assert.equal(h.state.format,'pairs');assert.equal(h.state.private,true);
 assert.throws(()=>join(3,'Errato',{private:true,format:'pairs'}));
 assert.throws(()=>join(4,'Codice errato',{invite:'ZZZZZZ',format:'pairs'}));
 leave(h.token);
});
