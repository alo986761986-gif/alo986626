'use strict';
// NAPOLI CARTE 3D - authoritative multiplayer engine. In-memory prototype.
const GAME_IDS = ['scopa','scopone','briscola','sette','asso','ruba'];
const RULES = {
  scopa: {title:'Scopa',seats:[2,4],text:'Mazzo napoletano da 40 carte. Si danno 3 carte a testa e 4 al tavolo. Una carta prende una carta dello stesso valore (obbligatoriamente, se presente), altrimenti una combinazione che somma il suo valore. Le scope valgono 1 punto; l\'ultima presa non fa scopa. Alla fine: carte, denari, settebello e primiera valgono 1 punto ciascuno. A 4 giocatori si gioca in coppie alternate.'},
  scopone:{title:'Scopone',seats:[4],text:'Quattro giocatori in due coppie (posti 1+3 contro 2+4). Tutte le 40 carte vengono distribuite: 10 a ciascuno, nessuna al tavolo. Si prende per valore uguale o somma. Scope e punteggio finale seguono le regole della Scopa. Variante proposta: scopone scientifico senza carte iniziali sul tavolo.'},
  briscola:{title:'Briscola',seats:[2,4],text:'Tre carte a testa; la briscola scoperta determina il seme dominante. Ogni mano è vinta dalla briscola più forte oppure dalla carta più forte del seme di uscita. Non è obbligatorio rispondere al seme. Valori: asso 11, tre 10, re 4, cavallo 3, fante 2; totale 120. Si vince con più punti (61 o più a due). A quattro si gioca a coppie.'},
  sette:{title:'Sette e mezzo',seats:[2,4],text:'Partita a punti, SENZA DENARO. Carte da asso a sette valgono il numero indicato; fante, cavallo e re valgono mezzo punto. I giocatori scelgono Carta o Sto, senza oltrepassare 7 e mezzo. Il banco gioca per ultimo: a parità prevale il banco. Variante senza matta e senza puntate.'},
  asso:{title:'Asso piglia tutto',seats:[2,4],text:'Come la Scopa, con 3 carte a testa e 4 sul tavolo. Nella variante adottata qui, giocare un asso prende tutte le carte sul tavolo, se ce ne sono; altrimenti l\'asso resta sul tavolo. Restano punti per scope, carte, denari, settebello e primiera.'},
  ruba:{title:'Rubamazzetto',seats:[2,4],text:'Tre carte a testa e quattro al centro. Una carta prende una carta dello stesso valore dal tavolo oppure ruba l\'intero mazzetto visibile di un avversario se la sua carta superiore ha lo stesso valore. Si mantiene la carta giocata in cima al proprio mazzetto. Vince chi accumula più carte. Variante individuale anche a quattro.'}
};
const rooms = new Map();
const playerRoom = new Map();
const now = () => Date.now();
const uid = () => crypto.randomUUID();
const deck40 = () => { const d=[];for (let s=0;s<4;s++) for(let v=1;v<=10;v++)d.push({id:`${s}-${v}`,s,v});return d;};
const shuffle = (a) => {for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const value = c => c.v <=7 ? c.v : .5;
const briscolaPoints = c => ({1:11,3:10,10:4,9:3,8:2})[c.v] || 0;
const briscolaPower = c => ({1:10,3:9,10:8,9:7,8:6,7:5,6:4,5:3,4:2,2:1})[c.v]||0;
const cardText = c => c ? `${({8:'Fante',9:'Cavallo',10:'Re'})[c.v]||c.v} di ${['Denari','Coppe','Spade','Bastoni'][c.s]}` : '';
const isTeams = r => r.seats===4 && ['scopa','scopone','briscola','asso'].includes(r.game);
const teamFor = (r,seat)=>isTeams(r)?seat%2:seat;
const labelFor = (r,i)=>isTeams(r)?`Squadra ${i+1}`:r.players[i]?.name||`Giocatore ${i+1}`;
function log(r,s){r.log.unshift(s); if(r.log.length>8)r.log.length=8;}
function newRoom(game,seats){const r={id:uid(),game,seats,players:[],status:'waiting',deck:[],table:[],trick:[],trump:null,turn:0,scopes:Array(seats).fill(0),lastCapture:null,banker:seats-1,stood:[],scores:[],result:null,log:[],created:now(),updated:now()}; rooms.set(r.id,r); return r;}
function addPlayer(r,name,bot){const p={token:bot?null:uid(),name:String(name||'Giocatore').trim().slice(0,19)||'Giocatore',bot:!!bot,hand:[],pile:[]};r.players.push(p);if(p.token)playerRoom.set(p.token,r.id);return p;}
function deal(r,count){for(let k=0;k<count;k++)for(let p of r.players)if(r.deck.length)p.hand.push(r.deck.pop());}
function start(r){r.deck=shuffle(deck40());r.table=[];r.trick=[];r.turn=0;r.scopes=Array(r.seats).fill(0);r.lastCapture=null;r.stood=Array(r.seats).fill(false);r.scores=[];r.result=null;r.status='playing';r.log=[];for(const p of r.players){p.hand=[];p.pile=[];}
 if(r.game==='scopa'||r.game==='asso'||r.game==='ruba'){r.table=r.deck.splice(-4);deal(r,3);}
 else if(r.game==='scopone')deal(r,10);
 else if(r.game==='briscola'){deal(r,3);r.trump=r.deck[0]||null;}
 else if(r.game==='sette')deal(r,1);
 log(r,`Inizia ${RULES[r.game].title}. Tocca a ${r.players[0].name}.`);
}
function join({game,seats,name,bot,invite,private: privateRoom}){
 name=String(name||'Giocatore').replace(/[<>]/g,'').slice(0,19);
 const code=String(invite||'').trim().toUpperCase();
 let r;
 if(code){
   if(!/^[A-Z0-9]{6}$/.test(code))throw new Error('Il codice invito deve avere 6 caratteri');
   r=[...rooms.values()].find(v=>v.code===code&&v.status==='waiting'&&v.players.length<v.seats);
   if(!r)throw new Error('Nessun tavolo in attesa con questo codice');
   game=r.game;seats=r.seats;bot=false;
 }
 if(!GAME_IDS.includes(game))throw new Error('Gioco non valido');
 seats=Number(seats);if(!RULES[game].seats.includes(seats))throw new Error('Numero di giocatori non supportato');
 if(bot){r=newRoom(game,seats); const me=addPlayer(r,name,false);for(let i=1;i<seats;i++)addPlayer(r,`CPU ${i}`,true);start(r); return {token:me.token,roomId:r.id};}
 if(!r && privateRoom){
   r=newRoom(game,seats);r.private=true;
   for(let i=0;i<20;i++){const code=crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase();if(![...rooms.values()].some(v=>v!==r&&v.code===code)){r.code=code;break;}}
   if(!r.code)throw new Error('Impossibile creare il codice stanza');
 }
 if(!r)r=[...rooms.values()].find(v=>v.status==='waiting'&&!v.private&&v.game===game&&v.seats===seats&&v.players.length<seats&&now()-v.created<3*60*60*1000);
 if(!r)r=newRoom(game,seats);
 const me=addPlayer(r,name,false);log(r,`${me.name} è entrato. ${r.players.length}/${r.seats} giocatori.`);
 if(r.players.length===r.seats)start(r);
 return {token:me.token,roomId:r.id,code:r.code||null};
}
function auth(token){const r=rooms.get(playerRoom.get(String(token||'')));if(!r)throw new Error('Sessione scaduta o server riavviato. Torna alla lobby.');const seat=r.players.findIndex(p=>p.token===token);if(seat<0)throw new Error('Sessione non valida');r.updated=now();return {r,seat};}
function scopaChoices(r,card){if(r.game==='asso'&&card.v===1&&r.table.length)return [{type:'table',picks:r.table.map(c=>c.id),label:'Asso: prendi tutto'}];
 const equal=r.table.filter(c=>c.v===card.v);if(equal.length)return equal.map(c=>({type:'table',picks:[c.id],label:`Prendi ${cardText(c)}`}));
 const opts=[];function gen(pos,sum,arr){if(opts.length>=36||sum>card.v)return;if(sum===card.v&&arr.length){opts.push({type:'table',picks:[...arr],label:`Prendi ${arr.length} carte`});return;}
 for(let i=pos;i<r.table.length;i++)gen(i+1,sum+r.table[i].v,[...arr,r.table[i].id]);}
 gen(0,0,[]);return opts.length?opts:[{type:'drop',picks:[],label:'Scarta sul tavolo'}];
}
function rubaChoices(r,card,seat){const opts=[];for(let i=0;i<r.seats;i++){if(i!==seat){const pile=r.players[i].pile;const top=pile[pile.length-1];if(top&&top.v===card.v)opts.push({type:'steal',target:i,label:`Ruba da ${r.players[i].name} (${pile.length} carte)`});}}
 for(const c of r.table)if(c.v===card.v)opts.push({type:'table',picks:[c.id],label:`Prendi ${cardText(c)}`});
 return opts.length?opts:[{type:'drop',label:'Metti sul tavolo'}];}
function getChoices(r,seat,cardId){const p=r.players[seat];const card=p.hand.find(c=>c.id===cardId);if(!card)throw new Error('Carta non presente nella tua mano');if(r.turn!==seat||r.status!=='playing')throw new Error('Non è il tuo turno');if(['scopa','scopone','asso'].includes(r.game))return scopaChoices(r,card);if(r.game==='ruba')return rubaChoices(r,card,seat);return [{type:'play',label:'Gioca carta'}];}
function finishScopa(r){if(r.table.length){r.players[r.lastCapture??0].pile.push(...r.table);r.table=[];}
 const n=isTeams(r)?2:r.seats;const stats=Array.from({length:n},()=>({cards:[],scope:0,denari:0,primiera:0,points:0,settebello:false}));
 r.players.forEach((p,i)=>{const t=stats[teamFor(r,i)];t.cards.push(...p.pile);t.scope+=r.scopes[i];});
 const highest= (cards,s)=>{const vals={1:16,2:12,3:13,4:14,5:15,6:18,7:21,8:10,9:10,10:10};const x=cards.filter(c=>c.s===s);return x.length?Math.max(...x.map(c=>vals[c.v])):0;};
 stats.forEach(t=>{t.denari=t.cards.filter(c=>c.s===0).length;t.settebello=t.cards.some(c=>c.s===0&&c.v===7);const pri=[0,1,2,3].map(s=>highest(t.cards,s));t.primiera=pri.every(Boolean)?pri.reduce((a,b)=>a+b,0):0;t.points=t.scope+(t.settebello?1:0);});
 const award=(getter)=>{const vals=stats.map(getter);const best=Math.max(...vals);if(best>0&&vals.filter(v=>v===best).length===1)stats[vals.indexOf(best)].points++;};
 award(t=>t.cards.length);award(t=>t.denari);award(t=>t.primiera);
 r.scores=stats.map((s,i)=>({name:labelFor(r,i),points:s.points,cards:s.cards.length,denari:s.denari,scope:s.scope,primiera:s.primiera,settebello:s.settebello}));end(r);
}
function finishBriscola(r){const n=isTeams(r)?2:r.seats;const s=Array.from({length:n},(_,i)=>({name:labelFor(r,i),points:0,cards:0}));r.players.forEach((p,i)=>{s[teamFor(r,i)].points+=p.pile.reduce((a,c)=>a+briscolaPoints(c),0);s[teamFor(r,i)].cards+=p.pile.length;});r.scores=s;end(r);}
function finishRuba(r){r.players[r.lastCapture??0].pile.push(...r.table);r.table=[];r.scores=r.players.map(p=>({name:p.name,points:p.pile.length,cards:p.pile.length}));end(r);}
function finishSette(r){const b=r.banker;const bank=r.players[b].hand.reduce((s,c)=>s+value(c),0);const scores=r.players.map(p=>({name:p.name,points:0,total:p.hand.reduce((s,c)=>s+value(c),0)}));
 for(let i=0;i<r.seats;i++){if(i===b)continue;const x=scores[i].total;const win=x<=7.5&&(bank>7.5||x>bank);if(win)scores[i].points++;else scores[b].points++;}r.scores=scores;end(r);}
function end(r){r.status='finished';r.turn=-1;const best=Math.max(...r.scores.map(s=>s.points));const winners=r.scores.filter(s=>s.points===best);r.result=winners.length===1?`Vince ${winners[0].name} con ${best} punti!`:`Pareggio a ${best} punti.`;log(r,r.result);}
function advance(r,seat){r.turn=(seat+1)%r.seats;}
function play(r,seat,move){if(r.status!=='playing'||r.turn!==seat)throw new Error('Non è il tuo turno');const p=r.players[seat];
 if(r.game==='sette'){
   const action=move.action;if(action!=='hit'&&action!=='stand')throw new Error('Scegli Carta o Sto');
   if(action==='hit'){if(!r.deck.length)throw new Error('Mazzo esaurito');const c=r.deck.pop();p.hand.push(c);log(r,`${p.name} pesca una carta.`);}
   const sum=p.hand.reduce((s,c)=>s+value(c),0);if(action==='stand'||sum>=7.5){r.stood[seat]=true;log(r,`${p.name} si ferma a ${sum}.`);}
   if(r.stood[seat]){const next=(seat+1)%r.seats;if(next===0){finishSette(r);return;}r.turn=next;}
   return;
 }
 const idx=p.hand.findIndex(c=>c.id===move.card);if(idx===-1)throw new Error('Carta non in mano');const card=p.hand[idx];
 const choices=getChoices(r,seat,card.id);
 let choice=choices.find(ch=>ch.type===move.type && ((ch.type==='table'&&JSON.stringify(ch.picks)===JSON.stringify(move.picks))||(ch.type==='steal'&&ch.target===move.target)||(!['table','steal'].includes(ch.type))));
 if(!choice && choices.length===1&&!move.type)choice=choices[0];
 if(!choice)throw new Error('Presa non valida: scegli tra quelle mostrate');
 p.hand.splice(idx,1);
 if(['scopa','scopone','asso'].includes(r.game)){
   if(choice.type==='drop'){r.table.push(card);log(r,`${p.name} posa ${cardText(card)}.`);}else{
     const ids=new Set(choice.picks);const picked=r.table.filter(c=>ids.has(c.id));r.table=r.table.filter(c=>!ids.has(c.id));p.pile.push(card,...picked);r.lastCapture=seat;
     const left=r.players.reduce((n,z)=>n+z.hand.length,0);const last=left===0&&r.deck.length===0;
     if(!r.table.length&&!last){r.scopes[seat]++;log(r,`${p.name} fa SCOPA!`);}else log(r,`${p.name} prende ${picked.length} carte.`);
   }
   advance(r,seat);if(r.players.every(p=>p.hand.length===0)){if(r.deck.length)deal(r,3);else finishScopa(r);}
 }else if(r.game==='ruba'){
   if(choice.type==='steal'){const stolen=r.players[choice.target].pile.splice(0);p.pile.push(...stolen,card);r.lastCapture=seat;log(r,`${p.name} ruba ${stolen.length} carte!`);}
   else if(choice.type==='table'){const ids=new Set(choice.picks);p.pile.push(...r.table.filter(c=>ids.has(c.id)),card);r.table=r.table.filter(c=>!ids.has(c.id));r.lastCapture=seat;log(r,`${p.name} prende una carta.`);}
   else{r.table.push(card);log(r,`${p.name} posa ${cardText(card)}.`);}
   advance(r,seat);if(r.players.every(p=>!p.hand.length)){if(r.deck.length)deal(r,3);else finishRuba(r);}
 }else if(r.game==='briscola'){
   r.trick.push({seat,card});log(r,`${p.name} gioca ${cardText(card)}.`);
   if(r.trick.length<r.seats){advance(r,seat);return;}
   const lead=r.trick[0].card.s,trump=r.trump?.s;
   const power = x => (x.card.s===trump?100: x.card.s===lead?50:0)+briscolaPower(x.card);
   const winner=r.trick.reduce((a,b)=>power(b)>power(a)?b:a).seat;
   r.players[winner].pile.push(...r.trick.map(t=>t.card));r.trick=[];
   log(r,`La presa è di ${r.players[winner].name}.`);
   for(let i=0;i<r.seats;i++){const a=(winner+i)%r.seats;if(r.deck.length)r.players[a].hand.push(r.deck.pop());}
   r.turn=winner;if(r.players.every(p=>p.hand.length===0))finishBriscola(r);
 }
}
function botStep(r){let limit=300;while(r.status==='playing'&&r.players[r.turn]?.bot&&limit-->0){const seat=r.turn, p=r.players[seat];if(r.game==='sette'){
 const total=p.hand.reduce((n,c)=>n+value(c),0);play(r,seat,{action:total<5.5?'hit':'stand'});
 }else{
 const card=p.hand[0];if(!card)break;const ch=getChoices(r,seat,card.id)[0];play(r,seat,{card:card.id,...ch});
 }}if(limit<=0)log(r,'Limite mosse automatiche raggiunto.');}
function state(token){const {r,seat}=auth(token);botStep(r);return {roomId:r.id,code:r.code||null,private:!!r.private,game:r.game,title:RULES[r.game].title,seats:r.seats,seat,status:r.status,players:r.players.map((p,i)=>({name:p.name,bot:p.bot,handCount:p.hand.length,pileCount:p.pile.length,pileTop:r.game==='ruba'&&p.pile.length?p.pile[p.pile.length-1]:null,team:isTeams(r)?i%2:null,stood:r.stood[i]||false,total:r.game==='sette'&&(i===seat||r.status==='finished')?p.hand.reduce((s,c)=>s+value(c),0):null})),hand:r.players[seat].hand,turn:r.turn,table:r.table,trick:r.trick,deckCount:r.deck.length,trump:r.trump,scope:r.scopes,log:r.log,result:r.result,scores:r.scores,banker:r.banker,opponentCards:r.status==='finished'&&r.game==='sette'?r.players.map(p=>p.hand):null};}
function action(token,move){const {r,seat}=auth(token);play(r,seat,move);botStep(r);return state(token);}
function opts(token,card){const {r,seat}=auth(token);botStep(r);return {options:getChoices(r,seat,card)};}
function housekeeping(){let n=now();for(const r of rooms.values())if(n-r.updated>6*60*60*1000){rooms.delete(r.id);for(const p of r.players)if(p.token)playerRoom.delete(p.token);}}
function leave(token){const {r,seat}=auth(token);if(r.status==='waiting'){const p=r.players.splice(seat,1)[0];if(p.token)playerRoom.delete(p.token);if(!r.players.length)rooms.delete(r.id);else log(r,`${p.name} ha abbandonato la sala.`);}return {ok:true};}
function statusInfo(){const v=[...rooms.values()];return {ok:true,title:'Napoli Carte 3D',onlinePlayers:v.reduce((n,r)=>n+r.players.filter(p=>!p.bot).length,0),activeTables:v.filter(r=>r.status==='playing').length,waitingTables:v.filter(r=>r.status==='waiting').length,games:GAME_IDS};}
if (typeof module !== 'undefined') module.exports={join,state,action,opts,leave,statusInfo,RULES,rooms,deck40,getChoices,finishScopa,cardText};
