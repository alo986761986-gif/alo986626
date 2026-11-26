'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const social=require('./social70.js');
const profile=require('./profile79.js');
const id='qa-profile-1',friend='qa-profile-2',other='qa-profile-3';
const allUsers=[id,friend,other];
social.firebase=async req=>{
 const user=req.headers['x-qa-user'];
 if(!allUsers.includes(user)){const e=new Error('Accedi con email o Google');e.status=401;throw e;}
 return user;
};
function makeReq(who,method,data){
 const req=Readable.from(method==='POST'?[JSON.stringify(data||{})]:[]);
 req.headers={'x-qa-user':who};req.method=method;return req;
}
async function runRoute(who,path,method='GET',data){
 let output;
 await profile.route(makeReq(who,method,data),(status,result)=>{output={status,data:result}},path);
 return output;
}
(async()=>{
 assert.equal(profile.streak(['2026-11-24','2026-11-25','2026-11-26'],'2026-11-26').days,3);
 assert.equal(profile.streak(['2026-11-24','2026-11-25'],'2026-11-26').days,2);
 assert.equal(profile.streak([],'2026-11-26').days,0);
 assert.equal((await runRoute(null,'/profile79/summary')).status,401);
 await profile.setup();const db=social.db();
 try{
  for(const [i,user] of allUsers.entries()){
   await db.query('INSERT INTO nc_social_users(uid,nickname,nickname_key) VALUES($1,$2,$3)',[user,'QA Profile '+(i+1),'qa profile '+(i+1)]);
  }
  let r=await runRoute(id,'/profile79/summary');
  assert.equal(r.status,200,JSON.stringify(r));
  assert.equal(r.data.info.level,1);assert.equal(r.data.info.trophies,0);assert.equal(r.data.info.unlocked,0);
  assert.equal(r.data.info.statsCertified,false);
  const day=new Date().toISOString().slice(0,10);
  for(let delta=2;delta>=0;delta--){
   const date=new Date(Date.now()-delta*86400000).toISOString().slice(0,10);
   await db.query('INSERT INTO nc_daily_rewards(uid,claim_date,reward_day,cycle,credits) VALUES($1,$2,$3,1,100)',[id,date,3-delta]);
  }
  await db.query("INSERT INTO nc_social_friends(requester,recipient,status) VALUES($1,$2,'pending')",[id,friend]);
  await db.query("INSERT INTO nc_social_friends(requester,recipient,status) VALUES($1,$2,'pending')",[other,id]);
  await db.query("INSERT INTO nc_chat_messages(sender,recipient,kind,body) VALUES($1,$2,'text','Ciao')",[id,friend]);
  await db.query("INSERT INTO nc_chat_messages(sender,recipient,kind,body) VALUES($1,$2,'text','Benvenuto')",[other,id]);
  r=await runRoute(id,'/profile79/missions');
  assert.equal(r.status,200);
  assert.equal(r.data.streak,3);
  assert.equal(r.data.missions.filter(x=>x.done).length,3,'Missions must derive from database events');
  for(const mission of ['bonus','friends','chat']){
   r=await runRoute(id,'/profile79/mission/claim','POST',{id:mission});
   assert.equal(r.status,200,JSON.stringify(r));
   assert.equal((await runRoute(id,'/profile79/mission/claim','POST',{id:mission})).status,409,'XP must not be duplicate');
  }
  r=await runRoute(id,'/profile79/boost/claim','POST',{days:3});
  assert.equal(r.status,200,JSON.stringify(r));
  assert.equal((await runRoute(id,'/profile79/boost/claim','POST',{days:3})).status,409);
  assert.equal((await runRoute(id,'/profile79/boost/claim','POST',{days:30})).status,409);
  r=await runRoute(id,'/profile79/summary');
  assert.equal(r.status,200);assert.equal(r.data.info.level,2);
  assert.equal(r.data.info.dailyClaims,3);
  assert.equal(r.data.info.missionClaims,3);
  assert.equal(r.data.info.boostClaims,1);
  assert.ok(r.data.info.unlocked>0);assert.ok(r.data.notificationCount>0);
  r=await runRoute(id,'/profile79/notifications');
  assert.equal(r.status,200);
  const notif=r.data.items;
  assert.ok(notif.some(x=>x.kind==='friends'),'Friend notifications are real');
  assert.ok(notif.some(x=>x.kind==='chat'),'Chat notifications are real');
  assert.equal((await runRoute(id,'/profile79/notifications/read','POST',{keys:['fake-other-user']})).status,403);
  r=await runRoute(id,'/profile79/notifications/read','POST',{keys:[notif[0].key]});
  assert.equal(r.status,200,JSON.stringify(r));
  const again=await runRoute(id,'/profile79/notifications');
  assert.ok(again.data.items.find(x=>x.key===notif[0].key).read);
  r=await runRoute(id,'/profile79/ranking');
  assert.equal(r.status,200);
  assert.ok(r.data.myPosition>=1);
  assert.ok(r.data.rows.some(x=>x.self&&x.xp>0));
  r=await runRoute(id,'/profile79/performance');
  assert.equal(r.status,200);assert.equal(r.data.certified,false);
  const jpeg=Buffer.concat([Buffer.from([255,216,255,224]),Buffer.alloc(200)]).toString('base64');
  assert.equal((await runRoute(id,'/profile79/photo/save','POST',{mime:'image/jpeg',base64:jpeg})).status,200);
  r=await runRoute(id,'/profile79/photo');
  assert.equal(r.status,200);assert.equal(r.data.base64,jpeg);
  assert.equal((await runRoute(friend,'/profile79/photo')).data.stored,false,'Photos must not leak to other accounts');
  assert.equal((await runRoute(id,'/profile79/photo/save','POST',{remove:true})).status,200);
  assert.equal((await runRoute(id,'/profile79/photo')).data.stored,false);
  console.log('PASS: account profile, authenticated photo, XP, missions, streak, achievements, ranking and notification permissions');
 }finally{await db.end();}
})().catch(e=>{console.error(e);process.exitCode=1});
