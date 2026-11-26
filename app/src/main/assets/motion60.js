(function(){'use strict';const style=document.createElement('style');style.textContent=`
@keyframes nc60-arrive{0%{opacity:0;transform:translate3d(0,-22px,0) rotateX(35deg) rotateZ(-5deg) scale(.88)}65%{opacity:1;transform:translate3d(0,2px,0) rotateX(0) scale(1.025)}100%{opacity:1;transform:none}}
@keyframes nc60-throw{0%{opacity:1;transform:translate3d(0,0,0) rotate(0)}72%{opacity:1;transform:translate3d(var(--move-x),calc(var(--move-y) - 12px),0) rotate(var(--move-rot)) scale(.94)}100%{opacity:0;transform:translate3d(var(--move-x),var(--move-y),0) rotate(var(--move-rot)) scale(.91)}}
.nc-moving-card{animation:nc60-throw .60s cubic-bezier(.2,.7,.2,1) forwards!important}
.nc-enter{animation:nc60-arrive .48s cubic-bezier(.2,.7,.2,1) backwards!important}
.nc60-new{animation:nc60-arrive .48s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:var(--nc60-delay,0ms)}
@keyframes nc60-fly{0%{opacity:0;transform:translate3d(var(--ch-x),var(--ch-y),0) rotate(-12deg) scale(.7)}35%{opacity:1}80%{transform:translate3d(0,-5px,0) rotate(2deg) scale(1.04)}100%{opacity:1;transform:none}}
.ch-top.ch-fly{animation:nc60-fly .58s cubic-bezier(.18,.72,.22,1) both!important}
.playing-card,.ch-hand button{transition:filter .18s ease,box-shadow .18s ease}
@media(prefers-reduced-motion:reduce){.nc60-new,.nc-enter,.ch-top.ch-fly,.nc-moving-card{animation:none!important}}
`;document.head.append(style);
const old=window.NC_CHIODO_TABLE;if(typeof old==='function')window.NC_CHIODO_TABLE=function(root,s){const prior=root._nc60Hand||new Set();const out=old.apply(this,arguments);const next=new Set((s.hand||[]).map(c=>String(c.id)));if(s.status==='playing'&&root.dataset.quality!=='low'){let i=0;root.querySelectorAll('.ch-hand button[data-card]').forEach(b=>{if(!prior.has(b.dataset.card)){b.classList.add('nc60-new');b.style.setProperty('--nc60-delay',Math.min(i++*45,240)+'ms');}});}root._nc60Hand=next;return out;};
})();