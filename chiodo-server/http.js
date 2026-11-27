'use strict';
const http=require('node:http'), crypto=require('node:crypto');
const rooms=new Map(), sessions=new Map();
const MATCH_WAIT=30000;
const BOT_NAMES=['Antonio','Gennaro','Pasquale','Salvatore','Ciro','Vincenzo','Luca','Giuseppe','Raffaele','Mario','Anna','Lucia','Rosa','Carmela','Sofia','Francesca','Giulia','Maria','Elena','Teresa','Alessandra','Michele','Roberto','Paolo','Domenico','Marco','Sara','Valentina','Lorenzo','Martina'];
function botMember(r){const used=new Set(r.members.map(p=>p.name.toLowerCase()));const choices=BOT_NAMES.filter(n=>!used.has(n.toLowerCase()));return {name:choices.length?choices[crypto.randomInt(choices.length)]:'CPU '+crypto.randomInt(1000,9999),bot:true};}
function startRoom(r,fill=false){if(r.game||!r.members.length)return false;if(fill)while(r.members.length<r.n)r.members.push(botMember(r));if(r.members.length!==r.n)return false;r.game=new Game(r.n,r.format||'individual');r.game.players.forEach((p,i)=>{p.name=r.members[i].name;p.bot=!!r.members[i].bot;p.avatarId=r.members[i].avatarId||0;p.photo=r.members[i].photo||null;p.photoMode=r.members[i].photoMode||'avatar';});r.game.turnDeadline=Date.now()+60000;r.botDue=0;r.revision++;return true;}
function dropRoom(r){for(const p of r.members)if(p.t)sessions.delete(p.t);rooms.delete(r.id);}

const id=()=>crypto.randomBytes(24).toString('hex');
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function matchOutcome(g){
 if(g.format==='pairs'){
  g.teamScores=[0,0];g.players.forEach((p,i)=>{g.teamScores[i%2]+=p.score;});
  g.matchFinished=g.teamScores.some(n=>n>=121);g.isDraw=g.matchFinished&&g.teamScores[0]===g.teamScores[1];
  g.winners=g.matchFinished&&!g.isDraw?(g.teamScores[0]<g.teamScores[1]?[0,2]:[1,3]):[0,1,2,3];
  g.resultText=g.matchFinished?(g.isDraw?'Pareggio fra le squadre: '+g.teamScores[0]+' punti ciascuna.':'Vince la squadra '+(g.winners[0]%2+1)+' · Penalità '+g.teamScores[0]+' a '+g.teamScores[1]+'.'):'Mano conclusa · Squadra 1: '+g.teamScores[0]+' · Squadra 2: '+g.teamScores[1]+' · limite 121.';
 }else{
  g.teamScores=null;g.winners=g.active.filter(i=>g.players[i].score<121);g.matchFinished=g.winners.length===1;g.isDraw=false;
  g.resultText=g.matchFinished?'Vince '+g.players[g.winners[0]].name+'.':g.message;
 }
 if(g.matchFinished)g.message=g.resultText;
}
class Game{
constructor(n,format='individual'){if(![2,3,4].includes(n)||!['individual','pairs'].includes(format)||format==='pairs'&&n!==4)throw Error('Formato partita non valido');this.format=format;this.players=Array.from({length:n},()=>({score:0,hand:[]}));this.round();}
round(){if(this.matchFinished)throw Error('Partita conclusa: inizia una nuova partita');this.matchFinished=false;this.isDraw=false;this.resultText='';this.winners=undefined;this.teamScores=this.format==='pairs'?[this.players[0].score+this.players[2].score,this.players[1].score+this.players[3].score]:null;this.deck=shuffle(Array.from({length:40},(_,i)=>({id:'c'+i,s:Math.floor(i/10),v:i%10+1})));this.active=this.players.map((p,i)=>i).filter(i=>this.format==='pairs'||this.players[i].score<121);this.players.forEach(p=>p.hand=[]);for(let k=0;k<5;k++)for(const i of this.active)this.players[i].hand.push(this.deck.pop());this.discard=[this.deck.splice(this.deck.findIndex(c=>![1,2,9,10].includes(c.v)),1)[0]];this.suit=this.discard[0].s;this.turn=this.active[0];this.penalty=0;this.pending=null;this.event=null;this.voiceEvents=this.voiceEvents||[];this.drawnPlayable=false;this.turnDeadline=Date.now()+60000;this.ended=false;this.message='Nuova mano';}
announce(i,text){const e={id:id(),seat:i,text,voice:true};this.event=e;this.voiceEvents.push(e);if(this.voiceEvents.length>64)this.voiceEvents.shift();}
autoMove(now=Date.now(),bot=false){
 if(this.ended||this.pending||!this.turnDeadline||(!bot&&now<this.turnDeadline))return false;
 const i=this.turn;
 for(let k=0;k<3;k++){
  const hand=this.players[i].hand;
  const valid=hand.filter(c=>this.legal(c)).sort((a,b)=>(b.v===9?-1:b.v)-(a.v===9?-1:a.v));
  if(valid.length){
   const card=valid[0];
   const counts=[0,1,2,3].map(s=>hand.filter(c=>c.id!==card.id&&c.s===s).length);
   const suit=counts.indexOf(Math.max(...counts));
   const calls=this.play(i,card.id,suit);
   if(this.pending){for(const call of calls)this.announce(i,call+'!');this.resolve(calls);}
   this.message+=bot?' · CPU':' · Mossa automatica (60 s)';
   return true;
  }
  this.take(i);
  if(this.turn!==i||this.ended)return true;
 }
 this.turn=this.next(i);this.drawnPlayable=false;this.turnDeadline=now+60000;this.announce(i,'PASSO!');return true;
}
next(i,n=1){return this.active[(this.active.indexOf(i)+n)%this.active.length];}
draw(i,n){let count=0;while(n--){if(!this.deck.length)this.deck=shuffle(this.discard.splice(0,this.discard.length-1));if(!this.deck.length)break;this.players[i].hand.push(this.deck.pop());count++;}return count;}
legal(c){return this.penalty?c.v===2:c.v===9||c.s===this.suit||(this.discard.at(-1).v!==9&&c.v===this.discard.at(-1).v);}
play(i,key,suit){if(this.ended||this.pending||i!==this.turn)throw Error('Turno non valido');const h=this.players[i].hand,k=h.findIndex(c=>c.id===key),c=h[k];if(!c||!this.legal(c))throw Error('Carta non valida');if(c.v===9&&![0,1,2,3].includes(suit))throw Error('Scegli il palo');this.drawnPlayable=false;this.turnDeadline=0;h.splice(k,1);this.discard.push(c);this.suit=c.v===9?suit:c.s;if(c.v===9)this.announce(i,'CAMBIO PALO: '+['DENARI','COPPE','SPADE','BASTONI'][suit]+'!');if(c.v===2)this.penalty+=2;const calls=[];if(c.v===10)calls.push('CHIODO');if(h.length===1)calls.push('SOLA');this.pending={i,c,calls};this.message=this.players[i].name+' gioca '+c.v;if(!calls.length)this.resolve([]);return calls;}
resolve(calls){if(!this.pending)return;const {i,c,calls:needed}=this.pending;this.pending=null;const missing=needed.filter(x=>!calls.includes(x));if(missing.length)this.message+=' - penalita '+this.draw(i,5*missing.length)+' carte';if(!this.players[i].hand.length){if(this.penalty){const target=this.next(i),amount=this.draw(target,this.penalty);this.event={id:id(),seat:target,text:'+'+amount+' CARTE',voice:false};this.penalty=0;}for(const j of this.active)this.players[j].score+=this.players[j].hand.reduce((a,c)=>a+c.v,0);this.ended=true;this.turnDeadline=0;this.announce(i,'CHIUSO!');this.message=this.players[i].name+' chiude la mano!';matchOutcome(this);return;}this.turn=this.next(i,c.v===1?2:1);this.turnDeadline=Date.now()+60000;}
take(i){if(this.ended||this.pending||i!==this.turn)throw Error('Turno non valido');if(this.drawnPlayable)throw Error('Gioca la carta appena pescata');const forced=this.penalty>0;const n=this.draw(i,this.penalty||1);this.penalty=0;const hand=this.players[i].hand;const playable=!forced&&n>0&&this.legal(hand[hand.length-1]);this.drawnPlayable=playable;const keep=forced||playable;this.message=this.players[i].name+' pesca '+n+(forced?' - mantiene il turno':playable?' - carta valida, continua il turno':' - PASSO');this.turn=keep?i:this.next(i);if(!keep){this.turnDeadline=Date.now()+60000;this.announce(i,'PASSO!');}return n;}
}
function realtime(t,m){const {room:r,seat}=auth(t);if(!r.game)throw Error('Sala in attesa');const now=Date.now();r.chat=r.chat||[];r.signals=r.signals||[];r.voice=r.voice||{};r.chatSeq=r.chatSeq||0;r.signalSeq=r.signalSeq||0;r.rate=r.rate||{};for(const k of Object.keys(r.voice))if(now-r.voice[k]>18000)delete r.voice[k];r.signals=r.signals.filter(x=>now-x.time<30000).slice(-256);
if(m.kind==='chat'){const text=String(m.text||'').trim().slice(0,300);if(!text)throw Error('Messaggio vuoto');if(now-(r.rate[seat]||0)<500)throw Error('Attendi prima di inviare');r.rate[seat]=now;r.chat.push({id:++r.chatSeq,seat,name:r.members[seat].name,text,time:now});r.chat=r.chat.slice(-80);}
else if(m.kind==='voice'){if(m.enabled)r.voice[seat]=now;else{delete r.voice[seat];r.signals=r.signals.filter(x=>x.from!==seat&&x.to!==seat);}}
else if(m.kind==='signal'){const to=m.to;if(!Number.isInteger(to)||to===seat||!r.members[to]||r.members[to].bot||!r.voice[seat]||!r.voice[to]||!['offer','answer','candidate'].includes(m.type)||typeof m.payload!=='string'||m.payload.length>6500)throw Error('Segnale audio non valido');r.signals.push({id:++r.signalSeq,from:seat,to,type:m.type,payload:m.payload,time:now});r.signals=r.signals.slice(-256);}
else if(m.kind!=='poll')throw Error('Operazione sconosciuta');
if(m.kind==='poll'&&r.voice[seat])r.voice[seat]=now;r.updated=now;
return {chat:r.chat.filter(x=>x.id>Number(m.afterChat||0)),chatSeq:r.chatSeq,signalSeq:r.signalSeq,signals:r.signals.filter(x=>x.to===seat&&x.id>Number(m.afterSignal||0)).slice(0,24),voiceSeats:Object.keys(r.voice).map(Number),users:r.members.map((x,i)=>({seat:i,name:x.name,bot:!!x.bot})).filter(x=>!x.bot),iceServers:[{urls:'stun:stun.l.google.com:19302'}]};}
function auth(t){const s=sessions.get(t);if(!s||!rooms.has(s.room.id))throw Error('Sessione non valida');s.room.updated=Date.now();return s;}
function tick(r,now=Date.now()){
 if(!r.game){if(r.matchDeadline&&now>=r.matchDeadline)startRoom(r,true);if(!r.game)return;}
 const g=r.game;
 if(g.pending&&r.deadline&&now>=r.deadline){g.resolve(r.called);r.called=[];r.deadline=0;r.revision++;}
 if(g.ended||g.pending){r.botDue=0;return;}
 const cpu=!!g.players[g.turn]?.bot;
 if(cpu){
  if(!r.botDue||r.botRevision!==r.revision){r.botDue=now+crypto.randomInt(1000,2001);r.botRevision=r.revision;}
  if(now<r.botDue)return;
  if(g.autoMove(now,true)){r.called=[];r.deadline=0;r.revision++;r.botDue=0;}
 }else{r.botDue=0;if(g.autoMove(now)){r.called=[];r.deadline=0;r.revision++;}}
}
function validPhoto(photo){
 if(photo===null||photo==='')return null;
 if(typeof photo!=='string'||photo.length>95000)throw Error('Foto profilo troppo grande');
 const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo);
 if(!m)throw Error('Formato foto non valido');
 const bytes=Buffer.from(m[2],'base64');
 if(bytes.length<128||bytes.length>66000)throw Error('Foto non valida: massimo 65 KB');
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!(m[1]==='jpeg'&&jpg||m[1]==='png'&&png||m[1]==='webp'&&webp))throw Error('Immagine non valida');
 return 'data:image/'+m[1]+';base64,'+m[2];
}
function viewMember(p,viewerOwn){
 return {name:p.name,bot:!!p.bot,avatarId:p.avatarId||0,
  photo:viewerOwn||p.photoMode==='public'?p.photo||null:null,
  photoMode:viewerOwn?p.photoMode||'avatar':undefined};
}
function profile(t,changes){
 const {room:r,seat}=auth(t);
 if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('Profilo non valido');
 const p=r.members[seat];if(!p||p.bot)throw Error('Profilo non disponibile');
 if(Object.hasOwn(changes,'avatarId')){
  const id=Number(changes.avatarId);
  if(!Number.isInteger(id)||id<0||id>11)throw Error('Avatar non valido');
  p.avatarId=id;
 }
 if(Object.hasOwn(changes,'photoMode')){
  if(!['avatar','public','friends','room'].includes(changes.photoMode))throw Error('Visibilita foto non valida');
  p.photoMode=changes.photoMode;
 }
 if(Object.hasOwn(changes,'photo'))p.photo=validPhoto(changes.photo);
 // Chiodo has no cross-game friendship graph or private invite rooms.
 // Explicit 'friends' and 'room' modes never grant opponent visibility here.
 if(r.game){const target=r.game.players[seat];target.avatarId=p.avatarId;target.photoMode=p.photoMode;target.photo=p.photo;}
 r.revision++;return state(t);
}
function state(t){const {room:r,seat}=auth(t);tick(r);const g=r.game;return {id:r.id,seat,revision:r.revision,status:g?(g.ended?'finished':'playing'):'waiting',players:g?g.players.map((p,i)=>({...viewMember(p,i===seat),score:p.score,count:p.hand.length,team:g.format==='pairs'?i%2:null,eliminated:g.format!=='pairs'&&p.score>=121})):r.members.map((p,i)=>viewMember(p,i===seat)),n:r.n,format:r.format||'individual',matchFinished:!!g?.matchFinished,draw:!!g?.isDraw,resultText:g?.resultText||'',teamScores:g?.teamScores||null,realCount:r.members.filter(p=>!p.bot).length,botCount:r.members.filter(p=>p.bot).length,matchDeadline:g?0:r.matchDeadline,hand:g?g.players[seat].hand:[],top:g?g.discard.at(-1):null,suit:g?.suit,turn:g?.turn,penalty:g?.penalty,deckCount:g?.deck.length,message:g?.message,event:g?.event,voiceEvents:g?.voiceEvents||[],drawnPlayable:!!g?.drawnPlayable,turnDeadline:g?.turnDeadline||0,serverNow:Date.now(),pending:g?.pending?{actor:g.pending.i,calls:g.pending.calls,called:r.called,remainingMs:Math.max(0,r.deadline-Date.now())}:null,winners:g?.winners};}
function join(n,name,format='individual'){if(![2,3,4].includes(n))throw Error('Numero giocatori non valido');if(!['individual','pairs'].includes(format)||format==='pairs'&&n!==4)throw Error('Modalita non valida');if(sessions.size>=2000)throw Error('Server pieno');name=String(name||'Giocatore').trim().slice(0,32)||'Giocatore';const now=Date.now();for(const room of rooms.values())if(!room.game&&room.matchDeadline<=now)tick(room,now);let r=[...rooms.values()].find(r=>r.n===n&&(r.format||'individual')===format&&!r.game&&r.members.length<n);if(!r){r={id:id(),n,format,members:[],game:null,revision:0,deadline:0,called:[],updated:Date.now(),matchDeadline:now+MATCH_WAIT,botDue:0};rooms.set(r.id,r);}const t=id(),seat=r.members.length;r.members.push({name,t,bot:false,avatarId:0,photo:null,photoMode:'avatar'});sessions.set(t,{room:r,seat});r.updated=Date.now();r.revision++;if(r.members.length===n)startRoom(r);return {token:t,state:state(t)};}
function leave(t){const {room:r,seat}=auth(t);sessions.delete(t);
 if(!r.game){r.members.splice(seat,1);r.members.forEach((p,i)=>{const session=sessions.get(p.t);if(session)session.seat=i;});if(!r.members.length)dropRoom(r);else r.revision++;return {ok:true};}
 if(!r.members.some((p,i)=>i!==seat&&!p.bot)){dropRoom(r);return {ok:true};}
 const bot=botMember(r);r.members[seat]=bot;r.game.players[seat].name=bot.name;r.game.players[seat].bot=true;r.game.players[seat].photo=null;r.game.players[seat].photoMode='avatar';if(r.voice)delete r.voice[seat];if(r.signals)r.signals=r.signals.filter(x=>x.from!==seat&&x.to!==seat);r.botDue=0;r.revision++;return {ok:true};
}
function move(t,m){const {room:r,seat}=auth(t);tick(r);const g=r.game;if(!g)throw Error('Sala in attesa');if(m.revision!==r.revision)throw Error('Stato aggiornato: riprova');if(m.type==='call'){if(!g.pending||g.pending.i!==seat||!g.pending.calls.includes(m.call))throw Error('Dichiarazione non valida');if(!r.called.includes(m.call)){r.called.push(m.call);g.event={id:id(),seat,text:m.call+'!',voice:true};}if(g.pending.calls.every(c=>r.called.includes(c))){g.resolve(r.called);r.called=[];r.deadline=0;}}else if(m.type==='contest'){if(!g.pending||g.pending.i===seat||!g.active.includes(seat)||!g.pending.calls.includes(m.call)||r.called.includes(m.call)||Date.now()<r.deadline-1500)throw Error('Attendi la fine della dichiarazione');g.event={id:id(),seat,text:'CONTESTO '+m.call+'!',voice:true};g.resolve(r.called);r.called=[];r.deadline=0;}else if(m.type==='play'){const calls=g.play(seat,m.card,m.suit);if(calls.length){r.called=[];r.deadline=Date.now()+5000;}}else if(m.type==='draw')g.take(seat);else if(m.type==='next'){if(!g.ended||g.matchFinished||g.format!=='pairs'&&(g.winners.length<2||!g.winners.includes(seat)))throw Error('Nuova mano non consentita');g.round();}else throw Error('Mossa sconosciuta');r.revision++;r.updated=Date.now();return state(t);}
const allowed=new Set(['https://appassets.androidplatform.net',...(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)]);
const server=http.createServer(async(req,res)=>{const origin=req.headers.origin;if(origin&&allowed.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};if(origin&&!allowed.has(origin))return send(403,{error:'Origine non autorizzata'});if(req.method==='OPTIONS')return send(204,{});try{const path=new URL(req.url,'http://localhost').pathname,t=(req.headers.authorization||'').replace(/^Bearer /,'');if(path==='/health'&&req.method==='GET')return send(200,{ok:true,game:'chiodo121',revision:'6.3',realtime:true,turnTimeout:60,botMatchmaking:true,matchWaitSeconds:30});if(path==='/admob/health')return await require('./admob-ssv.js').health(send);if(path==='/admob/rewards')return await require('./admob-ssv.js').rewards(req,send);if(path==='/admob/ssv')return await require('./admob-ssv.js').callback(req,send);if(path==='/play/health')return await require('./play-billing.js').status(req,send);if(path==='/play/credits')return await require('./play-billing.js').credits(req,send);if(path==='/play/verify'){if(req.method!=='POST')return send(405,{error:'Metodo non valido'});let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)return send(413,{error:'Richiesta troppo grande'});}let payload;try{payload=JSON.parse(raw);}catch(e){return send(400,{error:'JSON non valido'});}return await require('./play-billing.js').verify(req,send,payload);}if(path.startsWith('/banco92/'))return await require('./banco92.js').route(req,send,path);if(path.startsWith('/expansion/'))return await require('./expansion.js').route(req,send,path);if(path.startsWith('/market/'))return await require('./market83.js').route(req,send,path);if(path.startsWith('/push/'))return await require('./push82.js').route(req,send,path);if(path.startsWith('/daily/'))return await require('./daily71.js').route(req,send,path);if(path.startsWith('/invites94/'))return await require('./invites94.js').route(req,send,path);if(path.startsWith('/audience/'))return await require('./audience85.js').route(req,send,path);if(path.startsWith('/social/'))return await require('./social70.js').route(req,send,path);if(path.startsWith('/chat/'))return await require('./chat77.js').route(req,send,path);if(path.startsWith('/feedback/'))return await require('./feedback78.js').route(req,send,path);if(path.startsWith('/profile79/'))return await require('./profile79.js').route(req,send,path);if(path==='/chiodo/state'&&req.method==='GET')return send(200,state(t));if(path==='/chiodo/profile'&&req.method==='POST'){let body='';for await(const c of req){body+=c;if(body.length>104000)return send(413,{error:'Foto troppo grande'});}return send(200,profile(t,JSON.parse(body||'{}')));}if(req.method!=='POST'||!['/chiodo/join','/chiodo/move','/chiodo/realtime','/chiodo/leave'].includes(path))return send(404,{error:'Endpoint sconosciuto'});let b='';for await(const chunk of req){b+=chunk;if(b.length>8192)return send(413,{error:'Richiesta troppo grande'});}const p=JSON.parse(b);return send(200,path.endsWith('/join')?join(p.n,p.name,p.format):path.endsWith('/realtime')?realtime(t,p):path.endsWith('/leave')?leave(t):move(t,p));}catch(e){return send(400,{error:e.message});}});
setInterval(()=>{const now=Date.now();for(const r of rooms.values()){if(now-r.updated>(r.game?30*60000:60*1000)){dropRoom(r);continue;}tick(r,now);}},250).unref();
if(require.main===module){server.listen(Number(process.env.PORT)||8080,'0.0.0.0');require('./push82.js').startDailySchedule();}
module.exports={Game,tick,join,state,move,leave,auth,profile,validPhoto,MATCH_WAIT};

