'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const theme=fs.readFileSync('app/src/main/assets/club84.css','utf8');
const script=fs.readFileSync('app/src/main/assets/club84.js','utf8');
test('Club Edition assets are loaded by the same APK WebView entry',()=>{
 assert.match(html,/<link rel="stylesheet" href="club84\.css">/);
 assert.match(html,/<script src="club84\.js"><\/script>/);
 assert.match(html,/<script src="market83\.js">|store52\.js/);
});
test('gameplay and multiplayer entry points remain present',()=>{
 for(const fn of ['function drawLobby()','function drawGame(s)','function renderBoard(s)','function setGame(g)','function joinGame()'])assert.ok(html.includes(fn),fn);
 for(const key of ['scopa','scopone','briscola','sette','asso','ruba'])assert.ok(html.includes("'"+key+"'"),key);
});
test('styles include mobile, lobby, cards, games, table and market without imported third-party designs',()=>{
 for(const sel of ['.nc84-in-lobby','.games','.setup','.board','.player','.myhand','#nc-market83','@media(max-width:720px)','prefers-reduced-motion'])assert.ok(theme.includes(sel),sel);
 assert.ok(!/@import\b/i.test(theme),'no remote third-party css');
 assert.ok(!/https?:\/\//i.test(theme),'no external resources');
 assert.ok(theme.length>12000,'theme styles must not be stubbed');
});
test('lobby enhancement only decorates existing controls and does not replace game logic',()=>{
 for(const snippet of ['MutationObserver','requestAnimationFrame','button.game','.nc84-cardfan','nc84-in-game','nc84-in-lobby'])assert.ok(script.includes(snippet),snippet);
 assert.ok(!/eval\s*\(/.test(script));
 assert.ok(!/setGame\s*=|drawLobby\s*=|joinGame\s*=|drawGame\s*=/.test(script),'do not overwrite rules or navigation');
});
test('Android package is Club Edition 8.4 or newer',()=>{
 const build=fs.readFileSync('app/build.gradle','utf8');
 assert.match(build,/versionCode (?:84|90|91)\b/);
 assert.match(build,/versionName '(?:8\.4\.0|9\.0\.0|9\.1\.0)'/);
});
