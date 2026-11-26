(function(w,d){
'use strict';
if(w.NC76_MENU)return;
const trigger=d.getElementById('nc76-menu-open');
if(!trigger)return;
const storage=(k)=>{try{return w.localStorage.getItem(k)}catch(e){return null}};
const action=(id,icon,title,description)=>'<button type="button" class="nc76-entry" data-action="'+id+'"><span class="nc76-icon" aria-hidden="true">'+icon+'</span><span class="nc76-entry-text"><strong>'+title+'</strong><small>'+description+'</small></span><span class="nc76-chevron" aria-hidden="true">›</span></button>';
const wrap=d.createElement('div');
wrap.id='nc76-overlay';wrap.hidden=true;
wrap.innerHTML='<div class="nc76-scrim" data-action="close"></div>'+
'<aside class="nc76-panel" role="dialog" aria-modal="true" aria-labelledby="nc76-title" tabindex="-1">'+
'<div class="nc76-top"><div><small>NAPOLI CARTE 3D</small><h2 id="nc76-title">Menu e impostazioni</h2></div><button type="button" class="nc76-close" data-action="close" aria-label="Chiudi menu">×</button></div>'+
'<div class="nc76-scroll"><section aria-labelledby="nc76-personal-title"><h3 id="nc76-personal-title">👤 Area personale</h3>'+
action('profile','👤','Il mio profilo','Nickname e privacy')+
action('bonus','🎁','Bonus giornaliero','Premi e crediti virtuali')+
action('friends','👥','Amici','Richieste e ricerca giocatori')+
action('search','🔎','Cerca nickname','Trova utenti email e Google')+
action('chat','💬','Chat privata','Messaggi, emoji e vocali')+
action('stats','🏆','Statistiche','Partite, risultati e vittorie')+
action('cloud','☁️','Progressi cloud','Salvataggi dei tuoi giochi')+
'</section><section aria-labelledby="nc76-settings-title"><h3 id="nc76-settings-title">⚙️ Impostazioni di gioco</h3>'+
'<button type="button" class="nc76-setting" data-action="music" id="nc76-music" aria-pressed="true"><span class="nc76-icon" aria-hidden="true">🎵</span><span class="nc76-entry-text"><strong>Musica di sottofondo</strong><small>Brano durante le partite</small></span><span class="nc76-switch" aria-hidden="true"></span><span class="nc76-state" id="nc76-music-state">ON</span></button>'+
'<button type="button" class="nc76-setting" data-action="sound" id="nc76-sound" aria-pressed="true"><span class="nc76-icon" aria-hidden="true">🔊</span><span class="nc76-entry-text"><strong>Effetti sonori</strong><small>Carte e pulsanti</small></span><span class="nc76-switch" aria-hidden="true"></span><span class="nc76-state" id="nc76-sound-state">ON</span></button>'+
'<button type="button" class="nc76-setting" data-action="vibration" id="nc76-vibration" aria-pressed="true"><span class="nc76-icon" aria-hidden="true">📳</span><span class="nc76-entry-text"><strong>Vibrazione</strong><small>Feedback delle carte</small></span><span class="nc76-switch" aria-hidden="true"></span><span class="nc76-state" id="nc76-vibration-state">ON</span></button>'+
action('rules','📖','Regole dei giochi','Consulta istruzioni e punteggi')+
action('guide','❔','Guida introduttiva','Rivedi il benvenuto')+
action('feedback','🛠️','Segnala un problema','Scrivi al supporto del gioco')+
'</section><button type="button" class="nc76-home" data-action="home" id="nc76-home" hidden>← Torna al menu principale</button>'+
'</div><div class="nc76-bottom">GAMES STUDIOS · NAPOLI CARTE 3D</div></aside>';
d.body.append(wrap);
let opened=false,previousOverflow='',lastFocused=null;
const closeButton=wrap.querySelector('.nc76-close');
function refresh(){
 const music=w.NC74_MUSIC?.isEnabled?.()!==false;
 const sound=storage('nc3d_sound')!=='off';
 const vibration=storage('nc3d_vibration')!=='off';
 for(const [id,value] of [['music',music],['sound',sound],['vibration',vibration]]){
  const btn=wrap.querySelector('#nc76-'+id);
  if(btn){btn.setAttribute('aria-pressed',value?'true':'false');wrap.querySelector('#nc76-'+id+'-state').textContent=value?'ON':'OFF';}
 }
 const root=d.getElementById('root');
 const playing=!!root&&!root.querySelector('.setup');
 wrap.querySelector('#nc76-home').hidden=!playing;
}
function open(){
 if(opened)return;
 lastFocused=d.activeElement;
 previousOverflow=d.body.style.overflow;
 d.body.style.overflow='hidden';
 opened=true;wrap.hidden=false;trigger.setAttribute('aria-expanded','true');
 refresh();closeButton.focus();
}
function close(){
 if(!opened)return;
 opened=false;wrap.hidden=true;d.body.style.overflow=previousOverflow;
 trigger.setAttribute('aria-expanded','false');
 if(lastFocused&&lastFocused.isConnected&&typeof lastFocused.focus==='function')lastFocused.focus();
 else trigger.focus();
}
function social(view){
 close();
 if(w.NC70_SOCIAL?.openTab)w.NC70_SOCIAL.openTab(view);
 else w.NC70_SOCIAL?.open?.();
}
function other(fn){
 close();
 try{fn()}catch(e){w.console?.warn?.('Menu action unavailable',e)}
}
function choose(name){
 switch(name){
 case 'close':close();break;
 case 'profile':other(()=>w.NC79_PROFILE?.open?.());break;
 case 'friends':social('friends');break;
 case 'search':social('search');break;
 case 'chat':other(()=>w.NC77_CHAT?.open?.());break;
 case 'stats':social('stats');break;
 case 'cloud':social('progress');break;
 case 'bonus':other(()=>w.NC71_DAILY?.open?.());break;
 case 'music':
  if(w.NC74_MUSIC?.toggle)w.NC74_MUSIC.toggle();
  refresh();break;
 case 'sound':
  if(w.NC3D_TOGGLE_SOUND)w.NC3D_TOGGLE_SOUND();
  refresh();break;
 case 'vibration':
  try{w.localStorage.setItem('nc3d_vibration',storage('nc3d_vibration')==='off'?'on':'off')}catch(e){}
  refresh();break;
 case 'rules':other(()=>w.rules?.());break;
 case 'guide':other(()=>w.NC74_WELCOME?.open?.());break;
 case 'feedback':other(()=>w.NC78_FEEDBACK?.open?.());break;
 case 'home':
  if(w.confirm('Uscire dalla partita e tornare al menu principale?'))
   other(()=>w.lobby?.());
  break;
 }
}
wrap.addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');
 if(button&&wrap.contains(button))choose(button.dataset.action);
});
trigger.addEventListener('click',()=>opened?close():open());
d.addEventListener('keydown',e=>{
 if(!opened)return;
 if(e.key==='Escape'){e.preventDefault();close();return;}
 if(e.key!=='Tab')return;
 const focusable=Array.from(wrap.querySelectorAll('button:not([disabled]):not([hidden])')).filter(el=>el.getClientRects().length);
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus();}
});
w.addEventListener('nc74:music-change',refresh);
w.NC76_MENU={open,close,refresh,isOpen:()=>opened};
})(window,document);
