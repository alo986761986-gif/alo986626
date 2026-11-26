/* Napoli Carte 3D · Club Edition 8.4 — original UI enhancements.
 * Decorative only. Existing game, room, social and market controls remain authoritative.
 */
(function(w,d){
'use strict';
if(w.NC84_CLUB_EDITION)return;
w.NC84_CLUB_EDITION={version:'8.4.0'};
const body=d.body;
body.classList.add('nc84');
const cards=[['7','♠','K'],['3','♦','7'],['A','♣','Q'],['7','♥','3'],['A','♦','7'],['K','♠','A']];
let scheduled=false,observer=null;
function decorateLobby(main){
 if(!main)return;
 const intro=main.querySelector('.intro'),games=main.querySelector('.games');
 if(!intro||!games)return;
 if(!main.querySelector('.nc84-featurestrip')){
  const feature=d.createElement('div');
  feature.className='nc84-featurestrip';
  feature.setAttribute('aria-label','Funzionalità disponibili');
  feature.innerHTML='<span>♠ Carte napoletane</span><span>🌍 Sfide online</span><span>✦ Club Edition</span>';
  if(intro.nextSibling)intro.parentNode.insertBefore(feature,intro.nextSibling);
  else intro.after(feature);
 }
 games.querySelectorAll('button.game').forEach((tile,i)=>{
  if(tile.querySelector('.nc84-cardfan'))return;
  const fan=d.createElement('span');fan.className='nc84-cardfan';
  fan.setAttribute('aria-hidden','true');
  const c=cards[i%cards.length];
  c.forEach(face=>{const card=d.createElement('i');card.textContent=face;fan.append(card);});
  tile.append(fan);
 });
}
function apply(){
 scheduled=false;
 const root=d.getElementById('root');
 if(!root)return;
 const main=root.querySelector(':scope > main.wrap');
 const lobby=!!(main?.querySelector('.intro')&&main?.querySelector('.games')&&main?.querySelector('.setup'));
 body.classList.toggle('nc84-in-lobby',lobby);
 body.classList.toggle('nc84-in-game',!!root.querySelector('.board,.ch-felt,.ch-arena'));
 if(lobby)decorateLobby(main);
}
function schedule(){if(scheduled)return;scheduled=true;w.requestAnimationFrame(apply);}
function boot(){
 const root=d.getElementById('root');
 if(!root){schedule();return;}
 observer=new MutationObserver(schedule);
 observer.observe(root,{childList:true,subtree:false});
 schedule();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
w.NC84_CLUB_EDITION.refresh=schedule;
})(window,document);
