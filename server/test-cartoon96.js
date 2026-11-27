'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const A='app/src/main/assets/';
const style=fs.readFileSync(A+'nc96-cartoon.css','utf8');
const loader=fs.readFileSync(A+'nc90-premium.js','utf8');
const manifest=JSON.parse(fs.readFileSync('tools/build93-manifest.json','utf8'));
test('Cartoon 9.6 applies to all 19 card games without touching rules',()=>{
 assert.equal(manifest.app.gameCount,19);
 assert.ok(manifest.app.versionCode>=96);
 assert.match(manifest.app.versionName,/^9\.(?:6|7|8|9|10|11|12|13)\.0$/);
 assert.equal(manifest.app.minSdk,24);
 assert.equal(manifest.app.targetSdk,36);
 const groups=[
  'body.nc90-in-lobby #root button.game',
  'body.nc90-in-game #root .board',
  'body.nc90-in-game #root .playing-card',
  '.ncx-screen','.ncx-config','.ncx-table','.ncx-card',
  '#nc91-banco','#nc92-online','.ch-felt','.ch-avatar'];
 for(const selector of groups)assert.ok(style.includes(selector),'Missing cartoon surface: '+selector);
 for(const asset of ['nc96-cartoon.css','nc96-cartoon-golfo.svg','nc96-avatar.svg','nc96-cardback.svg']){
  assert.ok(fs.statSync(A+asset).size>500,'Missing drawing: '+asset);
  assert.ok(manifest.requiredAssets.includes(asset),'Missing release requirement: '+asset);
 }
 assert.ok(loader.includes("link.href='nc96-cartoon.css'"));
 assert.ok(loader.includes("w.addEventListener('load',loadCartoonEdition"));
 assert.ok(!style.includes('@import '),'No dynamic stylesheet requests');
 assert.ok(!/https?:\/\//.test(style),'No external imagery or trackers');
});
test('original Naples artwork remains available and movement-reduction is respected',()=>{
 assert.ok(fs.existsSync(A+'nc90-napoli-bay.svg'));
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(style,/body\.nc90-in-game #root \.player/);
 assert.match(style,/body\.nc90-in-game #root \.opponent-cards \.back/);
 const html=fs.readFileSync(A+'index.html','utf8');
 for(const game of manifest.app.classicIds)assert.ok(html.includes("'"+game+"'"),'Classic game missing '+game);
 const assets=manifest.app.expansionIds.map(id=>id);
 assert.equal(assets.length,11);
});
