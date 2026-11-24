/* Napoli Carte 3D v2.6: private bidirectional voice relay (PCM16 over WSS).
   The game server forwards audio only to authenticated players in the same table. */
(function(){'use strict';if(window.NC26_AUDIO_RELAY)return;
const Audio=window.AudioContext||window.webkitAudioContext;
let ctx=null,ws=null,processor=null,source=null,silent=null;
let mic=null,token='',roomId='',seat=-1,sent=0,received=0,connected=false,closing=false,retries=0,lastError='',readyFn=null,readyTimeout=null,reconnectTimer=null;
const peers=new Map();
let statusFn=()=>{},isMuted=()=>false;
function state(){return {ready:connected,sent,received,peers:[...peers.keys()],roomId,seat,lastError,retries,context:ctx?ctx.state:'none',micTracks:mic?mic.getAudioTracks().map(t=>({enabled:t.enabled,state:t.readyState})):[]}}
function prime(){
 if(!Audio)return false;
 try{if(!ctx||ctx.state==='closed')ctx=new Audio();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return true;
 }catch(e){lastError=e.message;return false}
}
function downsample(floats,rate){
 const samples=Math.ceil(floats.length*16000/rate),output=new Int16Array(samples);
 for(let i=0;i<samples;i++){
  let start=Math.floor(i*rate/16000),end=Math.min(floats.length,Math.ceil((i+1)*rate/16000));
  let sum=0,count=0;for(let j=start;j<end;j++){sum+=floats[j];count++}
  let v=Math.min(1,Math.max(-1,count?sum/count:0));output[i]=Math.round(v<0?v*32768:v*32767);
 }
 return output;
}
function attachMic(){
 if(!mic||!connected||!prime())return false;
 if(processor)return true;
 let input=mic;
 try{const hooks=window.NC25_VOICE_HOOKS;
   if(hooks&&typeof hooks.getOutbound==='function'){const p=hooks.getOutbound();if(p&&p.getAudioTracks().some(t=>t.readyState==='live'))input=p}
 }catch(e){}
 try{
  source=ctx.createMediaStreamSource(input);
  processor=ctx.createScriptProcessor(2048,1,1);
  silent=ctx.createGain();silent.gain.value=0;
  source.connect(processor);processor.connect(silent);silent.connect(ctx.destination);
  processor.onaudioprocess=evt=>{
   if(!connected||!ws||ws.readyState!==WebSocket.OPEN||ws.bufferedAmount>80000)return;
   const pcm=downsample(evt.inputBuffer.getChannelData(0),ctx.sampleRate);
   if(pcm.length){try{ws.send(pcm.buffer);sent++}catch(e){lastError=e.message}}
  };
  return true;
 }catch(e){lastError=e.message;statusFn('⚠️ Acquisizione audio non disponibile: '+e.message);detachMic();return false}
}
function detachMic(){
 if(processor){processor.onaudioprocess=null;try{processor.disconnect()}catch(e){}processor=null}
 if(source){try{source.disconnect()}catch(e){}source=null}
 if(silent){try{silent.disconnect()}catch(e){}silent=null}
}
function cleanupPeers(){for(const p of peers.values()){try{p.gain.disconnect()}catch(e){}}peers.clear()}
function hear(frame){
 if(!(frame instanceof ArrayBuffer)||frame.byteLength<3||frame.byteLength%2!==1||!ctx)return;
 const bytes=new Uint8Array(frame),remote=bytes[0];
 if(remote===seat||remote>3||isMuted(remote))return;
 const length=(frame.byteLength-1)/2;if(length>4096)return;
 let p=peers.get(remote);
 if(!p){const gain=ctx.createGain();gain.connect(ctx.destination);p={gain,nextTime:0};peers.set(remote,p)}
 const floats=new Float32Array(length);
 for(let i=0;i<length;i++){let raw=bytes[1+i*2]|(bytes[2+i*2]<<8);if(raw>=32768)raw-=65536;floats[i]=raw/32768}
 try{
  const hooks=window.NC25_VOICE_HOOKS;
  const settings=hooks&&typeof hooks.getStatus==='function'?hooks.getStatus():null;
  p.gain.gain.value=(settings&&typeof settings.outputVolume==='number')?settings.outputVolume:1;
  const b=ctx.createBuffer(1,length,16000);b.copyToChannel(floats,0);
  const src=ctx.createBufferSource();src.buffer=b;src.connect(p.gain);
  let now=ctx.currentTime;
  if(!p.nextTime||p.nextTime<now+0.02||p.nextTime>now+0.30)p.nextTime=now+0.095;
  src.start(p.nextTime);p.nextTime+=length/16000;
  src.onended=()=>{try{src.disconnect()}catch(e){}};
  received++;
 }catch(e){lastError=e.message}
}
function wsUrl(){const configured=window.NC3D_SERVER_URL||location.origin;
 const parsed=new URL(configured,location.href);
 if(!['https:','http:'].includes(parsed.protocol))throw Error('Indirizzo server non valido');
 return (parsed.protocol==='https:'?'wss:':'ws:')+'//'+parsed.host+'/ws/audio';
}
function resetConnection(){connected=false;detachMic();cleanupPeers();if(readyFn){readyFn(false);readyFn=null}if(readyTimeout){clearTimeout(readyTimeout);readyTimeout=null}}
function connect(){
 if(closing||!token||!mic)return;
 let socket;try{socket=new WebSocket(wsUrl());socket.binaryType='arraybuffer'}catch(e){lastError=e.message;resetConnection();return}
 ws=socket;
 const timeout=setTimeout(()=>{if(ws===socket&&!connected)try{socket.close()}catch(e){}},6500);
 socket.onopen=()=>{if(ws!==socket)return;try{socket.send(JSON.stringify({type:'auth',token}))}catch(e){lastError=e.message;socket.close()}};
 socket.onmessage=evt=>{
  if(ws!==socket)return;
  if(typeof evt.data==='string'){
   let obj;try{obj=JSON.parse(evt.data)}catch(e){return}
   if(obj.type==='ready'&&obj.roomId===roomId&&obj.seat===seat){
    clearTimeout(timeout);connected=true;retries=0;lastError='';
    if(!attachMic()){try{socket.close()}catch(e){}return;}statusFn('🟢 Voce collegata tramite server · Audio bidirezionale');
    if(readyFn){readyFn(true);readyFn=null}if(readyTimeout){clearTimeout(readyTimeout);readyTimeout=null}
   }else if(obj.type==='error'){lastError=obj.message;statusFn('⚠️ '+lastError)}
  }else hear(evt.data);
 };
 socket.onerror=()=>{lastError='Rete audio non disponibile'};
 socket.onclose=()=>{
  clearTimeout(timeout);if(ws!==socket)return;ws=null;
  resetConnection();
  if(!closing&&mic&&token){
   statusFn('⚠️ Riconnessione audio in corso…');retries++;
   if(reconnectTimer)clearTimeout(reconnectTimer);
   reconnectTimer=setTimeout(connect,Math.min(6000,700*Math.pow(1.5,Math.min(6,retries))));
  }
 };
}
function start(stream,opts){
 stop();closing=false;mic=stream;token=opts.token;seat=opts.seat;roomId=opts.room;
 statusFn=opts.onStatus||(()=>{});isMuted=opts.isMuted||(()=>false);
 if(!Audio||typeof WebSocket==='undefined'||!prime())return Promise.resolve(false);
 if(!mic||!mic.getAudioTracks||!mic.getAudioTracks().length)return Promise.resolve(false);
 return new Promise(resolve=>{
  readyFn=resolve;readyTimeout=setTimeout(()=>{if(readyFn){readyFn(false);readyFn=null}},5000);
  connect();
 });
}
function stop(){closing=true;resetConnection();if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null}
 if(ws){const s=ws;ws=null;try{s.close()}catch(e){}}mic=null;token='';roomId='';seat=-1;statusFn=()=>{};
}
window.NC26_AUDIO_RELAY={start,prime,stop,isReady:()=>connected,state};
})();