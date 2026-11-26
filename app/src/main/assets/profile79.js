(function(w,d){
'use strict';
if(w.NC79_PROFILE)return;
const api=(action,payload={})=>w.NC70_SOCIAL?.call?.(action,payload)||Promise.reject(Error('Servizio profilo non disponibile.'));
const ICONS={photo:'📷',data:'✎',missions:'◴',boost:'🃏',notifications:'♧',achievements:'✪',trophies:'🏆',performance:'📈',ranking:'♛',logout:'➜'};
const NAMES={scopa:'Scopa',scopone:'Scopone',briscola:'Briscola',setteemezzo:'Sette e mezzo',assopigliatutto:'Asso piglia tutto',rubamazzetto:'Ruba mazzetto',chiodo121:'Chiodo 121'};
const ENTRIES=[
 ['photo','FOTO DEL PROFILO'],['data','DATI DEL PROFILO'],['missions','MISSIONI GIORNALIERE'],
 ['boost','GRAN SLANCIO'],['notifications','NOTIFICAZIONI'],['achievements','CONQUISTE'],
 ['trophies','TROFEI'],['performance','PRESTAZIONI'],['ranking','CLASSIFICA'],['logout','SCONNETTERE']
];
let layer=null,root=null,active='',busy=false,summary=null,photoURL='',account=null,pendingInfo=null,lastFocus=null,observer=null;
const e=(tag,cls,txt)=>{const el=d.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
const set=(id,value)=>{const target=root?.querySelector('#'+id);if(target)target.textContent=String(value);};
function formatNumber(n){return Number(n||0).toLocaleString('it-IT');}
function status(msg){set('nc79-status',msg||'');}
function sectionTitle(name,detail){const wrap=e('div','nc79-section-head');wrap.append(e('h3','',name));if(detail)wrap.append(e('p','',detail));return wrap;}
function line(title,value,note){const box=e('div','nc79-line'),left=e('span');left.append(e('strong','',title));if(note)left.append(e('small','',note));box.append(left,e('b','',value));return box;}
function message(msg){const p=e('p','nc79-note',msg);return p;}
function button(label,action,cls=''){const b=e('button','nc79-button '+cls,label);b.type='button';b.addEventListener('click',action);return b;}
function nativeInfo(){
 return new Promise(resolve=>{
  if(!w.NCProfileNative?.info){resolve({signedIn:false});return;}
  if(pendingInfo)pendingInfo({signedIn:false});
  pendingInfo=resolve;w.NCProfileNative.info();
  setTimeout(()=>{if(pendingInfo===resolve){pendingInfo=null;resolve({signedIn:false});}},8000);
 });
}
w.NC79_PROFILE_ACTION=function(result){status(String(result||'Operazione completata.'));};
w.NC79_PROFILE_INFO=function(payload){let info={signedIn:false};try{info=JSON.parse(payload);}catch(_){}const done=pendingInfo;pendingInfo=null;if(done)done(info)};
async function avatar(){
 if(!layer)return;
 try{const a=await api('pPhoto');if(!layer)return;
  photoURL=a.stored?'data:'+a.mime+';base64,'+a.base64:'';
  const img=root.querySelector('#nc79-avatar-img');if(img){img.src=photoURL||'';img.hidden=!photoURL;}
  const ico=root.querySelector('#nc79-avatar-fallback');if(ico)ico.hidden=!!photoURL;
 }catch(ex){status(ex.message);}
}
function renderSummary(){
 const x=summary?.info||{},p=summary?.profile||{};
 set('nc79-name',p.nickname||account?.displayName||'Giocatore');
 set('nc79-level',formatNumber(x.level||1));
 set('nc79-trophy-count',formatNumber(x.trophies||0));
 set('nc79-achievement-count',formatNumber(x.unlocked||0));
 set('nc79-balance',formatNumber(w.NC_WALLET?.balance?.()??0));
 const bar=root.querySelector('#nc79-levelbar');if(bar)bar.style.width=Math.min(100,Math.max(0,Number(x.levelProgress)||0))+'%';
 const notify=root.querySelector('[data-section=notifications] .nc79-pill');
 if(notify){notify.textContent=formatNumber(summary?.notificationCount||0);notify.hidden=!summary?.notificationCount;}
 for(const name of ['missions','boost']){
  const b=root.querySelector('[data-section='+name+'] .nc79-pill');if(!b)continue;
  const m=summary?.missions||{};
  const available=name==='missions'?m.missions?.filter(v=>v.done&&!v.claimed).length:m.boosts?.filter(v=>v.ready&&!v.claimed).length;
  b.hidden=!(available>0);b.textContent=available||'';
 }
}
async function refresh(){
 try{const result=await api('pSummary');if(!layer)return;summary=result;w.NC80_IDENTITY?.set?.(result.profile?.nickname);renderSummary();if(!active)status('');}
 catch(err){status(err.message);if(err.message.includes('nickname')){status('Per utilizzare il profilo, crea un nickname.');}}
}
function close(){
 if(!layer)return false;
 if(observer){observer.disconnect();observer=null;}
 layer.remove();layer=null;root=null;summary=null;active='';busy=false;photoURL='';
 if(lastFocus?.isConnected)lastFocus.focus();return true;
}
function overview(){if(!root)return false;const scroll=root.querySelector('.nc79-scroll');scroll?.classList.remove('is-detail');const back=root.querySelector('#nc79-back');if(back)back.hidden=true;const area=root.querySelector('#nc79-details');if(area){area.replaceChildren();area.hidden=true;}active='';if(scroll)scroll.scrollTop=0;status('');return true;}
function back(){if(!layer)return false;if(active)return overview();return close();}
function panel(name){const area=root.querySelector('#nc79-details');area.replaceChildren();active=name;area.hidden=false;const scroll=root.querySelector('.nc79-scroll');scroll.classList.add('is-detail');scroll.scrollTop=0;const back=root.querySelector('#nc79-back');back.hidden=false;back.textContent='← Torna al profilo';status('');return area;}
function loading(name){const area=panel(name);area.append(message('Caricamento dati dal server…'));return area;}
async function renderEntries(name){
 if(!layer)return;
 if(name==='logout'){logout();return;}
 if(name==='photo'){renderPhoto();return;}
 if(name==='data'){await renderData();return;}
 if(name==='missions'||name==='boost'){await renderMissions(name);return;}
 if(name==='notifications'){await renderNotifications();return;}
 if(name==='achievements'||name==='trophies'){await renderAchievements(name);return;}
 if(name==='performance'){await renderPerformance();return;}
 if(name==='ranking'){await renderRanking();return;}
}
async function renderPhoto(){
 const area=panel('photo');
 area.append(sectionTitle('Foto del profilo','La foto viene salvata in modo privato sul tuo account. Puoi modificarla oppure eliminarla.'));
 if(photoURL){const img=e('img','nc79-photo-preview');img.src=photoURL;img.alt='Foto attuale';area.append(img);}
 const input=e('input','nc79-file');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/*';
 input.setAttribute('aria-label','Scegli foto dalla galleria');area.append(input);
 area.append(message('L’immagine sarà ridimensionata e compressa prima dell’invio. Max 40 KB.'));
 area.append(button('💾 Salva la foto',async()=>{
  if(!input.files?.[0]){status('Seleziona prima una foto.');return;}
  try{
   const data=await compress(input.files[0]);status('Salvataggio foto…');
   await api('pPhotoSave',data);status('Foto salvata sul tuo profilo.');
   await avatar();renderPhoto();
  }catch(err){status(err.message);}
 }));
 area.append(button('🗑️ Elimina foto',async()=>{
  if(!w.confirm('Eliminare la foto personale dal tuo account?'))return;
  try{await api('pPhotoSave',{remove:true});photoURL='';await avatar();renderPhoto();status('Foto eliminata.');}
  catch(err){status(err.message);}
 },'nc79-muted-button'));
 area.append(button('🎨 Modifica avatar di gioco',()=>{close();w.NC69_PHOTO?.openEditor?.();},'nc79-muted-button'));
}
function compress(file){
 if(file.size>12*1024*1024)return Promise.reject(Error('Il file deve essere inferiore a 12 MB'));
 return new Promise((resolve,reject)=>{
  const img=new Image(),src=URL.createObjectURL(file);
  img.onload=()=>{
   URL.revokeObjectURL(src);
   try{const c=d.createElement('canvas'),size=256;c.width=c.height=size;
    const ctx=c.getContext('2d'),side=Math.min(img.width,img.height);
    ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,size,size);
    let str='',quality=.78;
    for(let i=0;i<7;i++){str=c.toDataURL('image/jpeg',quality).split(',')[1];if(str.length<60000)break;quality-=.10;}
    if(str.length>=60000)throw Error('Foto troppo complessa: scegli una fotografia più semplice');
    resolve({mime:'image/jpeg',base64:str});
   }catch(ex){reject(ex)}
  };
  img.onerror=()=>{URL.revokeObjectURL(src);reject(Error('Impossibile leggere la foto.'));};
  img.src=src;
 });
}
async function renderData(){
 const area=loading('data');
 const [a,n]=await Promise.allSettled([api('me'),nativeInfo()]);
 if(!layer||active!=='data')return;
 area.replaceChildren();area.append(sectionTitle('Dati del profilo','Le impostazioni di privacy sono salvate sul server.'));
 const social=a.status==='fulfilled'?a.value:null,person=social?.profile||summary?.profile;
 const native=n.status==='fulfilled'?n.value:{signedIn:false};account=native;
 if(person){
  area.append(line('Nickname',person.nickname||'Non impostato','Visibile nella ricerca quando autorizzato'));
  area.append(line('Visibile nella ricerca',person.searchable?'Sì':'No'));
  area.append(line('Mostra stato online',person.show_online?'Sì':'No'));
 }else area.append(message('Crea prima un nickname per gestire il profilo.'));
 if(native.signedIn){
  area.append(line('Nome account',native.displayName||'Non impostato'));
  area.append(line('Email',native.email||'Non disponibile'));
  area.append(line('Email verificata',native.verified?'Sì':'No'));
  area.append(line('Accesso',native.providers?.includes('google.com')?'Google':'Email e password'));
 }else area.append(message('Non hai effettuato l’accesso con Google o email. Accedi per salvare dati personali e missioni.'));
 area.append(button('✎ Modifica nickname e privacy',()=>{close();w.NC70_SOCIAL?.openTab?.('profile');}));
 if(native.signedIn&&native.providers?.includes('password')){
  area.append(button('✉️ Invia link per cambiare password',()=>{w.NCProfileNative?.resetPassword?.();status('Verifica e invio in corso…');},'nc79-muted-button'));
 }
}
async function renderMissions(name){
 const area=loading(name);let r;
 try{r=await api('pMissions');}catch(err){status(err.message);return;}
 if(!layer||active!==name)return;area.replaceChildren();
 if(name==='missions'){
  area.append(sectionTitle('Missioni giornaliere','Si aggiornano ogni giorno in UTC. I premi sono XP e vengono assegnati una sola volta.'));
  for(const task of r.missions){
   const row=e('div','nc79-task');row.append(line(task.title,'+'+task.xp+' XP',task.claimed?'Premio già riscosso':task.done?'Missione completata':'Da completare'));
   const b=button(task.claimed?'✓ Riscosso':task.done?'Riscatta XP':'Vai alla missione',async()=>{
    if(!task.done){
     close();
     if(task.id==='bonus')w.NC71_DAILY?.open?.();
     else if(task.id==='friends')w.NC70_SOCIAL?.openTab?.('search');
     else w.NC77_CHAT?.open?.();
     return;
    }
    try{await api('pMissionClaim',{id:task.id});await refresh();await renderMissions('missions');status('Esperienza accreditata.');}
    catch(ex){status(ex.message);}
   });b.disabled=task.claimed;row.append(b);area.append(row);
  }
 }else{
  area.append(sectionTitle('Gran slancio','Premi XP per giorni consecutivi di bonus giornaliero riscattato.'));
  area.append(line('Serie di bonus',r.streak+' giorni','Continuità calcolata dal server'));
  for(const item of r.boosts){
   const row=e('div','nc79-task');row.append(line(item.days+' giorni consecutivi','+'+item.xp+' XP',item.claimed?'Già riscosso':item.ready?'Disponibile':item.progress+' / '+item.days+' giorni'));
   const b=button(item.claimed?'✓ Riscosso':item.ready?'Riscatta slancio':'Non ancora disponibile',async()=>{
    try{await api('pBoostClaim',{days:item.days});await refresh();await renderMissions('boost');status('Premio continuità accreditato.');}
    catch(ex){status(ex.message);}
   });b.disabled=item.claimed||!item.ready;row.append(b);area.append(row);
  }
 }
}
async function renderNotifications(){
 const area=loading('notifications');let r;
 try{r=await api('pNotifications');}catch(ex){status(ex.message);return;}
 if(!layer||active!=='notifications')return;area.replaceChildren();
 area.append(sectionTitle('Notificazioni',r.unread+' da leggere · Dati reali di richieste, chat e missioni.'));
 if(!r.items.length){area.append(message('Non hai nuove notifiche.'));return;}
 const keys=[];
 for(const item of r.items){
  const row=e('div','nc79-task');row.append(line(item.title,item.read?'Letta':'● Nuova',item.detail));keys.push(item.key);
  row.append(button('Apri',async()=>{
   try{await api('pNotifRead',{keys:[item.key]});await refresh();}catch(ex){status(ex.message);}
   close();
   if(item.kind==='friends')w.NC70_SOCIAL?.openTab?.('friends');
   else if(item.kind==='chat')w.NC77_CHAT?.open?.();
   else w.NC79_PROFILE?.open?.('missions');
  }));
  area.append(row);
 }
 area.prepend(button('✓ Segna tutte come lette',async()=>{try{await api('pNotifRead',{keys});await refresh();await renderNotifications();}catch(ex){status(ex.message);}}));
}
async function renderAchievements(name){
 const area=loading(name);let r;
 try{r=await api('pAchievements');}catch(err){status(err.message);return;}
 if(!layer||active!==name)return;area.replaceChildren();
 const items=(r.items||[]).filter(x=>name!=='trophies'||x.trophy);
 area.append(sectionTitle(name==='trophies'?'Trofei':'Conquiste','Obiettivi sbloccati in base ad attività realmente registrate dal server.'));
 for(const item of items){
  const tile=e('div','nc79-task');tile.append(line((item.unlocked?'🏆 ':'🔒 ')+item.title,item.unlocked?'Sbloccato':item.progress+'/'+item.target,item.description));area.append(tile);
 }
 if(!items.length)area.append(message('Non ci sono trofei disponibili.'));
}
async function renderPerformance(){
 const area=loading('performance');let data;
 try{data=await api('pPerformance');}catch(err){status(err.message);return;}
 if(!layer||active!=='performance')return;area.replaceChildren();
 area.append(sectionTitle('Prestazioni','Risultati associati al tuo account.'));
 area.append(message(data.note||'I risultati non ancora certificati non vengono conteggiati.'));
 const totals=data.totals||{};
 area.append(line('Partite certificate',totals.played||0));
 area.append(line('Vittorie certificate',totals.wins||0));
 area.append(line('Sconfitte certificate',totals.losses||0));
 area.append(line('Pareggi certificati',totals.draws||0));
 for(const game of data.games||[])area.append(line(NAMES[game.game]||game.game,(game.played||0)+' partite · '+(game.wins||0)+' vittorie'));
}
async function renderRanking(){
 const area=loading('ranking');let data;
 try{data=await api('pRanking');}catch(err){status(err.message);return;}
 if(!layer||active!=='ranking')return;area.replaceChildren();
 area.append(sectionTitle('Classifica mondiale',data.basis||'Classifica di esperienza'));
 area.append(message('La classifica considera soltanto gli account pubblici. Le statistiche di vittoria non verificate non assegnano punti.'));
 area.append(line('La tua posizione',data.myPosition?'#'+data.myPosition:'Non disponibile'));
 for(const item of data.rows||[])area.append(line((item.self?'⭐ ':'')+item.position+'. '+item.nickname,item.xp+' XP'));
}
async function logout(){
 if(!w.NCProfileNative?.logout){status('Esci e rientra dalla schermata di autenticazione Android.');return;}
 if(!w.confirm('Disconnettere il tuo account Google/email da NAPOLI CARTE 3D? Le partite e i progressi online restano associati all’account.'))return;
 w.NCProfileNative.logout();
}
function open(section=''){
 if(layer){if(section)renderEntries(section);return;}
 lastFocus=d.activeElement;layer=e('section','nc79-overlay');layer.id='nc79-profile';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Profilo personale');
 const shell=e('div','nc79-sheet');root=shell;layer.append(shell);
 shell.innerHTML='<header class="nc79-header"><div class="nc79-brand"><span>🃏</span><strong>NAPOLI<br>CARTE 3D</strong></div><span id="nc79-balance" class="nc79-coin">0</span><span class="nc79-heading">👤 PROFILO</span><button id="nc79-close" aria-label="Chiudi profilo">×</button></header><div class="nc79-scroll"><div class="nc79-summary"><div class="nc79-avatar"><img id="nc79-avatar-img" alt="Foto del profilo" hidden><span id="nc79-avatar-fallback">👤</span></div><div class="nc79-stats"><h2 id="nc79-name">Profilo</h2><div class="nc79-level">🏅 Livello <b id="nc79-level">1</b><div class="nc79-progress"><span id="nc79-levelbar"></span></div></div><div class="nc79-numbers"><div><b id="nc79-trophy-count">0</b><small>TROFEI</small></div><div><b id="nc79-achievement-count">0</b><small>CONQUISTE</small></div></div></div></div><nav id="nc79-nav" aria-label="Sezioni profilo"></nav><p role="status" id="nc79-status"></p><section id="nc79-details" class="nc79-details" hidden></section><p class="nc79-foot">GAMES STUDIOS · NAPOLI CARTE 3D</p></div>';
 d.body.append(layer);
 const nav=root.querySelector('#nc79-nav');const backButton=button('← Torna al profilo',overview,'nc79-back');backButton.id='nc79-back';backButton.hidden=true;nav.after(backButton);for(const [id,label] of ENTRIES){const b=button('',()=>renderEntries(id),'nc79-entry');b.dataset.section=id;b.replaceChildren(e('span','nc79-entry-icon',ICONS[id]),e('span','nc79-entry-name',label),e('span','nc79-pill'));b.querySelector('.nc79-pill').hidden=true;b.append(e('span','nc79-chevron','›'));nav.append(b);}
 root.querySelector('#nc79-close').onclick=close;layer.onclick=ev=>{if(ev.target===layer)close()};
 root.querySelector('.nc79-avatar').onclick=()=>renderEntries('photo');
 root.querySelector('.nc79-avatar').setAttribute('role','button');root.querySelector('.nc79-avatar').setAttribute('tabindex','0');
 root.querySelector('.nc79-avatar').addEventListener('keydown',ev=>{if(ev.key==='Enter')renderEntries('photo')});
 nativeInfo().then(info=>{if(!layer)return;account=info;});
 refresh();avatar();
 if(section)renderEntries(section);
 root.querySelector('#nc79-close').focus();
}
d.addEventListener('keydown',ev=>{if(layer&&ev.key==='Escape'){ev.preventDefault();back();}});
w.NC79_PROFILE={open,close,back,isOpen:()=>!!layer};
})(window,document);
