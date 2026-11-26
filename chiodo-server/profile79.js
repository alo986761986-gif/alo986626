'use strict';
const social=require('./social70.js');
let setupPromise;
const MS=86400000;
const MISSIONS=[{id:'bonus',title:'Riscatta il bonus giornaliero',xp:15},{id:'friends',title:'Invia una richiesta di amicizia',xp:20},{id:'chat',title:'Scrivi a un amico',xp:15}];
const BOOSTS=[{days:3,xp:50},{days:7,xp:125},{days:14,xp:300},{days:30,xp:700}];
function fail(code,message){let e=new Error(message);e.status=code;throw e;}
function utc(v=new Date()){return v.toISOString().slice(0,10)}
function streak(dates,today=utc()){const values=new Set(dates.map(x=>x instanceof Date?utc(x):String(x).slice(0,10))),origin=Date.parse(today+'T00:00:00Z');const start=values.has(today)?0:1;let n=0,first=null;for(let i=start;i<366;i++){const date=utc(new Date(origin-i*MS));if(!values.has(date))break;n++;first=date;}return {days:n,start:first};}
async function setup(){
 if(!setupPromise)setupPromise=(async()=>{
  await social.initialize();await require('./daily71.js').setup();await require('./chat77.js').setup();const p=social.db();
  await p.query("CREATE TABLE IF NOT EXISTS nc_profile_photos(uid text PRIMARY KEY REFERENCES nc_social_users(uid) ON DELETE CASCADE,mime varchar(24) NOT NULL,content bytea NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
  await p.query("CREATE TABLE IF NOT EXISTS nc_profile_missions(uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,day_utc date NOT NULL,mission varchar(20) NOT NULL,xp integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(uid,day_utc,mission))");
  await p.query("CREATE TABLE IF NOT EXISTS nc_profile_boosts(uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,streak_start date NOT NULL,days integer NOT NULL,xp integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(uid,streak_start,days))");
  await p.query("CREATE TABLE IF NOT EXISTS nc_profile_notif_read(uid text NOT NULL REFERENCES nc_social_users(uid) ON DELETE CASCADE,key varchar(170) NOT NULL,read_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(uid,key))");
 })();
 try{await setupPromise}catch(e){setupPromise=null;throw e;}
}
async function account(p,uid){const r=await p.query('SELECT nickname,searchable,show_online FROM nc_social_users WHERE uid=$1',[uid]);if(!r.rowCount)fail(409,'Crea prima il nickname dalla sezione Amici');return r.rows[0];}
async function compute(p,uid){
 const [daily,missions,boosts,count,games,photo,dates]=await Promise.all([
 p.query('SELECT COUNT(*)::integer AS n FROM nc_daily_rewards WHERE uid=$1',[uid]),
 p.query('SELECT COUNT(*)::integer AS n,COALESCE(SUM(xp),0)::integer AS xp FROM nc_profile_missions WHERE uid=$1',[uid]),
 p.query('SELECT COUNT(*)::integer AS n,COALESCE(SUM(xp),0)::integer AS xp FROM nc_profile_boosts WHERE uid=$1',[uid]),
 p.query("SELECT (SELECT COUNT(*) FROM nc_social_friends WHERE status='accepted' AND (requester=$1 OR recipient=$1))::integer AS friends,(SELECT COUNT(*) FROM nc_chat_messages WHERE sender=$1)::integer AS messages",[uid]),
 p.query('SELECT game,played,wins,losses,draws,score FROM nc_social_stats WHERE uid=$1',[uid]),
 p.query('SELECT mime FROM nc_profile_photos WHERE uid=$1',[uid]),
 p.query('SELECT claim_date::text AS day FROM nc_daily_rewards WHERE uid=$1 ORDER BY claim_date DESC LIMIT 365',[uid])
 ]);
 const claims=Number(daily.rows[0].n),missionClaims=Number(missions.rows[0].n),boostClaims=Number(boosts.rows[0].n);
 const xp=claims*10+Number(missions.rows[0].xp)+Number(boosts.rows[0].xp);
 const friends=Number(count.rows[0].friends),messages=Number(count.rows[0].messages);
 const byGame=social.GAME_IDS.map(game=>games.rows.find(x=>x.game===game)||{game,played:0,wins:0,losses:0,draws:0,score:0});
 const totals=byGame.reduce((a,x)=>{for(const key of ['played','wins','losses','draws'])a[key]+=Number(x[key]);return a;},{played:0,wins:0,losses:0,draws:0});
 return{dailyClaims:claims,missionClaims,boostClaims,xp,level:1+Math.floor(xp/100),levelProgress:xp%100,
 friends,messages,streak:streak(dates.rows.map(x=>x.day)),hasPhoto:!!photo.rowCount,byGame,totals,statsCertified:false};
}
function achievements(data){
 const defs=[
 ['bonus1','Primo regalo','Riscatta il primo bonus',data.dailyClaims,1,false],
 ['bonus7','Sette regali','Riscatta sette bonus',data.dailyClaims,7,true],
 ['bonus30','Collezionista','Riscatta trenta bonus',data.dailyClaims,30,true],
 ['friend1','Prima amicizia','Ottieni un amico accettato',data.friends,1,false],
 ['friend5','Amici per sempre','Ottieni cinque amici accettati',data.friends,5,true],
 ['chat1','Prima conversazione','Invia un messaggio privato',data.messages,1,false],
 ['chat20','Conversatore','Invia venti messaggi',data.messages,20,true],
 ['mission3','Tre missioni','Riscatta tre premi missione',data.missionClaims,3,false],
 ['boost1','Primo slancio','Riscatta un premio Gran slancio',data.boostClaims,1,true]
 ];
 return defs.map(([id,title,description,progress,target,trophy])=>({id,title,description,progress:Math.min(progress,target),target,unlocked:progress>=target,trophy}));
}
async function missionData(p,uid,info){
 const day=utc();
 const [checks,claimed,rewards]=await Promise.all([
 p.query("SELECT (SELECT COUNT(*) FROM nc_daily_rewards WHERE uid=$1 AND claim_date=$2)::integer AS bonus,(SELECT COUNT(*) FROM nc_social_friends WHERE requester=$1 AND created_at>=$2::date AND created_at<($2::date+interval '1 day'))::integer AS friends,(SELECT COUNT(*) FROM nc_chat_messages WHERE sender=$1 AND created_at>=$2::date AND created_at<($2::date+interval '1 day'))::integer AS chat",[uid,day]),
 p.query('SELECT mission FROM nc_profile_missions WHERE uid=$1 AND day_utc=$2',[uid,day]),
 p.query('SELECT days FROM nc_profile_boosts WHERE uid=$1 AND streak_start=$2',[uid,info.streak.start||'1900-01-01'])
 ]);
 const redeemed=new Set(claimed.rows.map(x=>x.mission)),today=checks.rows[0];
 return{day,streak:info.streak.days,missions:MISSIONS.map(x=>({...x,done:Number(today[x.id])>0,claimed:redeemed.has(x.id)})),
 boosts:BOOSTS.map(x=>({...x,progress:Math.min(info.streak.days,x.days),ready:info.streak.days>=x.days,claimed:rewards.rows.some(y=>Number(y.days)===x.days)}))};
}
async function notifications(p,uid,mission){
 const [requests,acceptances,chat,seen]=await Promise.all([
 p.query("SELECT f.requester AS uid,u.nickname,f.created_at FROM nc_social_friends f JOIN nc_social_users u ON u.uid=f.requester WHERE f.recipient=$1 AND f.status='pending' ORDER BY f.created_at DESC LIMIT 40",[uid]),
 p.query("SELECT f.recipient AS uid,u.nickname,f.updated_at FROM nc_social_friends f JOIN nc_social_users u ON u.uid=f.recipient WHERE f.requester=$1 AND f.status='accepted' ORDER BY f.updated_at DESC LIMIT 30",[uid]),
 p.query("SELECT sender,u.nickname,MAX(m.id)::text AS newest,COUNT(*)::integer AS unread FROM nc_chat_messages m JOIN nc_social_users u ON u.uid=m.sender WHERE m.recipient=$1 AND m.read_at IS NULL GROUP BY sender,u.nickname ORDER BY MAX(m.id) DESC LIMIT 40",[uid]),
 p.query('SELECT key FROM nc_profile_notif_read WHERE uid=$1 ORDER BY read_at DESC LIMIT 500',[uid])
 ]);
 const items=[];
 for(const x of requests.rows)items.push({key:'request:'+x.uid+':'+new Date(x.created_at).getTime(),title:'Nuova richiesta di amicizia',detail:x.nickname+' vuole aggiungerti',kind:'friends'});
 for(const x of acceptances.rows)items.push({key:'accept:'+x.uid+':'+new Date(x.updated_at).getTime(),title:'Amicizia accettata',detail:x.nickname+' ha accettato',kind:'friends'});
 for(const x of chat.rows)items.push({key:'chat:'+x.sender+':'+x.newest,title:'Messaggi non letti',detail:x.nickname+' · '+x.unread+' messaggi',kind:'chat'});
 for(const x of mission.missions.filter(x=>x.done&&!x.claimed))items.push({key:'mission:'+mission.day+':'+x.id,title:'Missione completata',detail:x.title+' · '+x.xp+' XP',kind:'missions'});
 const read=new Set(seen.rows.map(x=>x.key));items.forEach(x=>x.read=read.has(x.key));items.sort((a,b)=>Number(a.read)-Number(b.read));
 return{items,unread:items.filter(x=>!x.read).length};
}
async function profileSummary(p,uid){
 const user=await account(p,uid),info=await compute(p,uid),ach=achievements(info),mission=await missionData(p,uid,info),notif=await notifications(p,uid,mission);
 return{profile:user,info:{...info,unlocked:ach.filter(x=>x.unlocked).length,trophies:ach.filter(x=>x.unlocked&&x.trophy).length},missions:mission,notificationCount:notif.unread};
}
async function rank(p,uid){
 const query="WITH base AS(SELECT u.uid,u.nickname,((SELECT COUNT(*) FROM nc_daily_rewards d WHERE d.uid=u.uid)*10+COALESCE((SELECT SUM(m.xp) FROM nc_profile_missions m WHERE m.uid=u.uid),0)+COALESCE((SELECT SUM(b.xp) FROM nc_profile_boosts b WHERE b.uid=u.uid),0))::integer AS xp FROM nc_social_users u WHERE u.searchable=true OR u.uid=$1),ranked AS(SELECT uid,nickname,xp,RANK() OVER(ORDER BY xp DESC,nickname ASC)::integer AS position FROM base) SELECT uid,nickname,xp,position FROM ranked WHERE position<=50 OR uid=$1 ORDER BY position LIMIT 51";
 const r=await p.query(query,[uid]);return{rows:r.rows.filter(x=>x.position<=50).map(x=>({nickname:x.nickname,xp:x.xp,position:x.position,self:x.uid===uid})),myPosition:r.rows.find(x=>x.uid===uid)?.position||null,basis:'Esperienza verificata da bonus e premi'};
}
function validateImage(data){
 if(!data||!['image/jpeg','image/png','image/webp'].includes(data.mime))fail(415,'Formato immagine non supportato');
 const str=data.base64;
 if(typeof str!=='string'||str.length>62000||!str||!/^[A-Za-z0-9+/]+={0,2}$/.test(str))fail(413,'Foto troppo grande');
 const img=Buffer.from(str,'base64');
 if(img.length<100||img.length>46000||img.toString('base64')!==str)fail(400,'Immagine non valida');
 const jpg=img[0]===255&&img[1]===216&&img[2]===255,png=[137,80,78,71,13,10,26,10].every((v,i)=>img[i]===v);
 const webp=img.subarray(0,4).toString()==='RIFF'&&img.subarray(8,12).toString()==='WEBP';
 if(!(data.mime==='image/jpeg'&&jpg||data.mime==='image/png'&&png||data.mime==='image/webp'&&webp))fail(400,'Contenuto immagine non valido');
 return{mime:data.mime,content:img};
}
async function readBody(req){
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>70000)fail(413,'Richiesta troppo grande');}
 try{const data=JSON.parse(raw||'{}');if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Dati non validi');return data}catch(e){if(e.status)throw e;fail(400,'JSON non valido');}
}
async function claimMission(p,uid,id){
 const mission=MISSIONS.find(x=>x.id===id);if(!mission)fail(400,'Missione non valida');
 const day=utc(),sql=id==='bonus'?'SELECT COUNT(*)::integer AS n FROM nc_daily_rewards WHERE uid=$1 AND claim_date=$2':
 id==='friends'?"SELECT COUNT(*)::integer AS n FROM nc_social_friends WHERE requester=$1 AND created_at>=$2::date AND created_at<($2::date+interval '1 day')":
 "SELECT COUNT(*)::integer AS n FROM nc_chat_messages WHERE sender=$1 AND created_at>=$2::date AND created_at<($2::date+interval '1 day')";
 const conn=await p.connect();
 try{
  await conn.query('BEGIN');await conn.query('SELECT pg_advisory_xact_lock(hashtextextended($1,20979))',[uid]);
  const check=await conn.query(sql,[uid,day]);if(!Number(check.rows[0].n))fail(409,'Completa prima questa missione');
  const r=await conn.query('INSERT INTO nc_profile_missions(uid,day_utc,mission,xp) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING mission',[uid,day,id,mission.xp]);
  if(!r.rowCount)fail(409,'Premio già riscattato');
  await conn.query('COMMIT');return{ok:true,xp:mission.xp};
 }catch(e){await conn.query('ROLLBACK').catch(()=>{});throw e;}finally{conn.release();}
}
async function claimBoost(p,uid,days){
 const item=BOOSTS.find(x=>x.days===days);if(!item)fail(400,'Traguardo non valido');
 const info=await compute(p,uid);if(!info.streak.start||info.streak.days<days)fail(409,'Traguardo non ancora raggiunto');
 const r=await p.query('INSERT INTO nc_profile_boosts(uid,streak_start,days,xp) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING days',[uid,info.streak.start,days,item.xp]);
 if(!r.rowCount)fail(409,'Premio continuità già riscosso');return{ok:true,xp:item.xp};
}
async function route(req,send,path){
 const routes={'/profile79/summary':'GET','/profile79/photo':'GET','/profile79/achievements':'GET','/profile79/performance':'GET','/profile79/ranking':'GET','/profile79/notifications':'GET','/profile79/missions':'GET','/profile79/photo/save':'POST','/profile79/mission/claim':'POST','/profile79/boost/claim':'POST','/profile79/notifications/read':'POST'};
 try{
  if(!Object.hasOwn(routes,path))return send(404,{error:'Endpoint sconosciuto'});
  if(req.method!==routes[path])return send(405,{error:'Metodo non consentito'});
  const uid=await social.firebase(req);await setup();const p=social.db();await account(p,uid);
  if(path==='/profile79/summary')return send(200,await profileSummary(p,uid));
  if(path==='/profile79/achievements')return send(200,{items:achievements(await compute(p,uid))});
  if(path==='/profile79/performance'){const info=await compute(p,uid);return send(200,{totals:info.totals,games:info.byGame,certified:false,note:'Le partite non sono ancora collegate a risultati verificabili per account. Nessuna vittoria viene inventata.'});}
  if(path==='/profile79/ranking')return send(200,await rank(p,uid));
  if(path==='/profile79/missions')return send(200,await missionData(p,uid,await compute(p,uid)));
  if(path==='/profile79/notifications')return send(200,await notifications(p,uid,await missionData(p,uid,await compute(p,uid))));
  if(path==='/profile79/photo'){const r=await p.query('SELECT mime,content FROM nc_profile_photos WHERE uid=$1',[uid]);return send(200,r.rowCount?{stored:true,mime:r.rows[0].mime,base64:r.rows[0].content.toString('base64')}:{stored:false});}
  const data=await readBody(req);
  if(path==='/profile79/photo/save'){
   if(data.remove===true){await p.query('DELETE FROM nc_profile_photos WHERE uid=$1',[uid]);return send(200,{saved:true,removed:true});}
   const photo=validateImage(data);await p.query('INSERT INTO nc_profile_photos(uid,mime,content) VALUES($1,$2,$3) ON CONFLICT(uid) DO UPDATE SET mime=EXCLUDED.mime,content=EXCLUDED.content,updated_at=now()',[uid,photo.mime,photo.content]);return send(200,{saved:true});
  }
  if(path==='/profile79/mission/claim')return send(200,await claimMission(p,uid,String(data.id||'')));
  if(path==='/profile79/boost/claim')return send(200,await claimBoost(p,uid,Number(data.days)));
  if(path==='/profile79/notifications/read'){
   const keys=Array.isArray(data.keys)?data.keys:[data.key];
   if(!keys.length||keys.length>100||keys.some(x=>typeof x!=='string'||x.length>170))fail(400,'Notifica non valida');
   const current=await notifications(p,uid,await missionData(p,uid,await compute(p,uid)));
   const allowed=new Set(current.items.map(x=>x.key));
   if(keys.some(x=>!allowed.has(x)))fail(403,'Notifica non autorizzata');
   for(const key of new Set(keys))await p.query('INSERT INTO nc_profile_notif_read(uid,key) VALUES($1,$2) ON CONFLICT DO NOTHING',[uid,key]);
   return send(200,{ok:true});
  }
 }catch(e){const status=e.status||500;if(status===500)console.error('Profile79:',e.message);return send(status,{error:status===500?'Profilo temporaneamente non disponibile':e.message});}
}
module.exports={route,setup,streak,achievements,validateImage,claimMission,claimBoost,missionData,compute};
