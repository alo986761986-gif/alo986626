(function(g){
'use strict';
function tracks(stream,enabled){if(stream&&stream.getAudioTracks)for(const t of stream.getAudioTracks())if(t.readyState!=='ended')t.enabled=!!enabled;}
function remote(set,id,peers){const muted=!set.has(id);if(muted)set.add(id);else set.delete(id);const p=peers.get(id);if(p?.audio)p.audio.muted=muted;return muted;}
function icon(mic,off){return '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(mic?'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/>':'<path d="M3 9v6h4l5 4V5L7 9H3"/><path d="M16 9a5 5 0 0 1 0 6M19 5a10 10 0 0 1 0 14"/>')+(off?'<path d="M3 3l18 18" stroke="#ffcfca" stroke-width="2.6"/>':'')+'</svg>';}
function button(host,id,opt){
 if(!host)return;
 let b=host.querySelector(':scope > .nc64-voice');
 if(!b){b=document.createElement('button');b.type='button';b.className='nc64-voice';host.append(b);}
 b.dataset.voiceSeat=String(id);b.classList.toggle('nc64-own',!!opt.own);b.classList.toggle('nc64-side-left',!!opt.left);b.classList.toggle('nc64-voice-off',!!opt.off);
 b.disabled=!!opt.disabled;
 const label=opt.own?(opt.off?'Attiva il mio microfono':'Disattiva il mio microfono'):(opt.off?'Riattiva audio di ':'Silenzia audio di ')+(opt.name||'avversario');
 b.setAttribute('aria-label',label);b.title=label;b.setAttribute('aria-pressed',String(opt.own?!opt.off:!!opt.off));
 if(b.dataset.icon!==String(!!opt.own)+String(!!opt.off)){b.dataset.icon=String(!!opt.own)+String(!!opt.off);b.innerHTML=icon(!!opt.own,!!opt.off);}
 b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!b.disabled)opt.onToggle();};
 return b;
}
const api={tracks,remote,button};
if(typeof module!=='undefined')module.exports=api;
g.NC64_AVATAR_VOICE=api;
if(typeof document==='undefined')return;
const css=document.createElement('style');css.textContent=`
.ch-seat,.board .player,.myname{isolation:isolate}
.nc64-voice{position:absolute;top:8px;left:calc(50% + 10px);z-index:35!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;color:#c5ffe1!important;display:grid!important;place-items:center!important;box-shadow:none!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent;pointer-events:auto!important}
.nc64-voice::before{content:'';position:absolute;inset:5px;border:1.5px solid #7de9b1;border-radius:50%;background:#123e2c;box-shadow:0 2px 7px #000a;z-index:-1}
.nc64-voice.nc64-voice-off{color:#ffd2c8!important}
.nc64-voice.nc64-voice-off::before{border-color:#f28c7b;background:#512925}
.nc64-voice.nc64-side-left{left:auto;right:calc(50% + 10px)}
.nc64-voice.nc64-own{color:#d3ffe4}
.nc64-voice:disabled{opacity:.45!important}
.nc64-voice:active{transform:scale(.94)}
.nc64-voice svg{pointer-events:none}
.myname>.nc64-voice{position:relative;top:auto;left:auto;right:auto;display:inline-grid!important;vertical-align:middle;margin-left:4px}
`;document.head.append(css);
})(typeof window==='undefined'?globalThis:window);