(function(){
'use strict';
const names={scopa:'Scopa',scopone:'Scopone',briscola:'Briscola',setteemezzo:'Sette e Mezzo',assopigliatutto:'Asso Piglia Tutto',rubamazzetto:'Ruba Mazzetto',chiodo121:'Chiodo 121'};
let overlay=null,next=0,heartbeat=null,tab='friends';
const pending=new Map();
window.NC_SOCIAL_RESPONSE=(id,status,raw)=>{const item=pending.get(Number(id));if(!item)return;pending.delete(Number(id));clearTimeout(item.timeout);let data={};try{data=JSON.parse(raw)}catch(e){}if(status>=200&&status<300)item.resolve(data);else item.reject(new Error(data.error||'Servizio non disponibile'));};
function call(action,payload={}){
 return new Promise((resolve,reject)=>{
  if(!window.NCSocialNative)return reject(new Error('Aggiorna l’app Android per usare Amici e Statistiche.'));
  const id=++next,timeout=setTimeout(()=>{pending.delete(id);reject(Error('Connessione scaduta'));},30000);
  pending.set(id,{resolve,reject,timeout});
  try{window.NCSocialNative.request(String(id),action,JSON.stringify(payload));}catch(e){clearTimeout(timeout);pending.delete(id);reject(e);}
 });
}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function button(text,handler){const b=el('button','nc70-btn',text);b.type='button';b.addEventListener('click',handler);return b;}
function message(value){const n=document.getElementById('nc70-message');if(n)n.textContent=value||'';}
function panel(){return document.getElementById('nc70-body')}
function close(){endViewer();if(overlay){overlay.remove();overlay=null;}clearInterval(heartbeat);heartbeat=null;}
function heading(parent,title){parent.append(el('h3','',title));}
function settingsForm(p,first){
 const root=panel();root.replaceChildren();heading(root,first?'Crea il tuo nickname':'Profilo pubblico');
 root.append(el('p','nc70-muted','Il nickname è univoco. La tua email non sarà pubblicata. Puoi modificare la visibilità quando vuoi.'));
 const form=el('form');form.className='nc70-form';
 const input=el('input');input.placeholder='Nickname (3–24 caratteri)';input.maxLength=24;input.required=true;input.value=p?.nickname||'';form.append(input);
 const searched=el('label');const find=el('input');find.type='checkbox';find.checked=p?.searchable!==false;searched.append(find,document.createTextNode(' Mostrami nella ricerca mondiale'));form.append(searched);
 const shown=el('label');const online=el('input');online.type='checkbox';online.checked=p?.show_online!==false;shown.append(online,document.createTextNode(' Mostra il mio stato online'));form.append(shown);
 const save=button('Salva profilo',()=>{});save.type='submit';form.append(save);
 form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{await call('profile',{nickname:input.value,searchable:find.checked,showOnline:online.checked});window.NC80_IDENTITY?.set?.(input.value);message('Profilo salvato');await friends();}catch(err){message(err.message)}finally{save.disabled=false}});
 root.append(form);
}
async function ensureProfile(){const a=await call('me');if(!a.registered){settingsForm(null,true);return false;}window.NC80_IDENTITY?.set?.(a.profile.nickname);return a.profile;}
function personRow(user,actions=[]){
 const row=el('div','nc70-person'),summary=el('div','nc70-person-info');
 const name=el('strong','',user.nickname||'Utente');summary.append(name,el('span',user.online?'nc70-online':'nc70-offline',user.online?'● Online':'● Offline'));row.append(summary);
 const controls=el('div','nc70-controls');for(const [label,fn] of actions)controls.append(button(label,fn));row.append(controls);return row;
}
async function friends(){tab='friends';const root=panel();root.replaceChildren();heading(root,'I tuoi amici e richieste');
 const result=await call('friends');if(!result.friends.length)root.append(el('p','nc70-muted','Nessun amico. Cerca un nickname per inviare una richiesta.'));
 for(const a of result.friends){
  const actions=a.status==='pending'&&a.direction==='received'?[['Accetta',async()=>{await call('accept',{uid:a.uid});await friends()}],['Rifiuta',async()=>{await call('remove',{uid:a.uid});await friends()}]]:
    a.status==='accepted'?[['💬 Chat',()=>{close();window.NC77_CHAT?.open(a.uid,a.nickname)}],['Rimuovi',async()=>{await call('remove',{uid:a.uid});await friends()}]]:[['Annulla richiesta',async()=>{await call('remove',{uid:a.uid});await friends()}]];
  const row=personRow(a,actions);
  if(a.status==='pending')row.append(el('small','nc70-muted',a.direction==='sent'?'Richiesta inviata':'Richiesta ricevuta'));
  root.append(row);
 }
}
async function search(){
 tab='search';const root=panel();root.replaceChildren();heading(root,'Trova giocatori nel mondo');
 root.append(el('p','nc70-muted','Cerca nickname pubblici. Per privacy non è possibile elencare automaticamente tutti gli account.'));
 const form=el('form','nc70-form'),input=el('input');input.placeholder='Inserisci almeno 2 caratteri';input.maxLength=24;input.required=true;input.minLength=2;
 const submit=button('Cerca',()=>{});submit.type='submit';form.append(input,submit);root.append(form);
 const results=el('div');root.append(results);
 form.addEventListener('submit',async e=>{e.preventDefault();results.replaceChildren();try{const r=await call('search',{q:input.value});if(!r.users.length)results.append(el('p','nc70-muted','Nessun giocatore trovato.'));for(const a of r.users){results.append(personRow(a,a.friend?[['💬 Apri chat',()=>{close();window.NC77_CHAT?.open(a.uid,a.nickname)}]]:[['Aggiungi amico',async()=>{try{await call('request',{uid:a.uid});message('Richiesta inviata a '+a.nickname)}catch(err){message(err.message)}}],['Blocca',async()=>{try{await call('block',{uid:a.uid});message('Giocatore bloccato');await search()}catch(err){message(err.message)}}]]));}}catch(err){message(err.message)}});
}
async function stats(){
 tab='stats';const root=panel();root.replaceChildren();heading(root,'Le mie statistiche');
 const data=await call('stats');
 root.append(el('p','nc70-muted','Vittorie e risultati riconosciuti soltanto quando sono convalidati dal server.'));
 for(const row of data.games){const div=el('div','nc70-stat'),title=el('strong','',names[row.game]||row.game);div.append(title,el('span','', 'Giocate '+row.played+' · Vittorie '+row.wins+' · Sconfitte '+row.losses+' · Pareggi '+row.draws));root.append(div);}
}
async function progress(){
 tab='progress';const root=panel();root.replaceChildren();heading(root,'Salvataggi cloud');
 root.append(el('p','nc70-muted','I dati personali restano legati al tuo account. Uscire dal gioco, disconnettersi o reinstallare l’app non equivale a cancellare l’account. La cancellazione definitiva è separata.'));
 const r=await call('progress',{read:true});
 for(const g of Object.keys(names)){const s=r.progress.find(x=>x.game===g),row=el('div','nc70-stat');row.append(el('strong','',names[g]),el('span','',s?'Salvataggio presente · '+new Date(s.updated_at).toLocaleDateString('it-IT'):'Nessun salvataggio'));root.append(row);}
}
let viewerTimer=null;
const GAME_LABELS={tressette:'Tressette',traversone:'Traversone',briscola_chiamata:'Briscola chiamata',bestia:'Bestia',
  trentuno:'Trentuno',cucu:'Cucù',cirulla:'Cirulla',asino:'Asino',dubito:'Dubito',tressette_morto:'Tressette col morto',mercante:'Mercante in fiera'};
function endViewer(){if(viewerTimer){clearInterval(viewerTimer);viewerTimer=null;}}
function invitationOptions(parent, context, target, audience){
 const options=el('div','nc70-controls');
 const kinds=context.status==='waiting'?[['join','Invita a giocare']]:
   [['watch','Invita a guardare'],['takeover','Richiedi subentro']];
 for(const [kind,label] of kinds){
  if(kind==='takeover'&&!context.vacantSeats)continue;
  const action=button(label,async()=>{
   action.disabled=true;
   try{
    const r=await call('inviteSend',{tableToken:context.tableToken,recipientUid:target.uid,audience,kind});
    message('Invito inviato a '+r.recipientNickname+' · valido 60 secondi');
   }catch(e){message(e.message);}finally{action.disabled=false;}
  });options.append(action);
 }
 parent.append(options);
}
async function showInvites(){
 tab='invites';endViewer();const root=panel();root.replaceChildren();
 heading(root,'Inviti e partite LIVE');
 root.append(el('p','nc70-muted','Gli inviti diretti scadono dopo 60 secondi. Ogni giocatore sceglie quali richieste ricevere.'));
 const ctx=window.NC_EXPANSION?.invitationContext?.();
 if(ctx){
  heading(root,'Invita dal tuo tavolo');
  root.append(el('p','nc70-muted',GAME_LABELS[ctx.game]||ctx.game));
  const controls=el('div','nc70-controls');
  const friendsButton=button('Amici',()=>invitationRecipients(ctx,'friends',root));
  const secondButton=button('Amici di amici',()=>invitationRecipients(ctx,'friends_of_friends',root));
  controls.append(friendsButton,secondButton);
  if(ctx.status==='waiting'&&!ctx.private)controls.append(button('Pubblica per tutti online',async()=>{
   try{await call('invitePublish',{tableToken:ctx.tableToken});message('Il tuo tavolo è visibile tra i tavoli pubblici per 3 minuti.');}
   catch(e){message(e.message);}
  }));
  root.append(controls);
  const recipients=el('div');recipients.id='nc94-recipients';root.append(recipients);
 }
 const inbox=el('div');inbox.id='nc94-inbox';root.append(inbox);
 heading(inbox,'Inviti ricevuti');
 const items=await call('inviteList');
 if(!items.invites?.length)inbox.append(el('p','nc70-muted','Nessun nuovo invito.'));
 for(const inv of items.invites||[]){
  const row=el('div','nc70-person');
  row.append(el('strong','',(GAME_LABELS[inv.game]||inv.game)+' · '+inv.sender_nickname));
  row.append(el('small','nc70-muted',inv.kind==='watch'?'Guarda la partita':inv.kind==='takeover'?'Subentra in una partita':'Entra in partita'));
  const actions=el('div','nc70-controls');
  if(inv.status==='pending'){
   actions.append(button('Accetta',async()=>{
    try{await call('inviteRespond',{id:inv.id,accept:true});await enterInvite(inv.id);}
    catch(e){message(e.message);}
   }));
   actions.append(button('Rifiuta',async()=>{
    try{await call('inviteRespond',{id:inv.id,accept:false});await showInvites();}
    catch(e){message(e.message);}
   }));
  }else if(inv.status==='accepted')actions.append(button('Entra',()=>enterInvite(inv.id)));
  row.append(actions);inbox.append(row);
 }
 const publicTitle=el('h3','','Tavoli pubblici');root.append(publicTitle);
 const browse=await call('inviteBrowse');
 if(!browse.rooms?.length)root.append(el('p','nc70-muted','Nessun tavolo pubblico disponibile.'));
 for(const item of browse.rooms||[]){
  const line=el('div','nc70-person');
  line.append(el('strong','',(GAME_LABELS[item.game]||item.game)+' · '+item.host));
  line.append(button('Entra al tavolo',()=>{
   const ok=window.NC_EXPANSION?.joinInvitation?.({kind:'join',game:item.game,roomId:item.room_id});
   if(ok)close();else message('Lascia prima la partita attuale.');
  }));root.append(line);
 }
 root.append(button('Preferenze inviti',()=>invitePreferences()));
}
async function invitationRecipients(ctx,audience,root){
 const into=root.querySelector('#nc94-recipients');if(!into)return;
 into.replaceChildren();
 let people=[];
 if(audience==='friends'){
  const r=await call('friends');people=(r.friends||[]).filter(x=>x.status==='accepted');
 }else{
  const r=await call('inviteCandidates');people=r.users||[];
 }
 if(!people.length)into.append(el('p','nc70-muted','Nessun contatto disponibile per questa categoria.'));
 for(const person of people){
  const row=personRow(person,[]);
  invitationOptions(row,ctx,person,audience);
  into.append(row);
 }
}
async function enterInvite(id){
 try{
  const data=await call('inviteEnter',{id});
  if(data.kind==='join'){
   if(window.NC_EXPANSION?.joinInvitation?.(data)){close();return;}
   throw Error('Termina prima la partita attuale.');
  }
  if(data.kind==='takeover'){
   if(window.NC_EXPANSION?.takeoverInvitation?.(data.joined)){close();return;}
   throw Error('Termina prima la partita attuale.');
  }
  if(data.kind==='watch'){startViewer(id,data.state);return;}
  throw Error('Tipo di invito non disponibile.');
 }catch(e){message(e.message);}
}
function startViewer(inviteId,initial){
 endViewer();tab='invites';
 const root=panel();root.replaceChildren();
 heading(root,'👁 Spettatore · '+(GAME_LABELS[initial.game]||initial.game));
 const status=el('div','nc70-stat');root.append(status);
 root.append(el('p','nc70-muted','Visualizzazione in sola lettura: le mani private e le mosse disponibili non sono trasmesse agli spettatori.'));
 root.append(button('Esci dalla visione',()=>{endViewer();showInvites().catch(e=>message(e.message));}));
 let inflight=false;
 function drawLive(v){
  if(!status.isConnected)return;
  status.replaceChildren();
  const active=v.players?.[v.turn];
  status.append(el('strong','',v.status==='finished'?'Partita conclusa':'Turno di '+(active?.name||'—')));
  status.append(el('span','',(v.players||[]).map(p=>p.name+(p.bot?' 🤖':'')).join(' · ')));
  const cards=(v.trick?.length?v.trick.map(t=>t.card):v.table)||[];
  status.append(el('span','',cards.length?'Carte sul tavolo: '+cards.map(c=>(c.v||'?')+' '+(['Denari','Coppe','Spade','Bastoni'][c.s]||'')).join(' · '):'Tavolo in attesa di una carta'));
 }
 drawLive(initial);
 viewerTimer=setInterval(async()=>{
  if(inflight||document.hidden||!status.isConnected)return;
  inflight=true;
  try{const data=await call('inviteWatch',{id:inviteId});drawLive(data.state);}
  catch(e){endViewer();message(e.message);}
  finally{inflight=false;}
 },3000);
}
async function invitePreferences(){
 tab='invites';endViewer();
 const root=panel();root.replaceChildren();heading(root,'Preferenze inviti e privacy');
 const data=await call('invitePreferences',{read:true});
 const prefs=data.preferences||{};
 const fields=[['direct','Ricevi inviti dagli amici'],['second_degree','Permetti inviti dagli amici degli amici'],
   ['public_invites','Ricevi inviti da chiunque (opt-in)'],['allow_watch','Accetta richieste per guardare partite']];
 const form=el('form','nc70-form'),controls={};
 for(const [key,label] of fields){
  const line=el('label'),box=el('input');box.type='checkbox';box.checked=prefs[key]===true;controls[key]=box;
  line.append(box,document.createTextNode(' '+label));form.append(line);
 }
 const save=button('Salva preferenze',()=>{});save.type='submit';form.append(save);
 form.addEventListener('submit',async e=>{
  e.preventDefault();save.disabled=true;
  try{await call('invitePreferences',Object.fromEntries(fields.map(([k])=>[k,controls[k].checked])));
    message('Preferenze inviti salvate');await showInvites();}
  catch(e){message(e.message);}finally{save.disabled=false;}
 });
 root.append(form);root.append(button('Torna agli inviti',()=>showInvites()));
}

async function show(view){
 try{if(view!=='invites')endViewer();message('');if(view==='profile'){const a=await call('me');if(a.registered)window.NC80_IDENTITY?.set?.(a.profile.nickname);settingsForm(a.profile,!a.registered);return;}const profile=await ensureProfile();if(!profile)return;
 await ({friends,search,stats,progress,invites:showInvites})[view]();}catch(e){message(e.message);}
}
function open(view='friends'){if(overlay){show(view);return;}overlay=el('section','nc70-overlay');overlay.id='nc70-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Amici e statistiche');overlay.innerHTML='<div class="nc70-sheet"><header><strong>👥 COMUNITÀ NAPOLI CARTE</strong><button type="button" id="nc70-close" aria-label="Chiudi">×</button></header><nav id="nc70-tabs"></nav><div id="nc70-message" role="status"></div><main id="nc70-body"></main></div>';
 document.body.append(overlay);overlay.querySelector('#nc70-close').onclick=close;
 overlay.onclick=e=>{if(e.target===overlay)close()};
 const nav=overlay.querySelector('#nc70-tabs');for(const [key,label] of [['friends','Amici'],['invites','Inviti'],['search','Cerca'],['stats','Statistiche'],['progress','Cloud'],['profile','Profilo']])nav.append(button(label,()=>show(key)));
 show(view);heartbeat=setInterval(()=>{if(document.visibilityState==='visible')call('heartbeat').catch(()=>{})},45000);call('heartbeat').catch(()=>{});
}
const style=el('style');style.textContent=`
#nc70-open{position:fixed;right:13px;bottom:12px;z-index:2147482800;background:linear-gradient(140deg,#ecd48d,#b7872e);color:#123427;border:2px solid #ffedaf;border-radius:28px;padding:11px 16px;font-weight:900;box-shadow:0 6px 22px #0009}
.nc70-overlay{position:fixed;inset:0;z-index:2147483600;background:#020b09dd;display:grid;place-items:center;padding:12px;font-family:system-ui;color:#f9ecd4}
.nc70-sheet{width:min(600px,100%);max-height:95dvh;overflow:auto;background:linear-gradient(150deg,#175444,#082921);border:2px solid #cba357;border-radius:18px;padding:15px;box-shadow:0 12px 50px #000a}
.nc70-sheet header{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:16px}
.nc70-sheet #nc70-close{border:0;background:#73362d;color:white;border-radius:9px;font-size:24px;width:40px;height:39px}
#nc70-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:15px 0}
.nc70-btn{border:1px solid #ba9b58;color:#fff1c9;background:#1b5140;border-radius:10px;padding:9px 10px;font-size:12px;font-weight:700}
.nc70-btn:active{background:#2a6f54}.nc70-btn:disabled{opacity:.5}
#nc70-message{min-height:22px;color:#ffe391;font-size:12px}
#nc70-body{overflow:auto;max-height:60dvh}#nc70-body h3{margin:8px 0 12px;font-size:18px}
.nc70-muted{color:#c7d5ca;font-size:12px;line-height:1.4}
.nc70-form{display:flex;flex-direction:column;gap:12px;margin:10px 0}.nc70-form input:not([type=checkbox]){background:#092c24;color:white;border:1px solid #d4b97e;border-radius:9px;padding:11px;width:100%}
.nc70-form label{font-size:12px;display:block}.nc70-person,.nc70-stat{background:#0b352c;border:1px solid #a98c5260;margin:8px 0;padding:11px;border-radius:12px}
.nc70-person{display:flex;flex-direction:column;gap:7px}.nc70-person-info{display:flex;align-items:center;justify-content:space-between;gap:7px}
.nc70-controls{display:flex;flex-wrap:wrap;gap:6px}.nc70-stat{display:flex;flex-direction:column;gap:4px;font-size:12px}
.nc70-online{color:#7df3a8;font-size:11px}.nc70-offline{color:#bec6c0;font-size:11px}
@media(max-height:490px){.nc70-sheet{max-height:96dvh}#nc70-body{max-height:45dvh}}
`;document.head.append(style);
// The friends screen is launched from Area personale in the main menu.
// Do not create floating actions while a game is running.
window.NC70_SOCIAL={open,openTab:open,close,call,openInvite:(id)=>{open('invites');return !!id;}};
})();
