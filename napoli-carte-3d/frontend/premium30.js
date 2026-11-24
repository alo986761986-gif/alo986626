/* Napoli Carte 3D 3.0 Premium — elegant progressive enhancement; original assets. */
(function(){'use strict';
 if(window.NC30_PREMIUM)return;window.NC30_PREMIUM=true;
 const doc=document,root=doc.documentElement,body=doc.body;
 body.classList.add('nc30-premium');
 const scenes=['salone','golfo','circolo'];
 const sceneNames={salone:'Salone Reale',golfo:'Terrazza sul Golfo',circolo:'Circolo Partenopeo'};
 let night=false,quality='auto',firstDraw=true,previousHand=new Set(),prevRoom='',prevLog='',prevStatus='',displayTimer=null,connTimer=null;
 try{night=localStorage.getItem('nc30_night')==='yes'}catch(e){}
 try{quality=localStorage.getItem('nc30_quality')||'auto'}catch(e){}
 const lowDevice=!!(navigator.deviceMemory&&navigator.deviceMemory<=2)||!!(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2);
 const reduce=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const effective=()=>quality==='auto'?(lowDevice||reduce()?'lite':'high'):quality;
 function applyPrefs(){
  body.classList.toggle('nc30-night',night);
  const mode=effective();if(typeof window.NC3D_SET_QUALITY==='function')window.NC3D_SET_QUALITY(mode==='high'?'high':'lite');
  const n=doc.getElementById('nc30-quality');if(n)n.textContent=quality==='auto'?'Automatica':quality==='high'?'Alta':'Leggera';
  const t=doc.getElementById('nc30-light');if(t)t.textContent=night?'Notte':'Giorno';
 }
 function safeRecords(){try{const p=JSON.parse(localStorage.getItem('nc3d_stats')||'{}');return {played:+p.played||0,wins:+p.wins||0,scopes:+p.scopes||0}}catch(e){return {played:0,wins:0,scopes:0}}}
 function awardsHTML(){
  const p=safeRecords(),items=[['🎮','Prima partita',p.played>=1],['🏆','Prima vittoria',p.wins>=1],['✨','Tre scope',p.scopes>=3],['🎖️','Dieci partite',p.played>=10],['👑','Cinque vittorie',p.wins>=5]];
  return '<div class="nc30-achievements" aria-label="Trofei personali"><h3>🏆 I tuoi trofei <span style="font-weight:400;font-size:10px;color:#d4d5bb">· '+p.wins+' vittorie / '+p.played+' partite</span></h3><div class="nc30-award-row">'+items.map(([icon,name,won])=>'<span class="nc30-award'+(won?' nc30-won':'')+'" title="'+(won?'Sbloccato':'Da sbloccare')+'">'+icon+' '+name+'</span>').join('')+'</div></div>';
 }
 function scene(){try{return localStorage.getItem('nc3d_scene')||'salone'}catch(e){return 'salone'}}
 function buildPanel(){
  const el=doc.createElement('div');el.className='nc30-settings';el.id='nc30-settings';
  el.innerHTML='<b>✦ NAPOLI PREMIUM 3.0</b><span class="nc30-conn" id="nc30-connection">Online: verifica…</span>'+
   '<button type="button" id="nc30-scene-btn" aria-label="Cambia ambientazione">◈ <span id="nc30-scene-name"></span></button>'+
   '<button type="button" id="nc30-light-btn" aria-label="Cambia illuminazione">☀ <span id="nc30-light"></span></button>'+
   '<button type="button" id="nc30-quality-btn" class="nc30-quality" aria-label="Qualità grafica">◉ <span id="nc30-quality"></span></button>';
  el.querySelector('#nc30-scene-btn').addEventListener('click',()=>{const n=scenes.indexOf(scene());if(typeof window.NC3D_SET_SCENE==='function')window.NC3D_SET_SCENE(scenes[(n+1)%scenes.length]);refreshLabels();});
  el.querySelector('#nc30-light-btn').addEventListener('click',()=>{night=!night;try{localStorage.setItem('nc30_night',night?'yes':'no')}catch(e){}applyPrefs()});
  el.querySelector('#nc30-quality-btn').addEventListener('click',()=>{const seq=['auto','high','lite'];quality=seq[(seq.indexOf(quality)+1)%3];try{localStorage.setItem('nc30_quality',quality)}catch(e){}applyPrefs()});
  return el;
 }
 function refreshLabels(){
  const s=doc.getElementById('nc30-scene-name');if(s)s.textContent=sceneNames[scene()]||'Ambiente';
  const t=doc.getElementById('nc30-light');if(t)t.textContent=night?'Notte':'Giorno';
  const q=doc.getElementById('nc30-quality');if(q)q.textContent=quality==='auto'?'Automatica':quality==='high'?'Alta':'Leggera';
 }
 function status(){
  const badge=doc.getElementById('nc30-connection');if(!badge)return;
  let state='Offline',level='warn';
  if(window.NC3D_OFFLINE&&typeof mode!=='undefined'&&mode==='bot'){state='Allenamento offline';level='ok'}
  else if(navigator.onLine===false){state='Riconnessione alla rete';level='bad'}
  else {
   const b=doc.getElementById('online');const text=b&&b.textContent||'';
   if(/CONNESSIONE|ERRORE|NON DISPONIBILE|SCADUTA/i.test(text)){state='Riconnessione in corso';level='warn'}
   else if(/ONLINE|SERVER/i.test(text)){state='Connesso al tavolo';level='ok'}
   else state='Connessione in verifica';
  }
  badge.textContent=state;badge.className='nc30-conn'+(level==='ok'?'':level==='warn'?' nc30-conn-warn':' nc30-conn-bad');
 }
 function installPanel(){
  const main=doc.querySelector('#root>.wrap')||doc.querySelector('#root main.wrap')||doc.querySelector('#root main');
  if(!main)return;
  if(!doc.getElementById('nc30-settings'))main.insertBefore(buildPanel(),main.firstChild);
  refreshLabels();status();
  const badge=doc.querySelector('.nc-headline span');if(badge&&/EDITION 2\.0/.test(badge.textContent))badge.textContent='✦ PREMIUM EDITION 3.0';
 }
 function decorate(s){
  const board=doc.querySelector('.board');if(!board){if(doc.querySelector('.setup'))installAwards();return}
  if(!board.querySelector('.nc30-ambient-veil')){const veil=doc.createElement('div');veil.className='nc30-ambient-veil';board.appendChild(veil)}
  const hand=doc.querySelectorAll('.myhand .playing-card');
  const ids=(s.hand||[]).map(c=>c.id);
  if(s.roomId!==prevRoom){prevRoom=s.roomId;previousHand=new Set();prevLog='';prevStatus='';}
  hand.forEach((card,i)=>{
   if(ids[i]&&!previousHand.has(ids[i])&&!reduce()&&effective()!=='lite'){
    card.classList.add('nc30-enter');card.style.animationDelay=Math.min(i*45,220)+'ms';
   }
  });
  previousHand=new Set(ids);
  const event=s.log&&s.log[0]||'';
  if(event&&event!==prevLog){
   if(/SCOPA|vince|ruba/i.test(event))announce(event);
   prevLog=event;
  }
  if(s.status==='finished'&&s.status!==prevStatus){installAwards(true)}
  prevStatus=s.status;
 }
 function installAwards(finished){
  const setup=doc.querySelector('.setup'),wrap=doc.querySelector('#root .wrap');
  if(!wrap||(!setup&&!finished))return;
  let existing=wrap.querySelector('.nc30-achievements');if(existing)existing.remove();
  const target=doc.createElement('div');target.innerHTML=awardsHTML();
  wrap.appendChild(target.firstChild);
 }
 function announce(text){
  if(reduce())return;
  const wrap=doc.querySelector('#root .wrap');if(!wrap)return;
  const node=doc.createElement('div');node.className='nc30-banner';node.textContent=text.slice(0,100);node.setAttribute('role','status');
  wrap.insertBefore(node,wrap.firstChild);
  window.setTimeout(()=>node.remove(),2800);
 }
 const oldLobby=window.drawLobby;
 if(typeof oldLobby==='function')window.drawLobby=function(){const out=oldLobby.apply(this,arguments);firstDraw=false;prevRoom='';previousHand.clear();installPanel();installAwards();return out};
 const oldGame=window.drawGame;
 if(typeof oldGame==='function')window.drawGame=function(s){const out=oldGame.apply(this,arguments);installPanel();if(s)decorate(s);return out};
 window.NC30_SHOW_ACHIEVEMENTS=()=>{const el=doc.querySelector('.nc30-achievements');if(el){el.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'center'});return true}return false};
 window.NC30_SET_PREMIUM_QUALITY=q=>{if(['auto','high','lite'].includes(q)){quality=q;applyPrefs()}};
 body.classList.toggle('nc30-night',night);
 if(typeof window.NC3D_SET_QUALITY==='function'){
  // Do not re-render the lobby from within a render hook.
  const mode=effective();if(mode==='lite')window.NC3D_SET_QUALITY('lite');
 }
 window.addEventListener('online',status);window.addEventListener('offline',status);
 connTimer=window.setInterval(status,3200);
 if(doc.querySelector('#root .wrap')){installPanel();installAwards()}
})();