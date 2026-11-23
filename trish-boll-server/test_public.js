'use strict';
const assert=require('node:assert/strict');
const URL='wss://trish-boll-global-arena.onrender.com/ws';
const BASE='https://trish-boll-global-arena.onrender.com/health';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function join(name){
  const ws=new WebSocket(URL);
  const current={ws,id:null,states:0,foods:0,players:0,history:[]};
  const timer=setTimeout(()=>{try{ws.close();}catch(e){}},19000);
  await new Promise((resolve,reject)=>{
    let ready=false;
    ws.onopen=()=>ws.send(JSON.stringify({t:'join',name,skin:name==='GLOBAL_A'?1:3}));
    ws.onerror=()=>reject(new Error('WebSocket TLS or transport error for '+name));
    ws.onclose=e=>{if(!ready)reject(new Error('Socket closed before join '+e.code));};
    ws.onmessage=e=>{
      const m=JSON.parse(e.data);
      if(m.t==='error')reject(new Error(m.message));
      if(m.t==='joined'){ready=true;current.id=m.id;resolve();}
      if(m.t==='state'){
        current.states++;current.players=m.p;current.history=m.s.map(s=>s[0]);
      }
      if(m.t==='food')current.foods++;
    };
  });
  clearTimeout(timer);
  return current;
}
(async()=>{
  let health=await fetch(BASE).then(r=>{assert.equal(r.status,200);return r.json();});
  assert.equal(health.ok,true);assert(health.capacity>=2);
  const [a,b]=await Promise.all([join('GLOBAL_A'),join('GLOBAL_B')]);
  assert.notEqual(a.id,b.id);
  a.ws.send(JSON.stringify({t:'input',a:2.3,b:1}));
  b.ws.send(JSON.stringify({t:'input',a:-1.2,b:0}));
  let shared=false;
  for(let i=0;i<85;i++){
    await delay(100);
    if(a.history.includes(b.id)&&b.history.includes(a.id)
       &&a.history.includes(a.id)&&b.history.includes(b.id)
       &&a.players>=2&&b.players>=2){shared=true;break;}
  }
  assert(shared,'Both independent remote clients must see the same global arena');
  assert(a.foods>0 && b.foods>0,'Both clients should receive food');
  console.log('PUBLIC_WSS_TWO_PLAYER_ARENA_PASS',a.id,b.id,'states',a.states,b.states);
  a.ws.close();b.ws.close();
})().catch(error=>{console.error('PUBLIC_WSS_TEST_FAILED',error);process.exitCode=1;});
