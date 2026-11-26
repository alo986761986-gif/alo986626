'use strict';
// Real PostgreSQL integration test with synthetic users only. Firebase verification is
// replaced in this test PROCESS; production routes remain fully authenticated.
const assert=require('node:assert/strict');
const http=require('node:http');
const social=require('./social70.js');
const chat=require('./chat77.js');
social.firebase=async req=>{
 const user=req.headers['x-qa-user'];
 if(!['qa-user-a','qa-user-b','qa-user-c'].includes(user)){
  const e=new Error('Accedi con email o Google');e.status=401;throw e;
 }
 return user;
};
let db,server;
async function request(port,user,path,body){
 const options={headers:{}};
 if(user)options.headers['X-QA-User']=user;
 if(body!==undefined){options.method='POST';options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
 const response=await fetch('http://127.0.0.1:'+port+path,options);
 const data=await response.json();
 return {status:response.status,data};
}
async function run(){
 if(!process.env.DATABASE_URL||!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL))throw Error('Use a local ephemeral PostgreSQL database for this test');
 db=social.db();
 await chat.setup();
 for(const [uid,nickname] of [['qa-user-a','Alice QA'],['qa-user-b','Bob QA'],['qa-user-c','Charlie QA']]){
  await db.query('INSERT INTO nc_social_users(uid,nickname,nickname_key) VALUES ($1,$2,$3)',[uid,nickname,nickname.toLowerCase()]);
 }
 server=http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  const path=new URL(req.url,'http://localhost').pathname;
  chat.route(req,(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));},path)
   .catch(e=>{res.statusCode=500;res.end(JSON.stringify({error:e.message}));});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const a='qa-user-a',b='qa-user-b',c='qa-user-c',p=b;
 let r=await request(port,null,'/chat/threads');
 assert.equal(r.status,401,'Missing auth must be blocked');
 r=await request(port,a,'/chat/threads');
 assert.equal(r.status,200);
 assert.deepEqual(r.data.threads,[]);
 r=await request(port,a,'/chat/messages?peer='+p);
 assert.equal(r.status,403,'Strangers cannot read chats');
 r=await request(port,a,'/chat/send',{peer:p,kind:'text',text:'Hello'});
 assert.equal(r.status,403,'Strangers cannot send chats');
 await db.query("INSERT INTO nc_social_friends(requester,recipient,status) VALUES($1,$2,'pending')",[a,b]);
 r=await request(port,a,'/chat/send',{peer:p,kind:'text',text:'Hello'});
 assert.equal(r.status,403,'Pending friendships must not permit chatting');
 await db.query("UPDATE nc_social_friends SET status='accepted' WHERE requester=$1 AND recipient=$2",[a,b]);
 r=await request(port,a,'/chat/threads');
 assert.equal(r.status,200);
 assert.equal(r.data.threads[0].uid,b);
 r=await request(port,a,'/chat/send',{peer:p,kind:'text',text:'Ciao 😄'});
 assert.equal(r.status,200,'Text must be sent after acceptance: '+JSON.stringify(r));
 assert.equal(r.data.message.body,'Ciao 😄');
 const textId=r.data.message.id;
 r=await request(port,b,'/chat/messages?peer='+a);
 assert.equal(r.status,200);
 assert.equal(r.data.messages[0].id,textId);
 assert.equal(r.data.messages[0].sender,a);
 r=await request(port,b,'/chat/threads');
 assert.equal(r.data.threads.find(t=>t.uid===a).unread,1);
 r=await request(port,b,'/chat/read',{peer:a});
 assert.equal(r.status,200);
 assert.equal(r.data.marked,1);
 r=await request(port,b,'/chat/threads');
 assert.equal(r.data.threads.find(t=>t.uid===a).unread,0);
 const encoded=Buffer.alloc(256,42).toString('base64');
 r=await request(port,b,'/chat/send',{peer:a,kind:'voice',base64:encoded,mime:'audio/webm',duration:4});
 assert.equal(r.status,200,'Voice message must be stored: '+JSON.stringify(r));
 const audioId=r.data.message.id;
 r=await request(port,a,'/chat/audio?id='+audioId);
 assert.equal(r.status,200,'Recipient must be able to fetch voice');
 assert.equal(r.data.base64,encoded);
 r=await request(port,c,'/chat/audio?id='+audioId);
 assert.equal(r.status,403,'Outsiders cannot access private voice');
 r=await request(port,c,'/chat/messages?peer='+a);
 assert.equal(r.status,403,'Outsiders cannot access other conversations');
 await db.query("INSERT INTO nc_social_blocks(owner,blocked) VALUES($1,$2)",[a,b]);
 for(const [actor,other] of [[a,b],[b,a]]){
  r=await request(port,actor,'/chat/messages?peer='+other);
  assert.equal(r.status,403,'Blocked conversations must be inaccessible');
  r=await request(port,actor,'/chat/send',{peer:other,kind:'text',text:'Cannot send'});
  assert.equal(r.status,403,'Blocked messages must be rejected');
 }
 r=await request(port,a,'/chat/audio?id='+audioId);
 assert.equal(r.status,403,'Block also revokes previously recorded voice access');
 r=await request(port,a,'/chat/unknown');
 assert.equal(r.status,404);
 console.log('PASS: PostgreSQL private chat acceptance, nickname identity, text/emoji, unread, voice access, and block protections');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 if(db)await db.end();
});
