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

function signed(values={}, {decoded=false, privateKey=keyPair.privateKey}={}){
 const fields={ad_network:'5450213213286189855',ad_unit:'3818748399',reward_amount:'350',reward_item:'crediti',timestamp:'1795560000000',transaction_id:'unit_test_transaction_1',user_id:'normal_firebase_uid',...values};
 const pairs=Object.keys(fields).sort().filter(key=>fields[key]!==undefined).map(key=>[key,String(fields[key])]);
 const raw=decoded?pairs.map(([key,value])=>key+'='+encodeURIComponent(value)).join('&'):new URLSearchParams(pairs).toString();
 // Build the signed text independently from the URL encoding, like URI.getQuery().
 const content=decoded?pairs.map(([key,value])=>key+'='+value).join('&'):raw;
 return signedContent(raw,content,privateKey);
}

function signedContent(raw,content=raw,privateKey=keyPair.privateKey){
 const signature=crypto.sign('sha256',Buffer.from(content),privateKey).toString('base64url');
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

test('Tink-style console signature accepts the configured space and full ad unit without crediting',async()=>{
 const h=harness({database:false});
 const raw=signed({user_id:testUid,custom_data:testData,reward_item:'Crediti Virtuali',ad_unit:'ca-app-pub-3210480040948197/3818748399'},{decoded:true});
 assert.match(raw,/reward_item=Crediti%20Virtuali/);
 assert.match(raw,/ad_unit=ca-app-pub-3210480040948197%2F3818748399/);
 const [content,suffix]=raw.split('&signature=');
 assert.equal(crypto.verify('sha256',Buffer.from(content),keyPair.publicKey,Buffer.from(suffix.split('&')[0],'base64url')),false,'fixture must fail the original raw-only verifier');
 assert.deepEqual(await h.callback(raw),{status:200,body:{ok:true,test:true,credited:false}});
 assert.equal(h.calls.keyFetches,1);
 assertNoDatabase(h);
});

test('Tink-style normal reward supports UTF-8 text and preserves the 350-credit upsert',async()=>{
 const h=harness();
 const raw=signed({ad_unit:'ca-app-pub-3210480040948197/3818748399',reward_item:'Créditi — 🎴',custom_data:'partita città'},{decoded:true});
 assert.deepEqual(await h.callback(raw),{status:200,body:{ok:true}});
 assert.equal(h.calls.pools,1);
 assert.deepEqual(h.calls.queries[1].values,['unit_test_transaction_1','normal_firebase_uid']);
 assert.match(h.calls.queries[1].sql,/VALUES\(\$1,\$2,350\) ON CONFLICT\(transaction_id\) DO NOTHING/);
});

test('existing raw signatures with form-encoded spaces, UTF-8 and a full ad unit stay valid',async()=>{
 const h=harness();
 assert.deepEqual(await h.callback(signed({ad_unit:'ca-app-pub-3210480040948197/3818748399',reward_item:'Créditi Virtuali'})),{status:200,body:{ok:true}});
 assert.deepEqual(h.calls.queries[1].values,['unit_test_transaction_1','normal_firebase_uid']);
});

test('decoded signatures still enforce ad unit, amount, account and transaction checks before console success',async()=>{
 for(const [change,error] of [
  [{ad_unit:'another/unit'},'Unexpected reward'],
  [{reward_amount:'351'},'Unexpected reward'],
  [{transaction_id:''},'Unexpected reward'],
  [{transaction_id:'x'.repeat(257)},'Missing account or invalid transaction'],
  [{user_id:''},'Missing account or invalid transaction'],
  [{user_id:'invalid.uid'},'Missing account or invalid transaction']
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(signed({user_id:testUid,custom_data:testData,reward_item:'Crediti Virtuali',...change},{decoded:true})),{status:400,body:{error}});
  assertNoDatabase(h);
 }
});

test('altered decoded callbacks cannot reuse a valid signature',async()=>{
 const raw=signed({user_id:testUid,custom_data:testData,reward_item:'Crediti Virtuali'},{decoded:true});
 for(const altered of [
  raw.replace('reward_amount=350','reward_amount=351'),
  raw.replace('Crediti%20Virtuali','Crediti%20Alterati'),
  raw.replace('user_id='+testUid,'user_id=another_uid'),
  raw.replace('unit_test_transaction_1','unit_test_transaction_2'),
  raw.replace('Crediti%20Virtuali','Crediti%2520Virtuali')
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(altered),{status:403,body:{error:'Invalid signature'}});
  assertNoDatabase(h);
 }
});

test('decoded fallback refuses escaped delimiters, literal pluses and residual percent escapes',async()=>{
 for(const custom_data of ['a&user_id=another_uid','a=b','a+b','a%26user_id%3Danother_uid','100%']){
  const h=harness();
  assert.deepEqual(await h.callback(signed({custom_data,reward_item:'Crediti Virtuali'},{decoded:true})),{status:403,body:{error:'Invalid signature'}});
  assertNoDatabase(h);
 }
 // A literal + is not a space under URI.getQuery(), so it must not enter the
 // fallback and acquire URLSearchParams' different form-decoding semantics.
 const plus=signed({custom_data:'a+b',reward_item:'Crediti Virtuali'},{decoded:true}).replace('a%2Bb','a+b');
 const h=harness();
 assert.deepEqual(await h.callback(plus),{status:403,body:{error:'Invalid signature'}});
 assertNoDatabase(h);
});

test('escaped parameter names and injected or encoded duplicate names are rejected',async()=>{
 const valid=signed({reward_item:'Crediti Virtuali'},{decoded:true});
 const content=valid.split('&signature=')[0];
 const injected=signed({custom_data:'a&user_id=another_uid',reward_item:'Crediti Virtuali'},{decoded:true}).replace('a%26user_id%3Danother_uid','a&user_id=another_uid');
 for(const raw of [
  valid.replace('ad_unit=','%61d_unit='),
  signedContent(content+'&user_id=another_uid'),
  signedContent(content+'&user%5Fid=another_uid'),
  signedContent(content+'&signature=fake'),
  injected
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(raw),{status:403,body:{error:'Invalid signature'}});
  assertNoDatabase(h);
 }
});

test('a wrong signing key and an unknown key ID remain invalid',async()=>{
 const other=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 for(const raw of [
  signed({reward_item:'Crediti Virtuali'},{decoded:true,privateKey:other.privateKey}),
  signed({reward_item:'Crediti Virtuali'},{decoded:true}).replace('key_id='+keyId,'key_id=12345')
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(raw),{status:403,body:{error:'Invalid signature'}});
  assertNoDatabase(h);
 }
});

test('malformed escaping or base64 signatures fail as invalid input without database access',async()=>{
 const valid=signed({reward_item:'Crediti Virtuali'},{decoded:true});
 for(const raw of [
  valid.replace('Crediti%20Virtuali','Crediti%ZZVirtuali'),
  valid.replace('Crediti%20Virtuali','Crediti%C0%AFVirtuali'),
  valid.replace(/&signature=[^&]+/,'&signature=%'),
  valid.replace(/&signature=[^&]+/,'&signature=%25'),
  valid.replace(/&signature=[^&]+/,'&signature=not_a_signature')
 ]){
  const h=harness();
  assert.deepEqual(await h.callback(raw),{status:403,body:{error:'Invalid signature'}});
  assertNoDatabase(h);
 }
});
