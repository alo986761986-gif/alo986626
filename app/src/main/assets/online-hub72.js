(function(){
'use strict';
const games=[['scopa','Scopa','🪙'],['scopone','Scopone scientifico','👑'],['briscola','Briscola','⚔️'],['sette','Sette e Mezzo','7½'],['asso','Asso Piglia Tutto','🏆'],['ruba','Ruba Mazzetto','🃏'],['chiodo121','Chiodo 121','♠']];
const expansionIcons={tressette:'🃏',traversone:'🔄',briscola_chiamata:'🤝',bestia:'🐺',trentuno:'31',cucu:'🐦',cirulla:'✨',asino:'🐴',dubito:'🎭',tressette_morto:'👤',mercante:'🎪'};
const expansionGames=window.NC_EXPANSION_SESSION?.catalog?.()||[];
const expansionIds=new Set(expansionGames.map(game=>game.id));
games.push(['banco','Il Banco · Tombola','🎱']);
for(const game of expansionGames)games.push([game.id,game.title,expansionIcons[game.id]||'🃏']);
const tiers=[['PRINCIPIANTI I',100,'green'],['PRINCIPIANTI II',200,'teal'],['INTERMEDIO I',500,'blue'],['INTERMEDIO II',2000,'blue'],['AVANZATO I',10000,'magenta'],['AVANZATO II',40000,'magenta'],['MEGA PRO',100000,'purple']];
let root=null,selected='scopa',humanCount=null;
const fmt=n=>n.toLocaleString('it-IT');
function node(t,c,s){const n=document.createElement(t);if(c)n.className=c;if(s!=null)n.textContent=s;return n;}
function $(selector){return root&&root.querySelector(selector);}
function close(){root?.remove();root=null;}
function info(s){const e=$('#nc72-message');if(e)e.textContent=s;}
function draw(){
 if(!root)return;
 const gamesNode=$('#nc72-games');gamesNode.replaceChildren();
 for(const [id,name,icon] of games){const b=node('button','nc72-game'+(id===selected?' active':''));b.type='button';b.append(node('span','nc72-game-icon',icon),node('strong','',name));b.onclick=()=>{selected=id;humanCount=null;draw();presence();};gamesNode.append(b);}
 $('#nc72-selected').textContent=games.find(g=>g[0]===selected)[1];
 const rooms=$('#nc72-rooms');rooms.replaceChildren();
 if(expansionIds.has(selected)){
  const b=node('button','nc72-room green wide');b.type='button';
  b.append(node('span','nc72-room-icon',expansionIcons[selected]||'🃏'),node('strong','','APRI IL TAVOLO'),node('span','nc72-cost','Partita a punti · Nessun credito prelevato'),node('small','','Scegli i partecipanti, cerca avversari o crea una sala privata.'));
  b.onclick=()=>enter(0);rooms.append(b);return;
 }
 if(selected==='banco'){
  const b=node('button','nc72-room blue wide');b.type='button';
  b.append(node('span','nc72-room-icon','🎱'),node('strong','','IL BANCO ONLINE'),node('small','','Apri le sale di Tombola e scegli cartelle e modalità.'));
  b.onclick=()=>enter(0);rooms.append(b);return;
 }
 tiers.forEach(([title,cost,color],i)=>{
  const b=node('button','nc72-room '+color+(i===6?' wide':'')+(i?' locked':''));b.type='button';
  b.append(node('span','nc72-room-icon',i>3?'🔒':i===0?'🃏':'🏆'),node('strong','',title),node('span','nc72-cost','🪙 '+fmt(cost)+' crediti'),node('small','',i?'Sala in attivazione':'Sala base disponibile'));
  if(i===0&&selected==='chiodo121'&&humanCount!==null)b.append(node('small','',humanCount+' giocatori reali collegati'));
  b.onclick=()=>enter(i);rooms.append(b);
 });
}
async function presence(){
 const el=$('#nc72-online');if(!el)return;
 if(expansionIds.has(selected)){el.textContent='Il tavolo mostra i partecipanti quando la sala è aperta.';return;}
 if(selected==='banco'){el.textContent='Tombola e Smorfia Napoletana, con sale pubbliche e private.';return;}
 if(selected!=='chiodo121'){el.textContent='Conteggio utenti non ancora disponibile per questo gioco';return;}
 el.textContent='Verifica giocatori collegati…';
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  let r;try{r=await fetch('https://napoli-chiodo-121.onrender.com/lobby/status',{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}
  const d=await r.json();if(!r.ok||!d.ok||!Number.isSafeInteger(d.humans))throw Error('Stato non disponibile');
  if(root&&selected==='chiodo121'){humanCount=d.humans;el.textContent=fmt(humanCount)+' giocatori reali collegati';draw();}
 }catch(e){if(root&&selected==='chiodo121')el.textContent='Presenze non disponibili dal server';}
}
function enter(i){
 if(i!==0){info('Sala non ancora attiva: il server deve gestire categorie separate e verifiche crediti. Nessun credito viene scalato.');return;}
 const chosen=selected;close();
 if(window.NC98_LAUNCHER?.open?.(chosen,'online'))return;
 if(expansionIds.has(chosen)){if(window.NC_EXPANSION?.open?.(chosen,'online'))return;open();info('Il tavolo non è disponibile. Riapri il gioco.');return;}
 if(chosen==='banco'){if(typeof window.NC_BANCO_ONLINE_OPEN==='function')window.NC_BANCO_ONLINE_OPEN();else{open();info('Il Banco online non è disponibile.');}return;}
 if(chosen==='chiodo121'){const b=document.querySelector('#chiodo-online-entry');if(b)b.click();else{window.drawLobby?.();setTimeout(()=>document.querySelector('#chiodo-online-entry')?.click(),100);}return;}
 try{if(typeof window.setGame!=='function'||typeof window.setMode!=='function'||typeof window.joinGame!=='function')throw Error('Multiplayer classico non disponibile');window.setGame(chosen);window.setMode('online');window.joinGame();}
 catch(e){open();info(e.message);}
}
function open(){
 if(root)return;
 root=node('section','nc72-overlay');root.id='nc72-hub';root.setAttribute('role','dialog');root.setAttribute('aria-label','Sale di gioco online');root.setAttribute('aria-modal','true');
 root.innerHTML='<div class="nc72-page"><header class="nc72-head"><button id="nc72-back" aria-label="Indietro">❮</button><span class="nc72-vip">♛ VIP CLUB</span><span class="nc72-balance">🪙 <b id="nc72-balance">—</b></span><span class="nc72-avatar">👤</span><button id="nc72-close" aria-label="Chiudi">☰</button></header><main><section class="nc72-hero"><div class="nc72-logo">♛ 🃏 ♛<br><b>NAPOLI<br>CARTE 3D</b></div><div><h1>GIOCARE ONLINE</h1><p>Scegli un gioco e apri la sua sala online.</p><button id="nc72-go">▶ GIOCARE ORA</button></div></section><h2 class="nc72-band">♠ TUTTI I GIOCHI DI NAPOLI CARTE 3D</h2><nav id="nc72-games"></nav><h2 class="nc72-band">♛ SCEGLI LA SALA DI GIOCO</h2><h3 id="nc72-selected"></h3><p id="nc72-online"></p><p role="status" id="nc72-message"></p><div id="nc72-rooms"></div><p class="nc72-foot">Le nuove partite a punti non prelevano crediti. Numeri utenti mostrati soltanto se verificati dal server. Le sale premium sono bloccate finché non saranno operative in sicurezza.</p></main></div>';
 document.body.append(root);
 $('#nc72-back').onclick=close;$('#nc72-close').onclick=close;$('#nc72-go').onclick=()=>$('#nc72-rooms').scrollIntoView({behavior:'smooth',block:'start'});
 const balance=window.NC_WALLET?.balance?.();$('#nc72-balance').textContent=Number.isSafeInteger(balance)?fmt(balance):'—';
 draw();presence();
}
const style=node('style');
style.textContent=[
'#nc72-launch{position:fixed;right:13px;bottom:118px;z-index:2147482700;background:linear-gradient(#f6d57f,#a46b23);color:#102521;border:2px solid #ffe9aa;border-radius:25px;padding:11px 14px;font-weight:900;box-shadow:0 6px 16px #0009}',
'.nc72-overlay{position:fixed;inset:0;z-index:2147483500;background:#030b13f4;overflow:auto;color:white;font-family:system-ui,sans-serif}',
'.nc72-page{max-width:850px;min-height:100dvh;margin:auto;background:linear-gradient(#122d46,#0b1728 60%,#171026)}',
'.nc72-head{position:sticky;top:0;z-index:1;background:#090909;border-bottom:2px solid #e8bd61;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:9px}',
'.nc72-head button{border:1px solid #c39c50;background:#111;color:#ffe6a8;border-radius:12px;font-size:23px;min-width:37px;min-height:42px}',
'.nc72-vip{border:1px solid #f2d386;border-radius:24px;padding:10px;background:#41321c;font-size:11px;font-weight:900;color:#ffe3a3}',
'.nc72-balance{border:1px solid #b89544;border-radius:25px;background:#080808;padding:9px 7px;text-align:center;flex:1;color:#ffe29c}',
'.nc72-avatar{font-size:28px}',
'.nc72-hero{display:grid;grid-template-columns:1fr 1.5fr;align-items:center;gap:12px;padding:25px 14px;text-align:center;background:radial-gradient(ellipse at bottom left,#286c9c,#0a315c 60%,#071829);border-bottom:2px solid #d8a947}',
'.nc72-logo{color:#ffe39b;font-size:21px;font-weight:900;text-shadow:0 3px #0a1b34}.nc72-logo b{font-size:clamp(16px,5vw,32px)}',
'.nc72-hero h1{font-size:clamp(18px,5vw,32px);color:#ffdfa2;margin:5px 0}.nc72-hero p{font-size:13px;line-height:1.4}',
'.nc72-hero button{border-radius:35px;border:3px solid #a3edff;background:linear-gradient(#00c5e9,#0069af);color:#fff;padding:12px 8px;font-weight:900;width:100%}',
'.nc72-band{text-align:center;font-size:14px;color:#ffe6ac;border:1px solid #cea854;border-radius:25px;background:#181d29;max-width:fit-content;margin:16px auto;padding:8px 16px}',
'#nc72-games{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:5px;padding:4px 9px}',
'.nc72-game{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:90px;gap:5px;background:linear-gradient(125deg,#174d43,#503159);border:1px solid #c89d4e;border-radius:10px;color:#fff;padding:6px 2px}',
'.nc72-game.active{border:3px solid #ffe08a;box-shadow:0 0 13px #f5b8499c}.nc72-game-icon{font-size:24px}.nc72-game strong{font-size:clamp(10px,1.8vw,12px);overflow-wrap:anywhere}',
'#nc72-selected,#nc72-online,#nc72-message{text-align:center;font-size:13px;margin:7px auto;min-height:16px}#nc72-selected{color:#ffdf90}#nc72-message{color:#ffdb80;padding:0 15px}',
'#nc72-rooms{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:10px}',
'.nc72-room{border-radius:15px;border:2px solid #8ce2af;background:linear-gradient(120deg,#47ae58,#167849);color:#fff;min-height:135px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:9px;text-align:center;box-shadow:inset 0 2px #ffffff3d,0 5px 12px #0006}',
'.nc72-room.teal{background:linear-gradient(120deg,#44b6a7,#217b9f)}.nc72-room.blue{background:linear-gradient(120deg,#4e9bdb,#22589b);border-color:#a3d5fe}.nc72-room.magenta{background:linear-gradient(120deg,#ad4e84,#6b225b);border-color:#dd9cc7}.nc72-room.purple{background:linear-gradient(120deg,#2e234f,#4c2765);border-color:#efd395}',
'.nc72-room.wide{grid-column:span 2}.nc72-room.locked{filter:saturate(.65)}.nc72-room-icon{font-size:23px}.nc72-room strong{font-size:clamp(15px,4vw,22px)}.nc72-cost{font-weight:900}.nc72-room small{font-size:10px;color:#ffebc7}',
'.nc72-foot{text-align:center;color:#bec8c9;font-size:11px;line-height:1.5;padding:8px 12px 22px}'
].join('');
document.head.append(style);
function mount(){if(document.getElementById('nc72-launch'))return;const b=node('button');b.id='nc72-launch';b.textContent='🌐 GIOCARE ONLINE';b.onclick=open;document.body.append(b);}
function attachLobbyVisibility(){
 const lobby=document.getElementById('root');if(!lobby)return;
 const sync=()=>{const b=document.getElementById('nc72-launch');if(b)b.hidden=!Boolean(lobby.querySelector('.setup'));};
 new MutationObserver(sync).observe(lobby,{childList:true,subtree:true});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();attachLobbyVisibility()});else{mount();attachLobbyVisibility()};
window.NC72_ONLINE_OPEN=open;window.NC72_ONLINE_CLOSE=close;
window.NC72_ONLINE_SELECT=function(id){if(games.some(g=>g[0]===id)){selected=id;if(root){draw();presence();}}};
})();

/* NAPOLI CARTE 3D 9.5 - streamlined game selection.
 * Hide presentation-only setup panels. Keep state, multiplayer and menus intact.
 */
(function(w,d){
 'use strict';
 if(w.NC95_CLEAN_LOBBY)return;
 w.NC95_CLEAN_LOBBY={version:'9.5.0'};
 const style=d.createElement('style');
 style.id='nc95-clean-lobby';
 style.textContent=`
 #root main.wrap>.setup,
 #root main.wrap>.nc30-settings,
 #root main.wrap>.nc30-achievements,
 #root main.wrap>.nc30-banner,
 #root main.wrap #nc-ultimate-options,
 #nc72-launch{display:none!important}
 #root main.wrap>.games{margin-bottom:24px!important}
 #root main.wrap>.games button.game{cursor:pointer}
 #root main.wrap>.games button.game:focus-visible{outline:3px solid #ffe3a0!important;outline-offset:3px}
 @media(max-width:760px){#root main.wrap>.games{padding-bottom:22px!important}}
 `;
 d.head.append(style);
 let opening=false;
 d.addEventListener('click',function(e){
  const tile=e.target.closest&&e.target.closest('#root main.wrap .games button.game');
  if(!tile)return;
  const match=/setGame\('([a-z_]+)'\)/.exec(tile.getAttribute('onclick')||'');
  if(!match||opening)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(typeof w.setGame!=='function'||typeof w.setMode!=='function'||typeof w.joinGame!=='function')return;
  if(w.NC98_LAUNCHER?.open?.(match[1]))return;
  opening=true;
  try{
   w.setGame(match[1]);
   w.setMode('bot');
   Promise.resolve(w.joinGame()).finally(function(){opening=false});
  }catch(err){
   opening=false;
   if(typeof w.toast==='function')w.toast('Impossibile avviare il gioco');
  }
 },true);
})(window,document);
