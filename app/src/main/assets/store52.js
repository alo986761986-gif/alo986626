(function(){
'use strict';
const products=[['coins_1000','STARTER',1000,'0,99'],['coins_2200','BRONZE',2200,'1,99'],['coins_6000','SILVER',6000,'4,99'],['coins_13000','GOLD',13000,'9,99'],['coins_28000','PLATINUM',28000,'19,99'],['coins_75000','DIAMOND VIP',75000,'49,99']];
function open(){if(document.getElementById('nc52-store'))return;const d=document.createElement('section');d.id='nc52-store';d.style.cssText='position:fixed;inset:0;z-index:2147483645;overflow:auto;background:linear-gradient(145deg,#18382b,#081610);color:#f6e5bd;padding:18px;font:16px system-ui';d.innerHTML='<div style="max-width:520px;margin:auto"><button id="nc52-close">‹ Chiudi</button><h1>NAPOLI COIN STORE</h1><p>Saldo: <strong id="nc52-balance" data-nc-wallet></strong></p><section aria-labelledby="nc52-reward-title" style="border:1px solid #d3b470;border-radius:16px;padding:18px;margin:16px 0;background:linear-gradient(135deg,#31543a,#193a2b)"><h2 id="nc52-reward-title" style="font-size:20px;color:#f2d59b;margin:0 0 8px">Crediti con la pubblicità</h2><p style="font-size:14px;line-height:1.5">Guadagna 350 crediti virtuali con un annuncio. La ricompensa vale per tutti i giochi di carte e viene accreditata dopo la conferma di Google.</p><button type="button" id="nc52-reward" style="width:100%;min-height:48px;padding:12px;border:1px solid #e7cd8f;border-radius:11px;background:linear-gradient(#ead29a,#bc9652);color:#292419;font:800 15px system-ui">Guarda un annuncio · +350 crediti</button><p id="nc52-reward-status" role="status" style="font-size:12px;margin:8px 0 0;color:#c4d3bf">La visione è facoltativa.</p></section><p>Acquisti una tantum. I prezzi visualizzati sulla schermata di acquisto Google Play sono quelli applicabili.</p>'+products.map(p=>'<article style="border:1px solid #b69758;border-radius:16px;padding:16px;margin:12px 0;background:#203b2d"><strong>'+p[1]+'</strong><h2 style="color:#ebc879;margin:8px 0">'+p[2].toLocaleString('it-IT')+' crediti</h2><p>'+p[3]+' € prezzo indicativo · '+p[2]/100+' ingressi</p><button disabled data-product="'+p[0]+'">Non ancora disponibile</button></article>').join('')+'<p>Crediti esclusivamente virtuali, non trasferibili e non convertibili in denaro o premi reali.</p></div>';document.body.append(d);d.querySelector('#nc52-balance').textContent=String(window.NC_WALLET?.balance()??0)+' crediti';d.querySelector('#nc52-close').onclick=()=>d.remove();
 const status=document.createElement('p');status.id='nc52-play-status';status.setAttribute('role','status');
 status.style.cssText='font-size:13px;color:#c7dbcf;padding:4px 0';
 status.textContent='I prezzi ufficiali e la disponibilità vengono caricati da Google Play. Gli acquisti richiedono accesso e conferma server.';
 d.querySelector('#nc52-reward-title').closest('section').after(status);
 for(const b of d.querySelectorAll('[data-product]')){
  const sku=b.dataset.product;
  b.disabled=!playCatalog.has(sku)||typeof window.NCPlayNative?.buy!=='function';
  b.textContent=b.disabled?'Non disponibile su Google Play':'Acquista · '+playCatalog.get(sku);
  b.onclick=()=>{if(b.disabled||typeof window.NCPlayNative?.buy!=='function')return;status.textContent='Apertura acquisto Google Play…';window.NCPlayNative.buy(sku);};
 }
 window.NCPlayNative?.sync?.();
 d.querySelector('#nc52-reward').onclick=()=>{
  if(typeof window.NC_WALLET?.reward!=='function'){d.querySelector('#nc52-reward-status').textContent='La ricompensa non è disponibile. Riapri l’app aggiornata.';return;}
  d.remove();window.NC_WALLET.reward();
 };
 const info=document.createElement('section');
 info.setAttribute('aria-labelledby','nc52-privacy-title');
 info.style.cssText='border:1px solid #a98c57;border-radius:16px;padding:16px;margin:16px 0;background:#19352b';
 info.innerHTML='<h2 id="nc52-privacy-title" style="font-size:19px;margin:0 0 8px">Privacy e dati</h2><a id="nc52-privacy-policy" href="https://napoli-carte-3d-global.onrender.com/privacy" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;min-height:44px;padding:8px 10px;color:#f6e5bd;border:1px solid #a98c57;border-radius:9px;margin:8px 0">Informativa privacy</a><a id="nc52-account-deletion" href="https://napoli-carte-3d-global.onrender.com/account-deletion" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;min-height:44px;padding:8px 10px;color:#f6e5bd;border:1px solid #a98c57;border-radius:9px;margin:8px 0">Eliminazione account e dati</a><p style="font-size:13px;line-height:1.5;margin:10px 0 0">La pagina di eliminazione spiega come inviare una richiesta all’assistenza. Aprire il link non elimina automaticamente account o dati.</p>';
 d.querySelector('[aria-labelledby="nc52-reward-title"]').after(info);
 for(const [id,method] of [['nc52-privacy-policy','privacyPolicy'],['nc52-account-deletion','accountDeletion']]){
  d.querySelector('#'+id).onclick=event=>{
   if(typeof window.NCAppLinks?.[method]==='function'){
    event.preventDefault();window.NCAppLinks[method]();
   }
  };
 }
}
window.NC52_CLOSE_STORE=()=>{const e=document.getElementById('nc52-store');if(!e)return false;e.remove();return true;};
const playCatalog=new Map();
window.NC_PLAY_CATALOG=rows=>{playCatalog.clear();if(Array.isArray(rows))for(const r of rows){
 if(r&&typeof r.id==='string'&&typeof r.price==='string'&&r.price.length<48)playCatalog.set(r.id,r.price);
 }
 document.querySelectorAll('[data-product]').forEach(b=>{
  const sku=b.dataset.product,price=playCatalog.get(sku),real=typeof window.NCPlayNative?.buy==='function';
  b.disabled=!price||!real;
  b.textContent=price&&real?'Acquista · '+price:'Non disponibile su Google Play';
 });};
window.NC_PLAY_EVENT=(status,message)=>{
 for(const e of document.querySelectorAll('#nc52-play-status'))e.textContent=message;
 if(status==='verified')document.querySelectorAll('#nc52-balance').forEach(e=>e.textContent=(window.NC_WALLET?.balance()??0)+' crediti');
};
let queued=false;function refresh(){queued=false;document.querySelectorAll('.nc-wallet-strip').forEach(e=>{if(e.querySelector('.nc52-shop'))return;const b=document.createElement('button');b.type='button';b.className='nc52-shop';b.textContent='🪙 Negozio';b.style.cssText='border:1px solid #d2ad65;background:#36513b;color:#f6e5bd;border-radius:9px;padding:7px 10px';b.onclick=ev=>{ev.stopPropagation();open();};e.append(b);});}function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
})();
