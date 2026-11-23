'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const PORT=32841;
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
let log='';
server.stdout.on('data',b=>{log+=b.toString();});
server.stderr.on('data',b=>{log+=b.toString();});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(name) {
  let ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');
  let id=null,seen=false,food=false;
  const result=await new Promise((resolve,reject)=>{
    let timer=setTimeout(()=>reject(new Error('Timed out joining '+name)),7000);
    ws.onopen=()=>ws.send(JSON.stringify({t:'join',name,skin:2}));
    ws.onerror=()=>{clearTimeout(timer);reject(new Error('WebSocket '+name));};
    ws.onmessage=e=>{
      let msg=JSON.parse(e.data);
      if(msg.t==='joined')id=msg.id;
      if(msg.t==='food')food=true;
      if(msg.t==='state'&&id&&msg.s.some(s=>s[0]===id)){seen=true;}
      if(id&&food&&seen){clearTimeout(timer);resolve({id,ws,msg});}
    };
  });
  return result;
}
(async()=>{
  for(let i=0;i<80&&!log.includes('MULTIPLAYER_READY');i++)await sleep(100);
  assert(log.includes('MULTIPLAYER_READY'),'Server failed to start '+log);
  let health=await fetch('http://127.0.0.1:'+PORT+'/health').then(x=>x.json());
  assert.equal(health.ok,true);
  assert.equal(health.capacity,30);
  let a=await connect('Alpha'),b=await connect('Beta');
  assert.notEqual(a.id,b.id);
  let stats=await fetch('http://127.0.0.1:'+PORT+'/stats').then(x=>x.json());
  assert.equal(stats.onlinePlayers,2);
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Other player state missing')),5000);
    b.ws.addEventListener('message',e=>{
      let m=JSON.parse(e.data);
      if(m.t==='state'&&m.s.some(s=>s[0]===a.id)&&m.s.some(s=>s[0]===b.id)){
        clearTimeout(timeout);resolve();
      }
    });
    a.ws.send(JSON.stringify({t:'input',a:2.25,b:1}));
  });
  a.ws.close();b.ws.close();
  for(let i=0;i<40;i++){
    stats=await fetch('http://127.0.0.1:'+PORT+'/health').then(x=>x.json());
    if(stats.onlinePlayers===0)break;
    await sleep(100);
  }
  assert.equal(stats.onlinePlayers,0,'Players not cleaned up');
  console.log('TRISH_BOLL_2_USERS_SHARED_ARENA_PASS');
  process.exitCode=0;
})().catch(e=>{console.error(log);console.error(e);process.exitCode=1;}).finally(()=>server.kill());
