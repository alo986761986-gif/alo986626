const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('frontend/index.html','utf8');
for(let suit=0;suit<4;suit++){
 for(let rank=1;rank<=10;rank++){
  assert(html.includes('"'+suit+'_'+rank+'":"data:image/webp;base64,'),'Missing Neapolitan card '+suit+'_'+rank);
 }
}
assert(html.includes('id="napoli-traditional-deck-script"'));
assert(html.includes('Florixc'));
assert(html.includes('window.NC3D_CARD_RENDER=function(c,clickable)'));
console.log('Traditional Naples deck test: 40/40 cards, suits Denari/Coppe/Spade/Bastoni, offline embedded artwork OK.');
