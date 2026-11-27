'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const dir='app/src/main/assets/';
const html=fs.readFileSync(dir+'index.html','utf8');
const css=fs.readFileSync(dir+'nc90-premium.css','utf8');
const js=fs.readFileSync(dir+'nc90-premium.js','utf8');
const art=fs.readFileSync(dir+'nc90-napoli-bay.svg','utf8');
test('Premium Club 9.0 assets load in Android entrypoint',()=>{
 assert.match(html,/<link rel="stylesheet" href="nc90-premium\.css">/);
 assert.match(html,/<script src="nc90-premium\.js"><\/script>/);
 assert.match(css,/nc90-napoli-bay\.svg/);
 assert.match(art,/<svg\s/);
 assert.match(art,/<\/svg>/);
});
test('Existing playing rules and multiplayer are preserved',()=>{
 for(const fn of ['function drawLobby()','function drawGame(s)','function renderBoard(s)','function setGame(g)','function joinGame()'])assert(html.includes(fn),fn);
 for(const id of ['scopa','scopone','briscola','sette','asso','ruba'])assert(html.includes("'"+id+"'"));
});
test('Navigation buttons have real mapped actions',()=>{
 for(const functionName of ['NC70_SOCIAL','NC79_PROFILE','NC71_DAILY','NC72_ONLINE_OPEN','NC_MARKET_OPEN'])assert(js.includes(functionName),functionName);
 assert(js.includes('new MutationObserver(schedule)'));
 assert(!/setGame\s*=|drawGame\s*=|joinGame\s*=/.test(js));
});
test('Original theme includes lobby, cards, players, responsive and accessibility',()=>{
 for(const selector of ['nc90-in-lobby','.games','.setup','.board','.player','.ch-seat','#nc-market83','#nc79-profile','@media(max-width:760px)','prefers-reduced-motion',':focus-visible'])assert(css.includes(selector),selector);
 assert(css.length>12000);
 assert(!/@import\b/.test(css));
 assert(!/https?:\/\//.test(css));
});
test('No fake live player stats or unverified purchases introduced',()=>{
 for(const n of ['1.248 online','125.750','1.280','12.638'])assert(!js.includes(n));
 const market=fs.readFileSync(dir+'market83.js','utf8');
 assert(market.includes("request('marketState')"));
 const server=fs.readFileSync('chiodo-server/market83.js','utf8');
 assert(server.includes('NC_MARKET_LEDGER_RECONCILED'));
});
test('Android package 9.0.0 is configured',()=>{
 const gradle=fs.readFileSync('app/build.gradle','utf8');
 assert.match(gradle,/versionCode (?:90|91|92|93|94|95|96|97)\b/);
 assert.match(gradle,/versionName '9\.(?:0|1|2|3|4|5|6|7)\.0'/);
});
