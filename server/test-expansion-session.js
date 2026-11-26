(function sessionRegressionTests(){
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const Session=require('../app/src/main/assets/expansion-session.js');
function fixture(){
 let serial=1,seed=923,time=1000000;
 const service=Session.createService({now:()=>time,token:()=>(serial++).toString(16).padStart(8,'0')+'a'.repeat(40),random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),botDelay:700});
 return{service,advance:ms=>{time+=ms;},join:(o={})=>service.join({game:'tressette',seats:2,name:'Tester',...o})};
}
function play(service,token,id='move-test-0001'){
 const s=service.state(token);return service.move(token,{revision:s.revision,action:s.actions[0],requestId:id});
}
test('catalog exposes all eleven playable games and version 9.3',()=>{
 const f=fixture(),c=f.service.catalog();assert.equal(c.length,11);assert.equal(new Set(c.map(x=>x.id)).size,11);
 assert.ok(c.every(x=>x.rules&&x.seats.length&&x.status==='playable'));assert.equal(Session.VERSION,'9.3.0');
 assert.throws(()=>f.join({game:'missing'}));assert.throws(()=>f.join({seats:99}));assert.equal(f.service.size(),0);
});
test('public rooms separate games and seat counts',()=>{
 const f=fixture(),a=f.join(),b=f.join({seats:4}),c=f.join({game:'cucu'}),d=f.join({name:'Secondo'});
 const av=f.service.state(a.token),dv=f.service.state(d.token);
 assert.equal(av.roomId,dv.roomId);assert.equal(av.status,'playing');assert.equal(av.humanCount,2);assert.equal(av.botCount,0);
 assert.notEqual(av.roomId,b.state.roomId);assert.notEqual(av.roomId,c.state.roomId);assert.equal(f.service.state(b.token).status,'waiting');
});
test('private invite selects its exact room and rejects absent/full codes',()=>{
 const f=fixture(),a=f.join({game:'tressette_morto',seats:3,private:true}),pub=f.join();
 assert.match(a.state.code,/^[A-Z0-9]{8}$/);assert.throws(()=>f.join({invite:'MISSING8'}));
 const b=f.join({invite:a.state.code,game:'ignored',seats:99}),c=f.join({invite:a.state.code.toLowerCase()});
 const v=f.service.state(c.token);assert.equal(v.game,'tressette_morto');assert.equal(v.status,'playing');assert.equal(v.seats,3);
 assert.equal(b.state.roomId,a.state.roomId);assert.notEqual(pub.state.roomId,a.state.roomId);assert.throws(()=>f.join({invite:a.state.code}));
});
test('CPU rooms remain isolated from online matchmaking',()=>{
 const f=fixture(),cpu=f.join({bot:true}),human=f.join();assert.equal(cpu.state.botCount,1);assert.equal(cpu.state.status,'playing');
 assert.equal(human.state.status,'waiting');assert.notEqual(cpu.state.roomId,human.state.roomId);
});
test('only host may explicitly fill after thirty seconds',()=>{
 const f=fixture(),a=f.join({seats:4}),b=f.join({seats:4});
 f.advance(29999);assert.throws(()=>f.service.fill(a.token));f.advance(1);
 assert.equal(f.service.state(a.token).canFill,true);assert.equal(f.service.state(b.token).canFill,false);assert.throws(()=>f.service.fill(b.token));
 const s=f.service.fill(a.token);assert.equal(s.status,'playing');assert.equal(s.humanCount,2);assert.equal(s.botCount,2);
});
test('private hands and bearer tokens never appear in another player view',()=>{
 const f=fixture(),a=f.join(),b=f.join(),av=f.service.state(a.token),bv=f.service.state(b.token);
 assert.equal(av.hand.length,10);assert.equal(bv.hand.length,10);
 assert.ok(av.hand.every(c=>!bv.hand.some(d=>d.id===c.id)));assert.ok(av.players.every(p=>!Object.hasOwn(p,'hand')&&!Object.hasOwn(p,'token')));
 assert.ok(!JSON.stringify(av).includes(b.token));assert.equal(av.deck,undefined);
 assert.throws(()=>f.service.state(a.token+'x'),e=>e.status===401);
});
test('stale or illegal actions are rejected atomically and successful IDs are idempotent',()=>{
 const f=fixture(),a=f.join();f.join();const before=f.service.state(a.token);
 assert.throws(()=>f.service.move(a.token,{revision:before.revision,action:{type:'play',card:'forged-card'},requestId:'illegal-0001'}));
 const still=f.service.state(a.token);assert.equal(still.revision,before.revision);assert.deepEqual(still.hand,before.hand);
 const payload={revision:before.revision,action:before.actions[0],requestId:'retry-123456'};
 const one=f.service.move(a.token,payload),two=f.service.move(a.token,payload);assert.equal(one.revision,two.revision);assert.deepEqual(one.hand,two.hand);
 assert.throws(()=>f.service.move(a.token,{...payload,requestId:'different-123'}),e=>e.status===409);
});
test('turn expires after exactly sixty seconds and performs one legal move',()=>{
 const f=fixture(),a=f.join();f.join();const before=f.service.state(a.token);
 f.advance(59999);assert.equal(f.service.state(a.token).revision,before.revision);f.advance(1);
 const after=f.service.state(a.token);assert.equal(after.revision,before.revision+1);assert.equal(after.hand.length,9);assert.equal(after.turn,1);
 assert.equal(after.turnDeadline-after.serverNow,60000);assert.match(after.log[0],/Tempo scaduto/);
});
test('CPU delay and leaving replace the player without leaking or losing the hand',()=>{
 const f=fixture(),a=f.join({bot:true});const after=play(f.service,a.token);
 f.advance(699);assert.equal(f.service.state(a.token).revision,after.revision);f.advance(1);assert.ok(f.service.state(a.token).revision>after.revision);
 assert.deepEqual(f.service.leave(a.token),{ok:true});assert.equal(f.service.size(),0);assert.throws(()=>f.service.state(a.token),e=>e.status===401);
 const g=fixture(),first=g.join(),second=g.join();g.service.leave(first.token);const view=g.service.state(second.token);
 assert.equal(view.players[0].bot,true);assert.equal(view.humanCount,1);assert.equal(view.players[0].handCount,10);
 g.service.leave(second.token);assert.equal(g.service.size(),0);
});
test('waiting departure reassigns host and cleanup expires inactive rooms',()=>{
 const f=fixture(),a=f.join({seats:4}),b=f.join({seats:4});f.service.leave(a.token);assert.equal(f.service.state(b.token).seat,0);
 f.advance(180001);f.service.tick();assert.equal(f.service.size(),0);assert.throws(()=>f.service.state(b.token),e=>e.status===401);
});
test('display names are bounded and strip markup/control characters',()=>{
 const f=fixture(),a=f.join({name:'<b>\u0000'+ 'x'.repeat(100)});assert.ok(a.state.players[0].name.length<=24);assert.ok(!/[<>\u0000]/.test(a.state.players[0].name));
});
for(const entry of Session.catalog()){
 test('complete CPU game through session: '+entry.id,()=>{
  const f=fixture(),u=f.join({game:entry.id,seats:entry.seats[0],bot:true});let s=u.state,moves=0;
  while(s.status==='playing'&&moves++<10000){
   if(s.turn===s.seat){assert.ok(s.actions.length,'human needs legal action');s=f.service.move(u.token,{revision:s.revision,action:s.actions[0],requestId:'game-'+entry.id+'-'+moves});}
   else{f.advance(1000);s=f.service.state(u.token);}
  }
  assert.equal(s.status,'finished',entry.id+' must finish');assert.ok(s.result);f.service.leave(u.token);assert.equal(f.service.size(),0);
 });
}
async function route(path,method='GET',data,token){
 const router=require('../chiodo-server/expansion.js');const req=Readable.from(data===undefined?[]:[typeof data==='string'?data:JSON.stringify(data)]);
 req.method=method;req.headers=token?{authorization:'Bearer '+token}:{};req.socket={remoteAddress:'127.0.0.93'};
 let output;await router.route(req,(status,body)=>{output={status,body};},path);return output;
}
test('HTTP catalogue, authentication, payload and method validation',async()=>{
 const c=await route('/expansion/catalog');assert.equal(c.status,200);assert.equal(c.body.version,'9.3.0');assert.equal(c.body.games.length,11);
 assert.equal((await route('/expansion/state')).status,401);assert.equal((await route('/expansion/join','GET')).status,405);
 assert.equal((await route('/expansion/join','POST','{')).status,400);assert.equal((await route('/expansion/join','POST','x'.repeat(17000))).status,413);
 assert.equal((await route('/expansion/missing','POST',{})).status,404);
});
test('HTTP online rooms force real humans and execute a private two-client game',async()=>{
 let a,b;
 try{
  a=await route('/expansion/join','POST',{game:'tressette',seats:2,name:'Alice test',bot:true,private:true});
  assert.equal(a.status,200);assert.equal(a.body.state.status,'waiting');assert.equal(a.body.state.botCount,0);
  b=await route('/expansion/join','POST',{invite:a.body.state.code,name:'Bruno test'});assert.equal(b.status,200);
  let av=(await route('/expansion/state','GET',undefined,a.body.token)).body,bv=b.body.state;
  assert.equal(av.status,'playing');assert.ok(av.hand.every(c=>!bv.hand.some(d=>d.id===c.id)));
  const played=await route('/expansion/move','POST',{revision:av.revision,action:av.actions[0],requestId:'http-move-0001'},a.body.token);
  assert.equal(played.status,200);assert.equal(played.body.hand.length,9);
  bv=(await route('/expansion/state','GET',undefined,b.body.token)).body;
  assert.equal((await route('/expansion/move','POST',{revision:bv.revision,action:bv.actions[0],requestId:'http-move-0002'},b.body.token)).status,200);
 }finally{if(a?.body.token)await route('/expansion/leave','POST',{},a.body.token);if(b?.body.token)await route('/expansion/leave','POST',{},b.body.token);}
});
})();
