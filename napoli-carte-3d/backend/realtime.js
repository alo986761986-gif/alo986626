'use strict';
const crypto=require('node:crypto'),engine=require('./engine.js');
const TIME=()=>Date.now(),MAX_CHAT=80,MAX_SIGNAL=260;
function live(r){if(!r.live)r.live={chat:[],signals:[],chatSeq:0,signalSeq:0,voice:new Map(),limit:new Map()};return r.live;}
function session(token){
 if(typeof token!=='string'||!token||token.length>180)throw Error('Sessione non valida');
 for(const r of engine.rooms.values()){const seat=r.players.findIndex(p=>p.token===token&&!p.bot);
  if(seat>=0){r.updated=TIME();return {r,seat,p:r.players[seat],live:live(r)};}}
 throw Error('Sessione non valida. Rientra nella partita');
}
function limit(l,seat,kind,max,ms){
 const key=kind+':'+seat,n=TIME();let previous=(l.limit.get(key)||[]).filter(t=>n-t<ms);
 if(previous.length>=max)throw Error('Troppi messaggi: attendi un momento');
 previous.push(n);l.limit.set(key,previous);
}
function chat(token,text){
 const {r,seat,p,live:l}=session(token);
 if(r.status==='finished')throw Error('Chat chiusa: partita terminata');
 if(typeof text!=='string')throw Error('Messaggio non valido');
 const msg=text.replace(/[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f]/g,' ').replace(/\s+/g,' ').trim();
 if(!msg||[...msg].length>420)throw Error('Scrivi un messaggio da 1 a 420 caratteri');
 limit(l,seat,'chat-fast',3,3500);limit(l,seat,'chat-min',22,60000);
 const item={id:++l.chatSeq,from:seat,name:p.name,text:msg,at:TIME()};
 l.chat.push(item);if(l.chat.length>MAX_CHAT)l.chat.splice(0,l.chat.length-MAX_CHAT);
 return {ok:true,id:item.id};
}
function voice(token,enabled){
 const {r,seat,live:l}=session(token);const on=enabled===true;
 if(on&&r.status==='finished')throw Error('Partita terminata');
 if(on)l.voice.set(seat,TIME());else l.voice.delete(seat);
 return {ok:true,enabled:on};
}
function active(l,seat){const seen=l.voice.get(seat);return typeof seen==='number'&&TIME()-seen<28000;}
function cursor(v){const n=Number(v||0);if(!Number.isSafeInteger(n)||n<0)throw Error('Cursore non valido');return n;}
function poll(token,afterChat,afterSignal){
 const {r,seat,live:l}=session(token),c=cursor(afterChat),s=cursor(afterSignal);
 if(l.voice.has(seat))l.voice.set(seat,TIME());
 for(const [id,t] of l.voice)if(TIME()-t>28000)l.voice.delete(id);
 return {ok:true,roomId:r.id,seat,
  chat:l.chat.filter(m=>m.id>c),
  signals:l.signals.filter(m=>m.id>s&&m.to===seat).map(m=>({id:m.id,from:m.from,type:m.type,payload:m.payload})),
  chatSeq:l.chatSeq,signalSeq:l.signalSeq,
  voiceSeats:[...l.voice.keys()].filter(i=>i<r.players.length&&!r.players[i].bot),
  users:r.players.map((p,i)=>({seat:i,name:p.name,bot:p.bot})),status:r.status};
}
function signal(token,to,type,payload){
 const {r,seat,live:l}=session(token),dest=Number(to);
 if(!Number.isInteger(dest)||dest<0||dest===seat||dest>=r.players.length||r.players[dest].bot)throw Error('Destinatario voce non valido');
 if(!['offer','answer','candidate','hangup'].includes(type))throw Error('Segnale WebRTC non valido');
 if(type!=='hangup'&&(!active(l,seat)||!active(l,dest)))throw Error('Entrambi devono attivare il microfono');
 if(type==='hangup')payload=null;
 else if(typeof payload!=='string'||!payload||payload.length>(type==='candidate'?3200:15000))throw Error('Segnale WebRTC troppo lungo');
 limit(l,seat,'rtc',90,10000);
 const item={id:++l.signalSeq,to:dest,from:seat,type,payload,at:TIME()};
 l.signals.push(item);if(l.signals.length>MAX_SIGNAL)l.signals.splice(0,l.signals.length-MAX_SIGNAL);
 return {ok:true,id:item.id};
}
function rtcConfig(token){
 session(token);
 const iceServers=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
 const urls=(process.env.NC3D_TURN_URIS||'').split(',').map(x=>x.trim()).filter(x=>/^turns?:[^\s]+$/.test(x)).slice(0,4);
 if(urls.length&&process.env.NC3D_TURN_SECRET){
  const username=String(Math.floor(TIME()/1000)+3600)+':napoli';
  iceServers.push({urls,username,credential:crypto.createHmac('sha1',process.env.NC3D_TURN_SECRET).update(username).digest('base64')});
 }
 return {ok:true,iceServers,relayAvailable:iceServers.length>1};
}
module.exports={chat,voice,poll,signal,rtcConfig};
