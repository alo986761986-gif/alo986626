/* Napoli Carte 3D 2.7 - Visual capture choice window.
   Uses the same validated backend options for offline, online and touch dragging. */
(function(){
 'use strict';
 if(window.NC27_CAPTURE_READY) return;
 window.NC27_CAPTURE_READY=true;
 const $27=id=>document.getElementById(id);
 const suits=['Denari','Coppe','Spade','Bastoni'];
 const names={8:'Fante',9:'Cavallo',10:'Re'};
 const label=c=>c?(names[c.v]||String(c.v))+' di '+(suits[c.s]||'?'):'Carta';
 let current=null,request=0,savedFocus=null;
 const key=o=>JSON.stringify([o.type,(o.picks||[]).slice().sort(),o.target===undefined?null:o.target]);
 function mount(){
  let modal=$27('nc27-modal');if(modal)return modal;
  modal=document.createElement('div');modal.id='nc27-modal';modal.className='nc27-modal';modal.hidden=true;
  modal.innerHTML=`<div class="nc27-backdrop" data-nc27-dismiss="1"></div>
   <div class="nc27-dialog" role="dialog" aria-modal="true" aria-labelledby="nc27-title" aria-describedby="nc27-description" tabindex="-1">
     <div class="nc27-header"><div><span class="nc27-eyebrow">✦ PRESE NAPOLETANE ✦</span><h2 id="nc27-title">Scegli la tua presa</h2><p id="nc27-description">Seleziona quali carte raccogliere.</p></div>
     <button type="button" class="nc27-close" id="nc27-close" aria-label="Annulla la scelta">×</button></div>
     <div class="nc27-playing"><div class="nc27-playing-card" id="nc27-played"></div><div><span class="nc27-chip">CARTA CHE GIOCHI</span><strong id="nc27-played-label"></strong><small>È sempre una tua scelta: puoi annullare prima di confermare.</small></div></div>
     <h3 class="nc27-section-heading" id="nc27-options-title">PRESE CONSENTITE</h3>
     <div class="nc27-optionlist" id="nc27-options" role="group" aria-labelledby="nc27-options-title"></div>
     <div id="nc27-manual" class="nc27-manual" hidden><div class="nc27-section-heading">OPPURE TOCCA LE CARTE UNA PER UNA</div>
       <div id="nc27-table-picks" class="nc27-picks"></div><p id="nc27-manual-hint" class="nc27-manual-hint" role="status"></p></div>
     <div class="nc27-footer"><button type="button" id="nc27-cancel" class="nc27-cancel">← ANNULLA</button><button type="button" id="nc27-confirm" class="nc27-confirm" disabled>✓ CONFERMA LA PRESA</button></div>
   </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{
   if(e.target.closest('[data-nc27-dismiss]')||e.target.closest('#nc27-close')||e.target.closest('#nc27-cancel')){close();return;}
   const option=e.target.closest('[data-nc27-option]');if(option){choose(Number(option.dataset.nc27Option));return;}
   const pick=e.target.closest('[data-nc27-pick]');if(pick){togglePick(pick.dataset.nc27Pick);return;}
  });
  $27('nc27-confirm').addEventListener('click',confirm);
  document.addEventListener('keydown',e=>{
   if(!current)return;
   if(e.key==='Escape'){e.preventDefault();close()}
   if(e.key==='Tab'){
    const nodes=[...modal.querySelectorAll('button:not([disabled])')].filter(b=>b.offsetParent!==null);
    if(!nodes.length)return;
    const first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
  });
  return modal;
 }
 function clip(html){return '<div class="nc27-card">'+html+'</div>'}
 function showCards(ids,state){const cards=ids.map(id=>state.table.find(c=>c.id===id)).filter(Boolean);
  return cards.map(c=>clip(card(c))).join('');}
 function optionHtml(o,i,state){
  let picks='',title='',detail='',count=0;
  if(o.type==='table'){
   count=(o.picks||[]).length;
   picks=showCards(o.picks||[],state);
   title=count>1?'Prendi '+count+' carte': 'Prendi questa carta';
   detail=count>1?'Combinazione valida di '+count+' carte':label(state.table.find(c=>c.id===o.picks?.[0]));
  }else if(o.type==='steal'){
   const enemy=state.players[o.target];const top=enemy?.pileTop;
   picks=top?clip(card(top)):'<span class="nc27-blank">🂠</span>';
   title='Ruba il mazzetto';
   detail=(enemy?.name||'Avversario')+' · '+(enemy?.pileCount||0)+' carte';
  }else{
   picks='<span class="nc27-no-card">↘</span>';
   title=o.type==='drop'?'Posa sul tavolo':'Gioca la carta';
   detail=o.label||'Mossa consentita';
  }
  return `<button type="button" class="nc27-option" data-nc27-option="${i}" aria-pressed="false"><span class="nc27-opt-number">${i+1}</span><span class="nc27-opt-visual">${picks}</span><span class="nc27-opt-detail"><strong>${title}</strong><small>${esc(detail)}</small></span><span class="nc27-check" aria-hidden="true">✓</span></button>`;
 }
 function sync(){if(!current)return;const c=current;
  $27('nc27-options').querySelectorAll('[data-nc27-option]').forEach((button,i)=>{
   const yes=i===c.choice;button.classList.toggle('nc27-active',yes);button.setAttribute('aria-pressed',String(yes));
  });
  $27('nc27-table-picks').querySelectorAll('[data-nc27-pick]').forEach(button=>{
   const yes=c.selected.has(button.dataset.nc27Pick);button.classList.toggle('nc27-selected',yes);button.setAttribute('aria-pressed',String(yes));
  });
  const ok=c.choice>=0&&!c.busy;
  $27('nc27-confirm').disabled=!ok;
  $27('nc27-confirm').textContent=c.busy?'⏳ GIOCO IN CORSO…':'✓ CONFERMA LA PRESA';
 }
 function choose(i){if(!current||current.busy)return;const c=current;
  if(!Number.isInteger(i)||i<0||i>=c.options.length)return;
  c.choice=i;c.selected=new Set(c.options[i].picks||[]);
  $27('nc27-manual-hint').textContent='Selezione pronta: '+c.options[i].label;
  sync();
 }
 function togglePick(id){if(!current||current.busy)return;const c=current;
  if(!c.state.table.some(t=>t.id===id))return;
  if(c.selected.has(id))c.selected.delete(id);else c.selected.add(id);
  const wanted=[...c.selected].sort().join('|');
  c.choice=c.options.findIndex(o=>o.type==='table'&&(o.picks||[]).slice().sort().join('|')===wanted&&wanted.length>0);
  $27('nc27-manual-hint').textContent=c.choice<0?'Questa combinazione non è consentita: scegli una presa valida.':'✓ Combinazione valida · '+c.options[c.choice].label;
  sync();
 }
 function close(force=false){if(!current)return;if(current.busy&&!force)return;
  current=null;request++;
  const m=$27('nc27-modal');if(m)m.hidden=true;
  document.body.classList.remove('nc27-open');
  choosing=false;
  if(savedFocus?.isConnected){savedFocus.focus();savedFocus=null}
 }
 async function confirm(){const c=current;if(!c||c.choice<0||c.busy)return;
  if(!stateCache||stateCache.status!=='playing'||stateCache.turn!==stateCache.seat||!stateCache.hand.some(x=>x.id===c.card.id)){toast('Il turno è cambiato. Riprova la presa.');close(true);return}
  c.busy=true;sync();const chosen=c.options[c.choice];
  try{await playCard(c.card.id,chosen)}finally{close(true)}
 }
 async function select(id){
  if(current||choosing||!stateCache||stateCache.status!=='playing'||stateCache.turn!==stateCache.seat)return;
  const played=stateCache.hand.find(c=>c.id===id);if(!played)return;
  choosing=true;const serial=++request,originToken=token,originRoom=stateCache.roomId;
  try{
   const response=await api('choices',{token:originToken,card:id});
   if(serial!==request||originToken!==token||!stateCache||stateCache.roomId!==originRoom||stateCache.turn!==stateCache.seat){choosing=false;return}
   const options=Array.isArray(response.options)?response.options:[];
   if(!options.length)throw Error('Nessuna presa disponibile per questa carta');
   const hasMultiplePicks=options.some(o=>o.type==='table'&&(o.picks||[]).length>1);
   const requiresWindow=options.length>1||hasMultiplePicks;
   if(!requiresWindow){await playCard(id,options[0]);return;}
   const modal=mount(),state=stateCache;
   current={card:played,options,state,choice:-1,selected:new Set(),busy:false};
   savedFocus=document.activeElement;
   $27('nc27-played').innerHTML=clip(card(played));
   $27('nc27-played-label').textContent=label(played);
   $27('nc27-description').textContent=options.length>1
    ?`Sono possibili ${options.length} prese. Scegli le carte che vuoi raccogliere.`
    :'Puoi raccogliere più carte: controlla la combinazione prima di giocare.';
   $27('nc27-options').innerHTML=options.map((o,i)=>optionHtml(o,i,state)).join('');
   const manual=options.length>1&&options.some(o=>o.type==='table')&&state.game!=='asso'&&state.table.length>0;
   $27('nc27-manual').hidden=!manual;
   if(manual){$27('nc27-table-picks').innerHTML=state.table.map(c=>`<button type="button" class="nc27-pick" data-nc27-pick="${esc(c.id)}" aria-pressed="false" aria-label="Seleziona ${esc(label(c))}">${clip(card(c))}</button>`).join('');
    $27('nc27-manual-hint').textContent='Tocca una o più carte: puoi confermare solo le combinazioni consentite.';
   }
   document.body.classList.add('nc27-open');modal.hidden=false;
   if(options.length===1)choose(0);else sync();
   $27('nc27-close').focus();
  }catch(e){choosing=false;toast(e.message||'Impossibile selezionare la presa')}
 }
 // Top-level game functions are intentionally global; the touch gesture uses window.selectCard.
 window.selectCard=select;
 window.NC27_CAPTURE={close,select,choose,inspect:()=>current?{
  card:current.card.id,choices:current.options.length,selectedIndex:current.choice,
  selectedPicks:[...current.selected],busy:current.busy
 }:null};
 const originalLobby=window.lobby;
 if(typeof originalLobby==='function')window.lobby=function(){close(true);return originalLobby.apply(this,arguments)};
 const originalDrawLobby=window.drawLobby;
 if(typeof originalDrawLobby==='function')window.drawLobby=function(){close(true);return originalDrawLobby.apply(this,arguments)};
})();
