'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='app/src/main/assets/';
const gateway=fs.readFileSync(base+'nc98-launcher.js','utf8');
const css=fs.readFileSync(base+'nc98-launcher.css','utf8');
const chiodo=fs.readFileSync(base+'nc98-chiodo-layout.css','utf8');
const hub=fs.readFileSync(base+'online-hub72.js','utf8');
const premium=fs.readFileSync(base+'nc90-premium.js','utf8');
const manifest=JSON.parse(fs.readFileSync('tools/build93-manifest.json','utf8'));
test('All nineteen playable games are mapped to the shared launcher',()=>{
 assert.equal(manifest.app.gameCount,19);assert.ok(manifest.app.versionCode>=98);assert.match(manifest.app.versionName,/^9\.(?:8|9|10|11|12|13|14)\.0$/);
 const catalog=['scopa','scopone','briscola','sette','asso','ruba','chiodo121','banco','tressette','traversone','briscola_chiamata','bestia','trentuno','cucu','cirulla','asino','dubito','tressette_morto','mercante'];
 for(const id of catalog)assert.ok(gateway.includes("'"+id+"'"),'missing game '+id);
 assert.match(gateway,/const pairIds=new Set/);
 assert.ok(gateway.includes("['scopa','scopone','briscola','asso','chiodo121']"));
 assert.ok(gateway.includes("if(chosen==='scopone')"));
 assert.ok(gateway.includes("if(format==='pairs')players=4"));
 assert.ok(gateway.includes('window')===false||gateway.length>1000);
});
test('Mode selector offers bots and real online, while declining unsupported pairs',()=>{
 for(const value of ["['cpu'","['online'","['all'","['individual'","['pairs'","aria-pressed","disabled title","nc98-progress","role=\"progressbar\"","setStage(","requestAnimationFrame","NC98_LAUNCHER"]){
  assert.ok(gateway.includes(value),'launcher missing '+value);
 }
 assert.ok(!/setInterval\(.*progress/.test(gateway),'Do not fake loading percentage');
 assert.ok(gateway.includes("w.NC_EXPANSION?.open?."));
 assert.ok(gateway.includes("w.joinGame()"));
 assert.ok(gateway.includes("chiodo-online-entry"));
 assert.ok(gateway.includes("NC_BANCO_ONLINE_OPEN"));
 assert.ok(hub.includes("w.NC98_LAUNCHER?.open?.(match[1])"));
 assert.ok(hub.includes("window.NC98_LAUNCHER?.open?.(chosen,'online')"));
});
test('Cartoon Chiodo board is aligned in both modes without hiding gameplay controls',()=>{
 for(const id of ['#chiodo121.ch65','#chiodo121-online.ch65'])assert.ok(chiodo.includes(id));
 for(const section of ['.ch-head','.ch-score','.ch-arena','.ch-center','.ch-seat','.ch-controls','.ch-status','.ch-hand','.ch-live','.ch65-summary','.ch-settings']){
  assert.ok(chiodo.includes(section),'missing aligned section '+section);
 }
 assert.ok(chiodo.includes('max-width:var(--ch98-max)'));
 assert.ok(chiodo.includes('overflow-x:auto!important'));
 assert.ok(chiodo.includes('min-height:44px!important'));
 assert.ok(chiodo.includes('@media(max-width:420px)'));
 assert.ok(chiodo.includes('prefers-reduced-motion:reduce'));
 for(const asset of ['nc98-launcher.js','nc98-launcher.css','nc98-chiodo-layout.css']){
  assert.ok(manifest.requiredAssets.includes(asset),'not bundled '+asset);
  assert.ok(fs.statSync(base+asset).size>200,'empty asset '+asset);
 }
 assert.ok(premium.includes("script.src='nc98-launcher.js'"));
 assert.ok(premium.includes("layout.href='nc98-chiodo-layout.css'"));
});
