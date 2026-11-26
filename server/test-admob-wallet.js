const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/src/main/assets/wallet.js','utf8');
function app(scope,storage=new Map()){
 const win={NCRewardNative:{accountScope:()=>scope,sync(){}}};
 const document={getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null};
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 win.addEventListener=()=>{};
 vm.runInNewContext(source,{window:win,document,localStorage,setTimeout:()=>{}});
 return {win,storage};
}
test('verified 350-credit reward is applied once, including after restart',()=>{
 const {win,storage}=app('uid:playerA'),row={transaction_id:'google_tx_1',amount:350};
 assert.equal(win.NC_WALLET.balance(),500);
 assert.equal(typeof win.NC_AD_REWARD,'undefined');
 win.NC_AD_VERIFIED('uid:playerA',[row,row]);assert.equal(win.NC_WALLET.balance(),850);
 const restarted=app('uid:playerA',storage).win;
 restarted.NC_AD_VERIFIED('uid:playerA',[row]);assert.equal(restarted.NC_WALLET.balance(),850);
 restarted.NC_AD_VERIFIED('uid:playerA',[{transaction_id:'google_tx_2',amount:350}]);assert.equal(restarted.NC_WALLET.balance(),1200);
});
test('wrong account, wrong amounts and guest cannot receive credits',()=>{
 const {win,storage}=app('uid:playerA');
 win.NC_AD_VERIFIED('uid:playerB',[{transaction_id:'x',amount:350}]);
 win.NC_AD_VERIFIED('uid:playerA',[{transaction_id:'x',amount:999},{transaction_id:'',amount:350}]);
 assert.equal(win.NC_WALLET.balance(),500);
 const guest=app('guest',storage).win;guest.NC_AD_VERIFIED('guest',[{transaction_id:'x',amount:350}]);assert.equal(guest.NC_WALLET.balance(),500);
});
test('legacy wallet migrates only once and does not mix accounts',()=>{
 const storage=new Map([['nc47_wallet_v1',JSON.stringify({balance:735,matches:{},rewards:{}})]]);
 assert.equal(app('uid:a',storage).win.NC_WALLET.balance(),735);
 assert.equal(app('uid:b',storage).win.NC_WALLET.balance(),500);
 assert.equal(app('uid:a',storage).win.NC_WALLET.balance(),735);
});