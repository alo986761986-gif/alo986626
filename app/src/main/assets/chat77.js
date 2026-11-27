(function(w,d){
'use strict';
if(w.NC77_CHAT)return;
let layer=null,view='threads',peer='',peerName='',messages=[],lastId='',busy=false,reading=false,timer=0,recorder=null,mic=null,recordStart=0,recordTimeout=0,recordCancel=false,playingUrls=new Set(),lastFocused=null;
let inboxTimer=0,inboxBusy=false,inboxPromise=null,lastInboxHash='',lastUnread=-1,chatGeneration=0,blockedUntil=0;
const ACTIVE_POLL_MS=2200, INBOX_POLL_MS=7000;
const $=selector=>layer?.querySelector(selector);
const element=(tag,cls,text)=>{const e=d.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const call=(op,args={})=>w.NC70_SOCIAL?.call?.(op,args)??Promise.reject(Error('Servizio chat non disponibile. Aggiorna l’app.'));
const EMOJI=['😀','😁','😂','🥰','😍','😘','😎','🤩','🥳','😊','❤️','💙','👍','👏','🙏','🔥','🎉','🎮','🃏','🏆','💯','👋','😢','🤝'];
function status(t){const box=$('#nc77-status');if(box)box.textContent=t||'';}
function closeAudioUrls(){for(const url of playingUrls)URL.revokeObjectURL(url);playingUrls.clear();}
function stopMic(cancel=true){
 recordCancel=cancel;
 if(recorder&&recorder.state!=='inactive'){try{recorder.stop()}catch(e){}}
 if(mic){mic.getTracks().forEach(t=>t.stop());mic=null;}
 clearTimeout(recordTimeout);
 const b=$('#nc77-mic');if(b){b.textContent='🎙️';b.setAttribute('aria-pressed','false');}
}
function setHeader(title,showBack){
 const h=$('#nc77-title');if(h)h.textContent=title;
 const back=$('#nc77-back');if(back)back.hidden=!showBack;
}
function resetView(){const target=$('#nc77-body');if(target)target.replaceChildren();}
function close(){
 if(!layer)return false;
 clearInterval(timer);timer=0;stopMic(true);closeAudioUrls();
 layer.remove();layer=null;peer='';view='threads';messages=[];lastId='';busy=false;reading=false;chatGeneration++;
 refreshInbox().catch(()=>{});
 if(lastFocused?.isConnected)lastFocused.focus();
 return true;
}
function unreadCount(rows){return (rows||[]).reduce((total,row)=>total+Math.max(0,Math.min(999,Number(row.unread)||0)),0);}
function updateBadge(count){
 const n=Math.min(99,Math.max(0,count));if(n===lastUnread)return;
 lastUnread=n;
 const toggle=d.getElementById('nc76-menu-open');if(!toggle)return;
 let mark=d.getElementById('nc77-unread-badge');
 if(!mark){mark=element('span','nc77-menu-unread');mark.id='nc77-unread-badge';mark.setAttribute('aria-hidden','true');toggle.append(mark);}
 mark.textContent=n>99?'99+':String(n);mark.hidden=n===0;
 const original=toggle.getAttribute('data-chat-label')||toggle.getAttribute('aria-label')||'Apri menu';
 toggle.setAttribute('data-chat-label',original);
 toggle.setAttribute('aria-label',original+(n?' · '+n+' messaggi da leggere':''));
}
function renderThreads(rows){
 const root=$('#nc77-body');if(!root||!layer||view!=='threads')return;
 const signature=JSON.stringify(rows.map(x=>[x.uid,x.nickname,x.last_kind,x.last_text,x.unread]));
 if(signature===lastInboxHash)return;
 lastInboxHash=signature;
 const previousScroll=root.scrollTop;
 root.replaceChildren();
 if(!rows.length)root.append(element('p','nc77-hint','Non hai ancora amici accettati. Cerca un nickname da ☰ → Amici e invia una richiesta.'));
 for(const row of rows){
  const stamp=row.last_kind==='voice'?'🎙️ Messaggio vocale':row.last_text||'Inizia una conversazione';
  root.append(entry(row.uid,row.nickname,stamp,row.unread));
 }
 root.scrollTop=previousScroll;
}
async function refreshInbox(){
 if(inboxPromise)return inboxPromise;
 if(d.hidden||Date.now()<blockedUntil)return;
 if(w.NCDesktop?.identity&&!w.NCDesktop.identity()?.uid)return;
 inboxBusy=true;
 inboxPromise=(async()=>{try{
  const r=await call('chatThreads');
  const rows=Array.isArray(r.threads)?r.threads:[];
  updateBadge(unreadCount(rows));
  if(layer&&view==='threads')renderThreads(rows);
 }catch(e){
  if(/accedi|401|non autenticat|sessione|firebase/i.test(e.message||''))blockedUntil=Date.now()+30000;
  if(layer&&view==='threads')status(e.message||'Chat temporaneamente non disponibile');
 }finally{inboxBusy=false;inboxPromise=null;}})();
 return inboxPromise;
}
function spinner(){resetView();const p=element('p','nc77-hint','Caricamento…');$('#nc77-body').append(p);}
function entry(uid,name,subtitle,unread){
 const row=element('button','nc77-thread');row.type='button';
 const avatar=element('span','nc77-avatar',(name||'?').slice(0,1).toUpperCase());
 const info=element('span','nc77-thread-info'),label=element('strong','',name||'Giocatore'),small=element('small','',subtitle||'Nessun messaggio');
 info.append(label,small);row.append(avatar,info);
 if(unread>0)row.append(element('span','nc77-unread',String(unread)));
 row.onclick=()=>openPeer(uid,name);return row;
}
async function threads(){
 if(!layer)return;
 chatGeneration++;
 stopMic(true);view='threads';peer='';messages=[];lastId='';lastInboxHash='';setHeader('Chat privata',false);spinner();
 $('#nc77-editor').hidden=true;status('');
 await refreshInbox();
}
function addMessage(m){
 if(!layer||view!=='conversation'||messages.some(x=>x.id===m.id))return;
 messages.push(m);
 if(!lastId||Number(m.id)>Number(lastId))lastId=m.id;
 const root=$('#nc77-body');
 if(!root)return;
 const bubble=element('div','nc77-bubble '+(m.sender===peer?'received':'sent'));
 const time=element('time','',new Date(m.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}));
 if(m.kind==='voice'){
  const play=element('button','nc77-play','▶️ Vocale · '+(m.duration||'?')+'s');play.type='button';
  play.onclick=async()=>{
   if(play.disabled)return;play.disabled=true;play.textContent='Caricamento vocale…';
   try{
    const result=await call('chatAudio',{id:m.id});const binary=atob(result.base64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([bytes],{type:result.mime}));
    playingUrls.add(url);
    const audio=new Audio(url);audio.onended=()=>{play.disabled=false;play.textContent='▶️ Riascolta · '+(m.duration||'?')+'s';playingUrls.delete(url);URL.revokeObjectURL(url);};
    audio.onerror=()=>{play.disabled=false;status('Impossibile riprodurre questo vocale.');playingUrls.delete(url);URL.revokeObjectURL(url);};
    await audio.play();
    play.textContent='🔊 In riproduzione…';
   }catch(e){play.disabled=false;play.textContent='▶️ Vocale · '+(m.duration||'?')+'s';status(e.message||'Audio non riproducibile');}
  };
  bubble.append(play);
 }else bubble.append(element('span','nc77-message-text',m.body||''));
 bubble.append(time);root.append(bubble);root.scrollTop=root.scrollHeight;
}
async function openPeer(uid,name){
 if(!uid)return;
 stopMic(true);closeAudioUrls();
 const epoch=++chatGeneration;
 peer=uid;peerName=name||'Amico';view='conversation';messages=[];lastId='';
 setHeader(peerName,true);spinner();$('#nc77-editor').hidden=false;
 status('');
 try{
  const r=await call('chatMessages',{peer});
  if(!layer||view!=='conversation'||peer!==uid||epoch!==chatGeneration)return;
  resetView();
  for(const m of r.messages||[])addMessage(m);
  await call('chatRead',{peer}).catch(()=>{});
 }catch(e){status(e.message);resetView();}
}
async function tick(){
 if(!layer||busy||reading)return;
 reading=true;
 try{
  if(view==='conversation'&&peer){
   const expected=peer,r=await call('chatMessages',{peer:expected,after:lastId});
   if(!layer||view!=='conversation'||peer!==expected)return;
   for(const m of r.messages||[])addMessage(m);
   if((r.messages||[]).some(m=>m.sender===peer))call('chatRead',{peer}).catch(()=>{});
  }else if(view==='threads'){
   await refreshInbox();
  }
 }catch(e){if(layer&&view==='conversation')status(e.message);}finally{reading=false;}
}
async function sendMessage(){
 if(!layer||!peer||busy)return;
 const inp=$('#nc77-text');const text=(inp?.value||'').trim();
 if(!text)return;
 if([...text].length>2000){status('Messaggio troppo lungo (max 2000 caratteri)');return;}
 busy=true;const send=$('#nc77-send');send.disabled=true;status('Invio messaggio…');
 try{const r=await call('chatSend',{peer,kind:'text',text});addMessage(r.message);inp.value='';status('');}
 catch(e){status(e.message);}finally{busy=false;if(send)send.disabled=false;}
}
async function recording(){
 if(!layer||!peer||busy)return;
 if(recorder&&recorder.state==='recording'){stopMic(false);return;}
 if(!w.MediaRecorder||!navigator.mediaDevices?.getUserMedia){status('La registrazione vocale non è supportata da questo Android WebView.');return;}
 const formats=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg','audio/aac'];
 const mime=formats.find(x=>w.MediaRecorder.isTypeSupported?.(x));
 if(!mime){status('Nessun formato audio compatibile con il dispositivo.');return;}
 try{
  mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  if(!layer||view!=='conversation'){stopMic(true);return;}
  recordCancel=false;
  recorder=new MediaRecorder(mic,{mimeType:mime,audioBitsPerSecond:24000});
  const chunks=[];recordStart=Date.now();
  const micButton=$('#nc77-mic');micButton.textContent='⏹️ Stop';micButton.setAttribute('aria-pressed','true');
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=()=>{status('Registrazione non riuscita.');stopMic(true);};
  recorder.onstop=async()=>{
   const canceled=recordCancel,duration=Math.min(60,Math.max(1,Math.ceil((Date.now()-recordStart)/1000)));
   const blob=new Blob(chunks,{type:mime});
   if(mic){mic.getTracks().forEach(t=>t.stop());mic=null;}
   clearTimeout(recordTimeout);recorder=null;
   if(micButton){micButton.textContent='🎙️';micButton.setAttribute('aria-pressed','false');}
   if(canceled||!layer||view!=='conversation')return;
   if(blob.size<100||blob.size>262144){status('Vocale troppo grande. Prova una registrazione più breve.');return;}
   busy=true;status('Invio vocale…');
   try{
    const buf=new Uint8Array(await blob.arrayBuffer());let raw='';
    for(let i=0;i<buf.length;i+=8192)raw+=String.fromCharCode(...buf.subarray(i,i+8192));
    const r=await call('chatSend',{peer,kind:'voice',base64:btoa(raw),mime:mime.split(';')[0],duration});
    addMessage(r.message);status('');
   }catch(e){status(e.message);}finally{busy=false;}
  };
  recorder.start(1000);status('🎙️ Registrazione in corso · tocca Stop per inviare');
  recordTimeout=setTimeout(()=>stopMic(false),60000);
 }catch(e){status('Microfono non disponibile: controlla il permesso Android.');stopMic(true);}
}
function emojiPicker(){
 const picker=$('#nc77-emoji');if(!picker)return;
 picker.hidden=!picker.hidden;
 if(!picker.childNodes.length){
  for(const glyph of EMOJI){const b=element('button','nc77-emoji-item',glyph);b.type='button';b.onclick=()=>{const input=$('#nc77-text');input.value=(input.value||'')+glyph;input.focus();picker.hidden=true};picker.append(b);}
 }
}
function open(uid,name){
 if(!layer){
  lastFocused=d.activeElement;
  layer=element('section','nc77-overlay');layer.id='nc77-overlay';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Chat privata');
  layer.innerHTML='<div class="nc77-sheet"><header class="nc77-head"><button type="button" id="nc77-back" hidden aria-label="Torna alle chat">‹</button><div class="nc77-head-info"><small>NAPOLI CARTE 3D · MESSAGGI</small><strong id="nc77-title">Chat privata</strong></div><button type="button" id="nc77-close" aria-label="Chiudi chat">×</button></header><div class="nc77-body" id="nc77-body"></div><p role="status" id="nc77-status" class="nc77-status"></p><section id="nc77-editor" class="nc77-editor" hidden><div id="nc77-emoji" class="nc77-emojis" hidden></div><div class="nc77-input-line"><button type="button" id="nc77-emoji-btn" aria-label="Emoji">😊</button><input id="nc77-text" maxlength="2000" aria-label="Messaggio" placeholder="Scrivi un messaggio…"><button type="button" id="nc77-mic" aria-pressed="false" aria-label="Registra vocale">🎙️</button><button type="button" id="nc77-send" aria-label="Invia messaggio">➤</button></div><small>Vocali max 60 secondi. Visibili soltanto agli amici accettati.</small></section></div>';
  d.body.append(layer);
  $('#nc77-close').onclick=close;
  $('#nc77-back').onclick=threads;
  $('#nc77-emoji-btn').onclick=emojiPicker;
  $('#nc77-mic').onclick=recording;
  $('#nc77-send').onclick=sendMessage;
  $('#nc77-text').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendMessage();}});
  layer.addEventListener('click',e=>{if(e.target===layer)close()});
  timer=setInterval(tick,ACTIVE_POLL_MS);
 }
 if(uid)openPeer(uid,name);else threads();
 return true;
}
function wake(){
 if(d.hidden)return;
 if(layer){if(view==='conversation')tick().catch(()=>{});else refreshInbox().catch(()=>{});}
 else refreshInbox().catch(()=>{});
}
function incomingPush(senderUid){
 if(d.hidden)return;
 if(layer&&view==='conversation'&&(!senderUid||senderUid===peer))tick().catch(()=>{});
 else refreshInbox().catch(()=>{});
}
d.addEventListener('visibilitychange',()=>{if(d.hidden)stopMic(true);else wake()});
w.addEventListener('focus',wake);
w.addEventListener('online',wake);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',wake,{once:true});else setTimeout(wake,150);
inboxTimer=setInterval(()=>{if(!layer)refreshInbox().catch(()=>{});},INBOX_POLL_MS);
w.NC77_CHAT={open,openPeer,close,isOpen:()=>!!layer,refresh:wake,onIncomingPush:incomingPush};
})(window,document);
