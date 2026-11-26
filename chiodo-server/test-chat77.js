'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const chat=require('./chat77.js');
const text='Ciao 😄';
assert.equal(chat.textMessage('  '+text+' '),text);
assert.throws(()=>chat.textMessage(''),/Messaggio/);
assert.throws(()=>chat.textMessage('x'.repeat(2001)),/2000/);
const base64=Buffer.alloc(256,42).toString('base64');
assert.equal(chat.parseAudio(base64,'audio/webm;codecs=opus',12).bytes.length,256);
assert.throws(()=>chat.parseAudio(base64,'text/plain',12),/Formato/);
assert.throws(()=>chat.parseAudio(base64,'audio/webm',61),/Durata/);
assert.throws(()=>chat.parseAudio(Buffer.alloc(262145).toString('base64'),'audio/webm',10),/grande/);
function getPort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});}
(async()=>{
 const port=await getPort(),proc=spawn(process.execPath,['chiodo-server/http.js'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
 try{
  const base='http://127.0.0.1:'+port;
  async function request(path,options){const res=await fetch(base+path,options);return{status:res.status,json:await res.json()};}
  let ready=false;
  for(let i=0;i<50;i++){try{if((await request('/health')).json.ok){ready=true;break;}}catch(e){} await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,'Local server failed startup');
  for(const path of ['/chat/threads','/chat/messages?peer=abc','/chat/audio?id=1']){
   const x=await request(path);
   assert.equal(x.status,401,'Authentication required for '+path);
   assert.match(x.json.error,/Accedi/i);
  }
  for(const path of ['/chat/send','/chat/read']){
   const x=await request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(x.status,401,'Authentication required for '+path);
  }
  assert.equal((await request('/chat/unknown')).status,404);
  console.log('PASS: private chat route, auth, voice validation and unknown endpoint rejection');
 }finally{proc.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
