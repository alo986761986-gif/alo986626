/* Napoli Carte 3D 9.0 · Original Premium Club navigation */
(function(w,d){
'use strict';if(w.NC90_PREMIUM)return;
w.NC90_PREMIUM={version:'9.0.0'};
d.body.classList.add('nc90');
const commands=[
 ['home','⌂','Home',()=>{if(typeof w.lobby==='function')w.lobby();}],
 ['friends','♟','Amici',()=>w.NC70_SOCIAL?.open?.('friends')],
 ['ranking','♛','Classifiche',()=>w.NC79_PROFILE?.open?.('ranking')],
 ['bonus','🎁','Bonus',()=>w.NC71_DAILY?.open?.()],
 ['online','🌐','Gioca online',()=>w.NC72_ONLINE_OPEN?.()],
 ['market','🛒','Market',()=>w.NC_MARKET_OPEN?.()],
 ['profile','👤','Profilo',()=>w.NC79_PROFILE?.open?.()]
];
function el(tag,cls,txt){const n=d.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;}
function fmt(num){return Number(num||0).toLocaleString('it-IT');}
function safeName(){try{return w.NC80_IDENTITY?.get?.()||localStorage.getItem('nc3d_name')||'Giocatore';}catch(e){return 'Giocatore';}}
function activate(key){const item=commands.find(x=>x[0]===key);try{item?.[3]?.();}catch(e){console.warn('NC90 navigation',e);}}
function sidebar(main){
 if(main.querySelector('.nc90-sidebar'))return;
 const nav=el('nav','nc90-sidebar');
 nav.setAttribute('aria-label','Navigazione del club');
 for(const [id,icon,title] of commands){const b=el('button','nc90-nav');b.type='button';b.dataset.nc90Action=id;b.append(el('span','',icon),el('span','',title));b.addEventListener('click',()=>activate(id));nav.append(b);}
 main.insertBefore(nav,main.firstChild);
}
function profile(main){
 if(main.querySelector('.nc90-profilebar'))return;
 const bar=el('section','nc90-profilebar');
 bar.setAttribute('aria-label','Profilo e saldo');
 const p=el('button','');p.type='button';p.setAttribute('aria-label','Apri il tuo profilo');
 p.append(el('span','nc90-portrait','♛'));
 const name=el('span','');name.append(el('strong','nc90-nickname',safeName()),el('small','','GAMES STUDIOS · CLUB PREMIUM'));
 p.append(name);p.addEventListener('click',()=>activate('profile'));bar.append(p);
 const wallet=el('span','nc90-balance');wallet.setAttribute('aria-label','Crediti virtuali');
 wallet.textContent='🪙 '+fmt(w.NC_WALLET?.balance?.());bar.append(wallet);
 const note=el('button','nc90-notif','🔔');note.type='button';note.title='Notifiche del profilo';note.setAttribute('aria-label','Apri notifiche');note.addEventListener('click',()=>w.NC79_PROFILE?.open?.('notifications'));bar.append(note);
 const area=main.querySelector('.intro');
 if(area)main.insertBefore(bar,area);
}
function updateBar(){const p=d.querySelector('#root .nc90-profilebar');if(!p)return;
 const n=p.querySelector('.nc90-nickname');if(n)n.textContent=safeName();
 const b=p.querySelector('.nc90-balance');if(b)b.textContent='🪙 '+fmt(w.NC_WALLET?.balance?.());
}
let scheduled=false;
function paint(){
 scheduled=false;const root=d.getElementById('root');if(!root)return;
 const main=root.querySelector(':scope > main.wrap');
 const inLobby=!!(main&&main.querySelector('.games')&&main.querySelector('.setup'));
 const inGame=!!root.querySelector('.board,.ch-felt,.ch-arena');
 d.body.classList.toggle('nc90-in-lobby',inLobby);d.body.classList.toggle('nc90-in-game',inGame);
 if(inLobby){sidebar(main);profile(main);updateBar();}
}
function schedule(){if(scheduled)return;scheduled=true;w.requestAnimationFrame(paint);}
function start(){const root=d.getElementById('root');if(!root)return;
 new MutationObserver(schedule).observe(root,{childList:true,subtree:false});
 schedule();w.addEventListener('focus',updateBar);d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible')updateBar();});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
w.NC90_PREMIUM.refresh=schedule;
// Load the approved Cartoon Edition theme last. This stays presentation-only.
function loadCartoonEdition(){
 if(d.getElementById('nc96-cartoon-theme'))return;
 const link=d.createElement('link');
 link.id='nc96-cartoon-theme';
 link.rel='stylesheet';
 link.href='nc96-cartoon.css';
 d.head.appendChild(link);
 d.body.classList.add('nc96-cartoon');
 if(!d.getElementById('nc97-chiodo-theme')){
  const chiodo=d.createElement('link');
  chiodo.id='nc97-chiodo-theme';
  chiodo.rel='stylesheet';
  chiodo.href='nc97-chiodo-cartoon.css';
  d.head.appendChild(chiodo);
 }
 if(!d.getElementById('nc98-game-launch-style')){
  const style=d.createElement('link');style.id='nc98-game-launch-style';style.rel='stylesheet';style.href='nc98-launcher.css';d.head.appendChild(style);
 }
 if(!d.getElementById('nc98-chiodo-layout-style')){
  const layout=d.createElement('link');layout.id='nc98-chiodo-layout-style';layout.rel='stylesheet';layout.href='nc98-chiodo-layout.css';d.head.appendChild(layout);
 }
 if(!d.getElementById('nc913-hd-theme')){
  const hd=d.createElement('link');hd.id='nc913-hd-theme';hd.rel='stylesheet';
  hd.href='nc913-hd-motion.css';d.head.appendChild(hd);
 }
 if(!d.getElementById('nc913-motion-script')){
  const motion=d.createElement('script');motion.id='nc913-motion-script';motion.src='nc913-hd-motion.js';
  motion.defer=true;d.head.appendChild(motion);
 }
 if(!d.getElementById('nc98-game-launcher-script')){
  const script=d.createElement('script');script.id='nc98-game-launcher-script';script.src='nc98-launcher.js';d.head.appendChild(script);
 }
}
if(d.readyState==='complete')loadCartoonEdition();
else w.addEventListener('load',loadCartoonEdition,{once:true});

})(window,document);
