/* Subtle motion for real game transitions, without changing any rules or network traffic. */
(function(w,d){'use strict';
 if(w.NC913_MOTION)return;
 const reduced=w.matchMedia?.('(prefers-reduced-motion: reduce)');
 const smooth=()=>!reduced?.matches && d.visibilityState!=='hidden'&&d.body.dataset.nc50Quality!=='low';
 let pending=false;let prevRoot=null;
 function decorate(){
  pending=false;
  const root=d.getElementById('root');if(!root)return;
  const lobby=root.querySelector(':scope > main.wrap');
  const game=root.querySelector('.ch-arena,.board');
  const scene=game||lobby;
  if(scene&&scene!==prevRoot){
   if(prevRoot)prevRoot.classList.remove('nc913-reveal');
   prevRoot=scene;
   if(smooth()){
    scene.classList.remove('nc913-reveal');
    void scene.offsetWidth;
    scene.classList.add('nc913-reveal');
   }
  }
  // Apply once to newly dealt cards, avoid restarting each status redraw.
  if(smooth())root.querySelectorAll('.ch-hand button[data-card] .playing-card').forEach((card,i)=>{
   if(card.dataset.nc913Motion)return;
   card.dataset.nc913Motion='1';
   card.style.setProperty('--nc913-delay',Math.min(i*35,210)+'ms');
   card.classList.add('nc913-card-enter');
   card.addEventListener('animationend',()=>card.classList.remove('nc913-card-enter'),{once:true});
  });
 }
 function queue(){if(pending)return;pending=true;w.requestAnimationFrame(decorate)}
 function setup(){
  const root=d.getElementById('root');if(!root)return;
  new MutationObserver(queue).observe(root,{childList:true,subtree:false});
  queue();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 w.NC913_MOTION={refresh:queue,version:'9.13.0'};
})(window,document);
