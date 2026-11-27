'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='app/src/main/assets/';
const css=fs.readFileSync(base+'nc97-chiodo-cartoon.css','utf8');
const gl=fs.readFileSync(base+'chiodo-scene65.js','utf8');
const loader=fs.readFileSync(base+'nc90-premium.js','utf8');
const local=fs.readFileSync(base+'chiodo.js','utf8');
const multi=fs.readFileSync(base+'chiodo-network.js','utf8');
const manifest=JSON.parse(fs.readFileSync('tools/build93-manifest.json','utf8'));
test('Both Chiodo 121 modes receive the cartoon theme and common game table',()=>{
 assert.equal(manifest.app.versionName,'9.7.0');
 assert.equal(manifest.app.versionCode,97);
 assert.equal(manifest.app.gameCount,19);
 assert.equal(manifest.app.minSdk,24);
 for(const id of ['#chiodo121','#chiodo121-online','#chiodo121.ch65','#chiodo121-online.ch65']){
  assert.ok(css.includes(id),'missing themed mode '+id);
 }
 for(const part of ['.ch-lobby','.ch-head','.ch-score','.ch-score-item','.ch-arena','.ch-felt','.ch-avatar','.ch-deck','.ch-top','.ch-hand','.ch-status','.ch-timer','.ch-controls','.ch-bubble','.ch-live','.ch65-summary','.ch-settings-panel']){
  assert.ok(css.includes(part),'missing cartoon element '+part);
 }
 assert.ok(local.includes('global.NC_CHIODO_TABLE'));
 assert.ok(multi.includes('window.NC_CHIODO_TABLE(root,view'));
 assert.ok(loader.includes("chiodo.href='nc97-chiodo-cartoon.css'"));
 for(const a of ['nc97-chiodo-cartoon.css','nc97-chiodo-emblem.svg','nc96-cardback.svg','nc96-cartoon-golfo.svg']){
  assert.ok(manifest.requiredAssets.includes(a),a+' not bundled');
  assert.ok(fs.statSync(base+a).size>200,a+' asset missing');
 }
});
test('Three-dimensional material palette uses cartoon cel shading, preserves fallback and camera',()=>{
 for(const term of ['float band=diffuse>.78?1.0','const palette=themes[prefs.theme]','webglcontextlost','webglcontextrestored',"root.dataset.ch65Render='fallback'","root.dataset.ch65Render='low'","rec.canvas.dataset.scene='ready'"]){
  assert.ok(gl.includes(term),'3D renderer regression '+term);
 }
 assert.ok(gl.includes('NAPOLI CARTOON CLUB'));
 for(const term of ['function draw(rec, name','function bust(rec, parent','function render(root,s','function dispose(root)'])assert.ok(gl.includes(term),term);
});
test('No game server, user privacy, API or voice files changed by cartoon CSS',()=>{
 assert.ok(multi.includes("const base='https://napoli-chiodo-121.onrender.com'"));
 assert.ok(multi.includes("window.NC_CHIODO_TABLE(root,view"));
 assert.ok(multi.includes("liveHost.className='nc23-live ch-live'"));
 assert.ok(local.includes("class Chiodo {"));
 assert.ok(local.includes("Chiodo.settlementAmount=settlementAmount"));
 assert.ok(!/https?:\/\//.test(css),'External CSS assets forbidden');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
