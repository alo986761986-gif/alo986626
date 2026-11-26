'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sandbox={module:{exports:{}}};
new Function('module','window',fs.readFileSync('app/src/main/assets/banco91-core.js','utf8'))(sandbox.module,undefined);
const banco=sandbox.module.exports;
const all=Array.from({length:90},(_,i)=>i+1);
test('Smorfia is complete and canonical caffè=42, morto che parla=48',()=>{
 assert.equal(banco.LABELS.length,90);
 assert.equal(banco.getMeaning(42).name,'Il caffè');
 assert.equal(banco.getMeaning(48).name,'Il morto che parla');
 assert.equal(banco.getMeaning(0),null);
 assert.equal(banco.getMeaning(91),null);
 assert.equal(banco.getMeaning(17.5),null);
 for(const n of all)assert(banco.getMeaning(n)?.name);
});
test('500 generated classic tombola tickets each have 15 numbers and 5 per row',()=>{
 for(let i=0;i<500;i++){
  const card=banco.createTicket();
  assert.equal(banco.validateTicket(card),true,JSON.stringify(card));
  assert.equal(card.flat().filter(x=>x!==null).length,15);
  assert.deepEqual(card.map(row=>row.filter(x=>x!==null).length),[5,5,5]);
 }
});
test('Draws are unique and from 1 to 90, no repeat between calls',()=>{
 const game=banco.newGame({ticketCount:3});
 assert.equal(game.tickets.length,3);
 assert.equal(new Set(game.deck).size,90);
 assert.equal(game.deck.length,90);
 for(let i=0;i<90&&!game.finished;i++){
  const result=banco.draw(game);
  assert.equal(result.number>=1&&result.number<=90,true);
  assert.equal(new Set(game.drawn).size,game.drawn.length);
 }
 assert.equal(game.finished,true);
 assert.equal(banco.draw(game),null);
});
test('Manual marking requires extracted number and number on ticket',()=>{
 const game=banco.newGame({ticketCount:1,autoMark:false});
 const n=game.tickets[0].grid.flat().find(n=>n!==null);
 assert.equal(banco.mark(game,0,n).ok,false);
 game.deck=game.deck.filter(x=>x!==n);
 game.deck.push(n);
 banco.draw(game);
 assert.equal(banco.mark(game,0,n).ok,true);
 assert.equal(game.tickets[0].marked.includes(n),true);
 assert.equal(banco.mark(game,0,n).marked,false);
 assert.equal(banco.mark(game,99,n).ok,false);
});
test('Ambo, Terno, Quaterna, Cinquina and Tombola recognised in order',()=>{
 const game=banco.newGame({ticketCount:1,autoMark:false});
 const nums=game.tickets[0].grid[0].filter(x=>x!==null);
 game.drawn.push(...nums);
 for(let k=2;k<=5;k++){
  game.tickets[0].marked=nums.slice(0,k);
  const achieved=banco.scan(game);
  assert.deepEqual(achieved,banco.AWARDS.slice(0,k-1));
 }
 const whole=game.tickets[0].grid.flat().filter(n=>n!==null);
 game.tickets[0].marked=whole;
 const newAwards=banco.checkAwards(game);
 assert.deepEqual(newAwards,['Ambo','Terno','Quaterna','Cinquina','Tombola']);
 assert.equal(game.finished,true);
});
test('automatic marking can synchronise from existing verified draws',()=>{
 const game=banco.newGame({ticketCount:2,autoMark:false});
 const nums=game.tickets[0].grid.flat().filter(x=>x!==null).slice(0,4);
 for(const n of nums){const ix=game.deck.indexOf(n);game.deck.splice(ix,1);game.deck.push(n);banco.draw(game);}
 assert.equal(game.tickets[0].marked.length,0);
 banco.setAutoMark(game,true);
 for(const n of nums)assert(game.tickets[0].marked.includes(n));
});
test('Bingo mode rejects nonsensical card counts',()=>{
 for(const n of [0,4,-1,1.5,'2',null])assert.throws(()=>banco.newGame({ticketCount:n}));
});
test('Local game launcher and Android Back are installed without modifying cards engine',()=>{
 const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
 const ui=fs.readFileSync('app/src/main/assets/banco91.js','utf8');
 const css=fs.readFileSync('app/src/main/assets/banco91.css','utf8');
 const back=fs.readFileSync('app/src/main/assets/compat81.js','utf8');
 for(const name of ['banco91.css','banco91-core.js','banco91.js'])assert(html.includes(name));
 assert(ui.includes("className='game nc91-launch'"));
 assert(ui.includes('NC_BANCO_OPEN=open'));
 assert(ui.includes('NC_BANCO_CLOSE=close'));
 assert(ui.includes('NC_BANCO_IS_OPEN'));
 assert(back.includes('if(w.NC_BANCO_CLOSE?.())return true;'));
 assert(css.includes('.nc91-ticket'));
 assert(css.includes('prefers-reduced-motion'));
 assert(!ui.includes('NC_WALLET.buy'));
});
test('Version is bumped for a distinct installable update',()=>{
 const s=fs.readFileSync('app/build.gradle','utf8');
 assert.match(s,/versionCode (?:91|92|93|94)\b/);
 assert.match(s,/versionName '9\.(?:1|2|3|4)\.0'/);
});
