/* IL BANCO — playable Smorfia Napoletana Tombola for NAPOLI CARTE 3D
 * Local-only practice game: no server betting, wallet debit or fake multiplayer.
 */
(function(w,d){
 'use strict';
 if(w.NC_BANCO_OPEN)return;
 const core=w.NC_BANCO_CORE;
 if(!core){console.error('IL BANCO engine unavailable');return;}
 let game=null,dialog=null,latest=null,statusMessage='',autoTimer=null,autoDraw=false,audio=false;
 let ticketCount=1;
 const escap=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const money=n=>Number(n||0).toLocaleString('it-IT');
 function stopAuto(){if(autoTimer!==null){clearInterval(autoTimer);autoTimer=null;}autoDraw=false;}
 function announce(msg){statusMessage=msg;if(dialog){const node=dialog.querySelector('#nc91-status');if(node)node.textContent=msg;}}
 function say(meaning){
  if(!audio||!w.speechSynthesis||!w.SpeechSynthesisUtterance)return;
  try{
   w.speechSynthesis.cancel();
   const sentence=new SpeechSynthesisUtterance(meaning.number+'. '+(meaning.dialect||meaning.name));
   sentence.lang='it-IT';sentence.rate=.88;sentence.pitch=1.05;sentence.volume=.75;
   w.speechSynthesis.speak(sentence);
  }catch(e){/* WebView speech engine may be unavailable */}
 }
 function freshGame(){
  stopAuto();
  game=core.newGame({ticketCount,autoMark:true});
  latest=null;
  announce('Nuova partita pronta. Premi ESTRAI NUMERO per iniziare.');
 }
 function renderBoard(){
  return Array.from({length:90},(_,i)=>{
   const n=i+1,called=game.drawn.includes(n),last=latest?.number===n;
   return '<button type="button" class="nc91-number'+(called?' done':'')+(last?' latest':'')+'" data-nc91="meaning" data-number="'+n+'" title="'+escap(core.getMeaning(n).name)+'" aria-label="Numero '+n+', '+escap(core.getMeaning(n).name)+(called?', estratto':'')+'">'+n+'</button>';
  }).join('');
 }
 function renderTicket(ticket,i){
  const marked=new Set(ticket.marked);
  const cells=ticket.grid.map(row=>row.map(n=>{
   if(n===null)return '<span class="nc91-cell blank" aria-hidden="true"></span>';
   const isMarked=marked.has(n),called=game.drawn.includes(n);
   return '<button type="button" class="nc91-cell has-number'+(isMarked?' hit':'')+'" data-nc91="mark" data-ticket="'+i+'" data-number="'+n+'" aria-pressed="'+isMarked+'" aria-label="Numero '+n+', '+(called?'estratto':'non ancora estratto')+'" '+(!called?'disabled':'')+'>'+n+'</button>';
  }).join('')).join('');
  return '<section class="nc91-card"><div class="nc91-card-label"><span>♛ CARTELLA '+(i+1)+'</span><span>'+ticket.marked.length+' / 15</span></div><div class="nc91-ticket" aria-label="Cartella numero '+(i+1)+'">'+cells+'</div></section>';
 }
 function render(){
  if(!dialog||!game)return;
  const meaning=latest?.meaning||null;
  const balance=w.NC_WALLET?.balance?.();
  const num=meaning?meaning.number:'—',title=meaning?(meaning.dialect||meaning.name):'La Smorfia ti aspetta';
  const desc=meaning?.name||'Estrai il primo numero e scopri il significato napoletano.';
  const prizes=core.AWARDS.map(name=>'<span class="nc91-prize'+(game.awards.includes(name)?' earned':'')+'">'+(game.awards.includes(name)?'★ ':'◇ ')+name+'</span>').join('');
  const history=game.drawn.length?game.drawn.slice(-12).reverse().map(n=>'<b title="'+escap(core.getMeaning(n).name)+'">'+n+'</b>').join(''):'<span class="nc91-empty">Nessun numero estratto</span>';
  const content='<div class="nc91-wrap">'+
   '<header class="nc91-head"><button type="button" data-nc91="close" aria-label="Torna ai giochi">❮ Indietro</button><span class="nc91-balance">🪙 '+money(balance)+' crediti</span><button type="button" data-nc91="new" aria-label="Nuova partita">↻ Nuova</button></header>'+
   '<section class="nc91-hero"><div class="nc91-crest">N</div><h1>IL BANCO</h1><div class="nc91-subtitle">Smorfia Napoletana</div><p class="nc91-caption">♛ La Tombola di Napoli · 90 numeri · Cartelle classiche ♛</p></section>'+
   '<section class="nc91-latest"><div class="nc91-ball'+(meaning?' pop':'')+'" aria-label="Ultimo numero estratto '+num+'">'+num+'</div><div class="nc91-meaning"><p>ULTIMO NUMERO ESTRATTO</p><h2>'+escap(title)+'</h2><span class="nc91-desc">'+escap(desc)+'</span><div class="nc91-game-stats"><span>Estratti: '+game.drawn.length+' / 90</span><span>Rimanenti: '+game.deck.length+'</span><span>Cartelle: '+game.tickets.length+'</span></div></div></section>'+
   '<div class="nc91-body"><div>'+
   '<section class="nc91-panel"><h2>✦ Tabellone Tombola</h2><div class="nc91-numbers" aria-label="Tabellone da 1 a 90">'+renderBoard()+'</div></section>'+
   '<section class="nc91-panel nc91-ssection"><h2>♛ Le tue cartelle</h2><div class="nc91-card-collection">'+game.tickets.map(renderTicket).join('')+'</div><p class="nc91-footer">Ogni cartella contiene 15 numeri, 5 per riga. Tocca un numero già estratto per segnarlo.</p></section>'+
   '</div><div>'+
   '<section class="nc91-panel"><h2>✦ La Smorfia Napoletana</h2><div class="nc91-smorfia"><span class="nc91-smorfia-icon">'+(meaning?meaning.icon:'🎭')+'</span><strong>'+(meaning?meaning.number:'?')+'</strong><span class="nc91-smorfia-name">'+escap(meaning?meaning.name:'I numeri e le tradizioni')+'</span><small>'+escap(meaning?.dialect||'Ogni numero ha un significato speciale')+'</small></div>'+
   '<label for="nc91-lookup" class="nc91-footer">Consulta il significato di un numero (1–90)</label><div style="display:flex;gap:6px;margin-top:6px"><input id="nc91-lookup" type="number" min="1" max="90" inputmode="numeric" placeholder="Es. 42" aria-label="Numero Smorfia" style="width:100%;min-width:0;padding:10px;border-radius:9px;border:1px solid #dbb66b;background:#fff4d8;color:#17303d"><button type="button" data-nc91="lookup" style="background:#d8a74e;color:#32230e;border-radius:10px;border:1px solid #ffdd91;font-weight:900;padding:8px">Cerca</button></div></section>'+
   '<section class="nc91-panel nc91-ssection"><h2>🏆 Premi della partita</h2><div class="nc91-prizes">'+prizes+'</div><p class="nc91-footer">Premi simbolici di questa partita di prova: nessuna spesa o vincita in denaro.</p></section>'+
   '<section class="nc91-panel nc91-ssection"><h2>🪙 Ultime estrazioni</h2><div class="nc91-history">'+history+'</div></section>'+
   '</div></div>'+
   '<section class="nc91-actions" aria-label="Comandi Tombola"><button type="button" data-nc91="draw" '+(game.finished?'disabled':'')+'>🎱 '+(game.finished?'Partita finita':'ESTRAI NUMERO')+'</button><button type="button" data-nc91="auto" '+(game.finished?'disabled':'')+'>'+(autoDraw?'⏸ Ferma auto':'▶ Estrazione auto')+'</button><button type="button" data-nc91="new">↻ Nuova partita</button><button type="button" data-nc91="close">❮ Torna al Club</button></section>'+
   '<section class="nc91-settings"><label><input id="nc91-automark" data-nc91="automark" type="checkbox" '+(game.autoMark?'checked':'')+'> Segna automaticamente i numeri</label><label>Cartelle: <select id="nc91-count" data-nc91="count"><option value="1"'+(ticketCount===1?' selected':'')+'>1</option><option value="2"'+(ticketCount===2?' selected':'')+'>2</option><option value="3"'+(ticketCount===3?' selected':'')+'>3</option></select></label><label><input type="checkbox" id="nc91-voice" data-nc91="voice" '+(audio?'checked':'')+'> Voce estrazioni (se disponibile)</label></section>'+
   '<p id="nc91-status" class="nc91-status" role="status" aria-live="polite">'+escap(statusMessage)+'</p>'+
   '<p class="nc91-footer">IL BANCO · GAMES STUDIOS · Smorfia secondo la tradizione popolare. Gioco locale contro il tabellone, senza acquisti obbligatori.</p></div>';
  dialog.innerHTML=content;
 }
 function callNext(){
  if(!game||game.finished){stopAuto();return;}
  const event=core.draw(game);
  if(!event){stopAuto();return;}
  latest=event;
  const prize=event.awarded.length?' — 🎉 '+event.awarded.join(', ')+'!':'';
  statusMessage=event.number+' · '+event.meaning.name+prize;
  if(game.finished){stopAuto();statusMessage+=' · Partita conclusa!';}
  render();say(event.meaning);
 }
 function startAuto(){
  if(!game||game.finished)return;
  autoDraw=true;
  autoTimer=w.setInterval(()=>{if(dialog&&!d.hidden)callNext();},5000);
  announce('Estrazione automatica attiva: un numero ogni 5 secondi.');
  render();
 }
 function reset(){
  if(game&&game.drawn.length&&!w.confirm('Iniziare una nuova partita? La cartella e le estrazioni attuali verranno azzerate.'))return;
  freshGame();render();
 }
 function handleAction(event){
  const button=event.target.closest('button[data-nc91]');if(!button||!dialog?.contains(button))return;
  const action=button.dataset.nc91;
  if(action==='close'){close();return;}
  if(action==='draw'){callNext();return;}
  if(action==='new'){reset();return;}
  if(action==='auto'){if(autoDraw){stopAuto();announce('Estrazione automatica fermata.');render();}else startAuto();return;}
  if(action==='meaning'||action==='lookup'){
   const value=action==='meaning'?Number(button.dataset.number):Number(dialog.querySelector('#nc91-lookup')?.value);
   const info=core.getMeaning(value);
   if(!info){announce('Inserisci un numero intero da 1 a 90.');return;}
   // Looking up the Smorfia never changes the extraction history or drawn number.
   announce('Smorfia '+value+': '+info.name+(info.dialect?' ('+info.dialect+')':''));
   return;
  }
  if(action==='mark'){
   const index=Number(button.dataset.ticket),number=Number(button.dataset.number);
   const result=core.mark(game,index,number);
   if(!result.ok){announce(result.reason);return;}
   statusMessage=(result.marked?'Segnato':'Segno tolto')+' numero '+number+'.'+(result.awarded.length?' Premio: '+result.awarded.join(', '):'');
   render();
  }
 }
 function handleChange(event){
  const target=event.target;
  if(target.id==='nc91-automark'){
   const prizes=core.setAutoMark(game,target.checked);
   statusMessage=target.checked?'Segnatura automatica attiva.':'Segnatura manuale attiva.';
   if(prizes.length)statusMessage+=' Premio: '+prizes.join(', ');
   render();return;
  }
  if(target.id==='nc91-voice'){audio=target.checked;announce(audio?'Voce attiva, se supportata dal dispositivo.':'Voce disattivata.');return;}
  if(target.id==='nc91-count'){const v=Number(target.value);if(v===ticketCount)return;if(![1,2,3].includes(v))return;
   if(game.drawn.length&&!w.confirm('Cambiare numero di cartelle? Inizierà una nuova partita.')){render();return;}
   ticketCount=v;freshGame();render();
  }
 }
 function open(){
  if(dialog){dialog.querySelector('[data-nc91="close"]')?.focus();return;}
  freshGame();
  dialog=d.createElement('section');dialog.id='nc91-banco';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Il Banco, Tombola con Smorfia Napoletana');dialog.addEventListener('click',handleAction);dialog.addEventListener('change',handleChange);d.body.append(dialog);
  render();dialog.querySelector('[data-nc91="close"]')?.focus();
 }
 function close(){
  if(!dialog)return false;
  stopAuto();try{w.speechSynthesis?.cancel?.();}catch(e){}
  dialog.remove();dialog=null;game=null;latest=null;
  return true;
 }
 function mount(){
  const lobby=d.querySelector('#root .games');
  if(!lobby||lobby.querySelector('.nc91-launch'))return;
  const tile=d.createElement('button');tile.type='button';tile.className='game nc91-launch';
  tile.innerHTML='<span class="sel">GIOCA</span><span class="art">🎱</span><strong>IL BANCO</strong><small>La Tombola e Smorfia Napoletana</small>';
  tile.onclick=open;lobby.append(tile);
 }
 let queued=false;
 function queue(){if(queued)return;queued=true;w.requestAnimationFrame(()=>{queued=false;mount();});}
 function init(){
  const host=d.getElementById('root');
  if(host)new MutationObserver(queue).observe(host,{childList:true,subtree:false});
  queue();
 }
 d.addEventListener('keydown',event=>{if(dialog&&event.key==='Escape'){event.preventDefault();close();}});
 d.addEventListener('visibilitychange',()=>{if(d.hidden&&autoDraw){stopAuto();announce('Estrazione automatica sospesa: app non visibile.');render();}});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
 w.NC_BANCO_OPEN=open;w.NC_BANCO_CLOSE=close;w.NC_BANCO_IS_OPEN=()=>!!dialog;
})(window,document);
