(function(g){
'use strict';
const LEGACY_KEY='nc47_wallet_v1';
const scope=g.NCRewardNative?.accountScope?.()||'guest';
const KEY='nc60_wallet:'+scope;
try{if(!localStorage.getItem(KEY)&&!localStorage.getItem('nc60_wallet_migrated')){const prior=localStorage.getItem(LEGACY_KEY);if(prior)localStorage.setItem(KEY,prior);localStorage.setItem('nc60_wallet_migrated','1');}}catch(e){}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Number.isSafeInteger(x.balance)&&x.balance>=0&&x.matches&&typeof x.matches==='object'){x.rewards=x.rewards||{};return x;}}catch(e){}return {balance:500,matches:{},rewards:{}};}
let w=load();function save(){localStorage.setItem(KEY,JSON.stringify(w));document.querySelectorAll('[data-nc-wallet]').forEach(e=>e.textContent=w.balance+' crediti');}
function transact(fn){const before=JSON.stringify(w);try{const result=fn();save();return result;}catch(e){w=JSON.parse(before);throw e;}}
function start(id){if(!id)return false;if(w.matches[id])return w.matches[id].status==='open';if(w.balance<100){notice();return false;}return transact(()=>{w.balance-=100;w.matches[id]={status:'open',time:Date.now()};return true;});}
function settle(id,amount){if(!w.matches[id]||w.matches[id].status!=='open')return false;if(!Number.isInteger(amount)||amount<0||amount>400)throw Error('Premio non valido');return transact(()=>{w.matches[id].status='settled';w.matches[id].amount=amount;w.balance+=amount;return true;});}
function rewardDialog(insufficient){
 if(document.getElementById('nc-wallet-dialog'))return;
 const d=document.createElement('section');d.id='nc-wallet-dialog';
 d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','nc-wallet-heading');
 d.style.cssText='position:fixed;inset:0;z-index:2147483646;overflow:auto;background:#071a16eF;display:grid;place-items:center;padding:20px;color:#f8e5ba;font:16px system-ui;text-align:center';
 d.innerHTML='<div style="max-width:380px;width:100%;padding:24px;border:1px solid #d4b36e;border-radius:20px;background:#17372c"><h2 id="nc-wallet-heading">'+(insufficient?'Crediti insufficienti':'Guadagna crediti')+'</h2><p>'+(insufficient?'Servono 100 crediti per iniziare una partita.':'Guarda un annuncio per ottenere crediti virtuali utilizzabili in tutti i giochi di carte.')+'</p><p><strong>Ricompensa: 350 crediti virtuali.</strong></p><button type="button" id="nc-wallet-ad" style="min-height:44px;max-width:100%;padding:12px">Guarda un annuncio · +350 crediti</button><p id="nc-wallet-status" role="status" aria-live="polite" style="font-size:13px;line-height:1.5">La durata dipende dall’annuncio. Puoi chiuderlo, ma il premio viene assegnato solo se Google conferma la ricompensa.</p><button type="button" id="nc-wallet-privacy" style="min-height:44px;padding:8px">Preferenze privacy</button><button type="button" id="nc-wallet-close" style="min-height:44px;padding:12px">Chiudi</button></div>';
 document.body.append(d);
 d.querySelector('#nc-wallet-close').onclick=()=>d.remove();
 d.querySelector('#nc-wallet-ad').onclick=()=>{
  if(typeof g.NCRewardNative?.show!=='function'){g.NC_AD_EVENT('error','Pubblicità disponibile nell’app Android aggiornata');return;}
  if(!scope.startsWith('uid:')){g.NC_AD_EVENT('error','Accedi al tuo account per ricevere il premio verificato.');return;}
  d.querySelector('#nc-wallet-ad').disabled=true;g.NCRewardNative.show();
 };
 d.querySelector('#nc-wallet-privacy').onclick=()=>{
  if(typeof g.NCRewardNative?.privacy!=='function'){g.NC_AD_EVENT('error','Preferenze pubblicitarie disponibili nell’app Android aggiornata');return;}
  g.NCRewardNative.privacy();
 };
}
function notice(){rewardDialog(true);}
function reward(){rewardDialog(false);}
function mount(root){if(!root||root.querySelector(':scope > .nc-wallet-strip'))return;const e=document.createElement('div');e.className='nc-wallet-strip';e.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px auto;padding:10px 14px;max-width:780px;border:1px solid #ac8d51;border-radius:12px;background:#152f26;color:#f6d592;font:600 14px system-ui';e.innerHTML='<span>🪙 <span data-nc-wallet></span></span><small>Ingresso 100 · virtuali</small>';root.prepend(e);e.querySelector('[data-nc-wallet]').textContent=w.balance+' crediti';}
function unique(){return 'cpu-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function can(){if(w.balance>=100)return true;notice();return false;}
function classic(s){if(!s||!s.roomId)return;const id='classic-'+s.roomId;if(s.status==='playing'&&!w.matches[id])start(id);if(s.status!=='finished'||!w.matches[id]||!Array.isArray(s.scores)||!s.scores.length)return;const best=Math.max(...s.scores.map(x=>Number(x.points)));const winners=s.scores.map((x,i)=>Number(x.points)===best?i:-1).filter(i=>i>=0);const team=s.players[s.seat]?.team;const index=s.scores.length===2&&s.seats===4&&team!=null?team:s.seat;const amount=winners.length>1?100:winners.includes(index)?Math.floor(s.seats*100/(s.scores.length===2&&s.seats===4&&team!=null?2:1)):0;settle(id,amount);}
g.NC_AD_EVENT=(status,message)=>{const el=document.getElementById('nc-wallet-status'),b=document.getElementById('nc-wallet-ad');if(el)el.textContent=message;if(b)b.disabled=status==='loading'||status==='showing';};
g.NC_AD_VERIFIED=(account,rows)=>{
 if(account!==scope||!scope.startsWith('uid:')||!Array.isArray(rows))return;
 try{
  let added=0;
  transact(()=>{for(const row of rows){
   if(!row||typeof row.transaction_id!=='string'||!row.transaction_id||row.transaction_id.length>256||row.amount!==350)continue;
   const id='ssv:'+row.transaction_id;
   if(Object.prototype.hasOwnProperty.call(w.rewards,id))continue;
   w.rewards[id]=Date.now();w.balance+=350;added+=350;
  }});
  if(added){g.NC_AD_EVENT('idle','+'+added+' crediti verificati! Saldo: '+w.balance);if(w.balance>=100){const d=document.getElementById('nc-wallet-dialog');if(d)setTimeout(()=>d.remove(),1800);}}
 }catch(e){g.NC_AD_EVENT('error','Impossibile salvare i crediti verificati. Riapri l’app.');}
};
g.NC_DAILY_VERIFIED=(account,rows,cumulative)=>{
 if(account!==scope||!scope.startsWith('uid:')||!Number.isSafeInteger(cumulative)||cumulative<0)return 0;
 const rewards=[100,150,200,300,400,500,1000,150,200,250,350,450,600,1200,200,250,300,400,500,700,1500,250,300,400,500,650,800,1000,1500,2500];
 let credited=0;
 try{
  transact(()=>{
   w.daily=w.daily||{};
   // Migration: include any previously synchronized per-date rewards in the baseline.
   const previous=Number.isSafeInteger(w.dailyCumulative)?w.dailyCumulative:Object.values(w.daily).reduce((n,v)=>n+(Number.isSafeInteger(v)?v:0),0);
   if(cumulative<previous)throw Error('Il totale server e inferiore al totale locale');
   for(const row of Array.isArray(rows)?rows:[]){
    if(!row||typeof row.id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.id))continue;
    if(!Number.isInteger(row.day)||row.day<1||row.day>30||row.credits!==rewards[row.day-1])continue;
    w.daily['daily:'+row.id]=row.credits;
   }
   credited=cumulative-previous;w.balance+=credited;w.dailyCumulative=cumulative;
  });
  if(credited)g.NC71_DAILY_UPDATE?.(credited,w.balance);
 }catch(e){g.NC71_DAILY_ERROR?.('Bonus non sincronizzato: verifica account o riprova.');}
 return credited;
};
g.NC_PLAY_VERIFIED=(account,rows)=>{
 if(account!==scope||!scope.startsWith('uid:')||!Array.isArray(rows))return;
 const allowed={coins_1000:1000,coins_2200:2200,coins_6000:6000,coins_13000:13000,coins_28000:28000,coins_75000:75000};
 try{let added=0;
 transact(()=>{w.play=w.play||{};for(const r of rows){
  if(!r||typeof r.transaction_id!=='string'||!/^[a-f0-9]{64}$/.test(r.transaction_id)
    ||!Object.prototype.hasOwnProperty.call(allowed,r.product_id)||r.amount!==allowed[r.product_id])continue;
  const key='play:'+r.transaction_id;if(Object.prototype.hasOwnProperty.call(w.play,key))continue;
  w.play[key]=Date.now();w.balance+=r.amount;added+=r.amount;
 }});
 if(added){g.NC_PLAY_EVENT?.('verified','Accreditati '+added.toLocaleString('it-IT')+' crediti verificati!');}
 }catch(e){g.NC_PLAY_EVENT?.('error','Errore sincronizzazione crediti Play');}
};
g.NCRewardNative?.sync();
g.NCPlayNative?.sync?.();
g.NC_WALLET={start,settle,can,mount,unique,reward,balance:()=>w.balance};
const oldJoin=g.joinGame;if(typeof oldJoin==='function')g.joinGame=async function(){if(!can())return;return oldJoin.apply(this,arguments);};
const oldGame=g.drawGame;if(typeof oldGame==='function')g.drawGame=function(s){classic(s);const out=oldGame.apply(this,arguments);mount(document.querySelector('#root'));return out;};
const oldLobby=g.drawLobby;if(typeof oldLobby==='function')g.drawLobby=function(){const out=oldLobby.apply(this,arguments);mount(document.querySelector('#root'));return out;};
mount(document.querySelector('#root'));
window.addEventListener('pageshow',()=>g.NCRewardNative?.sync());
})(window);
