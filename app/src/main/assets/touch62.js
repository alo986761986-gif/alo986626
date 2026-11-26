(function(){
'use strict';
const css=document.createElement('style');css.textContent=`
button:not(:disabled),[role="button"],select,input[type="checkbox"]{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
button:not(:disabled){-webkit-user-select:none;user-select:none}
.ch-btn,.ch-controls button,.footeractions button,.choices button,.nc52-shop,.nc23-pill{min-height:44px}
.ch-premium .ch-hand{touch-action:pan-x;overscroll-behavior-x:contain;gap:7px;padding-bottom:18px}
.ch-premium .ch-hand button{min-width:44px;min-height:64px;touch-action:pan-x;transition:opacity 75ms ease,filter 75ms ease!important}
.ch-premium .ch-hand button:not(:disabled):active{transform:translateY(-5px)!important;opacity:.78;filter:brightness(1.18) drop-shadow(0 0 5px #f7d28c)!important}
.ch-hand button>*{pointer-events:none}
.ch-premium button.nc62-pressed:not(:disabled),button.nc62-pressed:not(:disabled){opacity:.76}
.myhand .user-card{touch-action:pan-x;min-width:44px}
.ch-gpu,.ch-fx,.ch-victory,.nc-overlay,.nc-moving-card{pointer-events:none!important}
.ch-fly,.nc-moving-card{will-change:transform,opacity}
.nc25-ghost:not(.nc25-played):not(.nc25-return){transition:none!important}
.nc25-ptt-hold,.nc25-buttons button.nc25-ptt-enabled{touch-action:none}
@media(prefers-reduced-motion:reduce){.ch-premium button,.nc-moving-card{transition:none!important}}
`;document.head.append(css);
let pressed=null,pid=null;
function release(e){if(e&&e.pointerId!==pid)return;if(pressed)pressed.classList.remove('nc62-pressed');pressed=null;pid=null;}
document.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button>0)return;release();const b=e.target.closest?.('button:not(:disabled),[role="button"]');if(b){pressed=b;pid=e.pointerId;b.classList.add('nc62-pressed');}},{capture:true,passive:true});
document.addEventListener('pointerup',release,{capture:true,passive:true});
document.addEventListener('pointercancel',release,{capture:true,passive:true});
window.addEventListener('blur',()=>release());
})();