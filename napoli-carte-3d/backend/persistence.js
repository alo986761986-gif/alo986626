'use strict';
/* Optional PostgreSQL snapshot service: no credentials in source, DB-side JSONB.
   Single authoritative game-server instance. No shared-state claim for multiple replicas. */
const engine=require('./engine');
let pool=null,ready=false,dirty=false,writing=false,timer=null,retryTimer=null,stopping=false,lastError='',lastSaved=0,restored=0,attempts=0;
const enabled=!!process.env.DATABASE_URL;
function status(){return {configured:enabled,connected:ready,savedAt:lastSaved||null,recoveredRooms:restored,pending:dirty,error:lastError?String(lastError).slice(0,140):null}}
async function start(){
 if(!enabled||stopping)return status();
 try{
  const {Pool}=require('pg');
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:2,idleTimeoutMillis:15000,connectionTimeoutMillis:5000});
  pool.on('error',err=>{ready=false;lastError=err.message;});
  await pool.query('CREATE TABLE IF NOT EXISTS nc3d_runtime_snapshots (slot text primary key, snapshot jsonb not null, updated_at timestamptz not null default now())');
  const result=await pool.query('SELECT snapshot FROM nc3d_runtime_snapshots WHERE slot=$1 LIMIT 1',['global-v1']);
  if(result.rows.length&&engine.rooms.size===0){
   const outcome=engine.importSnapshot(result.rows[0].snapshot);
   restored=outcome.rooms;
  }else if(engine.rooms.size){
   // If players joined during a database outage, never overwrite live matches.
   dirty=true;
  }
  ready=true;lastError='';timer=setInterval(()=>{flush().catch(()=>{})},1800);timer.unref();
 }catch(err){
  lastError=err.message;ready=false;
  if(pool){try{await pool.end()}catch(e){}pool=null}
  // Operate in memory rather than prevent users from joining while DB is unavailable.
  if(!stopping&&!retryTimer){retryTimer=setTimeout(()=>{retryTimer=null;start().catch(()=>{})},15000);retryTimer.unref()}
 }
 return status();
}
function changed(){if(enabled)dirty=true}
async function flush(){
 if(!enabled||!pool||writing||!dirty)return false;
 writing=true;dirty=false;attempts++;
 try{
  const snap=engine.exportSnapshot();
  await pool.query('INSERT INTO nc3d_runtime_snapshots (slot,snapshot,updated_at) VALUES ($1,$2,now()) ON CONFLICT (slot) DO UPDATE SET snapshot=EXCLUDED.snapshot,updated_at=now()', ['global-v1',JSON.stringify(snap)]);
  ready=true;lastError='';lastSaved=Date.now();return true;
 }catch(err){dirty=true;ready=false;lastError=err.message;return false}
 finally{writing=false}
}
async function stop(){stopping=true;if(retryTimer){clearTimeout(retryTimer);retryTimer=null}if(timer){clearInterval(timer);timer=null}if(pool){
 const deadline=Date.now()+7000;
 while(writing&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 await flush();
 try{await pool.end()}catch(e){}pool=null;
}}
module.exports={enabled,start,changed,flush,stop,status};
