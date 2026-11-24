/* Napoli Carte 3D v2.5 - optional clarity, mic level, mute and push-to-talk. */
(function(){'use strict';
 if(window.NC25_VOICE_HOOKS)return;
 const $=id=>document.getElementById(id);
 const read=(key,def)=>{try{return localStorage.getItem(key)||def}catch(e){return def}};
 const save=(key,val)=>{try{localStorage.setItem(key,String(val))}catch(e){}};
 const volMin=.6,volMax=1.55;
 let inputGain=Math.min(volMax,Math.max(volMin,parseFloat(read('nc25_input_gain','1.12'))||1.12));
 let outputVolume=Math.min(1,Math.max(.15,parseFloat(read('nc25_output_volume','1'))||1));
 let ptt=false,softMuted=false,holding=false,enabled=false; // v2.6: always enter with talk enabled; PTT must be selected explicitly each session
 let ctx=null,input=null,highpass=null,gain=null,compressor=null,analyser=null,output=null,raw=null,processed=null,meterTimer=null;
 function active(){try{return !!(window.NC23_DEBUG_STATE&&window.NC23_DEBUG_STATE().voiceEnabled)}catch(e){return false}}
 function updateControls(){
   const muted=softMuted||ptt&&!holding;
   const mute=$('nc25-mute');if(mute){mute.textContent=muted?'Riattiva voce':'Silenzia la mia voce';mute.setAttribute('aria-pressed',String(muted))}
   const pttBtn=$('nc25-ptt');if(pttBtn){pttBtn.hidden=!ptt;pttBtn.classList.toggle('nc25-ptt-enabled',ptt);pttBtn.classList.toggle('nc25-ptt-holding',holding)}const modeBtn=$('nc25-ptt-mode');if(modeBtn){modeBtn.textContent=ptt?'Premi per parlare: ON':'Premi per parlare: OFF';modeBtn.setAttribute('aria-pressed',String(ptt))}
   const activeStatus=$('nc25-mic-state');if(activeStatus)activeStatus.textContent=!active()?'Microfono spento':muted?'In silenzio':'Voce in trasmissione';
 }
 function applyMute(){
   const blocked=softMuted||(ptt&&!holding);
   if(raw)raw.getAudioTracks().forEach(t=>{if(t.readyState==='live')t.enabled=!blocked});
   updateControls();
 }
 function meter(){
  const track=raw&&raw.getAudioTracks()[0],meterEl=$('nc25-meter-fill');if(!meterEl)return;
  if(!track||!enabled||track.readyState!=='live'||!analyser){meterEl.style.width='0%';return}
  const buf=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(buf);
  let sum=0;for(let i=0;i<buf.length;i++)sum+=buf[i]*buf[i];
  const rms=Math.sqrt(sum/buf.length),level=Math.round(Math.min(100,Math.max(2,rms*280)));
  meterEl.style.width=level+'%';meterEl.style.background=level>75?'linear-gradient(90deg,#64df99,#f1be64)':'linear-gradient(90deg,#429c81,#a8f4b0)';
 }
 async function setup(stream){
  cleanup();raw=stream;
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A||!stream||!stream.getAudioTracks().length)return null;
  try{
   ctx=new A();input=ctx.createMediaStreamSource(stream);
   highpass=ctx.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=88;highpass.Q.value=.68;
   gain=ctx.createGain();gain.gain.value=inputGain;
   compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=3.2;compressor.attack.value=.009;compressor.release.value=.19;
   analyser=ctx.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.84;
   output=ctx.createMediaStreamDestination();
   input.connect(highpass);highpass.connect(gain);gain.connect(compressor);compressor.connect(output);
   input.connect(analyser);
   if(ctx.state==='suspended')await ctx.resume();
   if(ctx.state!=='running'||!output.stream.getAudioTracks().length){cleanupGraph();return null}
   processed=output.stream;return processed;
  }catch(err){console.info('Filtro voce non disponibile, uso microfono standard:',err.message);cleanupGraph();return null}
 }
 function cleanupGraph(){
   if(processed){for(const t of processed.getTracks())try{t.stop()}catch(e){}}processed=null;
   for(const node of [input,highpass,gain,compressor,analyser,output])if(node)try{node.disconnect()}catch(e){}
   input=highpass=gain=compressor=analyser=output=null;
   if(ctx){try{ctx.close()}catch(e){}}ctx=null;
 }
 function cleanup(){
  enabled=false;holding=false;softMuted=false;
  if(meterTimer){clearInterval(meterTimer);meterTimer=null}
  cleanupGraph();raw=null;
  const level=$('nc25-meter-fill');if(level)level.style.width='0%';updateControls();
 }
 function onEnabled(){enabled=true;softMuted=false;holding=false;applyMute();if(meterTimer)clearInterval(meterTimer);meterTimer=setInterval(meter,165);updateControls()}
 function onRemote(audio){if(audio)audio.volume=outputVolume}
 function install(){const help=document.querySelector('.nc23-help');if(!help||$('nc25-voice-tools'))return;
  const tools=document.createElement('div');tools.id='nc25-voice-tools';tools.className='nc25-voice-tools';tools.innerHTML=`<div class="nc25-mic-head"><strong>Audio PRO</strong><span id="nc25-mic-state">Microfono spento</span></div>
   <div class="nc25-meter" role="meter" aria-label="Livello microfono"><span id="nc25-meter-fill"></span></div>
   <label class="nc25-label" for="nc25-gain">Sensibilit\u00e0 del microfono <output id="nc25-gain-label"></output></label>
   <input class="nc25-range" id="nc25-gain" type="range" min="60" max="155" step="5" value="${Math.round(inputGain*100)}">
   <label class="nc25-label" for="nc25-output">Volume degli avversari <output id="nc25-output-label"></output></label>
   <input class="nc25-range" id="nc25-output" type="range" min="15" max="100" step="5" value="${Math.round(outputVolume*100)}">
   <div class="nc25-buttons"><button type="button" id="nc25-mute" aria-pressed="false">Silenzia la mia voce</button><button type="button" id="nc25-ptt-mode" aria-pressed="false">Premi per parlare: OFF</button></div>
   <button type="button" id="nc25-ptt" class="nc25-ptt-hold" hidden>TIENI PREMUTO PER PARLARE</button>
   <small class="nc25-audio-note">Riduzione eco, filtro bassi e compressore quando supportati dal dispositivo. Usa cuffie per evitare rientri audio.</small>`;
  help.appendChild(tools);
  const gainSlider=$('nc25-gain'),gainLabel=$('nc25-gain-label'),outSlider=$('nc25-output'),outLabel=$('nc25-output-label');
  const refresh=()=>{gainLabel.textContent=Math.round(inputGain*100)+'%';outLabel.textContent=Math.round(outputVolume*100)+'%';updateControls()};
  gainSlider.addEventListener('input',()=>{inputGain=Number(gainSlider.value)/100;save('nc25_input_gain',inputGain);if(gain)gain.gain.setTargetAtTime(inputGain,ctx.currentTime,.045);refresh()});
  outSlider.addEventListener('input',()=>{outputVolume=Number(outSlider.value)/100;save('nc25_output_volume',outputVolume);document.querySelectorAll('audio.nc23-remote-audio').forEach(a=>a.volume=outputVolume);refresh()});
  $('nc25-mute').addEventListener('click',()=>{softMuted=!softMuted;applyMute()});
  $('nc25-ptt-mode').addEventListener('click',()=>{ptt=!ptt;holding=false;save('nc25_ptt',ptt?'on':'off');applyMute()});
  const button=$('nc25-ptt');
  button.addEventListener('pointerdown',e=>{if(!ptt||!enabled)return;holding=true;applyMute();try{button.setPointerCapture(e.pointerId)}catch(err){}});
  const release=()=>{if(ptt&&holding){holding=false;applyMute()}};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('keydown',e=>{if(!ptt||!enabled||![' ','Enter'].includes(e.key))return;e.preventDefault();holding=true;applyMute()});
  button.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){holding=false;applyMute()}});
  window.addEventListener('blur',release);
  refresh();
 }
 const previous=window.drawGame;
 if(typeof previous==='function')window.drawGame=function(s){const result=previous.apply(this,arguments);install();return result};
 // A server may join while the game is already loaded from a saved session.
 if(document.querySelector('.nc23-help'))install();
 window.NC25_VOICE_HOOKS={setup,getOutbound:()=>processed,onEnabled,stop:cleanup,onRemote,install,getStatus:()=>({processing:!!processed,ptt,muted:softMuted||ptt&&!holding,inputGain,outputVolume,enabled})};
})();
