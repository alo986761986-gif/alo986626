(function(w){
'use strict';
if(!w.NCDesktop)return;
const desktop=w.NCDesktop;
const user=desktop.identity();
function invoke(callback,params){
 if(typeof w[callback]==='function')w[callback](...params);
}
w.NCRewardNative={
 accountScope:()=>user.uid?'uid:'+user.uid:'guest',
 displayName:()=>user.displayName||'',
 show:()=>w.NC_AD_EVENT?.('error','Le ricompense pubblicitarie Android non sono disponibili in Windows.'),
 sync:()=>{},
 privacy:()=>w.NC_AD_EVENT?.('error','Il consenso AdMob riguarda la versione Android.')
};
// Italian desktop voices use Windows' installed speech engines through Chromium.
let voiceGender='female',voiceName='';
function italianVoices(){return (w.speechSynthesis?.getVoices?.()||[]).filter(v=>/^it(?:[-_]|$)/i.test(v.lang));}
function speakItalian(text){
 try{
  if(!w.speechSynthesis||!w.SpeechSynthesisUtterance)return false;
  const utterance=new w.SpeechSynthesisUtterance(String(text).slice(0,120));
  utterance.lang='it-IT';utterance.rate=.92;utterance.pitch=voiceGender==='male'?.92:1.04;
  const voices=italianVoices();
  const matched=voices.find(v=>v.name===voiceName) || voices.find(v=>voiceGender==='female'?/female|alice|elsa|sara/i.test(v.name):/male|luca|diego|marco/i.test(v.name)) || voices[0];
  if(matched)utterance.voice=matched;
  w.speechSynthesis.cancel();w.speechSynthesis.speak(utterance);return true;
 }catch{return false;}
}
w.NCGameVoice={
 configure:(gender,name)=>{voiceGender=gender==='male'?'male':'female';voiceName=String(name||'').slice(0,120);},
 preview:()=>speakItalian('Ciao, benvenuto a Napoli Carte. Sola! Chiodo! Buona partita.'),
 list:()=>invoke('NC51_VOICE_LIST',[italianVoices().map(v=>v.name)])
};
w.NCChiodoNative={
 request:(id,op,body,token)=>desktop.chiodo({op,data:body,token:token||''}).then(result=>invoke('NC_CHIODO_RESPONSE',[Number(id),JSON.stringify(result)]))
  .catch(e=>invoke('NC_CHIODO_RESPONSE',[Number(id),JSON.stringify({status:0,error:e.message||'Connessione non riuscita',body:''})])),
 speak:text=>speakItalian(text)
};
w.NCSocialNative={request:(id,op,json)=>desktop.social({op,data:json}).then(r=>invoke('NC_SOCIAL_RESPONSE',[Number(id),r.status,r.body]))
 .catch(e=>invoke('NC_SOCIAL_RESPONSE',[Number(id),0,JSON.stringify({error:e.message||'Connessione non disponibile'})]))};
w.NCProfileNative={
 info:()=>invoke('NC79_PROFILE_INFO',[JSON.stringify({signedIn:!!user.uid,email:user.email,displayName:user.displayName,verified:false,providers:user.providers})]),
 logout:()=>desktop.logout(),
 resetPassword:()=>desktop.reset(user.email||'').then(()=>invoke('NC79_PROFILE_ACTION',['Email per il recupero della password inviata.'])).catch(e=>invoke('NC79_PROFILE_ACTION',[e.message||'Recupero password non disponibile.']))
};
w.NCAppLinks={privacyPolicy:()=>desktop.external('privacy'),accountDeletion:()=>desktop.external('delete')};
// La sintesi vocale del browser resta disponibile per tutte le frasi di gioco.

w.NCPlayNative={
 buy:()=>invoke('NC_PLAY_EVENT',['error','Google Play Billing non supporta acquisti Windows.']),
 sync:()=>{},query:()=>{}
};
const realFetch=w.fetch.bind(w);
w.fetch=function(input,init){
 try{
  const raw=typeof input==='string'?input:input?.url||'';
  const u=new URL(raw,w.location.href);
  if(u.origin==='https://napoli-carte-3d-global.onrender.com'&&u.pathname.startsWith('/api/')){
   const method=(init?.method||'GET').toUpperCase();
   return desktop.classic({url:u.toString(),method,body:typeof init?.body==='string'?init.body:''}).then(r=>new Response(r.body,{status:r.status||503,headers:{'content-type':'application/json'}}));
  }
 }catch(e){return Promise.reject(e);}
 return realFetch(input,init);
};
})(window);
