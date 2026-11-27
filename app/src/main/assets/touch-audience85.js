/* NAPOLI CARTE 3D - consistent action bars, responsive touch and live audience UI.
   No hardcoded/fake visitor totals. Backend /audience/visit stores pseudonymous unique installations.
*/
(function(w,d){
'use strict';
if(d.getElementById('nc85-touch-style'))return;
const style=d.createElement('style');
style.id='nc85-touch-style';
style.textContent=`
/* Harmonise toolbar surfaces without changing card illustrations or game rules. */
body.nc90 #chiodo121.ch65 .ch-controls,
body.nc90 #chiodo121-online.ch65 .ch-controls,
body.nc90 #root .actions,
body.nc90 #nc98-launcher .nc98-actions{
 background:#0b4e9c!important;border:2px solid #ffe08d!important;
 box-shadow:0 3px 10px #0005!important;color:#fff8df!important;
}
body.nc90 #chiodo121.ch65 .ch-controls button,
body.nc90 #chiodo121-online.ch65 .ch-controls button,
body.nc90 #root .actions .choice,
body.nc90 #nc98-launcher .nc98-actions button{
 background:#0a58a6!important;color:#fff8df!important;
 border:1px solid #ffe08d!important;border-radius:11px!important;
 text-shadow:none!important;filter:none!important;min-height:48px!important;
 box-shadow:0 2px 4px #0005!important;
}
body.nc90 #chiodo121.ch65 .ch-controls button:active,
body.nc90 #chiodo121-online.ch65 .ch-controls button:active,
body.nc90 #nc98-launcher .nc98-actions button:active{
 background:#177ac9!important;transform:scale(.97);
}
body.nc90 #nc98-launcher .nc98-actions button:disabled{opacity:.5;transform:none!important}
body.nc90 #chiodo121.ch65 .ch-controls:empty,
body.nc90 #chiodo121-online.ch65 .ch-controls:empty{display:none!important}

.actions,.ch65 .ch-controls,.ch65 .ch-actions,.nc83-match-type{
  background:#0b4e9c!important;border:1px solid #ffe08d!important;
  color:#fff8df!important;box-sizing:border-box;
}
.actions .choices,.ch65 .ch-controls,.ch65 .ch-actions{gap:8px!important;align-items:center;justify-content:center;flex-wrap:wrap}
.actions button.choice,.ch65 .ch-controls button,.ch65 .ch-actions button,
.nc83-match-type button,.footeractions button{
  -webkit-appearance:none;appearance:none;
  background:#0a58a6!important;color:#fff8df!important;
  border:1px solid #ffe08d!important;border-radius:11px!important;
  box-shadow:inset 0 1px 0 #ffffff1c,0 2px 4px #0004!important;
  text-shadow:none!important;filter:none!important;
  min-height:46px;min-width:46px;line-height:1.25;
  padding:10px 13px!important;font-weight:750;
  transition:background-color 100ms ease,transform 100ms ease;
}
.actions button.choice:active,.ch65 .ch-controls button:active,
.ch65 .ch-actions button:active,.nc83-match-type button:active{
  background:#177ac9!important;transform:scale(.97)
}
.nc83-match-type button[aria-pressed=true],
.ch65 .ch-controls button[aria-pressed=true],
.ch65 .ch-actions button[aria-pressed=true]{
  background:#ffce68!important;color:#56300e!important;border-color:#fff2bd!important
}
.actions button:disabled,.ch65 .ch-controls button:disabled,
.ch65 .ch-actions button:disabled{opacity:.48;cursor:default;transform:none!important}
button,[role=button],.playing-card.user-card,.ch65 .ch-card{
  touch-action:manipulation;-webkit-tap-highlight-color:transparent;
}
/* Cards inside the horizontal hand must keep swipe-to-scroll gestures. */
.ch65 .ch-hand,.ch65 .ch-hand button,.ch65 .ch-hand .playing-card{touch-action:pan-x!important}
.ch65 .ch-hand button{-webkit-tap-highlight-color:transparent}
button,[role=button]{user-select:none;-webkit-user-select:none}
.playing-card.user-card,.ch65 .ch-hand .playing-card,.ch65 .ch-card{
  -webkit-user-select:none;user-select:none;cursor:pointer;
  transition:transform 110ms ease,box-shadow 110ms ease!important;
}
.playing-card.user-card:active,.ch65 .ch-hand .playing-card:active,.ch65 .ch-card:active{
  transform:translateY(-9px) scale(1.035)!important
}
@media(pointer:coarse){
  .actions button.choice,.ch65 .ch-controls button,.ch65 .ch-actions button,
  .nc83-match-type button,.footeractions button{min-height:48px!important;min-width:48px!important}
  .myhand .playing-card.user-card{touch-action:manipulation}
}
@media(prefers-reduced-motion:reduce){.actions button,.ch65 .ch-controls button,.playing-card.user-card{transition:none!important}}
.nc85-audience{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:5px 9px;
  width:fit-content;max-width:calc(100% - 24px);margin:7px auto 12px;
  color:#fff0d1;background:#124c91;border:1px solid #ffe08d;border-radius:999px;
  padding:9px 13px;font:700 12px/1.35 system-ui,sans-serif;text-align:center}
.nc85-audience strong{color:#ffe79e;font-variant-numeric:tabular-nums}
.nc85-audience .nc85-secondary{color:#edf8ff;font-weight:500}
`;
d.head.appendChild(style);
const AUDIENCE_KEY='nc85-installation-id';
const label=d.createElement('div');
label.id='nc85-audience';label.className='nc85-audience';
label.setAttribute('role','status');
label.setAttribute('aria-live','off');
label.innerHTML='<span>👥 Comunità:</span> <strong>dato non disponibile</strong>';
function mount(){
 const root=d.getElementById('root');if(!root)return;
 const intro=root.querySelector('.intro');
 if(intro){if(label.parentElement!==intro)intro.appendChild(label);}
 else if(label.parentElement)label.remove();
}
const observer=new MutationObserver(mount);
const root=d.getElementById('root');
if(root)observer.observe(root,{childList:true,subtree:false});
function safeCount(value){return Number.isSafeInteger(value)&&value>=0?value:null}
function installationId(){
 try{
  let value=w.localStorage.getItem(AUDIENCE_KEY);
  if(value&&/^[0-9a-f]{32}$/i.test(value))return value;
  const bytes=new Uint8Array(16);
  w.crypto.getRandomValues(bytes);
  value=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  w.localStorage.setItem(AUDIENCE_KEY,value);
  return value;
 }catch(_){return null}
}
let updating=false;
async function update(){
 if(updating||!w.NC70_SOCIAL?.call)return;
 const visitorId=installationId();
 if(!visitorId)return;
 updating=true;
 try{
  const data=await w.NC70_SOCIAL.call('audienceVisit',{visitorId});
  const registered=safeCount(data.registered),guest=safeCount(data.guests);
  if(registered===null||guest===null)throw Error('Formato non valido');
  const total=registered+guest;
  if(!Number.isSafeInteger(total))throw Error('Totale non valido');
  const fmt=new Intl.NumberFormat('it-IT');
  label.innerHTML='<span>👥 Utenti totali:</span><strong>'+fmt.format(total)+'</strong>'+
    '<span class="nc85-secondary">('+fmt.format(registered)+' iscritti · '+fmt.format(guest)+' ospiti)</span>';
 }catch(_){label.innerHTML='<span>👥 Comunità:</span> <strong>dato non disponibile</strong>';}
 finally{updating=false}
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>{mount();update()},{once:true});
else{mount();update();}
w.addEventListener('pageshow',update,{passive:true});
d.addEventListener('visibilitychange',()=>{if(!d.hidden)update()});
setInterval(()=>{if(!d.hidden)update()},60000);
})(window,document);
