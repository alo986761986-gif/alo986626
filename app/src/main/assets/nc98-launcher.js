/* NAPOLI CARTE 3D 9.8 - One entry point for all 19 games.
 * Does not alter the rules, currencies, online authentication or card engines.
 * The progress indicator reports loading stages, never fake network percentages.
 */
(function(w,d){
'use strict';
if(w.NC98_LAUNCHER)return;
const expansionIds=['tressette','traversone','briscola_chiamata','bestia','trentuno','cucu','cirulla','asino','dubito','tressette_morto','mercante'];
const classicIds=['scopa','scopone','briscola','sette','asso','ruba'];
const pairIds=new Set(['scopa','scopone','briscola','asso','chiodo121']);
const catalog=[
 ['scopa','Scopa','🪙'],['scopone','Scopone Scientifico','👑'],['briscola','Briscola','⚔️'],['sette','Sette e Mezzo','7½'],
 ['asso','Asso Piglia Tutto','🏆'],['ruba','Ruba Mazzetto','🃏'],['chiodo121','Chiodo 121','♠'],['banco','Il Banco · Tombola','🎱'],
 ['tressette','Tressette','🃏'],['traversone','Traversone','🔄'],['briscola_chiamata','Briscola Chiamata','🤝'],['bestia','Bestia','🐺'],
 ['trentuno','Trentuno','31'],['cucu','Cucù','🐦'],['cirulla','Cirulla','✨'],['asino','Asino','🐴'],['dubito','Dubito','🎭'],
 ['tressette_morto','Tressette col Morto','👤'],['mercante','Mercante in Fiera','🎪']
];
let overlay=null,chosen='',opponent='cpu',format='all',players=2,launching=false,focused=null,request=0;
const names=new Map(catalog.map(v=>[v[0],v]));
function el(tag,cls,text){const e=d.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function gameData(id){return names.get(id)||null;}
function possible(id){if(id==='scopone')return [4];if(id==='banco')return [1];if(id==='chiodo121')return [2,3,4];if(classicIds.includes(id))return [2,4];const item=w.NC_EXPANSION_SESSION?.catalog?.().find(g=>g.id===id);return item?.seats?.length?item.seats.slice():[2,3,4];}
function canPairs(id){return pairIds.has(id);}
function getFormat(){if(chosen==='scopone')return 'pairs';if(format==='all')return chosen==='scopone'?'pairs':'individual';return format;}
function setStage(text){const status=overlay?.querySelector('#nc98-status');if(status)status.textContent=text;}
function close(){if(!overlay)return;request++;const old=overlay;overlay=null;launching=false;old.remove();if(focused?.isConnected)focused.focus();}
function render(){
 if(!overlay)return;const game=gameData(chosen),seats=possible(chosen);
 if(!game){close();return;}
 if(!seats.includes(players))players=seats[0];
 if(chosen==='scopone'){format='pairs';players=4;}
 if(!canPairs(chosen)&&format==='pairs')format='individual';
 if(format==='pairs')players=4;
 const buttons=(entries,selected,group)=>entries.map(([value,title,desc,disabled])=>'<button type="button" data-'+group+'="'+value+'" aria-pressed="'+(selected===value)+'" '+(disabled?'disabled title="Questa variante non è prevista dalle regole del gioco"':'')+'><strong>'+title+'</strong>'+ (desc?'<small>'+desc+'</small>':'')+'</button>').join('');
 const variants=[
  ['all','Tutti','Scelta automatica',chosen==='scopone'],
  ['individual','Individuale','Ognuno per sé',chosen==='scopone'||chosen==='banco'],
  ['pairs','Coppie','2 contro 2',!canPairs(chosen)]
 ];
 const onlineNote=chosen==='banco'?'Tombola: cartelle individuali, anche nella sala multiplayer.':expansionIds.includes(chosen)?'Questo gioco gestisce numero e regole dei partecipanti nel proprio tavolo. Le coppie non si possono forzare.':chosen==='scopone'?'Scopone: sempre quattro giocatori in due squadre.':canPairs(chosen)?'Coppie disponibili con quattro giocatori.':'Le coppie non sono previste per questo gioco.';
 overlay.innerHTML='<div class="nc98-dialog" role="dialog" aria-modal="true" aria-label="Prepara la partita">'
  +'<header><button type="button" id="nc98-back" aria-label="Torna ai giochi">‹</button><div><small>NAPOLI CARTE 3D · 19 GIOCHI</small><h2>Prepara la partita</h2></div><span class="nc98-logo">'+game[2]+'</span></header>'
  +'<div class="nc98-content"><div class="nc98-title"><h3>'+game[1]+'</h3><p>Scegli come e con chi giocare.</p></div>'
  +'<h4>1 · Scegli gli avversari</h4><div class="nc98-options" role="group" aria-label="Avversari">'
  +buttons([['cpu',chosen==='banco'?'🎱 Locale':'🤖 Contro bot','Partita offline'],['online','🌐 Online','Avversari reali']],opponent,'opponent')+'</div>'
  +'<h4>2 · Formato della partita</h4><div class="nc98-options nc98-formats" role="group" aria-label="Formato">'
  +buttons(variants,format,'format')+'</div><p class="nc98-help">'+onlineNote+'</p>'
  +'<h4>3 · Giocatori al tavolo</h4><div class="nc98-seats" role="group" aria-label="Numero giocatori">'
  +seats.map(n=>'<button type="button" data-seats="'+n+'" aria-pressed="'+(players===n)+'" '+(format==='pairs'&&n!==4||chosen==='scopone'&&n!==4?'disabled':'')+'>'+n+(n===1?' cartella':' giocatori')+'</button>').join('')+'</div>'
  +'<p id="nc98-error" role="alert" class="nc98-error" hidden></p>'
  +'<div class="nc98-progress" id="nc98-progress" hidden><div class="nc98-progress-label" id="nc98-status" role="status">Preparazione del gioco…</div><div class="nc98-track" role="progressbar" aria-label="Caricamento del gioco"><span></span></div></div>'
  +'<div class="nc98-actions"><button type="button" id="nc98-start">▶ '+(opponent==='online'?'Continua online':'Avvia partita')+'</button><button type="button" id="nc98-cancel">Annulla</button></div></div></div>';
 overlay.querySelector('#nc98-back').onclick=close;overlay.querySelector('#nc98-cancel').onclick=close;
 overlay.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=()=>{opponent=b.dataset.opponent;render();});
 overlay.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{if(!b.disabled){format=b.dataset.format;if(format==='pairs')players=4;render();}});
 overlay.querySelectorAll('[data-seats]').forEach(b=>b.onclick=()=>{if(!b.disabled){players=Number(b.dataset.seats);render();}});
 overlay.querySelector('#nc98-start').onclick=start;overlay.querySelector('#nc98-start').focus();
}
function reportError(error){if(!overlay)return;const b=overlay.querySelector('#nc98-error');if(b){b.hidden=false;b.textContent=String(error?.message||error||'Il gioco non è disponibile.');}launching=false;overlay.querySelector('#nc98-progress').hidden=true;overlay.querySelectorAll('button').forEach(b=>b.disabled=false);}
async function start(){
 if(launching||!overlay)return;launching=true;const mine=++request;
 const selected=chosen,kind=opponent,rule=getFormat(),n=players;
 const progress=overlay.querySelector('#nc98-progress');progress.hidden=false;
 overlay.querySelectorAll('button').forEach(b=>b.disabled=true);
 setStage('Preparazione delle risorse e del tavolo…');
 try {
  // Yield to let the visible loading bar paint before starting the game.
  await new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));
  if(request!==mine)return;
  let launched=false;
  if(classicIds.includes(selected)){
   if(typeof w.setGame!=='function'||typeof w.setSeats!=='function'||typeof w.setFormat!=='function'||typeof w.setMode!=='function'||typeof w.joinGame!=='function')throw Error('Il motore del gioco non è disponibile.');
   w.setGame(selected);w.setSeats(n);
   w.setFormat(rule);w.setMode(kind==='online'?'online':'bot');
   setStage(kind==='online'?'Apertura della ricerca online…':'Creazione della partita contro bot…');
   const result=w.joinGame();launched=true;
   // Classic joinGame handles its own online spinner and error feedback.
   if(result&&typeof result.then==='function')result.catch(err=>{if(typeof w.toast==='function')w.toast(err?.message||'Connessione non riuscita');});
  }else if(expansionIds.includes(selected)){
   setStage('Apertura del tavolo '+(kind==='online'?'online':'offline')+'…');
   launched=!!w.NC_EXPANSION?.open?.(selected,kind==='online'?'online':'cpu');
   if(launched){const seat=w.document.getElementById('ncx-seats');if(seat&&Array.from(seat.options).some(x=>Number(x.value)===n))seat.value=String(n);}
  }else if(selected==='chiodo121'){
   setStage('Caricamento del tavolo Chiodo 121…');
   const b=d.getElementById(kind==='online'?'chiodo-online-entry':'chiodo-entry');if(!b)throw Error('Chiodo 121 non è disponibile.');
   b.click();launched=!!d.getElementById(kind==='online'?'chiodo121-online':'chiodo121');
   if(launched&&kind==='cpu'){
    const fmt=d.getElementById('ch-format');if(fmt){fmt.value=rule;fmt.dispatchEvent(new Event('change',{bubbles:true}));}
    const chosenSeats=d.querySelector('#chiodo121 [data-n="'+n+'"]');
    if(chosenSeats&&!chosenSeats.disabled){chosenSeats.classList.add('nc98-seat-recommended');}
   }
   if(launched&&kind==='online'){
    const bFmt=d.querySelector('#chiodo121-online [data-format="'+rule+'"]');
    if(bFmt)bFmt.click();
    const bSeat=d.querySelector('#chiodo121-online [data-n="'+n+'"]');
    if(bSeat&&!bSeat.disabled)bSeat.click();
   }
  }else if(selected==='banco'){
   setStage('Apertura delle cartelle della Tombola…');
   if(kind==='online'){const fn=w.NC_BANCO_ONLINE_OPEN;if(typeof fn==='function'){fn();launched=!!d.getElementById('nc92-online');}}
   else{const b=d.querySelector('#root .games .nc91-launch');if(b){b.click();launched=!!d.getElementById('nc91-banco');}}
  }
  if(!launched)throw Error('Impossibile aprire il tavolo. Riprova dalla schermata dei giochi.');
  if(request===mine)close();
 }catch(e){if(request===mine)reportError(e);}
}
function open(id,op){
 if(!gameData(id))return false;
 if(overlay)close();
 focused=d.activeElement;chosen=id;opponent=op==='online'?'online':'cpu';format=id==='scopone'?'pairs':'all';players=possible(id)[0];if(id==='scopone')players=4;
 overlay=el('section','nc98-overlay');overlay.id='nc98-launcher';d.body.append(overlay);
 render();return true;
}
function tileId(tile){
 if(!tile||!tile.closest('#root .games'))return null;
 if(tile.id==='chiodo-entry'||tile.id==='chiodo-online-entry')return 'chiodo121';
 if(tile.classList.contains('nc91-launch')||tile.classList.contains('nc92-launch'))return 'banco';
 const direct=/setGame\('([a-z_]+)'\)/.exec(tile.getAttribute('onclick')||'');
 if(direct&&classicIds.includes(direct[1]))return direct[1];
 const expansion=/NC_EXPANSION\.open\('([a-z_]+)'/.exec(tile.getAttribute('onclick')||'');
 if(expansion&&expansionIds.includes(expansion[1]))return expansion[1];
 return null;
}
// Classic tiles are intercepted by NC95_CLEAN_LOBBY, which calls this API.
// Other tiles use this delegated listener even after the lobby rerenders.
d.addEventListener('click',e=>{
 const tile=e.target.closest?.('#root .games button.game');if(!tile)return;
 const id=tileId(tile);if(!id||classicIds.includes(id))return;
 e.preventDefault();e.stopImmediatePropagation();
 open(id,tile.id==='chiodo-online-entry'||tile.classList.contains('nc92-launch')?'online':'cpu');
},true);
d.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay){e.preventDefault();close();}});
w.NC98_LAUNCHER={version:'9.8.0',open,close,catalog:()=>catalog.map(x=>({id:x[0],title:x[1],pairs:canPairs(x[0]),seats:possible(x[0])}))};
})(window,document);
