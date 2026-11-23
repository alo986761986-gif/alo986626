/* Napoli Carte 3D 2.2 - 12 premium avatars, opt-in photos, crop editor, mutual friends. */
(function(){'use strict';
if(window.NC22_PROFILE_READY)return;
window.NC22_PROFILE_READY=true;
var AVATARS=['Luna','Sole','Cavaliere','Marina','Vesuvio','Regina','Artista','Stella','Gentiluomo','Sirena','Capitano','Partenope'];
var skins=['#e4af87','#f2c6a9','#ba7759','#dd9878','#e1b390','#a96d50','#f4ceae','#bc8764','#c8886e','#e7ad8d','#ad674e','#f6cdb4'];
var outfits=['#d46a5a','#5d8bbb','#287d71','#9b5d89','#c08a48','#774f98','#4a8caa','#bb6055','#587d54','#b47a78','#416c9e','#8d6361'];
var backdrops=['#5f394e','#205a6d','#4b4732','#5e456d','#5e3c31','#4a516d','#205a5c','#705244','#4a4b78','#406d69','#5b4936','#534d67'];
var hairs=['#302c2f','#71402c','#241a1c','#5e3b2c','#242d2c','#613628','#98593c','#2b2525','#51352c','#292333','#372b23','#6c4432'];
var oldLobby=window.drawLobby,oldGame=window.drawGame,oldUpdate=window.update,oldJoin=window.joinGame;
var lastSyncToken='',lastSyncHash='',syncBusy=false,opened=false,stagePhoto='',pendingImage=null,zoom=1,offsetX=0,offsetY=0,drag=null;
var stateCache22=null,stageAvatar=0;
function activeToken(){try{return typeof token==='string'?token:''}catch(e){return ''}}
function activeMode(){try{return typeof mode==='string'?mode:'online'}catch(e){return 'online'}}
function get(key,f){try{var x=localStorage.getItem(key);return x===null?f:x}catch(e){return f}}
function set(key,v){try{localStorage.setItem(key,String(v));return true}catch(e){return false}}
function cleanName(n){return String(n||'Giocatore').replace(/[<>\r\n\t]/g,'').trim().slice(0,19)||'Giocatore'}
function nId(n){var x=Number(n);return Number.isFinite(x)?Math.max(0,Math.min(11,Math.floor(x))):0}
function current(){
  var m=get('nc22_visibility','avatar');
  if(['avatar','public','room','friends'].indexOf(m)<0)m='avatar';
  return {avatarId:nId(get('nc22_avatar','0')),photo:get('nc22_photo',''),photoMode:m,name:cleanName(get('nc3d_name','Giocatore'))};
}
function ec(str){return String(str==null?'':str).replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]})}
function safeImage(src){return typeof src==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)&&src.length<95000?src:null}
function avatarSvg(id){
  var i=nId(id),sk=skins[i],shirt=outfits[i],bg=backdrops[i],hair=hairs[i];
  var g='nc22gradient'+i;
  var style=i%4;
  var hairShape=style===0?'<path d="M14 32Q9 10 31 9q21 1 18 24l-7-9q-6-6-13-6-7 7-15 14Z" fill="'+hair+'"/>':
    style===1?'<path d="M13 30Q12 10 29 9q19-2 23 23L44 26Q33 11 19 25z" fill="'+hair+'"/><path d="M12 30Q8 42 13 51l9-1-2-21" fill="'+hair+'"/>':
    style===2?'<path d="M15 27Q10 8 35 11q22 4 13 26l-7-14-13-7-14 15" fill="'+hair+'"/>':
               '<path d="M12 31Q5 11 28 8q19-3 24 23l-8-8q-13-11-28 9" fill="'+hair+'"/>';
  var accessory='';
  if(i===1||i===8)accessory='<g fill="none" stroke="#fff1cf" stroke-width="1.8"><circle cx="24" cy="35" r="6"/><circle cx="41" cy="35" r="6"/><path d="M30 35h5"/></g>';
  if(i===2||i===10)accessory='<path d="M12 21Q32 1 53 23L42 26Q31 13 18 27Z" fill="#e1b96f"/><path d="M12 21Q32 1 53 23" fill="none" stroke="#fff6be" stroke-width="2"/>';
  if(i===5)accessory='<path d="M18 22l5-13 9 7 9-7 7 13" fill="#ebc36b" stroke="#fff4be" stroke-width="1.8"/><circle cx="32" cy="15" r="3" fill="#ef8a95"/>';
  if(i===7||i===9)accessory='<circle cx="47" cy="42" r="3" fill="#ffdda0"/><path d="M11 28q-5 10 0 23" stroke="'+hair+'" stroke-width="8"/>';
  if(i===4||i===11)accessory='<path d="M11 21q21-24 42 0" stroke="#dcb078" stroke-width="4" fill="none"/>';
  var smile=i%3===0?'<path d="M27 45q5 4 10 0" stroke="#a85756" stroke-width="1.8" fill="none" stroke-linecap="round"/>':
    '<path d="M27 44q5 6 11 0" stroke="#a85756" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 64 64" role="img" aria-label="Avatar '+ec(AVATARS[i])+'" xmlns="http://www.w3.org/2000/svg">'+
   '<defs><linearGradient id="'+g+'" x1=".1" y1="0" x2="1" y2="1"><stop stop-color="'+bg+'"/><stop offset="1" stop-color="#101d27"/></linearGradient></defs>'+
   '<circle cx="32" cy="32" r="31" fill="url(#'+g+')"/><circle cx="32" cy="32" r="29" fill="none" stroke="#f6d992" stroke-width="1.4"/>'+
   '<path d="M3 63Q9 46 22 47l10 6 10-6q13 0 19 16Z" fill="'+shirt+'"/><path d="M23 48l9 10 9-10" fill="#f4e4cb"/>'+
   '<path d="M27 43v9h10v-9" fill="'+sk+'"/><ellipse cx="32" cy="33" rx="18" ry="22" fill="'+sk+'"/>'+
   '<ellipse cx="13" cy="34" rx="3" ry="6" fill="'+sk+'"/><ellipse cx="51" cy="34" rx="3" ry="6" fill="'+sk+'"/>'+
   hairShape+'<path d="M22 34q3-2 6 0m9 0q3-2 6 0" fill="none" stroke="#3f2926" stroke-width="2.2" stroke-linecap="round"/>'+
   '<circle cx="25" cy="35" r="1.5" fill="#2b2422"/><circle cx="40" cy="35" r="1.5" fill="#2b2422"/>'+
   '<path d="M32 35l-1 6 3 1" stroke="#b9745e" fill="none" stroke-width="1.3"/>'+smile+accessory+'</svg>';
}
function face(p,preview){
  if(!p)p={avatarId:0};
  var photo=safeImage(p.photo);
  if(photo)return '<img class="nc22-personal-photo" src="'+photo+'" alt="Foto profilo" draggable="false">';
  return avatarSvg(p.avatarId);
}
window.NC22_AVATAR_SVG=avatarSvg;
function profileMarkup(){
  var p=current();
  return '<div id="nc22-profile-top" class="nc22-profile-top">'+
    '<button class="nc22-top-person" onclick="NC22_OPEN_PROFILE()" aria-label="Apri il tuo profilo">'+
    '<span class="nc22-top-face">'+face(p)+'</span><span class="nc22-top-text"><b>Il mio profilo</b><small>Cambia avatar o aggiungi foto</small></span><span class="nc22-edit-glyph">✎</span></button>'+
    '<span class="nc22-profile-privacy">🔒 Foto protetta</span></div>';
}
function putProfileEntry(){
  var setup=document.querySelector('.setup');if(setup&&!document.getElementById('nc22-profile-top')){
    var host=document.createElement('div');host.innerHTML=profileMarkup();
    var opts=document.getElementById('nc-ultimate-options');setup.insertBefore(host.firstChild,opts||setup.firstChild);
    var oldBtns=setup.querySelectorAll('.nc-avatar-pick');Array.prototype.forEach.call(oldBtns,function(b){var group=b.closest('.nc-option-group');if(group)group.style.display='none'});
  }
}
window.drawLobby=function(){var out=oldLobby.apply(this,arguments);putProfileEntry();return out};
function decoratePlayers(state){
  if(!state||!state.players)return;
  stateCache22=state;
  var view=state.players[state.seat]||{};
  var currentLocal=current();
  // Every active player receives their selected SVG or their privacy-approved photo.
  var opponent=state.players.map(function(p,i){return {p:p,index:i}}).filter(function(x){return x.index!==state.seat});
  var order=state.seats===2?[opponent[0]]:[opponent[1],opponent[0],opponent[2]];
  var nodes=document.querySelectorAll('.board .player');
  Array.prototype.forEach.call(nodes,function(node,idx){
    var entry=order[idx];if(!entry||!entry.p)return;
    var target=node.querySelector('.avatar');if(!target)return;
    target.innerHTML=face(entry.p);
    target.classList.add('nc22-real-avatar');
    var badge=node.querySelector('.nc22-friend-btn');if(badge)badge.remove();
    if(!entry.p.bot&&entry.p.friendStatus!=='self'){
      badge=document.createElement('button');badge.type='button';badge.className='nc22-friend-btn';
      var status=entry.p.friendStatus;
      badge.textContent=status==='friend'?'✓ Amici':status==='incoming'?'+ Accetta amicizia':status==='outgoing'?'Richiesta inviata':'+ Amico';
      badge.title=status==='friend'?'Rimuovi amicizia':status==='incoming'?'Accetta richiesta':status==='outgoing'?'Richiesta in attesa':'Invia richiesta amicizia';
      badge.disabled=status==='outgoing';
      badge.onclick=function(ev){ev.stopPropagation();window.NC22_FRIEND(entry.index,status)};
      node.appendChild(badge);
    }
  });
  // Current player can see their own picture even with avatar-only visibility.
  var own=document.querySelector('.myname .nc-self-avatar');
  if(own){own.innerHTML=face({avatarId:currentLocal.avatarId,photo:currentLocal.photo});own.classList.add('nc22-self-face')}
  var hud=document.querySelector('.hudtop');
  if(hud&&!document.getElementById('nc22-hud-profile')){
    var button=document.createElement('button');button.type='button';button.id='nc22-hud-profile';button.className='nc22-hud-profile';button.innerHTML='✎ Profilo';button.setAttribute('aria-label','Modifica avatar e foto');button.onclick=window.NC22_OPEN_PROFILE;hud.appendChild(button);
  }
  var wait=document.querySelectorAll('.nc-wait-seat');
  Array.prototype.forEach.call(wait,function(node,i){if(state.players[i]){node.innerHTML=face(state.players[i]);node.classList.add('nc22-wait-face')}});
}
window.drawGame=function(state){var out=oldGame.apply(this,arguments);decoratePlayers(state);return out};
function message(s){if(typeof window.toast==='function')window.toast(s);else alert(s)}
function profileHash(p){return p.avatarId+'|'+p.photoMode+'|'+p.name+'|'+p.photo}
async function syncProfile(force){
  var t=activeToken();
  if(!t||syncBusy)return;
  var p=current(),h=profileHash(p);
  if(!force&&lastSyncToken===t&&lastSyncHash===h)return;
  syncBusy=true;
  try{
    var response;
    if(window.NC3D_OFFLINE&&activeMode()==='bot'){
      response=window.NC3D_LOCAL.profile(t,p);
    }else{
      var toServer={avatarId:p.avatarId,name:p.name,photoMode:p.photoMode,photo:p.photoMode==='avatar'?'':p.photo};
      response=await window.api('profile',{token:t,profile:toServer});
    }
    lastSyncToken=t;lastSyncHash=h;
    if(response&&response.players){stateCache=response;window.drawGame(response)}
  }catch(err){message('Profilo locale salvato. Sincronizzazione: '+(err.message||'errore rete'))}
  finally{syncBusy=false}
}
window.update=async function(){var out=await oldUpdate.apply(this,arguments);var t=activeToken();if(t&&t!==lastSyncToken)await syncProfile(false);return out};
window.joinGame=async function(){var out=await oldJoin.apply(this,arguments);if(activeToken())await syncProfile(true);return out};
window.NC22_FRIEND=async function(seat,status){
  if(!activeToken()||activeMode()==='bot')return message('Le amicizie sono disponibili solo online');
  var operation=status==='friend'?'remove':status==='incoming'?'accept':'request';
  try{var state=await window.api('friend',{token:activeToken(),target:seat,operation:operation});
    stateCache=state;window.drawGame(state);
    message(operation==='request'?'Richiesta inviata':operation==='accept'?'Ora siete amici!':'Amicizia rimossa');
  }catch(err){message(err.message||'Errore amicizia')}
};
function ensureModal(){
  if(document.getElementById('nc22-profile-panel'))return;
  var host=document.createElement('div');host.id='nc22-profile-panel';host.className='nc22-panel';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Personalizza il tuo profilo');host.hidden=true;
  host.innerHTML='<div class="nc22-shade" data-nc22-close="1"></div><div class="nc22-sheet">'+
    '<header class="nc22-title"><div><small>NAPOLI CARTE 3D</small><h2>Il mio profilo</h2><p>Scegli il tuo stile o usa una foto reale.</p></div><button type="button" class="nc22-x" id="nc22-close" aria-label="Chiudi">×</button></header>'+
    '<div class="nc22-hero"><div class="nc22-portrait" id="nc22-portrait"></div><div><b>Il tuo volto al tavolo</b><p>Foto e avatar si aggiornano durante la partita.</p></div></div>'+
    '<label class="nc22-label" for="nc22-name">Nome giocatore</label><input id="nc22-name" class="nc22-name" maxlength="19" autocomplete="nickname">'+
    '<div class="nc22-divider"><b>12 avatar premium</b><span>Scegli e cambia quando vuoi</span></div><div class="nc22-avatar-grid" id="nc22-avatar-grid"></div>'+
    '<div class="nc22-divider"><b>La tua foto reale</b><span>Facoltativa, modificabile</span></div>'+
    '<div class="nc22-upload-row"><button id="nc22-gallery" type="button">▧ Scegli foto</button><button id="nc22-camera" type="button">◉ Scatta foto</button><button id="nc22-remove" type="button" class="nc22-danger">✕ Rimuovi</button></div>'+
    '<input id="nc22-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" hidden><input id="nc22-camera-input" type="file" accept="image/*" capture="user" hidden>'+
    '<div id="nc22-crop" class="nc22-crop" hidden><p>Trascina la foto e usa lo zoom per centrare il volto.</p><div class="nc22-canvas-frame"><canvas id="nc22-photo-canvas" width="260" height="260" aria-label="Anteprima ritaglio quadrato"></canvas><span class="nc22-canvas-circle"></span></div><div class="nc22-slider"><label for="nc22-zoom">Zoom</label><input id="nc22-zoom" type="range" min="1" max="3" step="0.05" value="1"></div><button id="nc22-use-crop" class="nc22-crop-save" type="button">✓ Usa questa foto</button></div>'+
    '<div class="nc22-divider"><b>Chi può vedere la foto?</b><span>Default: solo avatar</span></div><div class="nc22-privacy" id="nc22-privacy">'+
    '<label><input type="radio" name="nc22-visibility" value="avatar"><span>🔒 Solo avatar <small>Gli altri non vedono la foto</small></span></label>'+
    '<label><input type="radio" name="nc22-visibility" value="public"><span>🌍 Altri giocatori <small>Visibile ai partecipanti delle partite online</small></span></label>'+
    '<label><input type="radio" name="nc22-visibility" value="friends"><span>♡ Solo amici <small>Amicizia confermata da entrambi nella partita</small></span></label>'+
    '<label><input type="radio" name="nc22-visibility" value="room"><span>♣ Solo stanze private <small>Visibile ai giocatori della stanza con codice</small></span></label></div>'+
    '<p class="nc22-disclosure">Con Solo avatar la foto non viene inviata al server. Se autorizzi la visibilità, la foto ritagliata viene inviata temporaneamente durante la partita. Non esistono ancora account condivisi tra dispositivi; le amicizie valgono per la partita in corso.</p>'+
    '<div class="nc22-actions"><button type="button" id="nc22-cancel">Annulla</button><button type="button" id="nc22-save">✓ Salva profilo</button></div></div>';
  document.body.appendChild(host);
  function el(id){return document.getElementById(id)}
  host.addEventListener('click',function(e){if(e.target&&e.target.hasAttribute('data-nc22-close'))closeProfile()});
  el('nc22-close').onclick=closeProfile;el('nc22-cancel').onclick=closeProfile;
  el('nc22-gallery').onclick=function(){el('nc22-gallery-input').click()};
  el('nc22-camera').onclick=function(){el('nc22-camera-input').click()};
  el('nc22-remove').onclick=function(){stagePhoto='';pendingImage=null;el('nc22-crop').hidden=true;renderPortrait()};
  el('nc22-gallery-input').onchange=function(){receiveImage(this.files&&this.files[0]);this.value=''};
  el('nc22-camera-input').onchange=function(){receiveImage(this.files&&this.files[0]);this.value=''};
  el('nc22-zoom').oninput=function(){zoom=Number(this.value)||1;drawCrop()};
  el('nc22-use-crop').onclick=useCrop;
  el('nc22-save').onclick=saveProfile;
  var canvas=el('nc22-photo-canvas');
  canvas.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY};if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);e.preventDefault()});
  canvas.addEventListener('pointermove',function(e){if(!drag||!pendingImage)return;var bounds=canvas.getBoundingClientRect(),ratio=260/Math.max(bounds.width,1);offsetX=drag.ox+(e.clientX-drag.x)*ratio;offsetY=drag.oy+(e.clientY-drag.y)*ratio;drawCrop();e.preventDefault()});
  canvas.addEventListener('pointerup',function(){drag=null});canvas.addEventListener('pointercancel',function(){drag=null});
}
function renderAvatarGrid(){var grid=document.getElementById('nc22-avatar-grid');if(!grid)return;var active=stageAvatar;grid.innerHTML=AVATARS.map(function(n,i){return '<button type="button" class="nc22-avatar-choice" aria-pressed="'+(active===i)+'" onclick="NC22_PICK_AVATAR('+i+')">'+avatarSvg(i)+'<small>'+ec(n)+'</small></button>'}).join('')}
function renderPortrait(){var t=document.getElementById('nc22-portrait');if(t)t.innerHTML=face({avatarId:stageAvatar,photo:stagePhoto})}
window.NC22_CLOSE_PROFILE=function(){if(!opened)return false;closeProfile();return true};
window.NC22_CLOSE_PROFILE=function(){if(!opened)return false;closeProfile();return true};
function closeProfile(){var box=document.getElementById('nc22-profile-panel');if(box){box.hidden=true;document.body.classList.remove('nc22-modal-open')}opened=false}
window.NC22_OPEN_PROFILE=function(){ensureModal();opened=true;var p=current(),box=document.getElementById('nc22-profile-panel');box.hidden=false;document.body.classList.add('nc22-modal-open');stagePhoto=p.photo;stageAvatar=p.avatarId;document.getElementById('nc22-name').value=document.getElementById('nickname')?.value||p.name;var input=box.querySelector('input[value="'+p.photoMode+'"]');if(input)input.checked=true;document.getElementById('nc22-crop').hidden=true;pendingImage=null;renderAvatarGrid();renderPortrait();setTimeout(function(){document.getElementById('nc22-close').focus()},0)};
window.NC22_PICK_AVATAR=function(id){stageAvatar=nId(id);renderAvatarGrid();renderPortrait()};
function receiveImage(file){
 if(!file)return;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12*1024*1024)return message('Scegli una foto JPG, PNG o WebP fino a 12 MB');
 var url=URL.createObjectURL(file),img=new Image();
 img.onload=function(){URL.revokeObjectURL(url);pendingImage=img;zoom=1;offsetX=0;offsetY=0;document.getElementById('nc22-zoom').value='1';document.getElementById('nc22-crop').hidden=false;drawCrop()};
 img.onerror=function(){URL.revokeObjectURL(url);message('Non riesco ad aprire questa immagine')};
 img.src=url;
}
function drawCrop(){
 var canvas=document.getElementById('nc22-photo-canvas');if(!canvas||!pendingImage)return;
 var ctx=canvas.getContext('2d');if(!ctx)return;
 var w=260,h=260,iw=pendingImage.naturalWidth||1,ih=pendingImage.naturalHeight||1;
 var scale=Math.max(w/iw,h/ih)*zoom,dw=iw*scale,dh=ih*scale;
 var maxX=Math.max(0,(dw-w)/2),maxY=Math.max(0,(dh-h)/2);
 offsetX=Math.max(-maxX,Math.min(maxX,offsetX));offsetY=Math.max(-maxY,Math.min(maxY,offsetY));
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#e9dfd1';ctx.fillRect(0,0,w,h);
 ctx.drawImage(pendingImage,(w-dw)/2+offsetX,(h-dh)/2+offsetY,dw,dh);
}
function useCrop(){
 if(!pendingImage)return;
 var canvas=document.getElementById('nc22-photo-canvas');if(!canvas)return;
 var output=document.createElement('canvas');output.width=192;output.height=192;
 output.getContext('2d').drawImage(canvas,0,0,192,192);
 var jpeg=output.toDataURL('image/jpeg',.74);
 if(!safeImage(jpeg)||jpeg.length>95000)return message('La foto risulta troppo grande; scegline una diversa');
 stagePhoto=jpeg;pendingImage=null;document.getElementById('nc22-crop').hidden=true;renderPortrait();message('Foto ritagliata: salva il profilo per applicarla');
}
async function saveProfile(){
 var name=cleanName(document.getElementById('nc22-name').value);
 var input=document.querySelector('input[name="nc22-visibility"]:checked');var privacy=input?input.value:'avatar';
 if(['avatar','public','room','friends'].indexOf(privacy)<0)privacy='avatar';
 if(!set('nc22_photo',stagePhoto))return message('Spazio di memoria insufficiente per salvare la foto');
 set('nc22_visibility',privacy);set('nc3d_name',name);set('nc22_avatar',stageAvatar);set('nc22_avatar',stageAvatar);
 var nickname=document.getElementById('nickname');if(nickname)nickname.value=name;
 var wasGame=!!document.querySelector('.board');closeProfile();
 if(activeToken()){await syncProfile(true)}
 else if(typeof window.drawLobby==='function')window.drawLobby();
 if(wasGame&&stateCache)window.drawGame(stateCache);
 message('Profilo personalizzato salvato');
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)closeProfile()});
// Replace the old four-avatar picker on the lobby without interfering with game setup.
if(document.querySelector('.setup'))putProfileEntry();
if(activeToken())syncProfile(false);
})();