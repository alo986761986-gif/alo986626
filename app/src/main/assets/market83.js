(function(g){
'use strict';
if(g.NC_MARKET_OPEN)return;
const entries=[];
function add(type,names,base,step,emoji){names.forEach((name,i)=>entries.push({id:type+'_'+(i+1),type,name,price:base+i*step,emoji}));}
add('table',['Napoli e Vesuvio','Costiera Amalfitana','Casinò Royal','Atlantide','Cyber Neon','Palazzo Reale','Napoli Antica','Natale a Napoli','Halloween','Discoteca 90','Giardino Zen','Spazio Galattico'],1500,1200,'🎴');
add('avatar',['Partenope','Vesuvio','Marinaio','Re di Denari','Regina di Coppe','Cavaliere','Pulcinella','Stella','Gatto Nero','Fenice','Leone','Dragone','Astronauta','Sirena','Pirati','DJ Neon','Sole','Luna','Imperatore','Diamante'],500,330,'👤');
add('frame',['Bronzo','Argento','Oro','Platino','Diamante','Vesuvio','Mare','Corallo','Neon','Gloria','Reale','Luna','Stelle','Fuoco','Ghiaccio','Smeraldo','Rubino','Zaffiro','Arcobaleno','Vintage','Barocco','Minimal','Leggenda','Napoli','Campione','VIP','Festival','Inverno','Estate','Galassia'],300,130,'🖼️');
add('cards',['Classico Rosso','Blu Napoli','Vesuvio','Barocco','Regale','Neon','Costiera','Notte','Oro','Argento','Smeraldo','Mosaico','Stelle','Fiori','Vintage'],400,300,'🃏');
add('effects',['Scintille','Coriandoli','Fuochi','Luci di Napoli','Onda Marina','Stelle Cadenti','Neon Pulse','Oro Brillante','Vesuvio','Champagne','Arcobaleno','Cuori','Glitter','Esplosione Blu','Festa','Corona','Aurora','Galassia','Vento','Diamante'],300,290,'✨');
const categories=[['table','Tavoli 3D'],['avatar','Avatar'],['frame','Cornici'],['cards','Carte'],['effects','Effetti'],['coins','Crediti']];
const play=[['coins_1000','Starter','1.000','€0,99'],['coins_2200','Bronzo','2.200','€1,99'],['coins_6000','Argento','6.000','€4,99'],['coins_13000','Oro','13.000','€9,99'],['coins_28000','Platino','28.000','€19,99'],['coins_75000','Diamante VIP','75.000','€49,99']];
let category='table';
let marketState={owned:[],equipped:{},balance:0,spendingEnabled:false},loaded=false,busy=false,requestSeq=800000000;
let activeAccount=null;
const marketPending=new Map();
let previousSocialResponse=null;
function marketResponse(id,status,raw){
 const pending=marketPending.get(Number(id));
 if(pending){marketPending.delete(Number(id));clearTimeout(pending.timer);
  let data={};try{data=JSON.parse(raw);}catch(e){}
  if(status>=200&&status<300)pending.resolve(data);
  else pending.reject(new Error(data.error||'Market non disponibile'));
  return;
 }
 if(typeof previousSocialResponse==='function')previousSocialResponse(id,status,raw);
}
function installResponseHook(){
 if(g.NC_SOCIAL_RESPONSE!==marketResponse){
  previousSocialResponse=g.NC_SOCIAL_RESPONSE;
  g.NC_SOCIAL_RESPONSE=marketResponse;
 }
}
function request(action,payload={}){
 installResponseHook();
 return new Promise((resolve,reject)=>{
  if(!g.NCSocialNative?.request)return reject(Error('Market online disponibile solo nell’app Android aggiornata.'));
  const id=++requestSeq;
  const timer=setTimeout(()=>{marketPending.delete(id);reject(Error('Connessione Market scaduta'));},30000);
  marketPending.set(id,{resolve,reject,timer});
  try{g.NCSocialNative.request(String(id),action,JSON.stringify(payload));}
  catch(e){marketPending.delete(id);clearTimeout(timer);reject(e);}
 });
}
async function synchronize(){
 const account=g.NCRewardNative?.accountScope?.()||'guest';
 if(!account.startsWith('uid:'))throw Error('Accedi per sincronizzare il Market.');
 if(activeAccount!==account){marketState={owned:[],equipped:{},balance:0,spendingEnabled:false};loaded=false;paint();activeAccount=account;}
 const data=await request('marketState');
 if((g.NCRewardNative?.accountScope?.()||'guest')!==account)throw Error('Account cambiato: riapri il Market');
 marketState=data;loaded=true;paint();render();return data;
}
function status(message){const e=document.getElementById('nc83-status');if(e)e.textContent=message;}

const css=`
#nc-market83{position:fixed;inset:0;z-index:2147483645;background:linear-gradient(155deg,#162d37,#07191a 65%,#10261f);color:#f4e4c5;overflow:auto;overscroll-behavior:contain;padding:env(safe-area-inset-top) 12px env(safe-area-inset-bottom);font:15px system-ui}
#nc-market83 *{box-sizing:border-box}#nc-market83 .shell{max-width:980px;margin:auto;padding:18px 0 40px}
#nc-market83 button{cursor:pointer;min-height:44px;border-radius:12px;background:#243e41;color:#fff0cf;border:1px solid #937950;padding:10px 12px}
#nc-market83 button:focus-visible{outline:3px solid #fff4af;outline-offset:2px}
#nc-market83 .head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
#nc-market83 h1{font-size:clamp(24px,6vw,37px);color:#e9c777;margin:9px 0}#nc-market83 .muted{color:#b8c8c3;font-size:12px}
#nc-market83 .tabs{display:flex;gap:7px;overflow-x:auto;padding:12px 0;scrollbar-width:thin}
#nc-market83 .tabs button{white-space:nowrap}#nc-market83 .tabs button[aria-selected=true]{background:#e8c57e;color:#231f16}
#nc-market83 .catalog{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px}
#nc-market83 .item{border:1px solid #6b654e;border-radius:16px;background:#16352e;padding:10px;min-width:0}
#nc-market83 .preview{display:grid;place-items:center;height:102px;border-radius:12px;font-size:47px;position:relative;overflow:hidden;background:radial-gradient(circle at 30% 20%,#577c78,#132c29 76%);box-shadow:inset 0 0 18px #0007}
#nc-market83 .preview.table{background:radial-gradient(ellipse,#287e5a 0%,#124c3a 65%,#8b602d 66%,#e6c47b 74%,#2d2117 75%);transform:perspective(260px) rotateX(10deg)}
#nc-market83 .preview.frame{border:8px ridge #d3ae65;border-radius:50%;width:100px;height:100px;margin:auto}
#nc-market83 .item h3{font-size:14px;min-height:36px;margin:12px 0 4px}
#nc-market83 .item button{display:block;width:100%;margin-top:10px;font-weight:750}
#nc-market83 .item button:disabled{opacity:.65;cursor:default}
#nc-market83 .note{padding:12px;background:#18302b;border:1px solid #536a57;border-radius:12px;margin:12px 0}
#nc-market83 .status{min-height:23px;color:#ffdf9d;font-size:13px}
@media(max-width:390px){#nc-market83 .catalog{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#nc-market83 .item{padding:8px}}
body[data-nc-table="table_1"] .board{background:radial-gradient(ellipse,#16876d,#084f3d 66%,#0b332a)!important}
body[data-nc-table="table_2"] .board{background:radial-gradient(ellipse,#4ca7ac,#137385 65%,#0c3b55)!important}
body[data-nc-table="table_3"] .board{background:radial-gradient(ellipse,#19463a,#0b2b28 65%,#121b1b)!important;border-color:#d7b765!important}
body[data-nc-table="table_4"] .board{background:radial-gradient(ellipse,#2286bb,#064968 75%,#032d47)!important}
body[data-nc-table="table_5"] .board{background:radial-gradient(ellipse,#703ea1,#261954 65%,#08152d)!important;border-color:#9f7de5!important}
body[data-nc-table="table_6"] .board{background:radial-gradient(ellipse,#962f38,#531c2a 75%,#30121b)!important;border-color:#e8c166!important}
body[data-nc-table] .board{transition:background .25s,border-color .25s}



body[data-nc-cards] .back{border:2px solid #e8d38d}
body[data-nc-cards="cards_2"] .back{background:repeating-linear-gradient(45deg,#1c4088 0 4px,#eee8bd 5px 6px,#0a276b 7px 10px)}
body[data-nc-cards="cards_6"] .back{background:repeating-linear-gradient(45deg,#551ca7 0 4px,#b4edfd 5px 6px,#133a9f 7px 10px)}
`;
const style=document.createElement('style');style.textContent=css;document.head.append(style);
const skin=document.createElement('link');skin.rel='stylesheet';skin.href='market83-themes.css';document.head.append(skin);
function wallet(){return g.NC_WALLET;}
function state(){return marketState;}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function refreshBalance(){document.querySelectorAll('#nc-market83 [data-balance]').forEach(el=>el.textContent=Number(state().balance||0).toLocaleString('it-IT'));}
function paint(){for(const key of ['ncTable','ncFrame','ncCards','ncAvatar','ncEffects'])delete document.body.dataset[key];const s=state();const kinds={table:'ncTable',frame:'ncFrame',cards:'ncCards',avatar:'ncAvatar',effects:'ncEffects'};const valid=new Set(s.owned||[]);for(const [kind,id] of Object.entries(s.equipped||{})){if(kinds[kind]&&valid.has(id)&&entries.some(x=>x.type===kind&&x.id===id))document.body.dataset[kinds[kind]]=id;}}
function render(){
const root=document.getElementById('nc-market83');if(!root)return;const s=state(),owned=new Set(s.owned||[]);
const current=entries.filter(x=>x.type===category);
let cards=category==='coins'?play.map(p=>'<article class="item"><div class="preview">🪙</div><h3>'+p[1]+'</h3><strong>'+p[2]+' crediti</strong><p class="muted">Prezzo indicativo '+p[3]+'</p><button data-sku="'+p[0]+'">Verifica disponibilità</button></article>').join(''):current.map(x=>{
const isOwned=owned.has(x.id),isEquipped=s.equipped?.[x.type]===x.id;const blocked=!loaded||busy||(!isOwned&&!s.spendingEnabled);
return '<article class="item" data-item="'+x.id+'"><div class="preview '+x.type+'" aria-hidden="true">'+x.emoji+'</div><h3>'+escape(x.name)+'</h3><div class="muted">'+x.price.toLocaleString('it-IT')+' crediti · '+(isOwned?'Acquistato':'Permanente')+'</div><button data-id="'+x.id+'" '+(blocked?'disabled':'')+'>'+(isEquipped?'✓ Equipaggiato':isOwned?'Equipaggia':s.spendingEnabled?'Acquista':'In arrivo')+'</button></article>';
}).join('');
root.innerHTML='<div class="shell"><div class="head"><div><div class="muted">GAMES STUDIOS · NAPOLI CARTE 3D</div><h1>✦ MARKET PREMIUM</h1></div><button id="nc83-close">✕ Chiudi</button></div><div class="note">🪙 Saldo Market verificato: <strong data-balance>0</strong> crediti · <span class="muted">I crediti delle partite sono gestiti separatamente finché la contabilità non viene riconciliata. Gli oggetti non danno vantaggi di gioco.</span></div><div class="tabs" role="tablist" aria-label="Categorie del negozio">'+categories.map(p=>'<button role="tab" data-tab="'+p[0]+'" aria-selected="'+(p[0]===category)+'">'+p[1]+'</button>').join('')+'</div><button type="button" id="nc83-refresh">↻ Aggiorna inventario</button><p class="status" role="status" aria-live="polite" id="nc83-status"></p><div class="catalog">'+cards+'</div><p class="muted">I prezzi in euro sono indicativi. Il prezzo effettivo è quello mostrato da Google Play. Il server gestisce acquisti e inventario. Le funzioni di acquisto restano disattivate fino alla verifica completa del saldo.</p></div>';
refreshBalance();root.querySelector('#nc83-close').onclick=close;root.querySelector('#nc83-refresh').onclick=()=>{if(busy)return;loaded=false;status('Aggiornamento…');synchronize().catch(e=>status(e.message));};
root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{category=b.dataset.tab;render();});
root.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{
 const x=entries.find(a=>a.id===b.dataset.id);if(!x||busy)return;
 if(!loaded){status('Sincronizzazione in corso.');return;}
 const owns=new Set(state().owned||[]);
 if(!owns.has(x.id)&&!state().spendingEnabled){status('Gli acquisti cosmetici non sono ancora attivi.');return;}
 if(!owns.has(x.id)&&!confirm('Acquistare '+x.name+' per '+x.price.toLocaleString('it-IT')+' crediti verificati?'))return;
 busy=true;b.disabled=true;status('Verifica server in corso…');
 try{
  const data=await request(owns.has(x.id)?'marketEquip':'marketBuy',{itemId:x.id});
  marketState={...marketState,...data};loaded=true;
  if(!owns.has(x.id)){const equipped=await request('marketEquip',{itemId:x.id});marketState={...marketState,...equipped};}
  paint();render();status('Personalizzazione salvata nel tuo account.');
 }catch(err){status(err.message);}finally{busy=false;b.disabled=false;}
});
root.querySelectorAll('[data-sku]').forEach(b=>{const sku=b.dataset.sku;
const available=typeof g.NCPlayNative?.buy==='function';
b.disabled=!available;b.textContent=available?'Apri Google Play':'Disponibile nell’app Android';
b.onclick=()=>{if(!available)return;g.NCPlayNative.buy(sku);};
});
g.NCPlayNative?.sync?.();
}
function close(){const el=document.getElementById('nc-market83');if(!el)return false;el.remove();return true;}
function open(){if(document.getElementById('nc-market83'))return;document.getElementById('nc52-store')?.remove();const el=document.createElement('section');el.id='nc-market83';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Market Premium');document.body.append(el);loaded=false;render();synchronize().then(()=>paint()).catch(e=>{loaded=false;status('Impossibile sincronizzare: '+e.message);});}
g.NC_MARKET_OPEN=open;g.NC_MARKET_CLOSE=close;g.NC_MARKET_CATALOG=entries.map(x=>({...x}));
document.addEventListener('click',e=>{const b=e.target.closest?.('.nc52-shop');if(b){e.preventDefault();e.stopImmediatePropagation();open();}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
})(window);
