'use strict';
const fs=require('fs');
const role=process.env.CLIENT_ROLE||'A';
const token=(process.env.GITHUB_RUN_ID||'000000').slice(-6);
const meName='TB'+token+role,otherName='TB'+token+(role==='A'?'B':'A');
const URL='wss://trish-boll-global-arena.onrender.com/ws';
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function ip(){for(const url of ['https://api.ipify.org?format=json','https://ifconfig.me/ip'])
 try{let r=await fetch(url,{signal:AbortSignal.timeout(6000)});let t=(await r.text()).trim();return t.startsWith('{')?JSON.parse(t).ip:t;}catch(e){}return 'unknown';}
async function main(){
 let address=await ip(),success=false,states=0,matches=[];
 for(let attempt=0;attempt<12&&!success;attempt++){
  let ws=new WebSocket(URL);
  try{
   await new Promise((resolve,reject)=>{
    let timer=setTimeout(()=>reject(Error('connect timeout')),12000);
    ws.onopen=()=>{clearTimeout(timer);ws.send(JSON.stringify({t:'join',name:meName,skin:2,sensitivity:4}));resolve();};
    ws.onerror=()=>reject(Error('WebSocket handshake error'));
   });
   await new Promise(resolve=>{
    let timer=setTimeout(resolve,15000);
    ws.onmessage=e=>{
     let d;try{d=JSON.parse(e.data)}catch(err){return;}
     if(d.t==='state'){
      states++;
      const players=(d.s||[]).filter(s=>s[1]===meName||s[1]===otherName);
      if(players.length===2&&d.p>=2){
       matches=players.map(s=>({id:s[0],name:s[1],x:s[3],y:s[4]}));
       success=true;clearTimeout(timer);resolve();
      }
     }
     if(d.t==='dead'){clearTimeout(timer);resolve();}
    };
   });
  }catch(e){console.log(role,'attempt',attempt,e.message)}
  finally{try{ws.close()}catch(e){}}
  if(!success)await sleep(1200);
 }
 const report={role,ip:address,server:URL,sharedWorld:success,states,players:matches};
 fs.writeFileSync('dual-'+role+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
 if(!success)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});