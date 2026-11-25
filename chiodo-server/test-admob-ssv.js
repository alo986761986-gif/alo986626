'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'admob-ssv.js'),'utf8');
const keyPair=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const publicPem=keyPair.publicKey.export({type:'spki',format:'pem'});
const keyId='987654321';
const testUid='nc_admob_ssv_verification_20261125';
const testData='nc_admob_console_verify_v1';

function signed(values={}){
 const fields={ad_network:'5450213213286189855',ad_unit:'3818748399',reward_amount:'350',reward_item:'crediti',timestamp:'1795560000000',transaction_id:'unit_test_transaction_1',user_id:'normal_firebase_uid',...values};
 const params=new URLSearchParams();
 for(const key of Object.keys(fields).sort())if(fields[key]!==undefined)params.set(key,String(fields[key]));
 const raw=params.toString();
 const signature=crypto.sign('sha256',Buffer.from(raw),keyPair.privateKey).toString('base64url');
 return raw+'&signature='+signature+'&key_id='+keyId;
}

function harness({database=true}={}){
 const calls={keyFetches:0,pools:0,queries:[]};
 class Pool{
  constructor(){calls.pools++;}
  on(){}
  async query(sql,values){calls.queries.push({sql,values:values?Array.from(values):undefined});return {rows:[]};}
 }
 const module={exports:{}};
 const context=vm.createContext({
  module,exports:module.exports,Buffer,URLSearchParams,AbortSignal,
  process:{env:database?{DATABASE_URL:'postgres://isolated-test.invalid/test'}:{}},
  require(name){
   if(name==='node:crypto')return crypto;
   if(name==='pg')return {Pool};
   throw Error('Unexpected dependency: '+name);
  },
  async fetch(url){
   assert.equal(url,'https://www.gstatic.com/admob/reward/verifier-keys.json');
   calls.keyFetches++;
   return {ok:true,json:async()=>({keys:[{keyId,pem:publicPem}]})};
  }
 });
 vm.runInContext(source,context,{filename:'admob-ssv.js'});
 return {
  calls,
  async callback(raw,method='GET'){
   let response;
   await module.exports.callback({method,url:'/admob/ssv'+(raw?'?'+raw:'')},(status,body)=>{response={status,body:JSON.parse(JSON.stringify(body))};});
   assert.ok(response,'callback must complete its response');
   return response;
  }
 };
}

function assertNoDatabase(h){
 assert.equal(h.calls.pools,0,'verification must not initialize a database pool');
 assert.deepEqual(h.calls.queries,[],'verification must not query or insert in the reward ledger');
}

test('signed exact console verification succeeds with no database configuration or access',async()=>{
 const h=harness({database:false});
 const result=await h.callback(signed({user_id:testUid,custom_data:testData}));
 assert.deepEqual(result,{status:200,body:{ok:true,test:true,credited:false}});
 assert.equal(h.calls.keyFetches,1,'the Google key verification path must run');
 assertNoDatabase(h);
});

test('console marker cannot bypass ECDSA verification',async()=>{
 const h=harness();
 const raw=signed({user_id:testUid,custom_data:testData}).replace('reward_amount=350','reward_amount=351');
 assert.deepEqual(await h.callback(raw),{status:403,body:{error:'Invalid signature'}});
 assertNoDatabase(h);
});

test('console verification still rejects the wrong ad unit and reward amount',async()=>{
 for(const change of [{ad_unit:'other_ad_unit'},{reward_amount:'351'}]){
  const h=harness();
  assert.deepEqual(await h.callback(signed({user_id:testUid,custom_data:testData,...change})),{status:400,body:{error:'Unexpected reward'}});
  assertNoDatabase(h);
 }
});

test('console verification still rejects missing or oversized transactions',async()=>{
 for(const [transaction_id,error] of [['','Unexpected reward'],['x'.repeat(257),'Missing account or invalid transaction']]){
  const h=harness();
  assert.deepEqual(await h.callback(signed({user_id:testUid,custom_data:testData,transaction_id})),{status:400,body:{error}});
  assertNoDatabase(h);
 }
});

test('a normal verified reward keeps the existing 350-credit database upsert',async()=>{
 const h=harness();
 assert.deepEqual(await h.callback(signed()),{status:200,body:{ok:true}});
 assert.equal(h.calls.pools,1);
 assert.equal(h.calls.queries.length,2);
 assert.match(h.calls.queries[0].sql,/^CREATE TABLE IF NOT EXISTS nc_admob_rewards/);
 assert.deepEqual(h.calls.queries[1],{
  sql:'INSERT INTO nc_admob_rewards(transaction_id,firebase_uid,amount) VALUES($1,$2,350) ON CONFLICT(transaction_id) DO NOTHING',
  values:['unit_test_transaction_1','normal_firebase_uid']
 });
});

test('both console marker fields must match exactly; other signed rewards use the existing ledger',async()=>{
 for(const fields of [
  {user_id:testUid},
  {user_id:testUid,custom_data:testData+'_suffix'},
  {user_id:testUid+'_suffix',custom_data:testData},
  {user_id:'normal_firebase_uid',custom_data:testData}
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(signed(fields)),{status:200,body:{ok:true}});
  assert.equal(h.calls.pools,1);
  assert.deepEqual(h.calls.queries[1].values,['unit_test_transaction_1',fields.user_id]);
 }
});

test('signed invalid account identifiers remain rejected',async()=>{
 for(const user_id of [undefined,'','invalid.uid','x'.repeat(129)]){
  const h=harness();
  assert.deepEqual(await h.callback(signed({user_id,custom_data:testData})),{status:400,body:{error:'Missing account or invalid transaction'}});
  assertNoDatabase(h);
 }
});

test('unsigned and non-GET callbacks remain rejected before key or database access',async()=>{
 for(const [raw,method,status,error] of [
  ['', 'GET',400,'Signed callback required'],
  ['user_id='+testUid+'&custom_data='+testData,'GET',403,'Invalid signature'],
  [signed({user_id:testUid,custom_data:testData}),'POST',405,'method']
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(raw,method),{status,body:{error}});
  assert.equal(h.calls.keyFetches,0);
  assertNoDatabase(h);
 }
});
