(function(w,d){
'use strict';
// Firebase-backed nickname is the single source of truth across every game.
if(w.NC80_IDENTITY)return;
let verified='',currentScope='',loading=null;
const scope=()=>{try{return w.NCRewardNative?.accountScope?.()||'guest';}catch(e){return 'guest'}};
function saved(key){try{return w.localStorage.getItem(key)||'';}catch(e){return '';}}
function stored(){const k=scope();return k==='guest'?saved('nc3d_name'):saved('nc80_nickname:'+k);}
function name(){const k=scope();if(k!==currentScope){currentScope=k;verified=stored();}return verified||stored()||'Giocatore';}
function locked(){const k=scope();return k!=='guest'&&k.startsWith('uid:')&&!!name()&&name()!=='Giocatore';}
function apply(){
 const n=name(),fixed=locked();
 for(const id of ['nickname','co-name']){
  const input=d.getElementById(id);
  if(!input)continue;
  if(fixed){input.value=n;input.readOnly=true;input.title='Nickname salvato nel tuo account · modifica dal Profilo';}
  else if(d.activeElement!==input&&!input.value.trim()){input.value=n;input.readOnly=false;}
 }
 try{w.dispatchEvent(new CustomEvent('nc80:nickname',{detail:{name:n,verified:fixed}}));}catch(e){}
}
function set(n){const clean=String(n||'').trim().slice(0,24);if(!clean)return;
 const k=scope();currentScope=k;verified=clean;
 try{if(k.startsWith('uid:'))w.localStorage.setItem('nc80_nickname:'+k,clean);
 else w.localStorage.setItem('nc3d_name',clean);}catch(e){}
 apply();
}
async function sync(force=false){
 const k=scope();
 if(!force&&locked()){apply();return name();}
 if(loading)return loading;
 loading=(async()=>{
  try{
   const r=await w.NC70_SOCIAL?.call?.('me');
   if(k===scope()&&r?.registered&&r.profile?.nickname){set(r.profile.nickname);return r.profile.nickname;}
   if(k===scope()&&!r?.registered&&k.startsWith('uid:')){verified='';try{w.localStorage.removeItem('nc80_nickname:'+k)}catch(e){}}
  }catch(e){/* Remain usable offline; do not overwrite the stored account nickname. */}
  apply();return name();
 })();
 try{return await loading;}finally{loading=null;}
}
w.NC80_IDENTITY={get:name,isVerified:locked,apply,set,sync};
function boot(){apply();sync(true);d.addEventListener('visibilitychange',()=>{if(!d.hidden)sync(true)});}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot);else boot();
})(window,document);
