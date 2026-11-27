'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {clientConfigured,pkce,openGoogleOAuth}=require('../google-auth.cjs');
test('client Google desktop requires a real Google OAuth client id',()=>{
 assert.equal(clientConfigured(''),false);
 assert.equal(clientConfigured('fake_client_id'),false);
 assert.equal(clientConfigured('12345-example.apps.googleusercontent.com'),true);
});
test('OAuth PKCE is random per login and SHA256-verifiable',()=>{
 const crypto=require('node:crypto');
 const a=pkce(),b=pkce();
 assert.notEqual(a.state,b.state);
 assert.notEqual(a.verifier,b.verifier);
 assert.equal(a.challenge,crypto.createHash('sha256').update(a.verifier).digest('base64url'));
});
test('desktop OAuth callback verifies state and opens browser safely',async()=>{
 const result=await openGoogleOAuth({clientId:'12345-example.apps.googleusercontent.com',timeoutMs:2000,openExternal:async auth=>{
  const u=new URL(auth);const state=u.searchParams.get('state');
  assert.equal(u.origin,'https://accounts.google.com');
  assert.equal(u.searchParams.get('code_challenge_method'),'S256');
  assert.ok(state.length>=20);
  const r=await fetch(u.searchParams.get('redirect_uri')+'?code=demo-code&state='+encodeURIComponent(state));
  assert.equal(r.status,200);
 }});
 assert.equal(result.code,'demo-code');
 assert.equal(result.clientId,'12345-example.apps.googleusercontent.com');
 assert.match(result.redirectUri,/^http:\/\/127\.0\.0\.1:\d+\/oauth2callback$/);
});
test('OAuth callback rejects mismatched state',async()=>{
 await assert.rejects(openGoogleOAuth({clientId:'12345-example.apps.googleusercontent.com',timeoutMs:2000,openExternal:async auth=>{
  const u=new URL(auth);
  const r=await fetch(u.searchParams.get('redirect_uri')+'?code=demo-code&state=WRONG');
  assert.equal(r.status,403);
 }}),/Stato OAuth non valido/);
});
