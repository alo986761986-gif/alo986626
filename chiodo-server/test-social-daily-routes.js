'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const host='127.0.0.1';
async function pickPort(){
 return new Promise((resolve,reject)=>{
 const s=http.createServer();
 s.once('error',reject);
 s.listen(0,host,()=>{const port=s.address().port;s.close(()=>resolve(port));});
 });
}
async function main(){
 const port=await pickPort();
 const child=spawn(process.execPath,['chiodo-server/http.js'],{
   env:{...process.env,PORT:String(port)},
   stdio:['ignore','pipe','pipe']
 });
 let stderr='';
 child.stderr.on('data',x=>{stderr+=String(x).slice(0,3000);});
 async function request(path,options){
   const result=await fetch('http://'+host+':'+port+path,{redirect:'manual',...options});
   const payload=await result.json();
   return {status:result.status,payload};
 }
 try{
   let up=false;
   for(let attempt=0;attempt<50;attempt++){
     if(child.exitCode!==null)throw Error('Server exited: '+stderr);
     try{const r=await request('/health');if(r.status===200&&r.payload.ok){up=true;break;}}
     catch(e){}
     await new Promise(resolve=>setTimeout(resolve,100));
   }
   assert.ok(up,'Chiodo backend did not start: '+stderr);
   for(const path of ['/social/me','/social/friends','/social/stats','/social/search?q=Ma','/daily/status']){
     const r=await request(path);
     assert.equal(r.status,401,path+' should require Firebase token, not return an unknown endpoint: '+JSON.stringify(r));
     assert.match(r.payload.error,/Accedi con email o Google/i);
   }
   const claim=await request('/daily/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(claim.status,401,'Daily claims must require Firebase authentication');
   const missing=await request('/daily/unknown');
   assert.equal(missing.status,404,'Unknown daily operations must not be silently accepted');
   const old=await request('/nonexistent');
   assert.equal(old.status,404,'Unknown routes must remain rejected');
   console.log('PASS: daily and social routes available with Firebase auth enforced, unknown routes rejected');
 }finally{child.kill('SIGTERM');}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
