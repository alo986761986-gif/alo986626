'use strict';
// Daily rewards v7.1: server time, Firebase identity, atomic one-claim-per-UTC-day.
// Claims use unique (uid, UTC date); never accept client currency amounts.
const social=require('./social70.js');
const REWARDS=Object.freeze([100,150,200,300,400,500,1000,150,200,250,350,450,600,1200,200,250,300,400,500,700,1500,250,300,400,500,650,800,1000,1500,2500]);
let ready=null;
function day(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
async function setup(){
 if(!ready)ready=(async()=>{
  await social.initialize();
  const db=social.db();
  await db.query(`CREATE TABLE IF NOT EXISTS nc_daily_rewards (
    uid text NOT NULL, claim_date date NOT NULL, reward_day integer NOT NULL CHECK(reward_day BETWEEN 1 AND 30),
    cycle integer NOT NULL DEFAULT 1 CHECK(cycle>=1), credits integer NOT NULL CHECK(credits>0),
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(uid,claim_date))`);
  await db.query('CREATE INDEX IF NOT EXISTS nc_daily_rewards_user_history ON nc_daily_rewards(uid,created_at)');
 })();
 try{await ready;}catch(e){ready=null;throw e;}
}
async function status(uid){
 await setup();const db=social.db();
 const r=await db.query('SELECT claim_date::text AS claim_date,reward_day,cycle,credits FROM nc_daily_rewards WHERE uid=$1 ORDER BY claim_date DESC LIMIT 90',[uid]);
 const rows=r.rows,claimedToday=rows.some(x=>x.claim_date===day());
 const total=await db.query('SELECT COUNT(*)::integer AS count FROM nc_daily_rewards WHERE uid=$1',[uid]);
 const summed=await db.query('SELECT COALESCE(SUM(credits),0)::bigint AS credits FROM nc_daily_rewards WHERE uid=$1',[uid]);
 const cumulativeCredits=Number(summed.rows[0].credits);
 const count=total.rows[0].count, nextDay=count%REWARDS.length+1;
 return {serverDate:day(),claimedToday,cumulativeCredits,nextDay,nextCredits:REWARDS[nextDay-1],history:rows.map(x=>({id:x.claim_date,date:x.claim_date,day:x.reward_day,credits:x.credits})),schedule:REWARDS,cycle:Math.floor(count/REWARDS.length)+1};
}
async function claim(uid){
 await setup();const db=social.db(),client=await db.connect();
 try{
  await client.query('BEGIN');
  // Serialize concurrent requests from every instance for the same Firebase user.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 71471))',[uid]);
  const today=day();
  const old=await client.query('SELECT claim_date::text AS claim_date,reward_day,credits FROM nc_daily_rewards WHERE uid=$1 AND claim_date=$2',[uid,today]);
  if(old.rowCount){await client.query('COMMIT');return {awarded:false,alreadyClaimed:true,date:today,credits:0};}
  const previous=await client.query('SELECT COUNT(*)::integer AS count FROM nc_daily_rewards WHERE uid=$1',[uid]);
  const count=previous.rows[0].count, dayNumber=count%30+1, credits=REWARDS[dayNumber-1];
  await client.query('INSERT INTO nc_daily_rewards(uid,claim_date,reward_day,cycle,credits) VALUES($1,$2,$3,$4,$5)',[uid,today,dayNumber,Math.floor(count/30)+1,credits]);
  await client.query('COMMIT');
  return {awarded:true,alreadyClaimed:false,date:today,day:dayNumber,credits};
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
 finally{client.release();}
}
async function route(req,send,path){
 try{
  if(!['/daily/status','/daily/claim'].includes(path))return send(404,{error:'Endpoint sconosciuto'});
  if(req.method!==(path==='/daily/status'?'GET':'POST'))return send(405,{error:'Metodo non consentito'});
  const uid=await social.firebase(req);
  if(path==='/daily/status')return send(200,await status(uid));
  return send(200,await claim(uid));
 }catch(e){console.error('daily reward:',e.message);return send(e.status||503,{error:e.status===401?e.message:'Bonus temporaneamente non disponibile'});}
}
module.exports={route,REWARDS,day,status,claim};
