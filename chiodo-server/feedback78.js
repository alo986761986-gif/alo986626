'use strict';
// Authenticated user support reports. Never accept a client supplied account ID.
const social=require('./social70.js');
let ready=null;
const GAMES=new Set(['generale','scopa','scopone','briscola','sette','asso','ruba','chiodo121','chat','account','bonus','audio']);
const CATEGORIES=new Set(['bug','crash','accesso','online','grafica','audio','altro']);
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
async function initialize(){
 if(!ready)ready=(async()=>{
  const db=social.db();
  await db.query("CREATE TABLE IF NOT EXISTS nc_feedback_reports (id bigserial PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),uid text NOT NULL,category varchar(18) NOT NULL,game varchar(20) NOT NULL,description varchar(1500) NOT NULL,version varchar(32),status varchar(14) NOT NULL DEFAULT 'new')");
  await db.query("CREATE INDEX IF NOT EXISTS nc_feedback_rate_idx ON nc_feedback_reports(uid,created_at DESC)");
 })();
 try{await ready;}catch(e){ready=null;throw e;}
}
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Segnalazione non valida');
 const category=String(value.category||'').toLowerCase(),game=String(value.game||'').toLowerCase();
 if(!CATEGORIES.has(category)||!GAMES.has(game))fail(400,'Seleziona un problema e un gioco validi');
 const description=String(value.description||'').trim();
 if(description.length<15||description.length>1500)fail(400,'Descrivi il problema con almeno 15 caratteri (massimo 1500)');
 const version=String(value.version||'').trim();
 if(version.length>32||/[\x00-\x1f<>]/.test(version))fail(400,'Versione non valida');
 return {category,game,description,version};
}
async function route(req,send,path){
 try{
  if(path!=='/feedback/report')return send(404,{error:'Endpoint sconosciuto'});
  if(req.method!=='POST')return send(405,{error:'Metodo non valido'});
  const uid=await social.firebase(req);
  let raw='';
  for await(const chunk of req){raw+=chunk;if(raw.length>7000)fail(413,'Segnalazione troppo lunga');}
  let payload;try{payload=JSON.parse(raw||'{}')}catch(e){fail(400,'Dati non validi')}
  const data=validate(payload);
  await initialize();const db=social.db(),client=await db.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,78178))',[uid]);
   const count=await client.query("SELECT COUNT(*)::integer AS n FROM nc_feedback_reports WHERE uid=$1 AND created_at>now()-interval '24 hours'",[uid]);
   if(count.rows[0].n>=5)fail(429,'Limite di cinque segnalazioni in 24 ore raggiunto');
   const result=await client.query('INSERT INTO nc_feedback_reports(uid,category,game,description,version) VALUES($1,$2,$3,$4,$5) RETURNING id::text AS id',[uid,data.category,data.game,data.description,data.version||null]);
   await client.query('COMMIT');
   return send(201,{ok:true,reference:'NC-'+result.rows[0].id,message:'Segnalazione ricevuta'});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){
  const status=e.status||500;
  if(status===500)console.error('Feedback service:',e.message);
  return send(status,{error:status===500?'Impossibile registrare la segnalazione in questo momento':e.message});
 }
}
module.exports={route,initialize,validate};
