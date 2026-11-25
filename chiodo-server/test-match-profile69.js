const test=require('node:test'),assert=require('node:assert/strict');
const {join,state,leave,auth,tick,profile,MATCH_WAIT}=require('../chiodo-server/http.js');
test('matchmaking 30 seconds, no premature CPU',()=>{assert.equal(MATCH_WAIT,30000);const u=join(4,'A');try{const r=auth(u.token).room;assert.equal(r.matchDeadline-r.updated,30000);tick(r,r.matchDeadline-1);assert.equal(state(u.token).status,'waiting');tick(r,r.matchDeadline);assert.equal(state(u.token).status,'playing');assert.equal(state(u.token).botCount,3);}finally{leave(u.token);}});
test('photo visibility on public online Chiodo is consent-gated per viewer',()=>{
 const a=join(2,'Alice'),b=join(2,'Bob');
 const photo='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(130,1)]).toString('base64');
 try{
  profile(a.token,{avatarId:7,photoMode:'avatar',photo});
  assert.equal(state(a.token).players[0].photo,photo);assert.equal(state(b.token).players[0].photo,null);
  for(const mode of ['friends','room','avatar']){profile(a.token,{photoMode:mode});assert.equal(state(b.token).players[0].photo,null,mode);}
  profile(a.token,{photoMode:'public'});assert.equal(state(b.token).players[0].photo,photo);
  profile(a.token,{photoMode:'avatar'});assert.equal(state(b.token).players[0].photo,null);
  assert.equal(state(b.token).players[0].avatarId,7);
  profile(a.token,{photo:''});assert.equal(state(a.token).players[0].photo,null);
  assert.throws(()=>profile(a.token,{photo:'javascript:alert(1)'}));
  assert.throws(()=>profile(a.token,{avatarId:99}));
 }finally{leave(a.token);leave(b.token);}
});
test('waiting room keeps unpublished photo private even before match',()=>{
 const a=join(3,'Alice');const b=join(3,'Bob');
 try{profile(a.token,{photoMode:'friends'});assert.equal(state(b.token).players[0].photo,null);}
 finally{leave(a.token);leave(b.token);}
});
