'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const clean=fs.readFileSync('app/src/main/assets/online-hub72.js','utf8');
test('classic games remain available with direct play, preserving their rules',()=>{
 for(const fn of ['function setGame(g)','function setMode(m)','async function joinGame()','function drawLobby()'])assert.ok(html.includes(fn),fn);
 for(const id of ['scopa','scopone','briscola','sette','asso','ruba'])assert.ok(html.includes("'"+id+"'"));
 assert.match(clean,/NC95_CLEAN_LOBBY/);
 assert.match(html,/NC95_QUICK_PLAY|e\.stopImmediatePropagation\(\)/);
 assert.match(html,/w\.setGame\(match\[1\]\)/);
 assert.match(html,/w\.setMode\('bot'\)/);
 assert.match(html,/w\.joinGame\(\)/);
});
test('unwanted lobby setup and floating launcher are removed only from view',()=>{
 assert.match(html,/#root main\.wrap>\.setup\s*,/);
 for(const selector of ['#root main.wrap>.nc30-settings','#root main.wrap>.nc30-achievements','#nc72-launch'])assert.ok(clean.includes(selector),selector);
 assert.match(clean,/display:none!important/);
 assert.match(clean,/style.id='nc95-clean-lobby'/);
 assert.ok(html.includes('window.NC72_ONLINE_OPEN')||html.includes('online-hub72.js'));
 assert.ok(html.includes('social70.js'));
 assert.ok(fs.existsSync('app/src/main/assets/expansion-ui.js'));
});
