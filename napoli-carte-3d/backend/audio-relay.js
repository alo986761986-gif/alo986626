'use strict';
const crypto=require('node:crypto');
const {URL}=require('node:url');
const engine=require('./engine.js');
const connections=new Set();
let accepted=0,frames=0;
function findSession(token){
 if(typeof token!=='string'||token.length<8||token.length>180)return null;
 for(const room of engine.rooms.values()){
  const seat=room.players.findIndex(p=>!p.bot&&p.token===token);
  if(seat!==-1&&room.status==='playing')return {room,seat,token};
 }
 return null;
}
function voiceAllowed(s){
 if(!s||!s.room||!s.token)return false;
 const again=findSession(s.token);
 return !!(again&&again.room===s.room&&again.seat===s.seat&&s.room.live&&s.room.live.voice&&s.room.live.voice.has(s.seat)&&Date.now()-s.room.live.voice.get(s.seat)<30000);
}
function writeFrame(socket,opcode,payload){
 if(!socket||socket.destroyed||socket.writableLength>200000)return false;
 const bytes=Buffer.isBuffer(payload)?payload:Buffer.from(payload||'');
 if(bytes.length>65000)return false;
 const head=bytes.length<126?Buffer.alloc(2):Buffer.alloc(4);
 head[0]=0x80|(opcode&15);
 if(bytes.length<126)head[1]=bytes.length;
 else{head[1]=126;head.writeUInt16BE(bytes.length,2)}
 try{socket.write(Buffer.concat([head,bytes]));return true}catch(e){return false}
}
function sendJson(s,obj){return writeFrame(s.socket,1,Buffer.from(JSON.stringify(obj)))}
function close(s){
 if(s.closed)return;s.closed=true;connections.delete(s);
 try{s.socket.destroy()}catch(e){}
}
function handleMessage(s,opcode,payload){
 if(opcode===8)return close(s);
 if(opcode===9){writeFrame(s.socket,10,payload);return}
 if(opcode===10)return;
 if(!s.token){
  if(opcode!==1||payload.length>360)return close(s);
  let msg;try{msg=JSON.parse(payload.toString('utf8'))}catch(e){return close(s)}
  if(msg.type!=='auth')return close(s);
  const auth=findSession(msg.token);
  if(!auth)return close(s);
  Object.assign(s,auth);accepted++;
  sendJson(s,{type:'ready',seat:s.seat,roomId:s.room.id,transport:'pcm16-wss',sampleRate:16000});
  return;
 }
 if(opcode===1){
  if(payload.length>100||payload.toString('utf8')!=='ping')return close(s);
  sendJson(s,{type:'pong'});return;
 }
 if(opcode!==2||payload.length<2||payload.length>8192||payload.length%2!==0)return close(s);
 if(!voiceAllowed(s)){sendJson(s,{type:'error',message:'Sessione vocale non autorizzata'});return}
 const now=Date.now();
 if(now-s.bucketTime>1000){s.bucketTime=now;s.bucketFrames=0}
 if(++s.bucketFrames>36)return close(s);
 const audio=Buffer.allocUnsafe(payload.length+1);audio[0]=s.seat;payload.copy(audio,1);
 for(const other of connections){
  if(other===s||other.room!==s.room||!voiceAllowed(other))continue;
  if(writeFrame(other.socket,2,audio))frames++;
 }
}
function onData(s,buf){
 s.pending=Buffer.concat([s.pending,buf]);if(s.pending.length>30000)return close(s);
 while(s.pending.length>=2&&!s.closed){
  const b0=s.pending[0],b1=s.pending[1],opcode=b0&15;
  if(!(b0&0x80)||!(b1&0x80))return close(s);
  let len=b1&127,head=2;
  if(len===126){if(s.pending.length<4)return;len=s.pending.readUInt16BE(2);head=4}
  else if(len===127)return close(s);
  if(len>8192)return close(s);
  const full=head+4+len;if(s.pending.length<full)return;
  const mask=s.pending.subarray(head,head+4),payload=Buffer.from(s.pending.subarray(head+4,full));
  for(let i=0;i<payload.length;i++)payload[i]^=mask[i&3];
  s.pending=s.pending.subarray(full);
  handleMessage(s,opcode,payload);
 }
}
function originAllowed(origin,host){
 if(!origin)return false;
 try{const url=new URL(origin);
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return false;
  return url.hostname==='appassets.androidplatform.net'||url.host===host||['localhost','127.0.0.1'].includes(url.hostname);
 }catch(e){return false}
}
function attach(server){
 server.on('upgrade',(req,socket,head)=>{
  try{
   const host=req.headers.host||'';
   if(req.url!=='/ws/audio'||!originAllowed(req.headers.origin,host)||String(req.headers.upgrade||'').toLowerCase()!=='websocket'||String(req.headers['sec-websocket-version'])!=='13')return socket.destroy();
   const key=String(req.headers['sec-websocket-key']||'');
   if(!/^[A-Za-z0-9+/]{22}==$/.test(key))return socket.destroy();
   const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
   socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
   socket.setNoDelay(true);
   const s={socket,token:'',room:null,seat:-1,pending:Buffer.alloc(0),closed:false,bucketTime:Date.now(),bucketFrames:0};
   connections.add(s);
   socket.on('data',part=>onData(s,part));
   socket.on('error',()=>close(s));socket.on('close',()=>close(s));
   if(head&&head.length)onData(s,head);
   const init=setTimeout(()=>{if(!s.token)close(s)},10000);init.unref();
  }catch(e){socket.destroy()}
 });
}
function stats(){return {openSockets:connections.size,authenticated:accepted,audioFramesForwarded:frames}}
module.exports={attach,stats};
