/* NAPOLI CARTE 3D 9.9 — friend invitations shared by Android WebView and Windows Electron.
 * Uses authenticated social endpoints already present in the game. It does NOT
 * create a room on the client or grant access to another player's private hand.
 */
(function(w,d){
'use strict';
if(w.NC99_INVITES)return;
const titles={scopa:'Scopa',scopone:'Scopone Scientifico',briscola:'Briscola',sette:'Sette e Mezzo',asso:'Asso Piglia Tutto',ruba:'Ruba Mazzetto',chiodo121:'Chiodo 121',banco:'Il Banco',tressette:'Tressette',traversone:'Traversone',briscola_chiamata:'Briscola Chiamata',bestia:'Bestia',trentuno:'Trentuno',cucu:'Cucù',cirulla:'Cirulla',asino:'Asino',dubito:'Dubito',tressette_morto:'Tressette col Morto',mercante:'Mercante in Fiera'};
const pending=new Map(),attempted=new Set();
let modal=null,focused=null;
function element(tag,cls,value){const node=d.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;}
function cleanCode(code){const v=String(code||'').toUpperCase().trim();return /^[A-Z0-9]{6,8}$/.test(v)?v:'';}
function call(action,payload){if(typeof w.NC70_SOCIAL?.call!=='function')return Promise.reject(Error('Per invitare gli amici serve un accesso valido e un servizio Amici aggiornato.'));return w.NC70_SOCIAL.call(action,payload);}
function show(text){const target=modal?.querySelector('.nc99-invite-feedback');if(target)target.textContent=text;else if(text)w.console?.warn?.('Inviti: '+text);}
function close(){if(!modal)return;modal.remove();modal=null;if(focused?.isConnected)focused.focus();}
function inviteMessage(ctx){return '🃏 NAPOLI CARTE 3D · Invito personale a '+(titles[ctx.game]||'una partita di carte')+'!\n🔒 Codice stanza privata: '+ctx.code+'\nApri il gioco → Online → '+(titles[ctx.game]||'il gioco')+' → inserisci il codice per entrare. La stanza non compare nella ricerca pubblica. Non condividere il codice con estranei.';}
async function send(ctx,ids){
 const success=[],errors=[];
 for(const uid of ids){
  try{
   if(ctx.channel==='expansion'&&ctx.tableToken){
    await call('inviteSend',{tableToken:ctx.tableToken,recipientUid:uid,audience:'friends',kind:'join'});
   }else{
    if(!ctx.code)throw Error('Prima crea la stanza privata.');
    await call('chatSend',{peer:uid,kind:'text',text:inviteMessage(ctx)});
   }
   success.push(uid);
  }catch(e){errors.push(String(e?.message||e));}
 }
 return {success,errors};
}
function contextReady(ctx){return ctx.channel==='expansion'?!!ctx.tableToken:!!cleanCode(ctx.code);}
async function roomReady(input){
 if(!input||!titles[input.game])return false;
 const ctx={...input,code:cleanCode(input.code),channel:input.channel==='expansion'?'expansion':'chat'};
 if(!contextReady(ctx))return false;
 const users=pending.get(ctx.game);if(!users?.size)return true;
 const marker=[ctx.game,ctx.roomId||ctx.code,ctx.channel].join(':');
 if(attempted.has(marker))return true;
 attempted.add(marker);
 const result=await send(ctx,[...users]);
 for(const uid of result.success)users.delete(uid);
 if(!users.size)pending.delete(ctx.game);
 if(result.errors.length)show('Alcuni inviti non sono partiti: '+result.errors[0]+'. Apri nuovamente «Invita amici» per riprovare.');
 else show('Inviti inviati: '+result.success.length);
 return !result.errors.length;
}
async function open(args={}){
 if(!titles[args.game])return false;
 if(modal)close();
 const ctx={game:args.game,code:cleanCode(args.code),tableToken:String(args.tableToken||''),roomId:String(args.roomId||''),channel:args.channel==='expansion'?'expansion':'chat'};
 focused=d.activeElement;
 const overlay=element('section','nc99-invite-overlay');overlay.id='nc99-invite-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Invita amici alla partita privata');
 const card=element('div','nc99-invite-card'),header=element('header');
 header.append(element('h2','', '👥 Invita amici · '+titles[ctx.game]));
 const cross=element('button','nc99-close','×');cross.type='button';cross.setAttribute('aria-label','Chiudi');cross.onclick=close;header.append(cross);card.append(header);
 const description=element('p','',contextReady(ctx)?'Seleziona gli amici da invitare in questa stanza privata. Solo gli amici accettati sono elencati.':'Seleziona gli amici da invitare. Dopo aver creato la stanza privata, gli inviti saranno inviati automaticamente dal servizio del gioco, se disponibile.');card.append(description);
 if(ctx.code){const code=element('strong','', '🔐 '+ctx.code);card.append(code);}
 const list=element('div','nc99-friend-list','Caricamento amici…');list.setAttribute('role','group');list.setAttribute('aria-label','Amici da invitare');card.append(list);
 const feedback=element('p','nc99-invite-feedback','');feedback.setAttribute('role','status');card.append(feedback);
 const actions=element('div','nc99-invite-actions');const confirm=element('button','',contextReady(ctx)?'Invia inviti':'Seleziona amici');confirm.type='button';confirm.disabled=true;
 const cancel=element('button','','Chiudi');cancel.type='button';cancel.onclick=close;actions.append(confirm,cancel);card.append(actions);
 if(ctx.code){const copy=element('button','', '📋 Copia codice stanza');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(ctx.code);show('Codice copiato');}catch{show('Codice stanza: '+ctx.code)}};card.append(copy);}
 overlay.append(card);d.body.append(overlay);modal=overlay;
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
 cross.focus();
 try{
  const data=await call('friends',{});
  if(modal!==overlay)return true;
  const friends=(data.friends||[]).filter(a=>a.status==='accepted'&&typeof a.uid==='string'&&a.uid.length>0);
  list.replaceChildren();
  if(!friends.length){list.append(element('p','', 'Non hai ancora amici confermati. Apri ☰ → Amici e aggiungi un nickname.'));return true;}
  const previous=pending.get(ctx.game)||new Set();
  for(const friend of friends){
   const label=element('label','nc99-friend'),checkbox=element('input');checkbox.type='checkbox';checkbox.value=friend.uid;checkbox.checked=previous.has(friend.uid);
   label.append(checkbox,element('span','',friend.nickname||'Amico'),element('small','',friend.online?'● Online':'● Offline'));list.append(label);
  }
  confirm.disabled=false;
  confirm.onclick=async()=>{
   const ids=[...list.querySelectorAll('input:checked')].map(input=>input.value);
   if(!ids.length){show('Seleziona almeno un amico.');return;}
   confirm.disabled=true;
   if(!contextReady(ctx)){
    pending.set(ctx.game,new Set(ids));show('Amici selezionati. Crea la stanza privata per inviare gli inviti.');confirm.disabled=false;return;
   }
   show('Invio degli inviti in corso…');
   const result=await send(ctx,ids);
   if(modal!==overlay)return;
   if(result.errors.length){show('Inviti inviati: '+result.success.length+' · Non riusciti: '+result.errors.length+' — '+result.errors[0]);confirm.disabled=false;}
   else{pending.delete(ctx.game);show('✓ Inviti inviati: '+result.success.length);confirm.disabled=false;}
  };
 }catch(e){if(modal===overlay){list.replaceChildren();show(e.message||'Impossibile caricare gli amici. Controlla l’accesso all’account.');}}
 return true;
}
w.NC99_INVITES={open,roomReady,close,cleanCode};
})(window,document);

