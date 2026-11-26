(function(w,d){
'use strict';
const games=[
 ['scopa','Scopa','🪙','Fai prese, scope e conquista il settebello.'],
 ['scopone','Scopone scientifico','👑','Quattro giocatori in due squadre: vince la strategia.'],
 ['briscola','Briscola','⚔️','Scegli la carta migliore e usa il seme di briscola.'],
 ['sette','Sette e Mezzo','7½','Avvicinati a sette e mezzo senza superarlo.'],
 ['asso','Asso Piglia Tutto','🏆','Gli assi possono cambiare la partita.'],
 ['ruba','Ruba Mazzetto','🃏','Fai prese e ruba i mazzetti.'],
 ['chiodo121','Chiodo 121','♠','Gioca le carte speciali rispettando il turno.']
];
const expansionIcons={tressette:'🃏',traversone:'🔄',briscola_chiamata:'🤝',bestia:'🐺',trentuno:'31',cucu:'🐦',cirulla:'✨',asino:'🐴',dubito:'🎭',tressette_morto:'👤',mercante:'🎪'};
const expansionDescriptions={tressette:'Rispondi al seme e conquista le prese.',traversone:'Cerca di evitare i punti delle prese.',briscola_chiamata:'Asta, carta chiamata e alleato segreto.',bestia:'Scegli se entrare e conquista le prese.',trentuno:'Migliora il tuo seme e scegli quando bussare.',cucu:'Tieni o scambia la carta al tuo turno.',cirulla:'Prese a quindici, accusi e combinazioni.',asino:'Elimina le coppie e pesca dagli avversari.',dubito:'Gioca coperto e scegli quando dubitare.',tressette_morto:'Gioca con la mano scoperta del Morto.',mercante:'Aste di carte e premi di partita.'};
const expansionGames=w.NC_EXPANSION_SESSION?.catalog?.()||[];
const expansionIds=new Set(expansionGames.map(game=>game.id));
games.push(['banco','Il Banco · Tombola','🎱','Tombola e Smorfia Napoletana, locale e online.']);
for(const game of expansionGames)games.push([game.id,game.title,expansionIcons[game.id]||'🃏',expansionDescriptions[game.id]||'Apri il tavolo e leggi la variante.']);
let panel=null,step=0,selected='scopa',done=false;
let audio=null,playing=false,starting=false,gameActive=false,systemPaused=false;
const MUSIC_KEY='nc74_music_enabled';
let enabled=true;
try { enabled=w.localStorage.getItem(MUSIC_KEY)!=='0'; } catch(e) {}
const $=s=>panel?.querySelector(s);
const create=(tag,cls,value)=>{const el=d.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el;};
function scope(){try{return w.NCRewardNative?.accountScope?.()||'guest';}catch(e){return 'guest';}}
function key(){return 'nc74_welcome_seen:'+scope();}
function seen(){try{return w.localStorage.getItem(key())==='1';}catch(e){return false;}}
function remember(){try{w.localStorage.setItem(key(),'1');}catch(e){}}
function nickname(){try{const name=w.NCRewardNative?.displayName?.()||w.localStorage.getItem('nc3d_name');return name&&name.trim()?name.trim().slice(0,24):'Giocatore';}catch(e){return 'Giocatore';}}
function musicLabel(){
 const message=enabled?'♫ Disattiva musica':'♫ Attiva musica';
 for(const btn of [$('#nc74-music')]){
  if(btn){btn.textContent=message;btn.setAttribute('aria-pressed',enabled?'true':'false');}
 }
}
function ensureAudio(){
 if(audio)return audio;
 const player=new Audio('music/alfonso-neri-bass-on-fire.mp3');
 player.preload='auto';player.volume=.28;player.loop=true;
 player.addEventListener('error',()=>{if(audio===player){playing=false;starting=false;musicLabel();}});
 audio=player;return player;
}
async function startMusic(){
 if(!enabled||gameActive||systemPaused||starting||playing||d.hidden)return;
 const player=ensureAudio();starting=true;
 try{
  await player.play();
  if(!enabled||gameActive||systemPaused||d.hidden){player.pause();return;}
  playing=true;
 }catch(e){playing=false;}finally{starting=false;musicLabel();}
}
function pauseMusic(){
 if(audio)audio.pause();
 playing=false;
}
function detectGame(){const host=d.getElementById('root');return !!(w.NC_EXPANSION?.isPlaying?.()||w.NC_BANCO_IS_OPEN?.()||w.NC_BANCO_ONLINE_IS_OPEN?.()||d.getElementById('chiodo121')||d.getElementById('chiodo121-online')||(host&&!host.querySelector('.setup')&&(host.querySelector('.board')||host.querySelector('.waiting')||host.querySelector('.scoreboard'))));}
function syncGameMusic(){const on=detectGame();if(on!==gameActive){gameActive=on;if(on)pauseMusic();else if(enabled&&!gameActive)startMusic();}}
function setMusic(on){
 enabled=!!on;
 try{w.localStorage.setItem(MUSIC_KEY,enabled?'1':'0');}catch(e){}
 if(enabled&&!gameActive)startMusic();else pauseMusic();
 musicLabel();
 try{w.dispatchEvent(new Event('nc74:music-change'));}catch(e){}
}
function toggleMusic(){setMusic(!enabled);}
function close(){remember();panel?.remove();panel=null;musicLabel();}
function launch(kind){
 const game=selected;close();
 if(expansionIds.has(game)){w.NC_EXPANSION?.open?.(game,kind==='online'?'online':'cpu');return;}
 if(game==='banco'){if(kind==='online')w.NC_BANCO_ONLINE_OPEN?.();else w.NC_BANCO_OPEN?.();return;}
 if(kind==='online'){
  if(typeof w.NC72_ONLINE_OPEN==='function'){w.NC72_ONLINE_OPEN();w.NC72_ONLINE_SELECT?.(game);}
  else w.setMode?.('online');
 }else if(kind==='cpu'&&game!=='chiodo121'){
  w.setGame?.(game);w.setMode?.('bot');w.joinGame?.();
 }
}
function tile(title,description,icon){
 const row=create('div','nc74-info');
 row.append(create('span','nc74-info-icon',icon));
 const wrap=create('div');wrap.append(create('strong','',title),create('p','',description));row.append(wrap);
 return row;
}
function paint(){
 if(!panel)return;
 const body=$('#nc74-body');body.replaceChildren();
 $('#nc74-count').textContent='PASSO '+(step+1)+' DI 5';
 if(step===0){
  body.append(create('div','nc74-cards','🃏 🪙 ♛'));
  body.append(create('h2','nc74-title','Benvenuto, '+nickname()+'!'));
  body.append(create('p','nc74-copy','Napoli Carte 3D ti dà il benvenuto! '+games.length+' giochi, carte napoletane, Tombola e sfide online.'));
  body.append(create('p','nc74-gold','La passione di Napoli, una carta alla volta.'));
 }else if(step===1){
  body.append(create('h2','nc74-title','Scopri i '+games.length+' giochi'));
  body.append(create('p','nc74-copy','Tocca un gioco per scegliere quello che vuoi provare.'));
  const list=create('div','nc74-game-grid');
  for(const [id,name,icon,description] of games){
   const b=create('button','nc74-game'+(id===selected?' active':''));
   b.type='button';b.append(create('span','',icon),create('strong','',name),create('small','',description));
   b.onclick=()=>{selected=id;paint();};list.append(b);
  }body.append(list);
 }else if(step===2){
  body.append(create('h2','nc74-title','Come iniziare a giocare'));
  body.append(tile('1 · Scegli il gioco','Seleziona un gioco dal menu principale e imposta i partecipanti.','🃏'));
  body.append(tile('2 · Contro CPU','Premi Contro CPU e poi Gioca subito per una partita immediata.','🤖'));
  body.append(tile('3 · Online mondiale','Apri Giocare online, seleziona un gioco e una sala attiva per cercare avversari.','🌐'));
 }else if(step===3){
  body.append(create('h2','nc74-title','Crediti, regole e amici'));
  body.append(tile('Bonus giornaliero','Apri 🎁 Bonus giornaliero e riscatta una ricompensa gratuita ogni giorno.','🎁'));
  body.append(tile('Regole complete','Consulta le regole dei classici dal menu e leggi la variante prima di aprire un nuovo tavolo.','📖'));
  body.append(tile('Amici e statistiche','Cerca i nickname e consulta i dati disponibili nella tua area personale.','👥'));
  body.append(create('p','nc74-gold','I crediti sono virtuali e non si convertono in denaro.'));
 }else{
  body.append(create('h2','nc74-title','Ora tocca a te!'));
  body.append(create('p','nc74-copy','Gioco scelto: '+games.find(x=>x[0]===selected)[1]+'. Puoi andare al menu, aprire le sale online oppure iniziare una sfida contro CPU.'));
  const actions=create('div','nc74-actions');
  if(selected!=='chiodo121'){const cpu=create('button','nc74-cpu','🤖 GIOCA CONTRO CPU');cpu.onclick=()=>launch('cpu');actions.append(cpu);}
  const online=create('button','nc74-online','🌐 GIOCARE ONLINE');online.onclick=()=>launch('online');actions.append(online);
  const home=create('button','nc74-home','🏠 ENTRA NEL GIOCO');home.onclick=close;actions.append(home);
  body.append(actions);
  body.append(create('p','nc74-gold','Puoi riaprire questa guida in qualsiasi momento.'));
 }
 const dots=$('#nc74-dots');dots.replaceChildren();
 for(let i=0;i<5;i++){const dot=create('button','nc74-dot'+(i===step?' active':''));dot.type='button';dot.setAttribute('aria-label','Passo '+(i+1));dot.onclick=()=>{step=i;paint();};dots.append(dot);}
 $('#nc74-prev').disabled=step===0;
 $('#nc74-next').textContent=step===4?'ENTRA NEL GIOCO ✓':'AVANTI ❯';
}
function open(){
 if(panel)return;
 step=0;panel=create('section','nc74-overlay');panel.id='nc74-welcome';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Benvenuto a Napoli Carte 3D');
 panel.innerHTML='<div class="nc74-panel"><div class="nc74-sky"><span>🌋</span><b>NAPOLI CARTE 3D</b></div><header><span id="nc74-count">PASSO 1 DI 5</span><button id="nc74-skip">SALTA INTRODUZIONE ×</button></header><main id="nc74-body"></main><footer><nav id="nc74-dots" aria-label="Passaggi"></nav><div class="nc74-controls"><button id="nc74-prev">❮ INDIETRO</button><button id="nc74-next">AVANTI ❯</button></div><button id="nc74-music" aria-pressed="false">♫ Ascolta Bass on Fire</button><small>Musica originale: Alfonso Neri · Bass on Fire</small></footer></div>';
 d.body.append(panel);
 $('#nc74-skip').onclick=close;$('#nc74-prev').onclick=()=>{if(step>0){step--;paint();}};
 $('#nc74-next').onclick=()=>{if(step===4)close();else{step++;paint();}};
 $('#nc74-music').onclick=toggleMusic;paint();musicLabel();
}
const style=create('style');style.textContent=[
'.nc74-overlay{position:fixed;inset:0;z-index:2147483603;overflow:auto;background:#040e14ee;display:grid;place-items:center;padding:10px;color:#ffeed0;font-family:system-ui,sans-serif}',
'.nc74-panel{width:min(720px,100%);max-height:97dvh;overflow:auto;border-radius:20px;border:2px solid #d9b468;background:linear-gradient(180deg,#16465a,#0c392e 45%,#0b261e);box-shadow:0 14px 45px #000b}',
'.nc74-sky{height:108px;display:flex;align-items:center;justify-content:space-around;background:radial-gradient(at 72% 20%,#e2b374,#377d98 40%,#103954);border-bottom:2px solid #e6bd71}.nc74-sky span{font-size:60px}.nc74-sky b{font-size:clamp(16px,5vw,29px);text-shadow:0 3px #172f35}',
'.nc74-panel header{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;font-size:11px;letter-spacing:1px;color:#ffe09e}.nc74-panel header button{color:white;background:#16413c;border:1px solid #b7a073;border-radius:12px;padding:9px;font-size:11px}',
'.nc74-panel main{text-align:center;padding:8px 14px 17px;min-height:210px}.nc74-title{font-size:clamp(22px,5vw,33px);color:#ffe2a0;margin:9px 0}.nc74-copy{font-size:14px;line-height:1.6;max-width:520px;margin:13px auto}.nc74-gold{font-size:12px;color:#ffdc90}.nc74-cards{font-size:42px}',
'.nc74-game-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:15px auto;max-width:600px}.nc74-game{display:grid;grid-template-columns:35px 1fr;gap:3px 7px;align-items:center;text-align:left;border:1px solid #af9959;background:#1b4a38;color:white;border-radius:11px;padding:8px;min-height:69px}.nc74-game.active{border:3px solid #ffdf8d}.nc74-game span{grid-row:span 2;font-size:26px}.nc74-game strong{font-size:12px}.nc74-game small{font-size:10px;color:#caddce;line-height:1.35}',
'.nc74-info{display:flex;gap:12px;text-align:left;align-items:center;background:#194938;border:1px solid #b39b5e;border-radius:12px;padding:11px;max-width:580px;margin:9px auto}.nc74-info-icon{font-size:29px}.nc74-info strong{color:#ffe3a7;font-size:13px}.nc74-info p{margin:4px 0 0;font-size:12px;line-height:1.4}',
'.nc74-actions{display:grid;gap:9px;max-width:440px;margin:18px auto}.nc74-actions button{border-radius:13px;color:white;font-size:13px;font-weight:900;padding:13px;min-height:47px}.nc74-cpu{background:#1c805d;border:2px solid #8fe3b4}.nc74-online{background:#0d76b5;border:2px solid #8cdaf2}.nc74-home{background:#675022;border:2px solid #e1c079}',
'.nc74-panel footer{background:#0b211e;border-top:1px solid #b19b6c;padding:14px;text-align:center}.nc74-panel #nc74-dots{display:flex;gap:7px;justify-content:center;margin-bottom:12px}.nc74-dot{width:29px;height:7px;background:#647e70;border:0;border-radius:8px;padding:0}.nc74-dot.active{background:#f7cf7f}',
'.nc74-controls{display:flex;gap:10px}.nc74-controls button{min-height:48px;border:1px solid #e0bb73;border-radius:11px;padding:12px;color:#ffebc0;background:#1b5140;font-weight:900}.nc74-controls button:disabled{opacity:.4}.nc74-controls #nc74-next{flex:1;background:linear-gradient(#f8d992,#ba8031);color:#142e25}',
'.nc74-panel #nc74-music{background:#0d3d35;border:1px solid #bba574;color:#ffe9b6;border-radius:20px;padding:8px 12px;margin:11px auto 5px;min-height:40px}.nc74-panel footer small{display:block;color:#a9c9be;font-size:10px}',
'@media(max-height:580px){.nc74-sky{height:65px}.nc74-sky span{font-size:32px}.nc74-panel main{min-height:130px}}'
].join('\n');d.head.append(style);
function mount(){
 const host=d.getElementById('root');if(!host)return;
 // Audio continues in a single player and can be controlled from the hamburger menu.
 // Android WebView may require an initial tap to start media playback.
 d.addEventListener('pointerdown',()=>{if(enabled&&!gameActive&&!playing)startMusic();},{passive:true});
 d.addEventListener('keydown',()=>{if(enabled&&!gameActive&&!playing)startMusic();});
 const sync=()=>{
  const lobby=!!host.querySelector('.setup');
  if(!done&&lobby&&!seen()){done=true;setTimeout(()=>{if(!panel&&host.querySelector('.setup')&&!seen())open();},600);}
 };
 if(typeof MutationObserver!=='undefined'){new MutationObserver(()=>{sync();syncGameMusic();}).observe(host,{childList:true,subtree:true});new MutationObserver(syncGameMusic).observe(d.body,{childList:true,subtree:false});}
 sync();syncGameMusic();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount);else mount();
w.NC74_WELCOME={open,close,seen};
d.addEventListener('visibilitychange',()=>{if(d.hidden)pauseMusic();else if(enabled&&!gameActive&&!systemPaused)startMusic();});
w.addEventListener('pagehide',pauseMusic);
w.NC74_MUSIC={enable:()=>setMusic(true),disable:()=>setMusic(false),toggle:toggleMusic,isEnabled:()=>enabled,isPlaying:()=>playing,isInGame:()=>gameActive,syncGame:syncGameMusic,systemPause:()=>{systemPaused=true;pauseMusic();},systemResume:()=>{systemPaused=false;if(enabled&&!gameActive)startMusic();}};
})(window,document);
