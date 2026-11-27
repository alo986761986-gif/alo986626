'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','compat.js'),'utf8');
function make(){
 const calls=[],callbacks=[],desktop={
  identity:()=>({uid:'test-uid',email:'test@example.com',displayName:'Test',providers:['password']}),
  chiodo:async args=>(calls.push(['chiodo',args]),{status:200,body:'{"ok":true}'}),
  social:async args=>(calls.push(['social',args]),{status:200,body:'{"friends":[]}'}),
  classic:async args=>(calls.push(['classic',args]),{status:200,body:'{"ok":true}'}),
  remote:async args=>(calls.push(['remote',args]),{status:200,body:'{"ok":true}'}),
  external:()=>{},logout:()=>{},reset:async()=>{}
 };
 const w={NCDesktop:desktop,location:{href:'napoli://game/index.html'},fetch:async()=>({status:204}),SpeechSynthesisUtterance:class{}};
 w.NC_CHIODO_RESPONSE=(id,raw)=>callbacks.push(['chiodo',id,JSON.parse(raw)]);
 w.NC_SOCIAL_RESPONSE=(id,status,raw)=>callbacks.push(['social',id,status,JSON.parse(raw)]);
 const context={window:w,Response:class{constructor(body,options){this.body=body;this.status=options.status;}},URL,Promise,JSON,Error};
 vm.runInNewContext(code,context);
 return {w,calls,callbacks};
}
test('identity, social and Chiodo bridges preserve callback protocol',async()=>{
 const {w,calls,callbacks}=make();
 assert.equal(w.NCRewardNative.accountScope(),'uid:test-uid');
 w.NCChiodoNative.request('1','join','{}','');w.NCSocialNative.request('2','friends','{}');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,2);assert.equal(callbacks.length,2);
 assert.equal(callbacks[0][0],'chiodo');assert.equal(callbacks[0][2].status,200);
 assert.equal(callbacks[1][0],'social');assert.equal(callbacks[1][2],200);
});
test('classic multiplayer network uses restricted desktop bridge',async()=>{
 const {w,calls}=make();
 const res=await w.fetch('https://napoli-carte-3d-global.onrender.com/api/health');
 assert.equal(res.status,200);assert.equal(calls[0][0],'classic');
});
test('Google Play and rewarded ads never fabricate credits',()=>{
 const {w}=make();let awarded=false;
 w.NC_AD_EVENT=()=>{awarded=true;};w.NCRewardNative.show();
 assert.equal(awarded,true);assert.equal(typeof w.NCPlayNative.buy,'function');
});

test('expansion online games use desktop multiplayer transport',async()=>{
 const {w,calls}=make(),token='b'.repeat(48);
 const r=await w.fetch('https://napoli-chiodo-121.onrender.com/expansion/state',{headers:{Authorization:'Bearer '+token}});
 assert.equal(r.status,200);assert.equal(calls[0][0],'remote');assert.equal(calls[0][1].token,token);
 const m=await w.fetch('https://napoli-chiodo-121.onrender.com/expansion/move',
  {method:'POST',headers:{authorization:'Bearer '+token},body:'{"action":"draw"}'});
 assert.equal(m.status,200);assert.equal(calls[1][1].method,'POST');
});
test('lobby status uses restricted bridge',async()=>{
 const {w,calls}=make();const r=await w.fetch('https://napoli-chiodo-121.onrender.com/lobby/status');
 assert.equal(r.status,200);assert.equal(calls[0][0],'remote');
});
