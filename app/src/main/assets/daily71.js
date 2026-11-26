(function(g){
'use strict';
const rewards=[100,150,200,300,400,500,1000,150,200,250,350,450,600,1200,200,250,300,400,500,700,1500,250,300,400,500,650,800,1000,1500,2500];
const pending=new Map();
let seq=700000000,root=null,busy=false;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function call(op,data={}){
 return new Promise((resolve,reject)=>{
  if(typeof g.NCSocialNative?.request!=='function')return reject(Error('Bonus disponibili nell’app Android aggiornata.'));
  const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('Connessione al bonus scaduta'));},30000);
  pending.set(id,{resolve,reject,timer});try{g.NCSocialNative.request(String(id),op,JSON.stringify(data));}catch(e){clearTimeout(timer);pending.delete(id);reject(e);}
 });
}
// Share the native response callback without breaking the Friends screen.
const prior=g.NC_SOCIAL_RESPONSE;
g.NC_SOCIAL_RESPONSE=(id,status,json)=>{
 const waiter=pending.get(+id);if(!waiter){if(prior)prior(id,status,json);return;}
 pending.delete(+id);clearTimeout(waiter.timer);
 let data={};try{data=JSON.parse(json)}catch(e){}
 if(status>=200&&status<300)waiter.resolve(data);else waiter.reject(Error(data.error||'Bonus temporaneamente non disponibili'));
};
function feedback(message){const element=root?.querySelector('#nc71-status');if(element)element.textContent=message;}
function close(){if(!root)return false;root.remove();root=null;busy=false;return true;}
function draw(data){
 if(!root)return;
 const today=data.claimedToday;
 const calendar=root.querySelector('#nc71-calendar');calendar.replaceChildren();
 const completed=new Set((data.history||[]).map(x=>x.date));
 const last=(data.history||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const cycleStart=Math.max(0,Math.floor((last.length?last.length:0)/30));
 // Day tiles visualize the current reward cycle, not an invented claim calendar.
 const currentDay=Math.max(1,Math.min(30,data.nextDay||1));
 rewards.forEach((credits,i)=>{
  const day=i+1,tile=document.createElement('div');
  tile.className='nc71-tile'+(day===currentDay?' active':'')+(day<currentDay?' done':'')+(day%7===0||day===30?' jackpot':'');
  tile.innerHTML='<span>GIORNO '+day+'</span><b>'+(day===30?'👑':day%7===0?'🎁':'🪙')+'</b><strong>+'+credits.toLocaleString('it-IT')+'</strong><small>'+(day<currentDay?'Riscattato':day===currentDay?(today?'Riscattato':'Oggi'):'Da sbloccare')+'</small>';
  calendar.append(tile);
 });
 root.querySelector('#nc71-count').textContent='Ciclo '+data.cycle+' · '+(today?'Premio di oggi già riscosso':'Premio del giorno '+currentDay);
 root.querySelector('#nc71-value').textContent=today?'Torna domani':'+'+Number(data.nextCredits||rewards[0]).toLocaleString('it-IT')+' crediti';
 const button=root.querySelector('#nc71-claim');button.disabled=today||busy;button.textContent=today?'✓ Premio già riscosso':'🎁 Riscatta bonus gratuito';
 const rows=data.history||[];
 if(g.NCRewardNative?.accountScope?.()?.startsWith('uid:')){
  const scope=g.NCRewardNative.accountScope();
  const applied=g.NC_DAILY_VERIFIED?.(scope,rows,Number(data.cumulativeCredits))||0;
  if(applied)feedback('Sincronizzati '+applied.toLocaleString('it-IT')+' crediti verificati nel tuo portafoglio.');
 }
}
async function refresh(){
 try{const d=await call('daily');if(root){draw(d);if(!root.querySelector('#nc71-status').textContent)feedback('Una ricompensa ogni giorno UTC, senza perdere i giorni precedenti.');}}
 catch(e){feedback(e.message);}
}
async function claim(){
 if(busy||!root)return;busy=true;const button=root.querySelector('#nc71-claim');button.disabled=true;feedback('Verifica del premio con il server…');
 try{const result=await call('claim');await refresh();feedback(result.awarded?'🎉 Premio confermato! Crediti sincronizzati.':'Premio già riscattato oggi.');}
 catch(e){feedback(e.message);}finally{busy=false;if(root){const data=await call('daily').catch(()=>null);if(data)draw(data);else button.disabled=false;}}
}
function open(){
 if(root)return;
 root=document.createElement('section');root.className='nc71-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Bonus giornaliero');
 root.innerHTML='<div class="nc71-panel"><header><div><small>NAPOLI CARTE 3D</small><h2>✨ BONUS GIORNALIERO</h2></div><div class="nc71-navigation"><button type="button" id="nc71-back" aria-label="Torna al menu">← Indietro</button><button type="button" id="nc71-close" aria-label="Chiudi">×</button></div></header><p class="nc71-copy">30 giorni di premi, in crediti virtuali gratuiti. I premi sono legati al tuo account email o Google.</p><div id="nc71-count"></div><div id="nc71-calendar"></div><div class="nc71-reward"><small>PREMIO DISPONIBILE</small><strong id="nc71-value">Caricamento…</strong><button id="nc71-claim" disabled>Caricamento…</button></div><p id="nc71-status" role="status"></p><p class="nc71-foot">Il bonus si rinnova alle 00:00 UTC. Nessun annuncio obbligatorio. Nessun premio in denaro.</p><button type="button" id="nc71-back-bottom" class="nc71-back-bottom">← TORNA AL MENU</button></div>';
 document.body.append(root);root.querySelector('#nc71-close').onclick=close;root.querySelector('#nc71-back').onclick=close;root.querySelector('#nc71-back-bottom').onclick=close;root.querySelector('#nc71-claim').onclick=claim;
 root.onclick=e=>{if(e.target===root)close()};feedback('Caricamento premio…');refresh();
}
const css=document.createElement('style');
css.textContent='#nc71-open{position:fixed;right:13px;bottom:64px;z-index:2147482800;border:2px solid #ffe19b;color:#123427;background:linear-gradient(130deg,#ffe7a4,#ba8a36);border-radius:22px;padding:10px 16px;box-shadow:0 6px 18px #0009;font-weight:900}.nc71-overlay{position:fixed;inset:0;z-index:2147483601;background:#04140fee;display:grid;place-items:center;padding:10px;color:#fff1cd;font-family:system-ui}.nc71-panel{width:min(700px,100%);max-height:96dvh;overflow:auto;border-radius:20px;border:2px solid #b99b57;padding:16px;background:radial-gradient(ellipse at top,#19604d,#082820 75%);box-shadow:0 18px 55px #000b}.nc71-panel header{display:flex;align-items:center;justify-content:space-between;gap:12px}.nc71-panel header small{font-size:10px;letter-spacing:2px;color:#dcc68f}.nc71-panel h2{font-size:clamp(18px,4vw,26px);margin:4px 0;color:#ffe6a8}.nc71-panel #nc71-close{font-size:25px;background:#76392b;color:#fff;border:0;border-radius:8px;min-width:40px;min-height:40px}.nc71-copy,.nc71-foot{color:#c9dbcf;font-size:12px;line-height:1.5}.nc71-panel #nc71-count{font-weight:800;text-align:center;margin:10px}.nc71-panel #nc71-calendar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.nc71-tile{display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;gap:3px;border:1px solid #a9a26b80;background:#133e30;border-radius:10px;min-height:81px;padding:5px 2px}.nc71-tile span{font-size:9px;color:#d9ddc8}.nc71-tile b{font-size:20px}.nc71-tile strong{color:#ffe3a1;font-size:12px}.nc71-tile small{color:#c6d8ca;font-size:9px}.nc71-tile.done{background:#27583d}.nc71-tile.active{border:2px solid #ffe998;box-shadow:0 0 12px #ead47a66}.nc71-tile.jackpot{background:#654419}.nc71-reward{margin:14px auto;padding:13px;border:1px solid #e6c37a;border-radius:14px;display:grid;place-items:center;gap:6px;background:#124334}.nc71-reward small{font-size:10px;letter-spacing:1px}.nc71-reward strong{font-size:24px;color:#ffe6a0}.nc71-reward button{padding:12px;width:100%;max-width:350px;border:0;border-radius:10px;background:#f4d58b;color:#123325;font-weight:900}.nc71-reward button:disabled{opacity:.6}.nc71-panel #nc71-status{text-align:center;min-height:18px;color:#ffe4a9;font-size:12px}@media(max-width:400px){.nc71-panel #nc71-calendar{gap:3px}.nc71-tile{min-height:70px}.nc71-tile strong{font-size:11px}}';
document.head.append(css);
// Access is provided through the dedicated Area personale on the main menu.
// No floating bonus button is mounted over game controls.
document.addEventListener('keydown',e=>{if(root&&e.key==='Escape'){e.preventDefault();close();}});
css.textContent+='\n.nc71-panel{overflow-y:auto!important;min-height:0;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding-bottom:max(16px,env(safe-area-inset-bottom))}.nc71-panel header{position:sticky;top:-16px;z-index:5;background:#104435;padding:12px 9px;border-bottom:1px solid #d9b777;border-radius:12px}.nc71-navigation{display:flex;align-items:center;gap:6px}.nc71-panel #nc71-back,.nc71-back-bottom{background:#c69a51;color:#103629;border:1px solid #ffe5b0;min-height:42px;border-radius:10px;padding:10px 13px;font-weight:900}.nc71-back-bottom{width:100%;margin-top:12px;min-height:50px}.nc71-panel #nc71-back{white-space:nowrap;font-size:12px}@media(max-width:420px){.nc71-panel{padding:11px}.nc71-panel header{top:-11px;padding:9px 2px}.nc71-panel header h2{font-size:17px}}';
g.NC71_DAILY={open,close,refresh,isOpen:()=>!!root};
})(window);
