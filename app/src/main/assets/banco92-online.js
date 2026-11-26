/* IL BANCO ONLINE — Firebase verified rooms and server-led tombola */
(function(w,d){
'use strict';if(w.NC_BANCO_ONLINE_OPEN)return;
const core=w.NC_BANCO_CORE;
let root=null,roomId=null,snapshot=null,fetching=false,timer=null,notice='',lastRooms=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function native(action,data={}){
 if(typeof w.NC70_SOCIAL?.call!=='function')return Promise.reject(new Error('Aggiorna NAPOLI CARTE 3D per giocare online.'));
 return w.NC70_SOCIAL.call(action,data);
}
function message(s){notice=s||'';const box=root?.querySelector('#nc92-status');if(box)box.textContent=notice;}
function stop(){if(timer!==null){clearInterval(timer);timer=null;}}
function close(){if(!root)return false;stop();root.remove();root=null;return true;}
function head(){return '<header class="nc91-head"><button type="button" data-action="close">❮ Torna al Club</button><span class="nc91-balance">🌍 IL BANCO ONLINE</span><button type="button" data-action="refresh">↻ Aggiorna</button></header>';}
function banner(){return '<section class="nc91-hero"><div class="nc91-crest">N</div><h1>IL BANCO</h1><div class="nc91-subtitle">Smorfia Napoletana ONLINE</div><p class="nc91-caption">♛ Estrazioni condivise · 6 o 12 giocatori · Nessuna puntata ♛</p></section>';}
function settingsLobby(){return '<div class="nc92-welcome"><h2>♛ Scegli una sala</h2><p>Gioca con persone reali. Il server estrae un numero ogni 6 secondi: tutti vedono lo stesso tabellone. Le cartelle e i premi sono verificati automaticamente.</p>'+
 '<div class="nc92-form"><label>Le tue cartelle<select id="nc92-tickets"><option value="1">1 cartella</option><option value="2" selected>2 cartelle</option><option value="3">3 cartelle</option></select></label>'+
 '<label>Posti sala privata<select id="nc92-capacity"><option value="2">2 giocatori</option><option value="4">4 giocatori</option><option value="6">6 giocatori</option><option value="8">8 giocatori</option><option value="10">10 giocatori</option><option value="12" selected>12 giocatori</option></select></label></div>'+
 '<div class="nc92-choices"><button type="button" data-action="quick"><span>⚡</span><strong>Partita rapida</strong><small>Fino a 6 partecipanti</small></button>'+
 '<button type="button" data-action="public"><span>🌍</span><strong>Sala pubblica</strong><small>Fino a 12 partecipanti</small></button>'+
 '<button type="button" data-action="private"><span>🔐</span><strong>Sala privata</strong><small>Invita fino a 12 amici</small></button></div>'+
 '<div class="nc92-form"><label>Hai un codice invito?<input id="nc92-invite" maxlength="6" autocomplete="off" placeholder="ABC123" aria-label="Codice sala privata"></label><button type="button" data-action="code">🔑 Entra con codice</button></div>'+
 '<p class="nc91-footer">Per giocare online devi accedere con email o Google e scegliere il tuo nickname. Solo crediti virtuali, nessuna vincita in denaro.</p></div>';}
function board(){
 const selected=new Set(snapshot.drawn||[]),last=snapshot.lastNumber;
 return Array.from({length:90},(_,i)=>{
  const n=i+1,meaning=core.getMeaning(n)?.name||'';
  return '<span class="nc91-number'+(selected.has(n)?' done':'')+(last===n?' latest':'')+'" title="'+esc(meaning)+'" aria-label="Numero '+n+(selected.has(n)?', estratto':'')+'">'+n+'</span>';
 }).join('');
}
function ticket(grid,i){
 const picked=new Set(snapshot.drawn||[]);
 const rows=grid.map(row=>row.map(n=>n===null?'<span class="nc91-cell blank" aria-hidden="true"></span>':
 '<span class="nc91-cell has-number'+(picked.has(n)?' hit':'')+'" aria-label="Numero '+n+(picked.has(n)?', estratto':'')+'">'+n+'</span>').join('')).join('');
 return '<section class="nc91-card"><div class="nc91-card-label"><span>♛ CARTELLA '+(i+1)+'</span><span>'+grid.flat().filter(x=>x!==null&&picked.has(x)).length+'/15</span></div><div class="nc91-ticket">'+rows+'</div></section>';
}
function players(){
 return '<div class="nc92-players">'+snapshot.players.map(p=>
  '<div class="nc92-player'+(p.host?' host':'')+(p.active?'':' gone')+'"><span class="nc92-dot" aria-hidden="true"></span><span>'+
  (p.host?'♛ ':'')+esc(p.nickname)+(p.active?'':' · uscito')+'</span></div>').join('')+'</div>';
}
function winners(){
 const all=core.AWARDS||['Ambo','Terno','Quaterna','Cinquina','Tombola'];
 return '<div class="nc92-winners">'+all.map(name=>'<div class="nc92-winner"><b>'+esc(name)+'</b><span>'+
 (snapshot.awards?.[name]?.length?esc(snapshot.awards[name].join(' · ')):'—')+'</span></div>').join('')+'</div>';
}
function roomView(){
 const info=snapshot.room,s=info.status,live=s==='playing',done=s==='finished';
 const time=live?Math.max(0,Math.ceil((snapshot.nextDrawAt-(snapshot.serverNow+(Date.now()-(snapshotReceivedAt||Date.now()))))/1000)):
  s==='waiting'&&snapshot.waitUntil?Math.max(0,Math.ceil((snapshot.waitUntil-(snapshot.serverNow+(Date.now()-(snapshotReceivedAt||Date.now()))))/1000)):0;
 const meaning=core.getMeaning(snapshot.lastNumber);
 const code=info.code?'<div class="nc92-welcome"><p>Codice invito: <strong class="nc92-roomcode">'+esc(info.code)+'</strong></p><p>Comunicalo agli amici per entrare prima dell’inizio della partita.</p></div>':'';
 const headStats='<div class="nc92-toolbar"><span class="nc92-pill">👥 '+snapshot.joined+' / '+info.capacity+' giocatori</span><span class="nc92-livemark">'+(live?'● LIVE':done?'★ CONCLUSA':'● IN ATTESA')+'</span>'+
 '<span class="nc92-clock">'+(live?'Prossima estrazione: '+time+' s':s==='waiting'?(snapshot.joined<2?'Servono almeno 2 giocatori':'Partenza tra '+time+' s'):'Partita terminata')+'</span>'+
 '<button type="button" data-action="leave">↩ Esci dalla sala</button></div>';
 const startBtn=s==='waiting'&&snapshot.isHost&&snapshot.joined>=2?
 '<button type="button" data-action="start" style="background:linear-gradient(#29b56d,#07613e);border:2px solid #d3d87d;color:#fff;padding:12px;border-radius:14px;font-weight:900">▶ INIZIA ORA</button>':'';
 const status='<section class="nc91-latest"><div class="nc91-ball">'+(snapshot.lastNumber||'—')+'</div><div class="nc91-meaning"><p>NUMERO ESTRATTO DA SERVER</p><h2>'+esc(meaning?.dialect||meaning?.name||'In attesa della prima estrazione')+'</h2><span class="nc91-desc">'+esc(meaning?.name||'Le cartelle vengono segnate automaticamente')+'</span><div class="nc91-game-stats"><span>Estratti: '+snapshot.drawn.length+'/90</span><span>Sala '+(info.mode==='quick'?'rapida':info.mode==='private'?'privata':'pubblica')+'</span></div></div></section>';
 const history=snapshot.drawn.length?snapshot.drawn.slice(-12).reverse().map(n=>'<b>'+n+'</b>').join(''):'<span class="nc91-empty">Nessun numero estratto</span>';
 return '<section class="nc92-welcome"><h2>♛ Sala condivisa</h2>'+headStats+players()+startBtn+'</section>'+code+status+
 '<div class="nc91-body"><div><section class="nc91-panel"><h2>✦ Tabellone condiviso</h2><div class="nc91-numbers">'+board()+'</div></section>'+
 '<section class="nc91-panel nc91-ssection"><h2>♛ Le tue cartelle</h2><div class="nc91-card-collection">'+snapshot.tickets.map(ticket).join('')+'</div><p class="nc91-footer">I segni e i premi sono verificati dal server, non dal telefono.</p></section></div>'+
 '<div><section class="nc91-panel"><h2>🏆 Premi ufficiali della sala</h2>'+winners()+'</section>'+
 '<section class="nc91-panel nc91-ssection"><h2>🪙 Ultime estrazioni</h2><div class="nc91-history">'+history+'</div></section></div></div>'+
 (done?'<div class="nc92-welcome"><h2>🎉 Partita conclusa!</h2><p>Grazie per aver giocato. Per una nuova partita esci dalla sala e scegli una nuova modalità.</p><button data-action="leave">Torna alle sale</button></div>':'');
}
let snapshotReceivedAt=0;
function render(){
 if(!root)return;
 const scroll=root.scrollTop;
 root.innerHTML='<div class="nc91-wrap">'+head()+banner()+(snapshot?.member?roomView():settingsLobby())+
 '<p id="nc92-status" class="nc91-status" role="status" aria-live="polite">'+esc(notice)+'</p>'+
 '<p class="nc91-footer">IL BANCO ONLINE · GAMES STUDIOS · Sala pubblica o privata · Solo divertimento con crediti virtuali.</p></div>';
 root.scrollTop=scroll;
}
async function refresh(){
 if(fetching||!root)return;fetching=true;
 try{
  if(roomId){
   const fresh=await native('b92State',{roomId});
   if(!root)return;
   snapshot=fresh;snapshotReceivedAt=Date.now();
  }else{
   const info=await native('b92Rooms');lastRooms=info.rooms||[];
  }
  notice='';render();
 }catch(e){
  if(!root)return;
  if(/non fai parte|Sala non trovata|Non sei nella sala/i.test(e.message)){roomId=null;snapshot=null;stop();}
  message('Connessione: '+e.message);
 }finally{fetching=false}
}
function beginPolling(){stop();timer=setInterval(refresh,2500);}
async function join(mode){
 const tickets=Number(root?.querySelector('#nc92-tickets')?.value||2);
 const capacity=Number(root?.querySelector('#nc92-capacity')?.value||12);
 const code=root?.querySelector('#nc92-invite')?.value?.trim().toUpperCase()||'';
 if(mode==='code'&&!/^[A-HJ-NP-Z2-9]{6}$/.test(code)){message('Inserisci il codice invito di 6 caratteri.');return;}
 if(fetching)return;fetching=true;message('Connessione alla sala online…');
 try{
  const result=await native('b92Join',{mode,tickets,capacity,code});
  if(!root)return;
  snapshot=result;roomId=result.room.id;snapshotReceivedAt=Date.now();
  notice=result.reconnected?'Riconnesso alla tua partita.':'Sala pronta: aspetta gli altri giocatori.';
  render();beginPolling();
 }catch(e){message(e.message)}finally{fetching=false}
}
async function leave(){
 if(!roomId)return;
 if(fetching)return;
 fetching=true;stop();message('Uscita dalla sala…');
 try{await native('b92Leave',{roomId});roomId=null;snapshot=null;notice='Sei uscito dalla sala.';if(root)render();}
 catch(e){message(e.message);beginPolling();}
 finally{fetching=false}
}
async function start(){
 if(fetching||!roomId||!snapshot?.isHost)return;
 fetching=true;message('Avvio partita…');
 try{const fresh=await native('b92Start',{roomId});if(!root)return;snapshot=fresh;snapshotReceivedAt=Date.now();notice='Partita avviata.';render();}
 catch(e){message(e.message)}finally{fetching=false}
}
function onclick(e){
 const b=e.target.closest('button[data-action]');if(!b||!root?.contains(b))return;
 const act=b.dataset.action;
 if(act==='close'){close();return;}
 if(act==='refresh'){refresh();return;}
 if(act==='leave'){leave();return;}
 if(act==='start'){start();return;}
 if(['public','quick','private','code'].includes(act)){join(act);}
}
function open(){
 if(root)return;
 w.NC_BANCO_CLOSE?.();
 root=d.createElement('section');root.id='nc92-online';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','IL BANCO online, Tombola Smorfia Napoletana');
 root.addEventListener('click',onclick);
 d.body.append(root);
 notice=roomId?'Riconnessione alla sala…':'Accedi con email o Google, poi scegli una sala.';
 render();
 if(roomId){beginPolling();refresh();}
 else refresh();
 root.querySelector('[data-action="close"]')?.focus();
}
d.addEventListener('keydown',e=>{if(root&&e.key==='Escape'){e.preventDefault();close();}});
function mount(){
 const games=d.querySelector('#root .games');
 if(!games||games.querySelector('.nc92-launch'))return;
 const tile=d.createElement('button');tile.type='button';tile.className='game nc92-launch';
 tile.innerHTML='<span class="sel">ONLINE</span><span class="art">🌍</span><strong>IL BANCO ONLINE</strong><small>La Smorfia · fino a 12 giocatori</small>';
 tile.onclick=open;games.append(tile);
}
function initMount(){
 const host=d.getElementById('root');
 if(host)new MutationObserver(()=>{w.requestAnimationFrame(mount)}).observe(host,{childList:true,subtree:false});
 mount();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initMount,{once:true});else initMount();
w.NC_BANCO_ONLINE_OPEN=open;w.NC_BANCO_ONLINE_CLOSE=close;w.NC_BANCO_ONLINE_IS_OPEN=()=>!!root;
})(window,document);
