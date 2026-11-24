/* Napoli Carte 3D 2.6 - voice relay and WebRTC fallback for six games */
(function(){'use strict';if(window.NC23_REALTIME_READY)return;window.NC23_REALTIME_READY=true;
const oldGame=window.drawGame,oldLobby=window.drawLobby,oldLeave=window.lobby;
let timer=null,busy=false,active='',room='',seat=-1,chatSeq=0,signalSeq=0,users=[],voiceSeats=[],mic=null,enabled=false,ice=[{urls:'stun:stun.l.google.com:19302'}],peers=new Map(),muted=new Set(),opened=false,unread=0;
const el=id=>document.getElementById(id);
const currentToken=()=>{try{return typeof token==='string'?token:''}catch(e){return ''}};
const online=()=>{try{return typeof mode==='string'&&mode==='online'}catch(e){return false}};
const ok=()=>online()&&!!active&&currentToken()===active;
const message=t=>{if(typeof window.toast==='function')window.toast(t);else console.warn(t)};
const api23=async(path,payload)=>{if(!ok())throw Error('Non sei nella partita online');const base=window.NC3D_OFFLINE?window.NC3D_SERVER_URL:'';const res=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({token:active},payload||{})),cache:'no-store'});const data=await res.json();if(!res.ok||data.error)throw Error(data.error||'Errore di rete');return data};
function mount(){if(el('nc23-live'))return;
 const host=document.createElement('section');host.id='nc23-live';host.className='nc23-live';host.setAttribute('aria-label','Chat e microfono della partita');host.innerHTML=
 '<div class="nc23-fab"><button type="button" id="nc23-toggle-chat" class="nc23-pill" aria-expanded="false" aria-controls="nc23-chat-panel">💬 Chat <span id="nc23-unread" hidden></span></button><button type="button" id="nc23-toggle-mic" class="nc23-pill nc23-mic-off" aria-pressed="false">🎙️ Attiva microfono</button></div>'+
 '<div class="nc23-chat-panel" id="nc23-chat-panel" hidden><div class="nc23-head"><div><strong>💬 Chat della partita</strong><small>Solo i giocatori al tavolo</small></div><button type="button" id="nc23-chat-close" aria-label="Chiudi chat">×</button></div>'+
 '<div class="nc23-chat-list" id="nc23-chat-list" role="log" aria-live="polite"></div><form id="nc23-chat-form" class="nc23-chat-form"><input id="nc23-chat-input" type="text" maxlength="420" autocomplete="off" placeholder="Scrivi un messaggio…" aria-label="Messaggio" required><button type="submit">Invia</button></form>'+
 '<div class="nc23-help"><span id="nc23-voice-state">🎙️ Microfono spento</span><div id="nc23-peer-mutes"></div></div></div>';
 const root=document.getElementById('root');
 if(root&&root.parentNode)root.parentNode.insertBefore(host,root);
 else document.body.appendChild(host);
 el('nc23-toggle-chat').onclick=()=>toggle(!opened);
 el('nc23-chat-close').onclick=()=>toggle(false);
 el('nc23-toggle-mic').onclick=()=>enabled?disableMic():enableMic();
 el('nc23-chat-form').onsubmit=async event=>{event.preventDefault();const input=el('nc23-chat-input'),text=input.value.trim();if(!text)return;const btn=event.currentTarget.querySelector('button');btn.disabled=true;try{await api23('chat',{text});input.value='';await poll()}catch(e){message(e.message)}finally{btn.disabled=false;input.focus()}};
}
function toggle(on){mount();opened=on;el('nc23-chat-panel').hidden=!on;el('nc23-toggle-chat').setAttribute('aria-expanded',String(on));if(on){unread=0;badge();el('nc23-chat-input').focus()}}
function badge(){const b=el('nc23-unread');if(b){b.hidden=unread===0;b.textContent=unread>99?'99+':String(unread)}}
function append(m){const list=el('nc23-chat-list');if(!list||typeof m.text!=='string')return;const own=m.from===seat,box=document.createElement('article');box.className='nc23-message'+(own?' nc23-own':'');const meta=document.createElement('div');meta.className='nc23-message-meta';const name=document.createElement('strong');name.textContent=own?'Tu':(users.find(u=>u.seat===m.from)||{}).name||'Giocatore';const when=document.createElement('time');when.textContent=new Date(m.at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});meta.append(name,when);const p=document.createElement('p');p.textContent=m.text;box.append(meta,p);list.append(box);while(list.childElementCount>75)list.firstChild.remove();list.scrollTop=list.scrollHeight;if(!own&&!opened){unread++;badge()}}
function status(text){const elStatus=el('nc23-voice-state');if(elStatus)elStatus.textContent=text}
function updatePeersUI(){const host=el('nc23-peer-mutes');if(!host)return;host.replaceChildren();if(!enabled)return;for(const [id,x] of peers){const b=document.createElement('button');b.type='button';b.className='nc23-mute-remote';b.textContent=(muted.has(id)?'🔇':'🔊')+' Giocatore '+(id+1);b.setAttribute('aria-pressed',String(muted.has(id)));b.onclick=()=>{if(muted.has(id))muted.delete(id);else muted.add(id);if(x.audio)x.audio.muted=muted.has(id);updatePeersUI()};host.appendChild(b)}}
function removePeer(id){const x=peers.get(id);if(!x)return;peers.delete(id);try{x.pc.onicecandidate=null;x.pc.ontrack=null;x.pc.close()}catch(e){}if(x.audio){x.audio.srcObject=null;x.audio.remove()}updatePeersUI()}
function clean(){if(window.NC26_AUDIO_RELAY)try{window.NC26_AUDIO_RELAY.stop()}catch(e){}for(const id of [...peers.keys()])removePeer(id);if(mic){for(const track of mic.getTracks())track.stop();mic=null}enabled=false;voiceSeats=[];const b=el('nc23-toggle-mic');if(b){b.textContent='🎙️ Attiva microfono';b.setAttribute('aria-pressed','false');b.classList.remove('nc23-mic-on');b.classList.add('nc23-mic-off')}status('🎙️ Microfono spento')}
async function disableMic(){if(!enabled)return;try{await api23('voice',{enabled:false})}catch(e){}clean()}
async function enableMic(){if(!ok())return message('Entra prima in una partita online');if(!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection!=='function')return message('Microfono/WebRTC non disponibile. Aggiorna Android System WebView.');if(window.NC26_AUDIO_RELAY)window.NC26_AUDIO_RELAY.prime();const b=el('nc23-toggle-mic');b.disabled=true;try{
 // Minimal microphone capture first: complex DSP constraints can break Android WebView.
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false})}
 catch(first){
  if(!['NotReadableError','TrackStartError','AbortError'].includes(first.name))throw first;
  await new Promise(resolve=>setTimeout(resolve,400));
  if(!ok())return;
  stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
 }
 mic=stream;
 try{
  const track=mic.getAudioTracks()[0];
  if(track&&typeof track.applyConstraints==='function')
   await track.applyConstraints({echoCancellation:true,noiseSuppression:true,autoGainControl:true});
 }catch(e){console.info('Optional audio enhancements unavailable');}
 if(!ok()){clean();return}
 const cfg=await api23('rtc-config',{});ice=cfg.iceServers||ice;await api23('voice',{enabled:true});enabled=true;mic.getTracks().forEach(t=>t.addEventListener('ended',()=>{if(enabled)disableMic()}));b.textContent='🎙️ Microfono ON';b.setAttribute('aria-pressed','true');b.classList.add('nc23-mic-on');b.classList.remove('nc23-mic-off');if(window.NC26_AUDIO_RELAY){const ready=await window.NC26_AUDIO_RELAY.start(mic,{token:active,room,seat,onStatus:status,isMuted:id=>muted.has(id)});if(ready){for(const id of [...peers.keys()])removePeer(id)}}
 status(window.NC26_AUDIO_RELAY&&window.NC26_AUDIO_RELAY.isReady()?'🟢 Audio via server collegato':'🎙️ Microfono acceso · Provo collegamento diretto');await poll();
 }catch(e){clean();const name=e&&e.name||'';
 const reason=(name==='NotAllowedError'||name==='PermissionDeniedError')
  ?'Microfono non autorizzato: attiva il permesso Microfono nelle impostazioni Android.'
  :(['NotReadableError','TrackStartError','AbortError'].includes(name)||/Could not start audio/i.test(e.message||''))
  ?'Il microfono non si avvia: chiudi altre app che lo usano, controlla il permesso e aggiorna Android System WebView.'
  :(e.message||'Microfono non disponibile');status('⚠️ '+reason);message(reason)}finally{b.disabled=false}}
function makePeer(id){if(!enabled||!mic)return null;let x=peers.get(id);if(x)return x;const pc=new RTCPeerConnection({iceServers:ice});const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');audio.muted=muted.has(id);audio.className='nc23-remote-audio';document.body.appendChild(audio);x={pc,audio,candidates:[],offered:false};peers.set(id,x);for(const t of mic.getAudioTracks())pc.addTrack(t,mic);
 pc.onicecandidate=e=>{if(e.candidate)api23('signal',{to:id,type:'candidate',payload:JSON.stringify(e.candidate.toJSON?e.candidate.toJSON():e.candidate)}).catch(()=>{})};
 pc.ontrack=e=>{const stream=e.streams?.[0];if(stream)audio.srcObject=stream;else{const media=new MediaStream();media.addTrack(e.track);audio.srcObject=media}audio.play().catch(()=>status('🔊 Tocca Microfono per autorizzare la riproduzione'))};
 pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')status('🟢 Voce collegata al giocatore '+(id+1));if(pc.connectionState==='failed'){status('⚠️ Connessione vocale fallita. Può servire un server TURN');removePeer(id)}};
 updatePeersUI();return x}
async function offer(id){if(!enabled||seat>=id||!voiceSeats.includes(id))return;const x=makePeer(id);if(!x||x.offered)return;x.offered=true;try{const o=await x.pc.createOffer();await x.pc.setLocalDescription(o);await api23('signal',{to:id,type:'offer',payload:JSON.stringify(x.pc.localDescription)})}catch(e){removePeer(id);status('⚠️ Collegamento audio: '+e.message)}}
async function flush(x){if(!x.pc.remoteDescription)return;while(x.candidates.length){try{await x.pc.addIceCandidate(x.candidates.shift())}catch(e){}}}
async function receive(s){if(!enabled||s.from===seat||!voiceSeats.includes(s.from))return;if(s.type==='hangup'){removePeer(s.from);return}const x=makePeer(s.from);if(!x)return;try{const obj=JSON.parse(s.payload);
 if(s.type==='offer'){if(s.from<seat&&x.pc.signalingState==='stable'){await x.pc.setRemoteDescription(new RTCSessionDescription(obj));await flush(x);const answer=await x.pc.createAnswer();await x.pc.setLocalDescription(answer);await api23('signal',{to:s.from,type:'answer',payload:JSON.stringify(x.pc.localDescription)})}}
 else if(s.type==='answer'&&x.pc.signalingState==='have-local-offer'){await x.pc.setRemoteDescription(new RTCSessionDescription(obj));await flush(x)}
 else if(s.type==='candidate'){const candidate=new RTCIceCandidate(obj);if(x.pc.remoteDescription)await x.pc.addIceCandidate(candidate);else x.candidates.push(candidate)}
 }catch(e){console.warn('WebRTC',e.message)}}
async function poll(){if(!ok()||busy||!room)return;busy=true;try{const d=await api23('realtime',{afterChat:chatSeq,afterSignal:signalSeq});if(!ok()||d.roomId!==room)return;seat=d.seat;users=d.users||[];for(const m of d.chat||[])if(m.id>chatSeq)append(m);chatSeq=Math.max(chatSeq,Number(d.chatSeq)||0);signalSeq=Math.max(signalSeq,Number(d.signalSeq)||0);voiceSeats=d.voiceSeats||[];
 if(enabled){const viaRelay=!!(window.NC26_AUDIO_RELAY&&window.NC26_AUDIO_RELAY.isReady());if(viaRelay){for(const id of [...peers.keys()])removePeer(id)}else{for(const id of [...peers.keys()])if(!voiceSeats.includes(id))removePeer(id);for(const msg of d.signals||[])await receive(msg);for(const id of voiceSeats)if(id>seat&&!peers.has(id))await offer(id)}if(voiceSeats.length===1&&voiceSeats[0]===seat)status(viaRelay?'🟢 Audio pronto · In attesa degli altri':'🎙️ Microfono acceso · In attesa degli altri')}
 }catch(e){if(enabled)status('⚠️ Connessione audio in verifica')}finally{busy=false}}
function stop(){if(active){if(enabled)api23('voice',{enabled:false}).catch(()=>{});clean();active='';room=''}clearInterval(timer);timer=null;opened=false;const host=el('nc23-live');if(host){host.hidden=true;const panel=el('nc23-chat-panel');if(panel)panel.hidden=true}}
function start(s){if(!online()||!currentToken())return stop();mount();if(active!==currentToken()){stop();active=currentToken();chatSeq=0;signalSeq=0;unread=0;badge();el('nc23-chat-list').replaceChildren()}room=s.roomId;seat=s.seat;el('nc23-live').hidden=false;if(!timer)timer=setInterval(poll,1300);poll()}
window.drawGame=function(s){const r=oldGame.apply(this,arguments);if(s&&s.roomId&&online())start(s);return r};
window.drawLobby=function(){stop();return oldLobby.apply(this,arguments)};
window.lobby=function(){stop();return oldLeave.apply(this,arguments)};
window.NC23_CLOSE_CHAT=function(){if(opened){toggle(false);return true}return false};
window.NC23_DISABLE_VOICE=disableMic;
window.addEventListener('pagehide',stop);
})();