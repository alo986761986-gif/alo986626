'use strict';
// PostgreSQL-backed integration checks. Firebase is replaced only in this disposable test process.
const test=require('node:test'),assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const social=require('../chiodo-server/social70.js');
const push=require('../chiodo-server/push82.js');
const expansion=require('../chiodo-server/expansion.js');
social.firebase=async req=>req.testUid;
push.notify=async()=>true;
const router=require('../chiodo-server/invites94.js');
async function call(uid,path,data,method=data===undefined?'GET':'POST'){
 const req=Readable.from(data===undefined?[]:[JSON.stringify(data)]);
 req.testUid=uid;req.method=method;req.url=path;req.headers={};
 let out;await router.route(req,(status,body)=>{out={status,body};},path.split('?')[0]);
 return out;
}
async function user(db,uid,nickname){
 await db.query('INSERT INTO nc_social_users(uid,nickname,nickname_key) VALUES($1,$2,$3)',[uid,nickname,nickname.toLowerCase()]);
}
async function relation(db,a,b){
 await db.query("INSERT INTO nc_social_friends(requester,recipient,status) VALUES($1,$2,'accepted')",[a,b]);
}
function expectStatus(r,status){assert.equal(r.status,status,JSON.stringify(r.body));return r.body;}
test('authenticated invites: friendship, consent, private join, spectator and takeover',async()=>{
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required for integration test');
 await router.setup();
 const db=social.db();
 try{
  await user(db,'host94','Host94');
  await user(db,'friend94','Friend94');
  await user(db,'bridge94','Bridge94');
  await user(db,'second94','Second94');
  await user(db,'blocked94','Blocked94');
  await relation(db,'host94','friend94');
  await relation(db,'host94','bridge94');
  await relation(db,'bridge94','second94');
  const prefs=expectStatus(await call('second94','/invites94/preferences',{direct:true,second_degree:true,public_invites:false,allow_watch:true}),200);
  assert.equal(prefs.preferences.second_degree,true);
  const privateRoom=expansion.service.join({game:'tressette',seats:2,name:'Host94',private:true});
  const token=privateRoom.token;
  const wrong=await call('blocked94','/invites94/send',{tableToken:token,recipientUid:'friend94',audience:'friends',kind:'join'});
  expectStatus(wrong,403);
  const sent=expectStatus(await call('host94','/invites94/send',{tableToken:token,recipientUid:'friend94',audience:'friends',kind:'join'}),200);
  assert.match(sent.id,/^[0-9a-f-]{36}$/);
  expectStatus(await call('host94','/invites94/send',{tableToken:token,recipientUid:'friend94',audience:'friends',kind:'join'}),409);
  expectStatus(await call('friend94','/invites94/enter',{id:sent.id}),403);
  const inbox=expectStatus(await call('friend94','/invites94/list'),200);
  assert.ok(inbox.invites.some(i=>i.id===sent.id&&i.sender_nickname==='Host94'));
  expectStatus(await call('friend94','/invites94/respond',{id:sent.id,accept:true}),200);
  const enter=expectStatus(await call('friend94','/invites94/enter',{id:sent.id}),200);
  assert.equal(enter.kind,'join');
  assert.equal(enter.code,privateRoom.state.code);
  assert.equal(enter.roomId,undefined);
  const joined=expansion.service.join({invite:enter.code,name:'Friend94'});
  assert.equal(joined.state.roomId,privateRoom.state.roomId);
  assert.equal(joined.state.status,'playing');
  const inviteWatch=expectStatus(await call('host94','/invites94/send',{tableToken:token,recipientUid:'second94',audience:'friends_of_friends',kind:'watch'}),200);
  expectStatus(await call('second94','/invites94/respond',{id:inviteWatch.id,accept:true}),200);
  const watch=expectStatus(await call('second94','/invites94/enter',{id:inviteWatch.id}),200);
  assert.equal(watch.kind,'watch');
  for(const secret of ['hand','actions','code','privateRole','extraHands','token','partner','calledCard']){
   assert.equal(Object.hasOwn(watch.state,secret),false,secret);
  }
  const current=expectStatus(await call('second94','/invites94/watch?id='+inviteWatch.id),200);
  assert.equal(current.state.players.length,2);
  expectStatus(await call('blocked94','/invites94/watch?id='+inviteWatch.id),403);
  expansion.service.leave(joined.token);
  assert.equal(expansion.service.publicRoom(privateRoom.state.roomId).vacantSeats,1);
  const substitute=expectStatus(await call('host94','/invites94/send',{tableToken:token,recipientUid:'second94',audience:'friends_of_friends',kind:'takeover'}),200);
  expectStatus(await call('second94','/invites94/respond',{id:substitute.id,accept:true}),200);
  const taken=expectStatus(await call('second94','/invites94/enter',{id:substitute.id}),200);
  assert.equal(taken.kind,'takeover');
  assert.equal(taken.joined.state.seat,1);
  assert.equal(taken.joined.state.players[1].name,'Second94');
  expectStatus(await call('second94','/invites94/enter',{id:substitute.id}),403);
  expansion.service.leave(taken.joined.token);
  expansion.service.leave(token);
  const publicRoom=expansion.service.join({game:'tressette',seats:4,name:'Host94'});
  expectStatus(await call('host94','/invites94/publish',{tableToken:publicRoom.token}),200);
  const browse=expectStatus(await call('second94','/invites94/browse'),200);
  assert.ok(browse.rooms.some(r=>r.room_id===publicRoom.state.roomId));
  const exact=expansion.service.join({roomId:publicRoom.state.roomId,name:'Second94'});
  assert.equal(exact.state.roomId,publicRoom.state.roomId);
  const everyone=await call('host94','/invites94/send',{tableToken:publicRoom.token,recipientUid:'second94',audience:'everyone',kind:'join'});
  expectStatus(everyone,403);
  const updated=expectStatus(await call('second94','/invites94/preferences',{direct:true,second_degree:true,public_invites:true,allow_watch:true}),200);
  assert.equal(updated.preferences.public_invites,true);
  expectStatus(await call('host94','/invites94/send',{tableToken:publicRoom.token,recipientUid:'second94',audience:'everyone',kind:'join'}),200);
  expansion.service.leave(exact.token);expansion.service.leave(publicRoom.token);
 }finally{
  await db.query("DELETE FROM nc_social_users WHERE uid=ANY($1::text[])",[['host94','friend94','bridge94','second94','blocked94']]);
  await db.end();
 }
});
