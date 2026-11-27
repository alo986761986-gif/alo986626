'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='app/src/main/';
const read=p=>fs.readFileSync(root+p,'utf8');

test('GAMES STUDIOS boots before account without a second launcher',()=>{
 const manifest=read('AndroidManifest.xml');
 const splash=read('java/it/napolicarte/game/SplashActivity.java');
 const account=read('java/it/napolicarte/game/AccountActivity.java');
 const main=read('java/it/napolicarte/game/MainActivity.java');
 assert.equal((manifest.match(/android.intent.action.MAIN/g)||[]).length,1);
 assert.match(manifest,/<activity android:name="\.SplashActivity" android:exported="true"/);
 assert.match(manifest,/<activity android:name="\.AccountActivity" android:exported="false"/);
 assert.match(splash,/getAssets\(\)\.open\("studio\.jpg"\)/);
 assert.match(splash,/new Intent\(SplashActivity\.this, AccountActivity\.class\)/);
 assert.match(account,/auth\.signInWithEmailAndPassword/);
 assert.match(account,/GoogleAuthProvider\.getCredential/);
 assert.match(account,/Gioca come ospite/);
 assert.match(account,/Accedi e gioca/);
 assert.match(account,/Registrazione/);
 assert.match(main,/web\.setAlpha\(0f\)/);
 assert.match(main,/getElementById\('nc-studio-boot'\)/);
 assert.match(main,/view\.setAlpha\(1f\)/);
});

test('Native progress reflects actual WebView page progress',()=>{
 const main=read('java/it/napolicarte/game/MainActivity.java');
 assert.match(main,/onProgressChanged\(WebView view,int progress\)/);
 assert.match(main,/pageProgress\.setProgress\(Math\.max\(0,Math\.min\(100,progress\)\)\)/);
 assert.match(main,/Caricamento gioco/);
});

test('Chiodo offline and online fit compact phones with usable touch targets',()=>{
 const css=read('assets/nc98-chiodo-layout.css');
 assert.match(css,/@media \(max-width: 380px\) and \(orientation: portrait\)/);
 assert.match(css,/@media \(max-height: 620px\) and \(orientation: portrait\)/);
 assert.match(css,/#chiodo121\.ch65,#chiodo121-online\.ch65/);
 assert.match(css,/\.ch-controls button.*min-height:44px!important/);
 assert.match(css,/height:clamp\(190px,35dvh,265px\)/);
});
