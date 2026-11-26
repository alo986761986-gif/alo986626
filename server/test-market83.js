'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {CATALOG,ITEMS,spendingEnabled}=require('../chiodo-server/market83.js');
test('97 unique cosmetic products across five categories',()=>{
 assert.equal(CATALOG.length,97);
 assert.equal(new Set(CATALOG.map(x=>x.id)).size,97);
 assert.deepEqual(Object.fromEntries(['table','avatar','frame','cards','effects'].map(x=>[x,CATALOG.filter(p=>p.type===x).length])),{table:12,avatar:20,frame:30,cards:15,effects:20});
});
test('cosmetics have stable positive integer server prices',()=>{
 assert(CATALOG.every(x=>Number.isSafeInteger(x.price)&&x.price>0&&x.name.length>0&&ITEMS.get(x.id)===x));
 assert.equal(ITEMS.get('table_1').price,1500);
 assert.equal(ITEMS.get('table_6').price,7500);
});
test('market ownership is backend-controlled and enabled only explicitly',()=>{
 const old=process.env.NC_MARKET_SPENDING_ENABLED;
 delete process.env.NC_MARKET_SPENDING_ENABLED;
 assert.equal(spendingEnabled(),false);
 process.env.NC_MARKET_SPENDING_ENABLED='false';
 assert.equal(spendingEnabled(),false);
 if(old===undefined)delete process.env.NC_MARKET_SPENDING_ENABLED;else process.env.NC_MARKET_SPENDING_ENABLED=old;
});
test('no unverified local cosmetic purchase path',()=>{
 const wallet=fs.readFileSync('app/src/main/assets/wallet.js','utf8');
 const market=fs.readFileSync('app/src/main/assets/market83.js','utf8');
 assert(!wallet.includes('buyCosmetic'));
 assert(market.includes("request('marketState')"));
 assert(market.includes("'marketBuy'"));
 assert(market.includes("'marketEquip'"));
});

test('all 97 market items have styling and preview asset categories',()=>{
 const css=fs.readFileSync('app/src/main/assets/market83-themes.css','utf8');
 const client=fs.readFileSync('app/src/main/assets/market83.js','utf8');
 for(const item of CATALOG)assert(css.includes('data-item="'+item.id+'"'),item.id+' preview missing');
 for(const type of ['table','avatar','frame','cards','effects'])assert(client.includes(type));
 assert(client.includes("skin.href='market83-themes.css'"));
 assert(client.includes("valid.has(id)"),'equipped items must belong to authenticated account');
 assert(client.includes("Saldo Market verificato"));
 assert(client.includes("id=\"nc83-refresh\""));
 assert(client.includes("(blocked?'disabled'"));
});
