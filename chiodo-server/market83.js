'use strict';
// Server-authoritative cosmetic catalog / ownership (NC Market 8.3).
// Do not grant items from WebView/localStorage or trust client-supplied prices.
const social=require('./social70.js');
const groups=[
 ['table',['Napoli e Vesuvio','Costiera Amalfitana','Casinò Royal','Atlantide','Cyber Neon','Palazzo Reale','Napoli Antica','Natale a Napoli','Halloween','Discoteca 90','Giardino Zen','Spazio Galattico'],1500,1200],
 ['avatar',['Partenope','Vesuvio','Marinaio','Re di Denari','Regina di Coppe','Cavaliere','Pulcinella','Stella','Gatto Nero','Fenice','Leone','Dragone','Astronauta','Sirena','Pirati','DJ Neon','Sole','Luna','Imperatore','Diamante'],500,330],
 ['frame',['Bronzo','Argento','Oro','Platino','Diamante','Vesuvio','Mare','Corallo','Neon','Gloria','Reale','Luna','Stelle','Fuoco','Ghiaccio','Smeraldo','Rubino','Zaffiro','Arcobaleno','Vintage','Barocco','Minimal','Leggenda','Napoli','Campione','VIP','Festival','Inverno','Estate','Galassia'],300,130],
 ['cards',['Classico Rosso','Blu Napoli','Vesuvio','Barocco','Regale','Neon','Costiera','Notte','Oro','Argento','Smeraldo','Mosaico','Stelle','Fiori','Vintage'],400,300],
 ['effects',['Scintille','Coriandoli','Fuochi','Luci di Napoli','Onda Marina','Stelle Cadenti','Neon Pulse','Oro Brillante','Vesuvio','Champagne','Arcobaleno','Cuori','Glitter','Esplosione Blu','Festa','Corona','Aurora','Galassia','Vento','Diamante'],300,290]
];
const CATALOG=Object.freeze(groups.flatMap(([type,names,base,step])=>names.map((name,i)=>Object.freeze({id:type+'_'+(i+1),type,name,price:base+i*step}))));
const ITEMS=new Map(CATALOG.map(item=>[item.id,item]));
let ready=null;
function error(status,message){const e=new Error(message);e.status=status;return e;}
function spendingEnabled(){return process.env.NC_MARKET_SPENDING_ENABLED==='true'&&process.env.NC_MARKET_LEDGER_RECONCILED==='true';}
async function setup(){
 if(!ready)ready=(async()=>{
  await social.initialize();
  await require('./daily71.js').setup();
  const db=social.db();
  // Existing Google Play backend uses this same schema.
  await db.query(`CREATE TABLE IF NOT EXISTS nc_play_purchases (
   token_hash varchar(64) PRIMARY KEY,firebase_uid text NOT NULL,
   product_id text NOT NULL,credits integer NOT NULL CHECK(credits>0),
   order_id text,consumed_at timestamptz,received_at timestamptz NOT NULL DEFAULT now())`);
  // AdMob callbacks are only credited after verified Google ECDSA SSV.
  await db.query("CREATE TABLE IF NOT EXISTS nc_admob_rewards (transaction_id varchar(128) PRIMARY KEY, firebase_uid text NOT NULL, amount integer NOT NULL CHECK(amount=350), rewarded_at timestamptz NOT NULL DEFAULT now())");
  await db.query(`CREATE TABLE IF NOT EXISTS nc_market_purchases (
   uid text NOT NULL,item_id text NOT NULL,price integer NOT NULL CHECK(price>0),
   purchased_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(uid,item_id))`);
  await db.query(`CREATE TABLE IF NOT EXISTS nc_market_equipment (
   uid text NOT NULL,category text NOT NULL,item_id text NOT NULL,
   updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(uid,category))`);
 })().catch(e=>{ready=null;throw e;});
 return ready;
}
async function account(client,uid){
 // Verified grants only. Gameplay/localStorage balances are deliberately excluded.
 const r=await client.query(`SELECT
  (SELECT COALESCE(SUM(credits),0) FROM nc_play_purchases WHERE firebase_uid=$1)::bigint AS play,
  (SELECT COALESCE(SUM(credits),0) FROM nc_daily_rewards WHERE uid=$1)::bigint AS daily,
  (SELECT COALESCE(SUM(amount),0) FROM nc_admob_rewards WHERE firebase_uid=$1)::bigint AS admob,
  (SELECT COALESCE(SUM(price),0) FROM nc_market_purchases WHERE uid=$1)::bigint AS spent`,[uid]);
 const row=r.rows[0],play=Number(row.play),daily=Number(row.daily),admob=Number(row.admob),spent=Number(row.spent);
 if(![play,daily,admob,spent].every(n=>Number.isSafeInteger(n)&&n>=0))throw error(503,'Saldo non disponibile');
 const verifiedGranted=play+daily+admob;
 if(!Number.isSafeInteger(verifiedGranted)||spent>verifiedGranted)throw error(503,'Saldo non riconciliato');
 return {balance:verifiedGranted-spent,verifiedGranted,spent};
}
async function read(uid,client=social.db()){
 const [balance,owned,equipped]=await Promise.all([
  account(client,uid),
  client.query('SELECT item_id FROM nc_market_purchases WHERE uid=$1 ORDER BY purchased_at,item_id',[uid]),
  client.query('SELECT category,item_id FROM nc_market_equipment WHERE uid=$1',[uid])
 ]);
 return {...balance,owned:owned.rows.map(x=>x.item_id),equipped:Object.fromEntries(equipped.rows.map(x=>[x.category,x.item_id]))};
}
async function purchase(uid,itemId){
 const item=ITEMS.get(itemId);
 if(!item)throw error(400,'Articolo non valido');
 if(!spendingEnabled())throw error(503,'Acquisti cosmetici non ancora attivati');
 const db=social.db(),client=await db.connect();
 try{
  await client.query('BEGIN');
  // Per-user DB lock guarantees atomicity across servers and simultaneous devices.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 83083))',[uid]);
  const already=await client.query('SELECT 1 FROM nc_market_purchases WHERE uid=$1 AND item_id=$2',[uid,item.id]);
  if(already.rowCount){
   const s=await read(uid,client);await client.query('COMMIT');
   return {ok:true,alreadyOwned:true,itemId:item.id,...s};
  }
  const s=await account(client,uid);
  if(s.balance<item.price)throw error(409,'Crediti Market verificati insufficienti');
  await client.query('INSERT INTO nc_market_purchases(uid,item_id,price) VALUES($1,$2,$3)',[uid,item.id,item.price]);
  const updated=await read(uid,client);
  await client.query('COMMIT');
  return {ok:true,alreadyOwned:false,itemId:item.id,charged:item.price,...updated};
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
 finally{client.release();}
}
async function equip(uid,itemId){
 const item=ITEMS.get(itemId);if(!item)throw error(400,'Articolo non valido');
 const db=social.db();
 const owned=await db.query('SELECT 1 FROM nc_market_purchases WHERE uid=$1 AND item_id=$2',[uid,item.id]);
 if(!owned.rowCount)throw error(403,'Acquista prima questo articolo');
 await db.query(`INSERT INTO nc_market_equipment(uid,category,item_id) VALUES($1,$2,$3)
  ON CONFLICT(uid,category) DO UPDATE SET item_id=excluded.item_id,updated_at=now()`,[uid,item.type,item.id]);
 return {ok:true,...await read(uid)};
}
async function parseBody(req){
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw error(413,'Richiesta troppo grande');}
 let x;try{x=JSON.parse(raw||'{}');}catch(e){throw error(400,'JSON non valido');}
 if(!x||Array.isArray(x)||typeof x!=='object'||typeof x.itemId!=='string'||x.itemId.length>60)throw error(400,'Articolo non valido');
 return x;
}
async function route(req,send,path){
 if(!['/market/catalog','/market/state','/market/buy','/market/equip'].includes(path))return send(404,{error:'Endpoint sconosciuto'});
 const readOnly=path==='/market/catalog'||path==='/market/state';
 if(req.method!==(readOnly?'GET':'POST'))return send(405,{error:'Metodo non consentito'});
 if(path==='/market/catalog')return send(200,{version:83,items:CATALOG,spendingEnabled:spendingEnabled()});
 try{
  const uid=await social.firebase(req);
  await setup();
  if(path==='/market/state')return send(200,{version:83,items:CATALOG,spendingEnabled:spendingEnabled(),...await read(uid)});
  const input=await parseBody(req);
  return send(200,path==='/market/buy'?await purchase(uid,input.itemId):await equip(uid,input.itemId));
 }catch(e){
  const status=e.status||503;
  if(status>=500)console.error('market route',e.message);
  return send(status,{error:status>=500?(status===503&&e.message==='Acquisti cosmetici non ancora attivati'?e.message:'Market temporaneamente non disponibile'):e.message});
 }
}
module.exports={CATALOG,ITEMS,spendingEnabled,setup,account,read,purchase,equip,route};
