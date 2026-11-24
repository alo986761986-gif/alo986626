'use strict';
const {spawn}=require('node:child_process'),assert=require('node:assert/strict'),net=require('node:net');
const port=31000+Math.floor(Math.random()*14000);
const proc=spawn(process.execPath,['backend/local-server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let logs='';proc.stdout.on('data',d=>{logs+=d.toString()});proc.stderr.on('data',d=>{logs+=d.toString()});
const base='http://127.0.0.1:'+port;
async function post(route,body){const res=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {code:res.status,data:await res.json()}}
async function run(){let health;
 for(let i=0;i<45;i++){if(proc.exitCode!==null)throw Error('Server failed: '+logs);try{const res=await fetch(base+'/api/health');if(res.ok){health=await res.json();break}}catch(e){}await new Promise(r=>setTimeout(r,100))}
 assert(health&&health.ok,logs);assert.equal(health.serverVersion,'2.8');
 assert.equal(typeof health.uptimeSeconds,'number');
 assert.equal(typeof health.cleanupCount,'number');
 const bad=await fetch(base+'/api/join');assert.equal(bad.status,404);
 const huge=await post('/api/join',{payload:'x'.repeat(130000)});assert.equal(huge.code,413);
 const a=await post('/api/join',{game:'scopa',seats:2,name:'A',private:true});
 assert.equal(a.code,200);assert(a.data.code);
 const b=await post('/api/join',{game:'scopa',seats:2,name:'B',invite:a.data.code});
 assert.equal(b.code,200);
 const state=await post('/api/state',{token:a.data.token});assert.equal(state.code,200);assert.equal(state.data.status,'playing');
 const chat=await post('/api/chat',{token:a.data.token,text:'Ciao online'});assert.equal(chat.code,200);
 const received=await post('/api/realtime',{token:b.data.token,afterChat:0,afterSignal:0});
 assert(received.data.chat.some(m=>m.text==='Ciao online'));
 const rm=await post('/api/leave',{token:a.data.token});assert.equal(rm.data.ok,true);
 const still=await post('/api/state',{token:b.data.token});assert.equal(still.code,200);assert.equal(still.data.players[0].bot,true);
 console.log('SERVER STABILITY HTTP TEST PASS: health, request size, join, chat, disconnect');
}
run().catch(e=>{console.error(e,logs);process.exitCode=1}).finally(()=>{proc.kill('SIGTERM');setTimeout(()=>{if(proc.exitCode===null)proc.kill('SIGKILL')},700).unref()});
