'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const CPU=require('../app/src/main/assets/chiodo.js');
const service=require('../chiodo-server/http.js');
const {resultSummary}=require('../app/src/main/assets/chiodo65.js');
const assets=path.join(__dirname,'../app/src/main/assets');
const engines=[['CPU',()=>new CPU(4,'ultra','pairs')],['server',()=>new service.Game(4,'pairs')]];

function closeHand(g,scores,leftovers,actor=0){
  g.players.forEach((p,i)=>{
    p.name='Giocatore '+i;p.score=scores[i];
    p.hand=(leftovers[i]||[]).map((v,j)=>({id:'remaining-'+i+'-'+j,s:i,v}));
  });
  g.players[actor].hand=[{id:'closing',s:0,v:7}];
  g.turn=actor;g.discard=[{id:'top',s:0,v:5}];g.suit=0;g.deck=[];g.penalty=0;g.pending=null;
  g.play(actor,'closing');
  assert.equal(g.ended,true);
  return g;
}
function view(g,seat=0){
  return {status:g.ended?'finished':'playing',seat,n:g.players.length,format:g.format,
    matchFinished:g.matchFinished,draw:g.isDraw,resultText:g.resultText,teamScores:g.teamScores,
    winners:g.winners,players:g.players.map((p,i)=>({name:p.name,score:p.score,count:p.hand.length,
      team:g.format==='pairs'?i%2:null,eliminated:g.format!=='pairs'&&p.score>=121}))};
}
function clean(users){for(const u of users){try{service.leave(u.token);}catch{}}}
function cardsConserved(g){
  const cards=[...g.deck,...g.discard,...g.players.flatMap(p=>p.hand)];
  assert.equal(cards.length,40);assert.equal(new Set(cards.map(c=>c.id)).size,40);
}

test('pairs requires four seats; individual remains available with two to four',()=>{
  for(const n of [2,3]){
    assert.throws(()=>new CPU(n,'medium','pairs'),/Formato/);
    assert.throws(()=>new service.Game(n,'pairs'),/Formato/);
    assert.throws(()=>service.join(n,'A','pairs'),/Modalita non valida/);
  }
  assert.throws(()=>new CPU(4,'medium','unknown'),/Formato/);
  assert.throws(()=>new service.Game(4,'unknown'),/Formato/);
  for(const n of [2,3,4]){
    assert.equal(new CPU(n).format,'individual');assert.equal(new service.Game(n).format,'individual');
  }
});

for(const [label,create] of engines){
  test(label+': a hand below 121 adds alternating teammates and keeps all four in the match',()=>{
    const g=closeHand(create(),[50,20,60,20],[[],[5],[7],[5]]);
    assert.deepEqual(g.teamScores,[117,50]);assert.equal(g.matchFinished,false);
    assert.equal(g.isDraw,false);assert.deepEqual(g.winners,[0,1,2,3]);
    assert.equal(CPU.settlementAmount(g,0),null);
    g.round();assert.deepEqual(g.active,[0,1,2,3]);
    assert.ok(g.players.every(p=>p.hand.length===5));assert.deepEqual(g.teamScores,[117,50]);
    cardsConserved(g);
  });
  test(label+': reaching exactly 121 ends the match and awards the other two seats',()=>{
    const g=closeHand(create(),[60,20,60,20],[[],[5],[1],[5]]);
    assert.deepEqual(g.teamScores,[121,50]);assert.equal(g.matchFinished,true);
    assert.deepEqual(g.winners,[1,3]);assert.equal(g.isDraw,false);
    assert.match(g.resultText,/squadra 2/);assert.throws(()=>g.round(),/Partita conclusa/);
    assert.deepEqual([0,1,2,3].map(i=>CPU.settlementAmount(g,i)),[0,200,0,200]);
  });
  test(label+': both teams over 121 compares their total penalties, not the player closing',()=>{
    const g=closeHand(create(),[50,55,65,60],[[],[10],[10],[5]]);
    assert.deepEqual(g.teamScores,[125,130]);assert.equal(g.matchFinished,true);
    assert.deepEqual(g.winners,[0,2]);assert.equal(g.isDraw,false);
    assert.deepEqual([0,1,2,3].map(i=>CPU.settlementAmount(g,i)),[200,0,200,0]);
  });
  test(label+': equal totals above the limit explicitly tie and return each entry once',()=>{
    const g=closeHand(create(),[50,55,65,60],[[],[5],[10],[5]]);
    assert.deepEqual(g.teamScores,[125,125]);assert.equal(g.matchFinished,true);
    assert.equal(g.isDraw,true);assert.match(g.resultText,/Pareggio/);
    assert.deepEqual(g.winners,[0,1,2,3]);assert.throws(()=>g.round(),/Partita conclusa/);
    assert.deepEqual([0,1,2,3].map(i=>CPU.settlementAmount(g,i)),[100,100,100,100]);
    assert.equal(typeof g.draw,'function','the draw-card method must remain callable');
  });
  test(label+': no individual elimination in pairs and both winning seats receive victory effects',()=>{
    const g=closeHand(create(),[120,0,0,0],[[5],[],[2],[2]],1);
    assert.deepEqual(g.active,[0,1,2,3]);
    assert.equal(g.players[0].score,125);assert.equal(view(g).players[0].eliminated,false);
    assert.equal(CPU.wonMatch(g,1),true);assert.equal(CPU.wonMatch(g,3),true);
    assert.equal(CPU.wonMatch(g,0),false);assert.equal(CPU.wonMatch(g,2),false);
  });
  test(label+': twenty complete pairs matches conserve the deck and finish at the team limit',()=>{
    for(let match=0;match<20;match++){
      const g=create();let hands=0;
      while(!g.matchFinished&&hands++<100){
        let turns=0;
        while(!g.ended&&turns++<10000){
          if(label==='CPU'&&g.turn!==0){g.bot();if(g.pending)g.resolve(g.pending.called||[]);}
          else assert.equal(g.autoMove(g.turnDeadline,true),true);
          cardsConserved(g);
        }
        assert.ok(turns<10000,'hand must terminate');
        assert.deepEqual(g.teamScores,[g.players[0].score+g.players[2].score,g.players[1].score+g.players[3].score]);
        if(!g.matchFinished){assert.ok(g.teamScores.every(n=>n<121));g.round();}
      }
      assert.ok(g.matchFinished&&hands<=100);assert.ok(g.teamScores.some(n=>n>=121));
      assert.equal(g.winners.length,g.isDraw?4:2);
      if(!g.isDraw){assert.ok(g.teamScores[g.winners[0]%2]<g.teamScores[1-g.winners[0]%2]);}
    }
  });
}

test('individual scoring, elimination, next hand and single-winner prizes remain unchanged',()=>{
  for(const create of [()=>new CPU(4),()=>new service.Game(4)]){
    const g=closeHand(create(),[10,120,10,10],[[],[5],[1],[2]]);
    assert.equal(g.matchFinished,false);assert.deepEqual(g.winners,[0,2,3]);
    assert.equal(CPU.settlementAmount(g,1),0);assert.equal(CPU.settlementAmount(g,0),null);
    g.round();assert.deepEqual(g.active,[0,2,3]);assert.equal(g.players[1].hand.length,0);
  }
  for(const n of [2,3,4]){
    const s={status:'finished',format:'individual',n,winners:[0],players:Array.from({length:n},()=>({}))};
    assert.equal(CPU.settlementAmount(s,0),n*100);assert.equal(CPU.settlementAmount(s,1),0);
  }
});

test('online matchmaking keeps individual and pairs rooms separate and retains the format',()=>{
  const users=[];
  try{
    const p0=service.join(4,'P0','pairs'),i0=service.join(4,'I0');users.push(p0,i0);
    const p1=service.join(4,'P1','pairs'),i1=service.join(4,'I1','individual');users.push(p1,i1);
    assert.equal(p0.state.id,p1.state.id);assert.equal(i0.state.id,i1.state.id);
    assert.notEqual(p0.state.id,i0.state.id);assert.equal(p0.state.format,'pairs');
    const room=service.auth(p0.token).room;service.tick(room,room.matchDeadline);
    const s=service.state(p0.token);
    assert.equal(s.format,'pairs');assert.equal(room.game.format,'pairs');assert.equal(s.botCount,2);
    assert.deepEqual(s.players.map(p=>p.team),[0,1,0,1]);assert.deepEqual(s.teamScores,[0,0]);
    assert.equal(s.hand.length,5);assert.ok(s.players.every(p=>!('hand' in p)));
  }finally{clean(users);}
});

test('online pairs can advance an unfinished hand from any seat but cannot restart a completed match',()=>{
  const users=Array.from({length:4},(_,i)=>service.join(4,'P'+i,'pairs'));
  try{
    const room=service.auth(users[0].token).room;
    closeHand(room.game,[50,20,60,20],[[],[5],[7],[5]]);
    let s=service.state(users[3].token);const revision=s.revision;
    assert.equal(s.matchFinished,false);assert.deepEqual(s.teamScores,[117,50]);
    s=service.move(users[3].token,{type:'next',revision});assert.equal(s.status,'playing');
    assert.throws(()=>service.move(users[3].token,{type:'next',revision}),/Stato aggiornato/);
    closeHand(room.game,[60,20,60,20],[[],[5],[1],[5]]);
    s=service.state(users[0].token);
    assert.equal(s.matchFinished,true);assert.deepEqual(s.winners,[1,3]);
    assert.ok(s.players.every(p=>!p.eliminated));
    for(const user of users)assert.throws(()=>service.move(user.token,{type:'next',revision:s.revision}),/non consentita/);
  }finally{clean(users);}
});

test('results show team totals, both winners and a final tie without individual elimination',()=>{
  const g=closeHand(new CPU(4,'ultra','pairs'),[50,55,65,60],[[],[10],[10],[5]]);
  const history=[50,55,65,60].map(before=>({before}));
  let model=resultSummary(view(g,2),history);
  assert.equal(model.title,'Vince la squadra 1');assert.equal(model.finished,true);assert.equal(model.win,true);
  assert.equal(model.rows.length,2);assert.deepEqual(model.rows.map(r=>r.total),[125,130]);
  assert.deepEqual(model.rows.map(r=>r.before),[115,115]);assert.deepEqual(model.rows.map(r=>r.delta),[10,15]);
  assert.deepEqual(model.rows.map(r=>r.own),[true,false]);assert.ok(model.rows.every(r=>!r.out));
  assert.match(model.subtitle,/200 crediti/);assert.match(model.foot,/SQUADRA/);
  const tied=closeHand(new CPU(4,'ultra','pairs'),[50,55,65,60],[[],[5],[10],[5]]);
  model=resultSummary(view(tied));assert.match(model.title,/Pareggio/);assert.equal(model.win,false);
  assert.match(model.subtitle,/100 crediti/);assert.ok(model.rows.every(r=>r.before===null));
});

function wallet(win={}){
  const store=new Map();win.NCRewardNative={accountScope:()=>'uid:test',sync(){}};win.addEventListener=()=>{};
  const document={getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null};
  vm.runInNewContext(fs.readFileSync(path.join(assets,'wallet.js'),'utf8'),{window:win,document,
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout:()=>0});
  return win.NC_WALLET;
}
test('pairs wallet divides the existing 400-credit pot without double settlement or extra entry charges',()=>{
  const final=closeHand(new CPU(4,'ultra','pairs'),[50,55,65,60],[[],[10],[10],[5]]);
  let distributed=0;
  for(let seat=0;seat<4;seat++){
    const w=wallet(),id='pairs-test';assert.equal(w.start(id),true);assert.equal(w.balance(),400);
    assert.equal(w.start(id),true);assert.equal(w.balance(),400);
    const amount=CPU.settlementAmount(final,seat);distributed+=amount;
    assert.equal(w.settle(id,amount),true);assert.equal(w.balance(),400+amount);
    assert.equal(w.settle(id,amount),false);assert.equal(w.settle(id,0),false);
    assert.equal(w.start(id),false);assert.equal(w.balance(),400+amount);
  }
  assert.equal(distributed,400);
  const tied=closeHand(new CPU(4,'ultra','pairs'),[50,55,65,60],[[],[5],[10],[5]]);
  for(let seat=0;seat<4;seat++){
    const w=wallet();w.start('tie');w.settle('tie',CPU.settlementAmount(tied,seat));assert.equal(w.balance(),500);
    assert.equal(w.settle('tie',100),false);assert.equal(w.balance(),500);
  }
});

// Execute the actual online controller with an isolated DOM and mocked transport.
// No request can reach the public Chiodo server.
function networkHarness(initial){
  class Element{
    constructor(){this.style={setProperty(){}};this.dataset={};this.children=[];this.elements=new Map();this.innerHTML='';this.value='';}
    append(...elements){this.children.push(...elements);}appendChild(el){this.append(el);return el;}
    prepend(el){this.children.unshift(el);}remove(){this.removed=true;}addEventListener(){}setAttribute(){}
    querySelector(selector){if(!this.elements.has(selector))this.elements.set(selector,new Element());return this.elements.get(selector);}
    querySelectorAll(){return [];}
  }
  const body=new Element(),lobby=new Element(),main=new Element();let entry=null,next=initial;
  lobby.querySelector=()=>entry;lobby.appendChild=el=>{entry=el;};
  const document={body,createElement:()=>new Element(),createTextNode:text=>({textContent:text}),
    getElementById:()=>main,querySelector:selector=>selector==='#root .games'?lobby:null,querySelectorAll:()=>[]};
  const requests=[],win={NC_CHIODO_SETTLEMENT:CPU.settlementAmount,NC_CHIODO_RULES(){},
    NC_CHIODO_TABLE(root,s){root.view=s;},NC80_IDENTITY:{get:()=>'QA',async sync(){}}};
  const w=wallet(win);
  const fetch=async(url,options)=>{
    const action=url.split('/').at(-1);requests.push({action,data:options.body?JSON.parse(options.body):null});
    const payload=action==='join'?{token:'test-token',state:next}:action==='state'?next:action==='realtime'?{chat:[],signals:[],voiceSeats:[]}:{};
    return {ok:true,json:async()=>payload};
  };
  vm.runInNewContext(fs.readFileSync(path.join(assets,'chiodo-network.js'),'utf8'),{
    window:win,document,fetch,MutationObserver:class{observe(){}},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}});
  return {win,w,requests,get root(){return body.children.find(el=>el.id==='chiodo121-online'&&!el.removed);},
    open(){entry.onclick();},setState(s){next=s;},
    async click(id,dataset={}){const button={id,dataset};await this.root.onclick({target:{closest:()=>button}});}};
}
function networkState(extra={}){
  return {id:'isolated-pair-room',format:'pairs',n:4,seat:0,revision:1,status:'playing',
    matchFinished:false,draw:false,teamScores:[0,0],turn:0,hand:[{id:'mine',s:0,v:7}],
    players:Array.from({length:4},(_,i)=>({name:'P'+i,score:0,count:5,team:i%2})),
    top:{id:'top',s:0,v:5},suit:0,deckCount:19,realCount:4,botCount:0,
    ...extra};
}
test('online controller renders final pairs result, pays 200 once and offers lobby instead of next hand',async()=>{
  const h=networkHarness(networkState());h.open();await h.click('',{format:'pairs'});await h.click('co-find-players');
  assert.deepEqual(h.requests.find(r=>r.action==='join').data,{n:4,format:'pairs',name:'QA'});
  assert.equal(h.w.balance(),400);
  h.setState(networkState({status:'finished',revision:2,matchFinished:false,winners:[0,1,2,3]}));
  await h.win.NC69_CHIODO_NETWORK.refresh();assert.equal(h.w.balance(),400);
  assert.match(h.root.querySelector('#co-controls').innerHTML,/co-next/);
  const final=networkState({status:'finished',revision:3,matchFinished:true,winners:[0,2],teamScores:[80,121],resultText:'Vince la squadra 1'});
  h.setState(final);await h.win.NC69_CHIODO_NETWORK.refresh();
  assert.equal(h.w.balance(),600);assert.match(h.root.view.message,/squadra 1/);
  assert.doesNotMatch(h.root.querySelector('#co-controls').innerHTML,/co-next/);
  assert.match(h.root.querySelector('#co-controls').innerHTML,/data-ch-match-finished="true"/);
  h.setState({...final,revision:4});await h.win.NC69_CHIODO_NETWORK.refresh();assert.equal(h.w.balance(),600);
  await h.click('co-close');assert.equal(h.w.balance(),600);
});
test('online controller rejects pairs silently downgraded by an older individual server',async()=>{
  const h=networkHarness(networkState({format:'individual'}));h.open();await h.click('',{format:'pairs'});await h.click('co-find-players');
  assert.equal(h.w.balance(),500);assert.match(h.root.querySelector('#co-error').textContent,/aggiornato/);
  assert.ok(h.requests.some(r=>r.action==='leave'));assert.equal(h.win.NC69_CHIODO_NETWORK.getToken(),undefined);
  await h.click('co-close');
});
