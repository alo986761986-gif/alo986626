'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {PRODUCTS,PACKAGE,obfuscate,validate,configured}=require('../chiodo-server/play-billing.js');
const uid='firebase-user-QA';
function good(sku='coins_1000'){return {purchaseStateContext:{purchaseState:'PURCHASED'},obfuscatedExternalAccountId:obfuscate(uid),
 productLineItem:[{productId:sku,productOfferDetails:{quantity:1,refundableQuantity:1,consumptionState:'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'}}]};}
test('six unique consumable products with fixed credit values',()=>{
 assert.equal(PACKAGE,'it.napolicarte.game');
 assert.deepEqual(Object.entries(PRODUCTS),[['coins_1000',1000],['coins_2200',2200],['coins_6000',6000],['coins_13000',13000],['coins_28000',28000],['coins_75000',75000]]);
 assert.equal(new Set(Object.keys(PRODUCTS)).size,6);
});
test('valid purchased product and obfuscated Firebase account pass',()=>{
 for(const sku of Object.keys(PRODUCTS))assert.deepEqual(validate(good(sku),sku,uid),{alreadyConsumed:false});
});
test('reject wrong identity, product substitution, pending, cancelled and quantity manipulation',()=>{
 const g=good();
 assert.throws(()=>validate(g,'coins_1000','other'),/Account/);
 assert.throws(()=>validate(g,'coins_2200',uid),/Prodotto/);
 for(const state of ['PENDING','CANCELLED']){const a=good();a.purchaseStateContext.purchaseState=state;assert.throws(()=>validate(a,'coins_1000',uid),/Pagamento/);}
 const b=good();b.productLineItem[0].productOfferDetails.quantity=2;assert.throws(()=>validate(b,'coins_1000',uid),/Quantita/);
 const c=good();c.productLineItem[0].productOfferDetails.refundableQuantity=0;assert.throws(()=>validate(c,'coins_1000',uid),/rimborsato/);
 const d=good();d.productLineItem=[];assert.throws(()=>validate(d,'coins_1000',uid),/Prodotto/);
});
test('only a consumed receipt may be marked consumed and invalid states are rejected',()=>{
 const g=good();g.productLineItem[0].productOfferDetails.consumptionState='CONSUMPTION_STATE_CONSUMED';
 assert.equal(validate(g,'coins_1000',uid).alreadyConsumed,true);
 g.productLineItem[0].productOfferDetails.consumptionState='UNKNOWN';
 assert.throws(()=>validate(g,'coins_1000',uid),/Stato/);
});
test('feature is unavailable without explicit production Google Play service credentials',()=>{
 const old=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
 delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
 assert.equal(configured(),false);
 if(old!==undefined)process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=old;
});
