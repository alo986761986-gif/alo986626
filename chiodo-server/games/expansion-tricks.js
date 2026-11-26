(function(root,factory){
  'use strict';
  var engines=factory();
  if(typeof module==='object'&&module.exports)module.exports=engines;
  if(root)Object.assign(root.NC_EXPANSION_RULES||(root.NC_EXPANSION_RULES={}),engines);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Reconstructed and independently verified after the local workspace was lost.
  var SUITS=['Denari','Coppe','Spade','Bastoni'];
  var TRE_RANK={4:0,5:1,6:2,7:3,8:4,9:5,10:6,1:7,2:8,3:9};
  var BRI_RANK={2:0,4:1,5:2,6:3,7:4,8:5,9:6,10:7,3:8,1:9};
  var TRE_RULES='Partita breve di una smazzata, senza accusi. Nessuna briscola: obbligo di rispondere al seme. Ordine di presa: 3, 2, Asso, Re, Cavallo, Fante, 7, 6, 5, 4. Asso 1 punto; 2, 3 e figure un terzo; ultima presa 1 punto. Si sommano i terzi della squadra e solo alla fine si arrotonda per difetto: 11 punti complessivi. A quattro, coppie alternate 1+3 contro 2+4. A due, variante con 10 carte ciascuno e 20 nel tallone: dopo ogni presa pesca prima chi ha preso, poi l’altro, mostrando le due carte pescate. Vince chi ottiene più punti.';
  var TRA_RULES='Traversone a 3, 4 o 5: una smazzata, ognuno per sé, senza accusi. Ordine e obbligo di seme del Tressette; vince chi fa meno penalità. A tre, il mazziere riceve 14 carte, gli altri 13: il mazziere scarta una carta coperta, assegnata a chi fa l’ultima presa. Gli altri arrotondano per difetto; chi fa l’ultima presa riceve i punti mancanti fino a 11. Cappotto: chi ottiene tutti gli 11 punti segna 0, ciascun avversario 11. Parità ammessa.';
  var MOR_RULES='Tressette col morto: tre persone e quattro mani da 10 carte, una sola smazzata senza accusi. Il posto 1 è solista e controlla anche il morto, seduto di fronte: ordine fisico solista, difensore 1, morto, difensore 2. Comincia il primo difensore. La mano del morto si scopre dopo la prima carta giocata e diventa pubblica. Ogni mano deve rispondere al seme separatamente. Solista+morto contro i due difensori; punti in terzi sommati per squadra prima dell’arrotondamento, ultima presa 1 punto, totale 11.';
  var BRI_RULES='Briscola chiamata in cinque: una smazzata, 8 carte ciascuno. Variante con asta crescente a punti da 61 a 120; chi passa esce dall’asta. Se tutti gli altri passano senza offerte, l’ultimo deve aprire almeno a 61. Il vincitore chiama una carta che non possiede: il seme diventa briscola e il possessore è il socio segreto. Il socio viene rivelato pubblicamente solo quando gioca quella carta. Nessun obbligo di seme. Asso 11, Tre 10, Re 4, Cavallo 3, Fante 2; altre carte 0, totale 120. Chiamante e socio devono raggiungere il contratto; altrimenti vincono gli altri tre. Nessuna puntata o denaro reale.';

  function copy(x){return x==null?x:JSON.parse(JSON.stringify(x));}
  function cardName(c){return (c.v===1?'Asso':c.v===8?'Fante':c.v===9?'Cavallo':c.v===10?'Re':String(c.v))+' di '+SUITS[c.s];}
  function deck(){return Array.from({length:40},function(_,i){return {id:'c'+i,s:Math.floor(i/10),v:i%10+1};});}
  function shuffle(cards,random){
    for(var i=cards.length-1;i>0;i--){
      var r=Number(random());
      if(!Number.isFinite(r)||r<0||r>=1)throw Error('Generatore casuale non valido');
      var j=Math.floor(r*(i+1)),t=cards[i];cards[i]=cards[j];cards[j]=t;
    }
    return cards;
  }
  function thirds(c){return c.v===1?3:([2,3,8,9,10].includes(c.v)?1:0);}
  function briPoints(c){return c.v===1?11:c.v===3?10:c.v===10?4:c.v===9?3:c.v===8?2:0;}
  function isMorto(s){return s.id==='tressette_morto';}
  function isBriscola(s){return s.id==='briscola_chiamata';}
  function owner(s,pos){return s.controllers[pos];}
  function participant(s,pos){return isMorto(s)&&pos===2?s.dummy:s.players[owner(s,pos)];}
  function positionName(s,pos){return isMorto(s)&&pos===2?'Morto':s.players[owner(s,pos)].name||'Giocatore '+(owner(s,pos)+1);}
  function playerName(s,seat){return s.players[seat].name||'Giocatore '+(seat+1);}
  function setTurn(s,pos){s.position=pos;s.turn=owner(s,pos);}
  function log(s,text){s.message=text;s.log.push(text);if(s.log.length>36)s.log.shift();}
  function sameAction(a,b){
    if(!a||typeof a!=='object'||Array.isArray(a))return false;
    var ak=Object.keys(a).filter(function(k){return k!=='label';}).sort();
    var bk=Object.keys(b).filter(function(k){return k!=='label';}).sort();
    return ak.length===bk.length&&ak.every(function(k,i){return k===bk[i]&&a[k]===b[k];});
  }
  function winnerOf(s,trick){
    var best=trick[0],rank=isBriscola(s)?BRI_RANK:TRE_RANK;
    for(var i=1;i<trick.length;i++){
      var x=trick[i];
      if(x.card.s===best.card.s&&rank[x.card.v]>rank[best.card.v])best=x;
      else if(isBriscola(s)&&x.card.s===s.trump&&best.card.s!==s.trump)best=x;
    }
    return best;
  }
  function makeState(id,seats,random){
    var positions=id==='tressette_morto'?4:seats;
    var s={id:id,seats:seats,status:'playing',phase:id==='briscola_chiamata'?'auction':'play',
      turn:0,position:0,controllers:id==='tressette_morto'?[0,1,0,2]:Array.from({length:seats},function(_,i){return i;}),
      players:Array.from({length:seats},function(_,i){return {name:'Giocatore '+(i+1),hand:[],won:[],thirds:0,score:0};}),
      dummy:id==='tressette_morto'?{hand:[],won:[],thirds:0}:null,dummyRevealed:false,
      dealer:id==='tressette_morto'?0:positions-1,deck:shuffle(deck(),random),discard:[],trick:[],lastTrick:[],lastDraws:[],
      lastWinner:null,completedTricks:0,log:[],message:'',scores:[],result:null,
      highBid:0,highBidder:null,auctionActive:id==='briscola_chiamata'?Array(seats).fill(true):[],
      contract:null,calledCard:null,trump:null,partner:null,partnerRevealed:false};
    var per=id==='tressette'&&seats===2?10:Math.floor(40/positions);
    for(var n=0;n<per;n++)for(var p=0;p<positions;p++)participant(s,p).hand.push(s.deck.pop());
    if(id==='traversone'&&seats===3){
      s.players[s.dealer].hand.push(s.deck.pop());s.phase='discard';setTurn(s,s.dealer);
      log(s,'Il mazziere scarta una carta coperta prima della prima presa.');
    }else{
      setTurn(s,id==='tressette_morto'?1:0);
      log(s,id==='briscola_chiamata'?'Asta aperta: offri almeno 61 punti oppure passa.':'Inizia '+positionName(s,s.position)+'.');
    }
    return s;
  }
  function legalActions(s,seat){
    if(!s||s.status!=='playing'||!Number.isInteger(seat)||seat<0||seat>=s.seats||seat!==s.turn)return [];
    if(s.phase==='auction'){
      var active=s.auctionActive.filter(Boolean).length,out=[];
      if(s.highBidder!==null||active>1)out.push({type:'pass',label:'Passo'});
      for(var n=Math.max(61,s.highBid+1);n<=120;n++)out.push({type:'bid',points:n,label:'Offro '+n+' punti'});
      return out;
    }
    if(s.phase==='call'){
      var held=new Set(s.players[seat].hand.map(function(c){return c.id;}));
      return deck().filter(function(c){return !held.has(c.id);}).map(function(c){return {type:'call',card:c.id,label:'Chiamo '+cardName(c)};});
    }
    var hand=participant(s,s.position).hand;
    if(s.phase==='discard')return hand.map(function(c){return {type:'discard',card:c.id,label:'Scarta '+cardName(c)};});
    if(s.phase!=='play')return [];
    var available=hand;
    if(!isBriscola(s)&&s.trick.length){
      var suit=s.trick[0].card.s,matching=hand.filter(function(c){return c.s===suit;});
      if(matching.length)available=matching;
    }
    return available.map(function(c){return {type:'play',card:c.id,label:(isMorto(s)&&s.position===2?'Morto: ':'Gioca ')+cardName(c)};});
  }
  function concludeAuction(s){
    s.contract=s.highBid;s.phase='call';setTurn(s,s.highBidder);
    log(s,playerName(s,s.highBidder)+' vince l’asta a '+s.contract+' e deve chiamare una carta.');
  }
  function auctionMove(s,a){
    if(a.type==='pass'){
      s.auctionActive[s.turn]=false;log(s,playerName(s,s.turn)+' passa.');
    }else{
      s.highBid=a.points;s.highBidder=s.turn;log(s,playerName(s,s.turn)+' offre '+a.points+' punti.');
    }
    if(s.highBid===120||s.highBidder!==null&&s.auctionActive.filter(Boolean).length===1){concludeAuction(s);return;}
    var next=s.turn;do{next=(next+1)%s.seats;}while(!s.auctionActive[next]);
    setTurn(s,next);
  }
  function teamGroups(s){
    if(isMorto(s))return [{members:[0],positions:[0,2],label:'Solista e morto'},{members:[1,2],positions:[1,3],label:'Difensori'}];
    if(s.id==='tressette'&&s.seats===4)return [{members:[0,2],positions:[0,2],label:'Squadra 1'},{members:[1,3],positions:[1,3],label:'Squadra 2'}];
    return s.players.map(function(_,i){return {members:[i],positions:[i],label:playerName(s,i)};});
  }
  function scoreTresette(s){
    var groups=teamGroups(s);
    return groups.map(function(g,i){
      var raw=g.positions.reduce(function(sum,p){return sum+participant(s,p).thirds;},0);
      return {seat:g.members[0],team:i,members:g.members.slice(),label:g.label,points:Math.floor(raw/3),thirds:raw};
    });
  }
  function scoreBriscola(s,revealed){
    if(!revealed)return s.players.map(function(p,i){return {seat:i,label:playerName(s,i),points:p.score};});
    var attacking=[s.highBidder,s.partner],defending=s.players.map(function(_,i){return i;}).filter(function(i){return !attacking.includes(i);});
    return [attacking,defending].map(function(members,i){return {seat:members[0],team:i,members:members.slice(),label:i?'Difensori':'Chiamante e socio',points:members.reduce(function(sum,p){return sum+s.players[p].score;},0)};});
  }
  function finish(s){
    s.status='finished';s.phase='finished';
    if(isBriscola(s)){
      s.scores=scoreBriscola(s,true);
      var succeeds=s.scores[0].points>=s.contract,chosen=s.scores[succeeds?0:1];
      s.result={winners:chosen.members.slice(),text:(succeeds?'Vincono chiamante e socio':'Vincono i difensori')+' · Contratto '+s.contract+'; chiamante e socio '+s.scores[0].points+' punti su 120.'};
    }else if(s.id==='traversone'){
      var penalties=s.players.map(function(p){return Math.floor(p.thirds/3);});
      var others=penalties.reduce(function(sum,p,i){return i===s.lastWinner?sum:sum+p;},0);
      penalties[s.lastWinner]=11-others;
      var cap=penalties.findIndex(function(p){return p===11;});
      if(cap!==-1)penalties=penalties.map(function(_,i){return i===cap?0:11;});
      s.players.forEach(function(p,i){p.score=penalties[i];});
      s.scores=penalties.map(function(p,i){return {seat:i,label:playerName(s,i),points:p};});
      var least=Math.min.apply(null,penalties),wins=penalties.map(function(p,i){return p===least?i:-1;}).filter(function(i){return i!==-1;});
      s.result={winners:wins,text:(cap!==-1?'Cappotto di '+playerName(s,cap)+'. ':'')+(wins.length>1?'Pareggio a '+least+' penalità.':'Vince '+playerName(s,wins[0])+' con '+least+' penalità.')};
    }else{
      s.scores=scoreTresette(s);
      var best=Math.max.apply(null,s.scores.map(function(x){return x.points;})),leaders=s.scores.filter(function(x){return x.points===best;});
      s.result={winners:leaders.flatMap(function(x){return x.members;}),text:(leaders.length>1?'Pareggio':'Vince '+leaders[0].label)+' · '+s.scores.map(function(x){return x.label+': '+x.points;}).join(' · ')+'.'};
      s.scores.forEach(function(group){group.members.forEach(function(seat){s.players[seat].score=group.points;});});
    }
    log(s,s.result.text);
  }
  function completeTrick(s){
    var winner=winnerOf(s,s.trick),pos=winner.position,p=participant(s,pos);
    s.lastTrick=copy(s.trick);s.lastDraws=[];s.completedTricks++;s.lastWinner=pos;
    var captured=s.trick.map(function(x){return x.card;});s.trick=[];
    p.won.push.apply(p.won,captured);
    if(isBriscola(s))p.score+=captured.reduce(function(sum,c){return sum+briPoints(c);},0);
    else p.thirds+=captured.reduce(function(sum,c){return sum+thirds(c);},0);
    log(s,positionName(s,pos)+' prende.');
    if(s.id==='tressette'&&s.seats===2&&s.deck.length){
      for(var step=0;step<2;step++){
        var drawSeat=(pos+step)%2,card=s.deck.pop();s.players[drawSeat].hand.push(card);
        s.lastDraws.push({seat:drawSeat,card:copy(card)});
      }
    }
    var empty=s.controllers.every(function(_,i){return participant(s,i).hand.length===0;});
    if(empty&&s.deck.length===0){
      if(s.discard.length){p.won.push.apply(p.won,s.discard);p.thirds+=s.discard.reduce(function(sum,c){return sum+thirds(c);},0);s.discard=[];}
      if(!isBriscola(s)&&s.id!=='traversone')p.thirds+=3;
      setTurn(s,pos);finish(s);
    }else setTurn(s,pos);
  }
  function applyMove(s,seat,action){
    var legal=legalActions(s,seat),chosen=legal.find(function(a){return sameAction(a,action);});
    if(!chosen)throw Error('Mossa o turno non valido');
    if(s.phase==='auction'){auctionMove(s,chosen);return s;}
    if(s.phase==='call'){
      var called=deck().find(function(c){return c.id===chosen.card;});
      s.calledCard=called;s.trump=called.s;
      s.partner=s.players.findIndex(function(p){return p.hand.some(function(c){return c.id===called.id;});});
      if(s.partner<0||s.partner===seat)throw Error('Carta chiamata non valida');
      s.phase='play';setTurn(s,0);log(s,playerName(s,seat)+' chiama '+cardName(called)+'. Briscola: '+SUITS[s.trump]+'.');return s;
    }
    var p=participant(s,s.position),idx=p.hand.findIndex(function(c){return c.id===chosen.card;}),card=p.hand.splice(idx,1)[0];
    if(s.phase==='discard'){
      s.discard.push(card);s.phase='play';setTurn(s,(s.dealer+1)%s.seats);log(s,'Scarto coperto completato. Inizia '+positionName(s,s.position)+'.');return s;
    }
    var pos=s.position;
    s.trick.push({seat:seat,position:pos,card:card,dummy:isMorto(s)&&pos===2});
    if(isMorto(s)&&!s.dummyRevealed)s.dummyRevealed=true;
    if(isBriscola(s)&&card.id===s.calledCard.id)s.partnerRevealed=true;
    log(s,positionName(s,pos)+' gioca '+cardName(card)+(isBriscola(s)&&card.id===s.calledCard.id?' e si rivela socio.':'.'));
    if(s.trick.length===s.controllers.length)completeTrick(s);else setTurn(s,(pos+1)%s.controllers.length);
    return s;
  }
  function publicScores(s){
    if(s.status==='finished')return copy(s.scores);
    if(isBriscola(s))return scoreBriscola(s,s.partnerRevealed);
    if(s.id==='traversone')return s.players.map(function(p,i){return {seat:i,label:playerName(s,i),points:Math.floor(p.thirds/3)};});
    return scoreTresette(s);
  }
  function viewState(s,seat){
    if(!Number.isInteger(seat)||seat<0||seat>=s.seats)throw Error('Posto non valido');
    var scores=publicScores(s),groups=!isBriscola(s)&&s.id!=='traversone'?teamGroups(s):null;
    var players=s.players.map(function(p,i){
      var pub={name:p.name||'Giocatore '+(i+1),handCount:p.hand.length,score:p.score||0};
      if(groups){
        var g=groups.findIndex(function(x){return x.members.includes(i);});pub.team=g;pub.score=scores[g].points;
      }else if(isBriscola(s)&&s.partnerRevealed)pub.team=i===s.highBidder||i===s.partner?0:1;
      else if(s.id==='traversone')pub.score=s.status==='finished'?p.score:Math.floor(p.thirds/3);
      return pub;
    });
    var out={status:s.status,turn:s.turn,phase:s.phase,hand:copy(s.players[seat].hand),table:[],
      trick:copy(s.trick),lastTrick:copy(s.lastTrick),lastDraws:copy(s.lastDraws),players:players,
      log:s.log.slice(),message:s.message,scores:scores,result:copy(s.result),actions:copy(legalActions(s,seat)),
      deckCount:s.deck.length,discardCount:s.discard.length};
    if(isMorto(s)){
      out.dummyRevealed=s.dummyRevealed;
      out.extraHands=s.dummyRevealed?[{label:'Morto · controllato da '+playerName(s,0),seat:0,cards:copy(s.dummy.hand)}]:[];
    }
    if(isBriscola(s)){
      out.contract=s.contract;out.highBid=s.highBid;out.highBidder=s.highBidder;
      out.calledCard=copy(s.calledCard);out.trump=s.trump;out.partnerRevealed=s.partnerRevealed;
      out.partner=s.partnerRevealed?s.partner:null;
      if(s.calledCard)out.privateRole=seat===s.highBidder?'chiamante':seat===s.partner?'socio':'difensore';
    }
    return out;
  }
  function botMove(s,seat,random){
    var legal=legalActions(s,seat);if(!legal.length)return null;
    if(s.phase==='auction'){
      var hand=s.players[seat].hand,value=hand.reduce(function(n,c){return n+briPoints(c);},0);
      var strength=Math.max.apply(null,[0,1,2,3].map(function(suit){return hand.filter(function(c){return c.s===suit;}).length;}));
      var limit=Math.min(90,61+Math.max(0,Math.floor((value-15)/3))+Math.max(0,strength-2)*3);
      return legal.find(function(a){return a.type==='bid'&&a.points<=limit;})||legal.find(function(a){return a.type==='pass';})||legal[0];
    }
    if(s.phase==='call'){
      var own=s.players[seat].hand,weights=[0,1,2,3].map(function(suit){return own.filter(function(c){return c.s===suit;}).reduce(function(n,c){return n+3+briPoints(c);},0);});
      var candidates=legal.slice().sort(function(a,b){
        var ca=deck().find(function(c){return c.id===a.card;}),cb=deck().find(function(c){return c.id===b.card;});
        return (weights[cb.s]*10+BRI_RANK[cb.v])-(weights[ca.s]*10+BRI_RANK[ca.v]);
      });
      return candidates[0];
    }
    var current=participant(s,s.position).hand;
    if(s.phase==='discard')return legal.slice().sort(function(a,b){return thirds(current.find(function(c){return c.id===b.card;}))-thirds(current.find(function(c){return c.id===a.card;}));})[0];
    var rank=isBriscola(s)?BRI_RANK:TRE_RANK;
    function cost(a){
      var c=current.find(function(c){return c.id===a.card;}),value=isBriscola(s)?briPoints(c):thirds(c);
      var trial=s.trick.concat([{seat:seat,position:s.position,card:c}]),wins=winnerOf(s,trial).position===s.position;
      if(s.id==='traversone')return (wins?100:0)+rank[c.v]-value*4;
      if(s.trick.length&&wins)return 40-rank[c.v]+value;
      return 50+rank[c.v]-value;
    }
    return legal.slice().sort(function(a,b){return cost(a)-cost(b);})[0];
  }
  function engine(id,title,seats,rules){
    return {id:id,title:title,seats:seats,rules:rules,
      create:function(options){
        options=options||{};var n=options.seats==null?seats[0]:options.seats;
        if(!Number.isInteger(n)||!seats.includes(n))throw Error('Numero giocatori non valido');
        var random=options.random||Math.random;if(typeof random!=='function')throw Error('Generatore casuale non valido');
        return makeState(id,n,random);
      },
      actions:function(s,seat){return legalActions(s,seat);},
      apply:function(s,seat,a){return applyMove(s,seat,a);},
      view:function(s,seat){return viewState(s,seat);},
      chooseBot:function(s,seat,random){return botMove(s,seat,random||Math.random);}
    };
  }
  return {
    tressette:engine('tressette','Tressette',[2,4],TRE_RULES),
    traversone:engine('traversone','Traversone',[3,4,5],TRA_RULES),
    tressette_morto:engine('tressette_morto','Tressette col morto',[3],MOR_RULES),
    briscola_chiamata:engine('briscola_chiamata','Briscola chiamata',[5],BRI_RULES)
  };
});
