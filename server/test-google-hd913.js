'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
test('Google Android uses Credential Manager and still signs into original Firebase',()=>{
 const java=read('app/src/main/java/it/napolicarte/game/AccountActivity.java');
 const gradle=read('app/build.gradle');
 assert.match(java,/CredentialManager\.create\(this\)/);
 assert.match(java,/GetSignInWithGoogleOption/);
 assert.match(java,/GoogleIdTokenCredential\.createFrom/);
 assert.match(java,/signInWithCredential\(GoogleAuthProvider\.getCredential\(idToken,null\)\)/);
 assert.match(gradle,/credentials-play-services-auth:1\.3\.0/);
});
test('Desktop Google ID is configured by trusted IPC, not a bundled secret',()=>{
 const main=read('windows-edition/desktop/main.cjs'),ui=read('windows-edition/desktop/login.html');
 assert.match(main,/napoli:google-configure/);
 assert.match(main,/clientConfigured\(id\.trim\(\)\)/);
 assert.match(main,/assertLocal\(event\);return configureGoogleClient/);
 assert.match(ui,/id="googleId"/);
 assert.match(ui,/NCDesktop\.googleConfigure/);
});
test('HD/Full HD effects load after the cartoon theme and respect reduced motion',()=>{
 const entry=read('app/src/main/assets/nc90-premium.js');
 const css=read('app/src/main/assets/nc913-hd-motion.css');
 const js=read('app/src/main/assets/nc913-hd-motion.js');
 assert.match(entry,/nc913-hd-motion\.css/);
 assert.match(entry,/nc913-hd-motion\.js/);
 assert.match(css,/@media\(min-width:1200px\)/);
 assert.match(css,/@media\(min-width:1800px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(js,/new MutationObserver\(queue\)/);
 assert.doesNotMatch(js,/fetch\(|WebSocket|localStorage\.setItem/);
});
