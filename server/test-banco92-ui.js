'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='app/src/main/assets/';
const html=fs.readFileSync(base+'index.html','utf8');
const online=fs.readFileSync(base+'banco92-online.js','utf8');
const css=fs.readFileSync(base+'banco92-online.css','utf8');
const local=fs.readFileSync(base+'banco91.js','utf8');
const native=fs.readFileSync('app/src/main/java/it/napolicarte/game/MainActivity.java','utf8');
const back=fs.readFileSync(base+'compat81.js','utf8');
const backend=fs.readFileSync('chiodo-server/banco92.js','utf8');
test('Online Smorfia assets installed after local game',()=>{
 for(const file of ['banco92-online.js','banco92-online.css'])assert(html.includes(file));
 assert(html.indexOf('banco91.js')<html.indexOf('banco92-online.js'));
});
test('Native Firebase bridge supports room discovery, join, state, start and leave',()=>{
 for(const op of ['b92Rooms','b92State','b92Join','b92Start','b92Leave'])assert(native.includes('"'+op+'"')||native.includes('|'+op),op);
 for(const endpoint of ['banco92/rooms','banco92/state','banco92/join','banco92/start','banco92/leave'])assert(native.includes(endpoint),endpoint);
 assert(native.includes('if("b92State".equals(operation))url+="?roomId="'));
 assert(online.includes("w.NC70_SOCIAL.call(action,data)"));
});
test('Lobby has 6-player quick, 12-player public and private invite modes',()=>{
 assert(online.includes('Fino a 6 partecipanti'));
 assert(online.includes('Fino a 12 partecipanti'));
 assert(online.includes('Codice invito'));
 assert(online.includes("'private','code'")||online.includes("['public','quick','private','code']"));
 assert(online.includes('nc92-launch'));
});
test('Online results are not decided or charged on the device',()=>{
 assert(online.includes("snapshot.awards"));
 assert(online.includes("snapshot.drawn"));
 assert(!online.includes('core.draw(game)'));
 assert(!online.includes('NC_WALLET.buy'));
 assert(backend.includes("core.scan({tickets:"));
 assert(backend.includes("const uid=await social.firebase(req)"));
});
test('System back and local-to-online navigation are supported',()=>{
 assert(back.includes('w.NC_BANCO_ONLINE_CLOSE?.()'));
 assert(local.includes("data-nc91=\"online\""));
 assert(local.includes('w.NC_BANCO_ONLINE_OPEN?.()'));
 assert(online.includes('NC_BANCO_ONLINE_OPEN=open'));
 assert(css.includes('nc92-roomcode'));
 assert(css.includes('max-width:720px'));
});
test('Android 9.2.0 package configured',()=>{
 const build=fs.readFileSync('app/build.gradle','utf8');
 assert.match(build,/versionCode (?:92|93|94|95)\b/);
 assert.match(build,/versionName '9\.(?:2|3|4|5)\.0'/);
});
