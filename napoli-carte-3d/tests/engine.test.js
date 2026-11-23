const assert=require('node:assert/strict');
const e=require('../backend/engine.js');
let tally=0;
for(const game of ['scopa','scopone','briscola','sette','asso','ruba']){
  for(const seats of (game==='scopone'?[4]:[2,4])){
   const {token}=e.join({game,seats,name:'Tester',bot:true});
   let s=e.state(token),i=0;
   while(s.status==='playing'&&i++<100){
      assert.equal(s.turn,0,`wrong turn: ${game} ${seats}`);
      if(game==='sette'){
        s=e.action(token,{action:s.hand.reduce((n,c)=>n+(c.v>7?.5:c.v),0)<5.5?'hit':'stand'});
      } else{
        const c=s.hand[0];assert.ok(c,`no hand ${game}`);
        const ch=e.opts(token,c.id).options[0];s=e.action(token,{card:c.id,...ch});
      }
   }
   assert.equal(s.status,'finished',`${game}/${seats} not finished after ${i} moves`);
   assert.ok(s.result&&s.scores.length);tally++;
   if(game==='briscola')assert.equal(s.scores.reduce((n,x)=>n+x.points,0),120);
   else if(game!=='sette')assert.equal(s.scores.reduce((n,x)=>n+x.cards,0),40);
   console.log('OK',game,seats,'turns',i,'winner',s.result);
  }
}
console.log('PASSED',tally,'full bot matches');
