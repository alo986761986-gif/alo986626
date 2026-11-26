'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const engines=require('../app/src/main/assets/expansion-tricks.js');
function random(seed){return function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function clone(x){return JSON.parse(JSON.stringify(x));}
function card(s,v){return {id:'c'+(s*10+v-1),s,v};}
function allCards(s){
  const people=s.players.concat(s.dummy?[s.dummy]:[]);
  return s.deck.concat(s.discard,s.trick.map(x=>x.card),people.flatMap(p=>p.hand.concat(p.won)));
}
function conserved(s){
  const cards=allCards(s);assert.equal(cards.length,40);assert.equal(new Set(cards.map(c=>c.id)).size,40);
  assert.ok(cards.every(c=>Number.isInteger(c.s)&&c.s>=0&&c.s<=3&&Number.isInteger(c.v)&&c.v>=1&&c.v<=10));
}
function walk(engine,state,seed=7){
  let s=state,steps=0,rng=random(seed);
  while(s.status==='playing'&&steps++<1000){
    assert.ok(Number.isInteger(s.turn)&&s.turn>=0&&s.turn<s.seats);
    const prior=JSON.stringify(s),a=engine.chooseBot(s,s.turn,rng);
    assert.equal(JSON.stringify(s),prior,'bot selection must not mutate the state');
    assert.ok(engine.actions(s,s.turn).some(x=>JSON.stringify(x)===JSON.stringify(a)),'bot must return an offered action');
    for(let viewer=0;viewer<s.seats;viewer++){
      const v=engine.view(s,viewer);assert.deepEqual(v.hand,s.players[viewer].hand);
      assert.equal(v.players.length,s.seats);assert.ok(v.players.every(p=>!Object.hasOwn(p,'hand')&&!Object.hasOwn(p,'won')));
      if(viewer!==s.turn)assert.deepEqual(v.actions,[]);
      assert.ok(!Object.hasOwn(v,'deck')&&!Object.hasOwn(v,'discard'));
    }
    s=clone(s);engine.apply(s,s.turn,a);conserved(s);
  }
  assert.ok(steps<1000,'match must finish');assert.equal(s.status,'finished');
  assert.ok(s.result&&s.result.winners.length>0);
  assert.ok(s.result.winners.every(i=>Number.isInteger(i)&&i>=0&&i<s.seats));
  assert.deepEqual(engine.actions(s,s.turn),[]);
  return s;
}
function endFixture(s,hands,raw){
  s.deck=[];s.discard=[];s.trick=[];s.lastTrick=[];s.phase='play';s.status='playing';s.position=0;s.turn=0;
  s.players.forEach((p,i)=>{p.hand=hands[i];p.won=[];p.thirds=raw?raw[i]:0;p.score=0;});
}
test('catalog, seats and JSON-only state follow the expansion contract',()=>{
  assert.deepEqual(Object.keys(engines).sort(),['briscola_chiamata','traversone','tressette','tressette_morto']);
  for(const [id,e] of Object.entries(engines)){
    assert.equal(e.id,id);assert.ok(e.title&&e.rules.length>100);assert.throws(()=>e.create({seats:99}),/giocatori/);
    assert.throws(()=>e.create({seats:e.seats[0],random:()=>1}),/casuale/);
    for(const seats of e.seats){
      const s=e.create({seats,random:random(3)}),serialized=JSON.stringify(s);
      assert.equal(JSON.stringify(clone(s)),serialized);assert.equal(s.players.length,seats);conserved(s);
      assert.deepEqual(e.actions(s,-1),[]);assert.deepEqual(e.actions(s,seats),[]);
      assert.throws(()=>e.view(s,seats),/Posto/);
    }
  }
});
test('illegal actions and wrong turns reject without changing any state',()=>{
  for(const e of Object.values(engines)){
    const s=e.create({seats:e.seats[0],random:random(6)}),before=JSON.stringify(s);
    assert.throws(()=>e.apply(s,s.turn,{type:'not-a-move'}),/Mossa/);
    const a=e.actions(s,s.turn)[0];
    assert.throws(()=>e.apply(s,(s.turn+1)%s.seats,a),/Mossa/);
    assert.throws(()=>e.apply(s,s.turn,{...a,forged:true}),/Mossa/);
    assert.equal(JSON.stringify(s),before);
  }
});
for(const [id,e] of Object.entries(engines))for(const seats of e.seats){
  test(id+' '+seats+' seats: 25 complete serializable matches, legal bots and private views',()=>{
    for(let seed=1;seed<=25;seed++){
      const s=walk(e,e.create({seats,random:random(seed*37+seats)}),seed);
      const total=s.scores.reduce((n,x)=>n+x.points,0);
      if(id==='tressette'||id==='tressette_morto')assert.equal(total,11);
      if(id==='traversone')assert.ok(total===11||total===11*(seats-1));
      if(id==='briscola_chiamata'){
        assert.equal(total,120);assert.ok(s.partnerRevealed);
        assert.equal(s.result.winners.length,s.scores[0].points>=s.contract?2:3);
        assert.deepEqual(s.result.winners,s.scores[s.scores[0].points>=s.contract?0:1].members);
      }
      if(id==='tressette'&&seats===4)assert.ok([JSON.stringify([0,2]),JSON.stringify([1,3])].includes(JSON.stringify(s.result.winners)));
      if(id==='tressette_morto')assert.ok([JSON.stringify([0]),JSON.stringify([1,2])].includes(JSON.stringify(s.result.winners)));
    }
  });
}
test('Tressette enforces suit even when an off-suit Three is available',()=>{
  const e=engines.tressette,s=e.create({seats:4,random:random(9)});
  s.players[0].hand=[card(0,4)];s.players[1].hand=[card(0,5),card(1,3)];
  e.apply(s,0,e.actions(s,0)[0]);
  assert.deepEqual(e.actions(s,1).map(x=>x.card),[card(0,5).id]);
  const before=JSON.stringify(s);assert.throws(()=>e.apply(s,1,{type:'play',card:card(1,3).id}),/Mossa/);assert.equal(JSON.stringify(s),before);
});
test('Tressette order Three, Two, Ace beats King, with no off-suit trump',()=>{
  const e=engines.tressette,s=e.create({seats:4,random:random(9)});
  endFixture(s,[[card(0,1)],[card(0,3)],[card(0,2)],[card(0,10)]],[0,0,0,0]);
  while(s.status==='playing')e.apply(s,s.turn,e.actions(s,s.turn)[0]);
  assert.equal(s.lastWinner,1);assert.equal(s.players[1].won.length,4);
});
test('team thirds are combined before flooring, and last trick contributes one point',()=>{
  const e=engines.tressette,s=e.create({seats:4,random:random(10)});
  endFixture(s,[[card(0,3)],[card(0,2)],[card(0,10)],[card(0,8)]],[1,12,2,13]);
  while(s.status==='playing')e.apply(s,s.turn,e.actions(s,s.turn)[0]);
  assert.deepEqual(s.scores.map(x=>x.thirds),[10,25]);assert.deepEqual(s.scores.map(x=>x.points),[3,8]);
  assert.deepEqual(s.result.winners,[1,3]);assert.equal(s.players[0].thirds,8);
});
test('two-player variant draws winner first and publishes only the newly exposed draws',()=>{
  const e=engines.tressette,s=e.create({seats:2,random:random(2)});
  s.players[0].hand[0]=card(0,4);s.players[1].hand=[card(0,3)].concat(s.players[1].hand.filter(c=>c.s!==0).slice(0,9));
  const top=s.deck.at(-1).id,next=s.deck.at(-2).id;
  e.apply(s,0,{type:'play',card:card(0,4).id});
  e.apply(s,1,{type:'play',card:card(0,3).id});
  assert.equal(s.lastWinner,1);assert.equal(s.deck.length,18);
  assert.deepEqual(s.lastDraws.map(x=>[x.seat,x.card.id]),[[1,top],[0,next]]);
  assert.deepEqual(e.view(s,0).lastDraws,s.lastDraws);
});
test('Traversone at three requires dealer discard, kept hidden until the last trick',()=>{
  const e=engines.traversone,s=e.create({seats:3,random:random(4)});
  assert.equal(s.phase,'discard');assert.equal(s.turn,2);assert.deepEqual(s.players.map(p=>p.hand.length),[13,13,14]);
  const selected=e.actions(s,2)[0];e.apply(s,2,selected);assert.equal(s.phase,'play');assert.equal(s.turn,0);
  const v=e.view(s,0);assert.equal(v.discardCount,1);assert.ok(!Object.hasOwn(v,'discard'));conserved(s);
  const final=walk(e,s);assert.equal(final.discard.length,0);
  assert.ok(final.players[final.lastWinner].won.some(c=>c.id===selected.card));
});
test('Traversone assigns fractional remainder to last winner so penalties total eleven',()=>{
  const e=engines.traversone,s=e.create({seats:4,random:random(5)});
  endFixture(s,[[card(0,4)],[card(0,5)],[card(0,6)],[card(0,7)]],[5,7,8,12]);
  while(s.status==='playing')e.apply(s,s.turn,e.actions(s,s.turn)[0]);
  assert.equal(s.lastWinner,3);assert.deepEqual(s.scores.map(x=>x.points),[1,2,2,6]);
  assert.deepEqual(s.result.winners,[0]);
});
test('Traversone cappotto reverses eleven penalties to every opponent',()=>{
  const e=engines.traversone,s=e.create({seats:4,random:random(5)});
  endFixture(s,[[card(0,4)],[card(0,5)],[card(0,6)],[card(0,7)]],[0,0,0,32]);
  while(s.status==='playing')e.apply(s,s.turn,e.actions(s,s.turn)[0]);
  assert.deepEqual(s.scores.map(x=>x.points),[11,11,11,0]);assert.deepEqual(s.result.winners,[3]);assert.match(s.result.text,/Cappotto/);
});
test('Morto opens after the first lead and its controller cannot substitute their own hand',()=>{
  const e=engines.tressette_morto,s=e.create({seats:3,random:random(14)});
  assert.deepEqual(s.controllers,[0,1,0,2]);assert.equal(s.turn,1);
  for(let i=0;i<3;i++)assert.deepEqual(e.view(s,i).extraHands,[]);
  e.apply(s,1,e.actions(s,1)[0]);assert.equal(s.position,2);assert.equal(s.turn,0);
  for(let i=0;i<3;i++)assert.deepEqual(e.view(s,i).extraHands[0].cards,s.dummy.hand);
  const own=clone(s.players[0].hand),dummyLength=s.dummy.hand.length,forbidden={type:'play',card:own[0].id};
  assert.throws(()=>e.apply(s,0,forbidden),/Mossa/);
  e.apply(s,0,e.chooseBot(s,0));assert.deepEqual(s.players[0].hand,own);assert.equal(s.dummy.hand.length,dummyLength-1);assert.equal(s.turn,2);
});
test('Briscola auction has permanent passes and forces the last remaining player to open',()=>{
  const e=engines.briscola_chiamata,s=e.create({seats:5,random:random(7)});
  for(let i=0;i<4;i++){assert.equal(s.turn,i);e.apply(s,i,{type:'pass'});}
  assert.equal(s.turn,4);assert.equal(s.highBidder,null);assert.ok(!e.actions(s,4).some(a=>a.type==='pass'));
  assert.equal(e.actions(s,4)[0].points,61);e.apply(s,4,{type:'bid',points:61});
  assert.equal(s.phase,'call');assert.equal(s.contract,61);assert.equal(s.highBidder,4);
});
test('Briscola auction rejects 60, repeated or oversized bids without mutation',()=>{
  const e=engines.briscola_chiamata,s=e.create({seats:5,random:random(8)});
  for(const points of [60,121,61.5]){
    const before=JSON.stringify(s);assert.throws(()=>e.apply(s,0,{type:'bid',points}),/Mossa/);assert.equal(JSON.stringify(s),before);
  }
  e.apply(s,0,{type:'bid',points:61});const before=JSON.stringify(s);
  assert.throws(()=>e.apply(s,1,{type:'bid',points:61}),/Mossa/);assert.equal(JSON.stringify(s),before);
  e.apply(s,1,{type:'bid',points:120});assert.equal(s.phase,'call');assert.equal(s.contract,120);assert.equal(s.turn,1);
});
test('called card cannot be owned by caller; partner is private until its card is played',()=>{
  const e=engines.briscola_chiamata,s=e.create({seats:5,random:random(13)});
  e.apply(s,0,{type:'bid',points:120});const own=s.players[0].hand[0];
  const before=JSON.stringify(s);assert.throws(()=>e.apply(s,0,{type:'call',card:own.id}),/Mossa/);assert.equal(JSON.stringify(s),before);
  const called=e.actions(s,0)[0];e.apply(s,0,called);assert.notEqual(s.partner,0);assert.equal(s.turn,0);
  for(let viewer=0;viewer<5;viewer++){
    const v=e.view(s,viewer);assert.equal(v.partner,null);assert.equal(v.partnerRevealed,false);assert.equal(v.contract,120);
    assert.equal(v.calledCard.id,called.card);assert.ok(v.players.every(p=>!Object.hasOwn(p,'team')));
    assert.equal(v.privateRole,viewer===0?'chiamante':viewer===s.partner?'socio':'difensore');
  }
  while(s.status==='playing'&&!s.partnerRevealed){
    const actions=e.actions(s,s.turn),a=s.turn===s.partner?actions.find(x=>x.card===called.card):actions.find(x=>x.card!==called.card);
    e.apply(s,s.turn,a);
  }
  assert.equal(s.partnerRevealed,true);
  for(let i=0;i<5;i++)assert.equal(e.view(s,i).partner,s.partner);
});
test('Briscola has no follow-suit obligation and even a low trump beats an off-suit Ace',()=>{
  const e=engines.briscola_chiamata,s=e.create({seats:5,random:random(11)});
  s.phase='play';s.highBidder=4;s.partner=0;s.calledCard=card(0,1);s.trump=2;s.contract=61;
  endFixture(s,[[card(0,1)],[card(0,7),card(2,2)],[card(0,3)],[card(1,1)],[card(3,1)]],[0,0,0,0,0]);
  e.apply(s,0,{type:'play',card:card(0,1).id});assert.equal(e.actions(s,1).length,2);
  e.apply(s,1,{type:'play',card:card(2,2).id});
  for(let i=2;i<5;i++)e.apply(s,i,e.actions(s,i)[0]);
  assert.equal(s.lastWinner,1);assert.equal(s.players[1].score,43);
});
test('views are detached copies and never expose hidden stock or captured hands',()=>{
  for(const e of Object.values(engines)){
    const s=e.create({seats:e.seats[0],random:random(21)}),before=JSON.stringify(s),v=e.view(s,0);
    v.hand.splice(0);v.players[0].score=999;v.log.push('tamper');v.actions.splice(0);
    assert.equal(JSON.stringify(s),before);assert.ok(!Object.hasOwn(v,'controllers')&&!Object.hasOwn(v,'dummy'));
  }
});
