(function(w,d){
'use strict';
if(w.NC78_FEEDBACK)return;
let overlay=null,lastFocus=null,busy=false;
const games=[['generale','App generale'],['scopa','Scopa'],['scopone','Scopone'],['briscola','Briscola'],['sette','Sette e mezzo'],['asso','Asso piglia tutto'],['ruba','Ruba mazzetto'],['chiodo121','Chiodo 121'],['chat','Chat e amici'],['account','Accesso e profilo'],['bonus','Bonus'],['audio','Musica e audio']];
const categories=[['bug','Funzione non corretta'],['crash','App si blocca o si chiude'],['accesso','Accesso e registrazione'],['online','Ricerca giocatori / connessione'],['grafica','Grafica e controlli'],['audio','Suoni e voce'],['altro','Altro']];
function clear(){if(!overlay)return false;overlay.remove();overlay=null;busy=false;if(lastFocus?.isConnected)lastFocus.focus();return true;}
function open(){
 if(overlay)return;
 lastFocus=d.activeElement;
 overlay=d.createElement('section');overlay.id='nc78-feedback';overlay.className='nc78-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','nc78-title');
 overlay.innerHTML='<div class="nc78-sheet"><div class="nc78-head"><div><small>GAMES STUDIOS · ASSISTENZA</small><h2 id="nc78-title">🛠️ Segnala un problema</h2></div><button type="button" id="nc78-close" aria-label="Chiudi segnalazione">×</button></div><p class="nc78-copy">Descrivi cosa è successo. La segnalazione viene inviata al supporto del gioco senza pubblicare il tuo indirizzo email.</p><form id="nc78-form"><label for="nc78-category">Tipo di problema</label><select id="nc78-category" required></select><label for="nc78-game">In quale sezione?</label><select id="nc78-game" required></select><label for="nc78-description">Descrivi il problema</label><textarea id="nc78-description" rows="5" minlength="15" maxlength="1500" required placeholder="Esempio: entrando in Briscola online il tasto Cerca non trova giocatori..."></textarea><small>Non inserire password, numeri di carte o informazioni riservate. Max 1500 caratteri.</small><button type="submit" id="nc78-submit">📩 Invia segnalazione</button><p id="nc78-status" role="status"></p></form></div>';
 d.body.append(overlay);
 const $=q=>overlay?.querySelector(q);
 const categoriesEl=$('#nc78-category'),gamesEl=$('#nc78-game');
 for(const [value,label] of categories){const e=d.createElement('option');e.value=value;e.textContent=label;categoriesEl.append(e);}
 for(const [value,label] of games){const e=d.createElement('option');e.value=value;e.textContent=label;gamesEl.append(e);}
 const selected=w.NC78_MATCH?.currentGame?.()||'generale';gamesEl.value=games.some(x=>x[0]===selected)?selected:'generale';
 $('#nc78-close').onclick=clear;
 overlay.addEventListener('click',e=>{if(e.target===overlay)clear()});
 $('#nc78-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const description=$('#nc78-description').value.trim(),category=categoriesEl.value,game=gamesEl.value,button=$('#nc78-submit');
  if(description.length<15||description.length>1500){$('#nc78-status').textContent='Inserisci almeno 15 caratteri e non più di 1500.';return;}
  busy=true;button.disabled=true;$('#nc78-status').textContent='Invio sicuro della segnalazione…';
  try{
   if(!w.NC70_SOCIAL?.call)throw Error('Aggiorna l’app per inviare segnalazioni.');
   const result=await w.NC70_SOCIAL.call('report',{category,game,description,version:'7.8.0'});
   if(!result.ok||!result.reference)throw Error('Il server non ha confermato la ricezione.');
   $('#nc78-status').textContent='✅ Segnalazione ricevuta · Codice '+result.reference+'. Conservalo per eventuali comunicazioni.';
   $('#nc78-description').value='';
   button.textContent='Segnalazione inviata';
  }catch(err){
   $('#nc78-status').textContent=err.message||'Invio non riuscito. Riprova.';
   button.disabled=false;
  }finally{busy=false;}
 });
 $('#nc78-close').focus();
}
d.addEventListener('keydown',e=>{if(overlay&&e.key==='Escape'){e.preventDefault();clear();}});
w.NC78_FEEDBACK={open,close:clear,isOpen:()=>!!overlay};
})(window,document);
