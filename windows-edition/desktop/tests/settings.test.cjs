'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const x=require('../settings.cjs');
const gameManifest=path.resolve(__dirname,'../../tools/build93-manifest.json');
test('19 games stay in Android source; desktop does not invent new rules',{skip:!require('node:fs').existsSync(gameManifest)&&'Requires pinned Android assets (automatically downloaded during Windows build)'},()=>{
 const m=JSON.parse(require('node:fs').readFileSync(gameManifest));
 assert.equal(m.app.gameCount,19);assert.equal(m.app.classicIds.length+m.app.separateGames.length+m.app.expansionIds.length,19);
});
test('social endpoints whitelist and query encoding',()=>{
 assert.match(x.socialRequest('search',{q:'Vincenzo & Anna'}).url,/q=Vincenzo\+%26\+Anna/);
 assert.equal(x.socialRequest('chatSend',{peer:'abc',text:'ciao'}).method,'POST');
 assert.equal(x.socialRequest('inviteBrowse',{}).method,'GET');
 assert.throws(()=>x.socialRequest('../../internal'),/non consentita/);
});
test('static file traversal blocked',()=>{
 assert.throws(()=>x.fileIn('/tmp/game','../secret'),/Percorso non valido/);
 assert.throws(()=>x.fileIn('/tmp/game','%2e%2e%2fsecret'),/Percorso non valido/);
 assert.throws(()=>x.fileIn('/tmp/game','a\\b'),/Percorso non valido/);
 assert.equal(x.fileIn('/tmp/game','index.html'),path.resolve('/tmp/game','index.html'));
});
test('all nineteen approved game identifiers are pinned to the Windows package',()=>{
 const catalog=require('../game-catalog.json');
 assert.equal(catalog.gameCount,19);
 const ids=[...catalog.classicIds,...catalog.separateGames,...catalog.expansionIds];
 assert.equal(new Set(ids).size,19);
 assert.ok(ids.includes('chiodo')&&ids.includes('banco')&&ids.includes('mercante'));
});

test('desktop expansion transport validates route, token, method and JSON',()=>{
 const token='a'.repeat(48);
 assert.equal(x.remoteRequest({url:'https://napoli-chiodo-121.onrender.com/expansion/state',token}).method,'GET');
 assert.equal(x.remoteRequest({url:'https://napoli-chiodo-121.onrender.com/expansion/move',method:'POST',body:'{"action":"play"}',token}).method,'POST');
 assert.equal(x.remoteRequest({url:'https://napoli-chiodo-121.onrender.com/lobby/status'}).method,'GET');
 for(const url of ['https://example.com/expansion/state','http://napoli-chiodo-121.onrender.com/expansion/state',
  'https://napoli-chiodo-121.onrender.com/private','https://napoli-chiodo-121.onrender.com/expansion/state?debug=1']){
  assert.throws(()=>x.remoteRequest({url}),/consentit|non valid|remot/i);
 }
 assert.throws(()=>x.remoteRequest({url:'https://napoli-chiodo-121.onrender.com/expansion/move',method:'GET'}),/non consentita/);
 assert.throws(()=>x.remoteRequest({url:'https://napoli-chiodo-121.onrender.com/expansion/move',method:'POST',body:'{"bad"'}),/JSON/);
 assert.throws(()=>x.remoteRequest({url:'https://napoli-chiodo-121.onrender.com/expansion/move',method:'POST',body:'{}',token:'guest'}),/Token/);
});
