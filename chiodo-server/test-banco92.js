'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const banco=require('./banco92.js'),core=require('./banco92-core.js');
function player(i,rng=()=>.5){
 return {uid:'u'+i,nickname:'Giocatore '+i,tickets:[core.createTicket()],left_at:null};
}
function room(n=12){
 return {id:'0'.repeat(32),mode:'public',capacity:n,code:null,host_uid:'u1',status:'waiting',state:{},created_at:new Date()};
}
test('capacity and shared extraction settings',()=>{
 assert.equal(banco.MAX_PLAYERS,12);
 assert.equal(banco.MIN_PLAYERS,2);
 assert.equal(banco.INTERVAL_MS,6000);
 assert.equal(banco.WAIT_MS,30000);
});
test('No game starts alone; start at two players; no bots',()=>{
 const r=room(),one=[player(1)],two=[...one,player(2)];
 assert.equal(banco.start(r,one,1000),false);
 assert.equal(banco.simulate(r,one,2000),false);
 assert.equal(banco.simulate(r,two,2000),true);
 assert.equal(r.status,'waiting');
 assert.equal(r.state.waitUntil,32000);
 assert.equal(banco.simulate(r,two,32000),true);
 assert.equal(r.status,'playing');
 assert.equal(r.state.drawn.length,0);
 assert.equal(r.state.deck.length,90);
});
test('Identical server stream for all members without duplicate numbers',()=>{
 const players=[player(1),player(2),player(3)],r=room(3);
 assert.equal(banco.start(r,players,1000),true);
 let now=7000;
 for(let i=0;i<90&&r.status==='playing';i++){
  assert.equal(banco.simulate(r,players,now),true);
  assert.equal(new Set(r.state.drawn).size,r.state.drawn.length);
  if(r.status==='playing')assert.equal(banco.simulate(r,players,now+10),false);
  now+=6000;
 }
 assert.equal(r.status,'finished');
 assert(r.state.awards.Tombola);
});
test('Shared winner ties on same extraction and no duplicate award',()=>{
 const grid=core.createTicket();
 const players=[
  {uid:'u1',nickname:'A',tickets:[grid],left_at:null},
  {uid:'u2',nickname:'B',tickets:[grid],left_at:null}
 ];
 const r=room(2);
 assert(banco.start(r,players,1000));
 const matches=grid[0].filter(x=>x!==null);
 const remaining=r.state.deck.filter(x=>!matches.includes(x));
 r.state.deck=[...remaining,...matches.slice().reverse()];
 r.state.nextAt=1000;
 let now=1000;
 for(let i=0;i<5;i++){
  assert(banco.simulate(r,players,now));
  now+=6000;
 }
 assert.deepEqual(r.state.awards.Ambo,['A','B']);
 assert.deepEqual(r.state.awards.Cinquina,['A','B']);
});
test('No private deck or other player tickets exposed via snapshot',()=>{
 const r=room(2),players=[player(1),player(2)];
 banco.start(r,players,500);
 const snap=banco.snapshot(r,players,'u1');
 assert.equal(snap.tickets.length,1);
 assert.equal(snap.players.length,2);
 assert.equal(snap.room.hostUid,undefined);
 assert.equal(snap.deck,undefined);
 assert.equal(snap.players[1].tickets,undefined);
 assert.equal(JSON.stringify(snap).includes('"deck"'),false);
});
test('No unverified credits, cash betting, or client-generated prizes',()=>{
 const fs=require('node:fs'),src=fs.readFileSync(__dirname+'/banco92.js','utf8');
 assert(!src.includes('NC_MARKET_SPENDING_ENABLED'));
 assert(src.includes("const uid=await social.firebase(req)"));
 assert(src.includes("pg_advisory_xact_lock(920012)"));
 assert(src.includes("SELECT * FROM nc_banco92_rooms WHERE id=$1 FOR UPDATE"));
 assert(src.includes("core.scan("));
});
