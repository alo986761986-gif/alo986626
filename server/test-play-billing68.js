'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {PRODUCTS,PACKAGE,obfuscate,validate,configured}=require('../chiodo-server/play-billing.js');
const uid='firebase-user-QA';
function good(sku='coins_1000'){return {purchaseStateContext:{purchaseState:'PURCHASED'},obfuscatedExternalAccountId:obfuscate(uid),
 productLineItem:[{productId:sku,productOfferDetails:{quantity:1,refundableQuantity:1,consumptionState:'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'}}]};}
test('six unique consumable products with fixed credit values',()=>{assert.equal(PACKAGE,'it.napolicarte.game');assert.deepEqual(Object.entries(PRODUCTS),[['coins_1000',1000],['coins_2200',2200],['coins_6000',6000],['coins_13000',13000],['coins_28000',28000],['coins_75000',75000]]);});
test('verify purchased credits for all six products',()=>{for(const sku of Object.keys(PRODUCTS))assert.equal(validate(good(sku),sku,uid).alreadyConsumed,false);});
test('reject wrong user, product, pending payment, double quantity, refunds',()=>{const x=good();assert.throws(()=>validate(x,'coins_1000','other'));assert.throws(()=>validate(x,'coins_2200',uid));x.purchaseStateContext.purchaseState='PENDING';assert.throws(()=>validate(x,'coins_1000',uid));const y=good();y.productLineItem[0].productOfferDetails.quantity=2;assert.throws(()=>validate(y,'coins_1000',uid));const z=good();z.productLineItem[0].productOfferDetails.refundableQuantity=0;assert.throws(()=>validate(z,'coins_1000',uid));});
test('feature cannot grant purchases without configured service account',()=>{const prev=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;assert.equal(configured(),false);if(prev!==undefined)process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=prev;});
