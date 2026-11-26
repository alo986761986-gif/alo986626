/* IL BANCO — Smorfia Napoletana. Local, virtual-only tombola engine.
 * 90 unique balls, authentic 3x9/15 number cards, no wallet debits or real prizes.
 * UMD exports for Android WebView and Node regression tests.
 */
(function(root,factory){
 'use strict';
 const core=factory();
 if(typeof module==='object'&&module.exports)module.exports=core;
 if(root)root.NC_BANCO_CORE=core;
})(typeof window!=='undefined'?window:undefined,function(){
'use strict';
const LABELS=[
 'L’Italia','La bambina','La gatta','Il maiale','La mano','Quella che guarda a terra','Il vaso','La Madonna','La figliolanza','I fagioli',
 'I topi','I soldati','Sant’Antonio','L’ubriaco','Il ragazzo','Il sedere','La disgrazia','Il sangue','La risata','La festa',
 'La donna nuda','Il pazzo','Lo scemo','Le guardie','Il Natale','Sant’Anna','Il pitale','Il seno','Il padre dei bambini','Le palle del tenente',
 'Il padrone di casa','Il capitone','Gli anni di Cristo','La testa','L’uccellino','Le nacchere','Il monaco','Le mazzate','Il cappio al collo','La noia',
 'Il coltello','Il caffè','La donna al balcone','Il carcere','Il vino buono','I soldi','Il morto','Il morto che parla','La carne','Il pane',
 'Il giardino','La mamma','Il vecchio','Il cappello','La musica','La caduta','Il gobbo','Il pacco','I peli','Il lamento',
 'Il cacciatore','Il morto ammazzato','La sposa','Il frac','Il pianto','Le due zitelle','Il totano nella chitarra','La zuppa cotta','Sottosopra','Il palazzo',
 'L’uomo da poco','La meraviglia','L’ospedale','La grotta','Pulcinella','La fontana','I diavoletti','La bella figliola','Il ladro','La bocca',
 'I fiori','La tavola imbandita','Il maltempo','La chiesa','Le anime del purgatorio','La bottega','I pidocchi','I caciocavalli','La vecchia','La paura'
];
const DIALECT={
 1:'L’Italia',2:'’A piccerella',3:'’A gatta',4:'’O puorco',5:'’A mano',8:'’A Maronna',10:'’E fasule',
 13:'Sant’Antonio',15:'’O guaglione',19:'’A resata',20:'’A festa',25:'Natale',32:'’O capitone',
 33:'Ll’anne ’e Cristo',40:'’A paposcia',42:'’O ccafè',46:'’E denare',47:'’O muorto',
 48:'’O muorto che pparla',50:'’O ppane',52:'’A mamma',55:'’A musica',57:'’O scartellato',
 63:'’A sposa',70:'’O palazzo',72:'’A meraviglia',75:'Pulcinella',76:'’A funtana',
 79:'’O mariuolo',80:'’A vocca',84:'’A chiesa',89:'’A vecchia',90:'’A paura'
};
const PICTOS={1:'🇮🇹',2:'👧',3:'🐈',5:'✋',7:'🏺',8:'✨',10:'🫘',13:'🙏',19:'😂',20:'🎊',25:'🎄',32:'🐟',34:'🧠',42:'☕',46:'🪙',47:'🕯️',48:'🕯️',50:'🍞',52:'💗',55:'🎼',57:'🎩',63:'👰',70:'🏛️',72:'⭐',75:'🎭',76:'⛲',80:'👄',81:'🌸',83:'🌩️',84:'⛪',88:'🧀',90:'😱'};
const AWARDS=Object.freeze(['Ambo','Terno','Quaterna','Cinquina','Tombola']);
function getMeaning(n){
 if(!Number.isInteger(n)||n<1||n>90)return null;
 return {number:n,name:LABELS[n-1],dialect:DIALECT[n]||'',icon:PICTOS[n]||'🔮'};
}
function safeRng(rng){
 if(typeof rng==='function')return rng;
 if(typeof crypto!=='undefined'&&crypto.getRandomValues){
  const arr=new Uint32Array(1);
  return ()=>{crypto.getRandomValues(arr);return arr[0]/4294967296;};
 }
 return Math.random;
}
function randomInt(rng,max){return Math.min(max-1,Math.max(0,Math.floor(rng()*max)));}
function shuffled(values,rng){
 const arr=values.slice();
 for(let i=arr.length-1;i>0;i--){const j=randomInt(rng,i+1),tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}
 return arr;
}
function choose(values,n,rng){return shuffled(values,rng).slice(0,n);}
function combinations(n){const result=[];for(let bits=1;bits<8;bits++){const rows=[0,1,2].filter(x=>(bits&(1<<x))!==0);if(rows.length===n)result.push(rows);}return result;}
function createTicket(rngArg){
 const rng=safeRng(rngArg);
 // Every decade must appear, with no more than three numbers in one column.
 const amounts=Array(9).fill(1);
 for(let k=0;k<6;k++){const eligible=amounts.map((v,i)=>v<3?i:-1).filter(x=>x>=0);amounts[eligible[randomInt(rng,eligible.length)]]++;}
 const priority=shuffled(Array.from({length:9},(_,i)=>i),rng).sort((a,b)=>amounts[b]-amounts[a]);
 const rowsLeft=[5,5,5],assigned=Array(9);
 function assign(k){
  if(k===9)return rowsLeft.every(x=>x===0);
  const col=priority[k];
  const possibilities=shuffled(combinations(amounts[col]),rng).filter(rows=>rows.every(r=>rowsLeft[r]>0));
  for(const rows of possibilities){
   rows.forEach(r=>rowsLeft[r]--);assigned[col]=rows;
   const remaining=priority.slice(k+1).reduce((sum,c)=>sum+amounts[c],0);
   if(rowsLeft.every(x=>x>=0&&x<=remaining)&&assign(k+1))return true;
   rows.forEach(r=>rowsLeft[r]++);
  }
  return false;
 }
 if(!assign(0))throw new Error('Cartella non generabile');
 const grid=Array.from({length:3},()=>Array(9).fill(null));
 for(let c=0;c<9;c++){
  const pool=Array.from({length:c===0?9:c===8?11:10},(_,i)=>c===0?i+1:c*10+i);
  const nums=choose(pool,amounts[c],rng).sort((a,b)=>a-b);
  assigned[c].sort((a,b)=>a-b).forEach((row,i)=>grid[row][c]=nums[i]);
 }
 return grid;
}
function validateTicket(grid){
 if(!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==9))return false;
 const values=grid.flat().filter(v=>v!==null);
 if(values.length!==15||new Set(values).size!==15)return false;
 if(grid.some(row=>row.filter(v=>v!==null).length!==5))return false;
 for(let c=0;c<9;c++){
  const numbers=grid.map(row=>row[c]).filter(v=>v!==null);
  if(numbers.length<1||numbers.length>3)return false;
  if(numbers.some((n,i)=>!Number.isInteger(n)||(c===0?n<1||n>9:c===8?n<80||n>90:n<c*10||n>c*10+9)||(i>0&&numbers[i-1]>=n)))return false;
 }
 return true;
}
function newGame({ticketCount=1,autoMark=true,rng}={}){
 if(!Number.isInteger(ticketCount)||ticketCount<1||ticketCount>3)throw new RangeError('Da 1 a 3 cartelle');
 const random=safeRng(rng);
 const tickets=Array.from({length:ticketCount},()=>({grid:createTicket(random),marked:[]}));
 return {version:1,deck:shuffled(Array.from({length:90},(_,i)=>i+1),random),drawn:[],tickets,autoMark:!!autoMark,awards:[],finished:false};
}
function scan(game){
 const achieved=new Set();
 for(const ticket of game.tickets){
  const marked=new Set(ticket.marked);
  const full=ticket.grid.flat().filter(x=>x!==null).every(x=>marked.has(x));
  if(full)achieved.add('Tombola');
  for(const row of ticket.grid){
   const matches=row.filter(n=>n!==null&&marked.has(n)).length;
   if(matches>=2)achieved.add('Ambo');
   if(matches>=3)achieved.add('Terno');
   if(matches>=4)achieved.add('Quaterna');
   if(matches>=5)achieved.add('Cinquina');
  }
 }
 return AWARDS.filter(name=>achieved.has(name));
}
function checkAwards(game){
 const found=scan(game),newly=found.filter(x=>!game.awards.includes(x));
 game.awards=AWARDS.filter(name=>game.awards.includes(name)||newly.includes(name));
 if(game.awards.includes('Tombola')||game.drawn.length===90)game.finished=true;
 return newly;
}
function draw(game){
 if(!game||!Array.isArray(game.deck)||!Array.isArray(game.drawn))throw new TypeError('Partita non valida');
 if(game.finished||!game.deck.length)return null;
 const number=game.deck.pop();
 if(game.drawn.includes(number))throw new Error('Estrazione duplicata');
 game.drawn.push(number);
 if(game.autoMark)game.tickets.forEach(ticket=>{if(ticket.grid.flat().includes(number)&&!ticket.marked.includes(number))ticket.marked.push(number);});
 const awarded=checkAwards(game);
 return {number,meaning:getMeaning(number),awarded,remaining:game.deck.length};
}
function mark(game,index,number){
 if(!Number.isInteger(index)||index<0||index>=game.tickets.length)return {ok:false,reason:'Cartella non valida'};
 const ticket=game.tickets[index];
 if(!ticket.grid.flat().includes(number))return {ok:false,reason:'Numero non presente'};
 if(!game.drawn.includes(number))return {ok:false,reason:'Questo numero non è ancora uscito'};
 if(ticket.marked.includes(number))ticket.marked=ticket.marked.filter(v=>v!==number);
 else ticket.marked.push(number);
 return {ok:true,marked:ticket.marked.includes(number),awarded:checkAwards(game)};
}
function setAutoMark(game,value){
 game.autoMark=!!value;
 if(game.autoMark)game.tickets.forEach(ticket=>{for(const n of ticket.grid.flat())if(n!==null&&game.drawn.includes(n)&&!ticket.marked.includes(n))ticket.marked.push(n);});
 return checkAwards(game);
}
return Object.freeze({LABELS:Object.freeze(LABELS),AWARDS,getMeaning,shuffled,createTicket,validateTicket,newGame,draw,mark,scan,setAutoMark,checkAwards});
});
