(function(g){
'use strict';
const photoRx=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
function current(){
 const p=g.NC22_CHIODO_PROFILE?.()||{};
 const photo=typeof p.photo==='string'&&p.photo.length<95000&&photoRx.test(p.photo)?p.photo:'';
 const mode=['avatar','public','friends','room'].includes(p.photoMode)?p.photoMode:'avatar';
 return {name:String(g.NC80_IDENTITY?.get?.()||p.name||'Giocatore').slice(0,32),avatarId:Math.max(0,Math.min(11,Number(p.avatarId)||0)),photoMode:mode,photo};
}
function visible(p,own){
 if(!p||p.bot)return '';
 const src=own?current().photo:p.photo;
 if(typeof src!=='string'||src.length>=95000||!photoRx.test(src))return '';
 if(!own&&p.photoMode==='avatar')return '';
 return '<img class="ch69-personal-photo" alt="Foto personale" draggable="false" src="'+src+'">';
}
function openEditor(){
 if(typeof g.NC22_OPEN_PROFILE!=='function')return;
 g.NC22_OPEN_PROFILE();
 const container=document.getElementById('nc22-privacy');
 if(container&&!document.getElementById('ch69-privacy-note')){
  const note=document.createElement('p');note.id='ch69-privacy-note';
  note.style.cssText='font-size:12px;line-height:1.5;color:#ead09c';
  note.textContent='In Chiodo 121 la foto viene condivisa con gli altri giocatori solo scegliendo “Altri giocatori”. Con “Solo avatar”, “Solo amici” e “Solo stanze private” gli altri vedono l’avatar: Chiodo non dispone ancora di amicizie o stanze private.';
  container.after(note);
 }
}
function mount(root,s){
 if(!root||!s)return;
 root.querySelectorAll('.ch-seat[data-seat]').forEach(seat=>{
  const i=Number(seat.dataset.seat),p=s.players?.[i];
  if(!p||p.bot)return;
  const avatar=seat.querySelector('.ch-avatar'),src=visible(p,i===s.seat);
  if(avatar&&src){avatar.innerHTML=src;avatar.removeAttribute('data-ch65-portrait');}
  if(i!==s.seat)return;
  let button=seat.querySelector(':scope > .ch69-edit');
  if(!button){button=document.createElement('button');button.className='ch69-edit';button.type='button';seat.append(button);}
  button.textContent='✎ Foto';button.setAttribute('aria-label','Modifica foto e visibilita');button.onclick=e=>{e.stopPropagation();openEditor();};
  let caption=seat.querySelector('.ch69-caption');
  if(!caption){caption=document.createElement('small');caption.className='ch69-caption';seat.append(caption);}
  caption.textContent=current().photoMode==='public'?'Foto visibile agli avversari':'Foto privata · solo avatar';
 });
}
async function sync(){
 const network=g.NC69_CHIODO_NETWORK;
 if(!network?.getToken?.())return;
 const p=current();
 // Chiodo has no mutual-friend list or invite room. Never upload a photo in
 // those modes or when it is explicitly hidden. Only public photo opt-in.
 const payload={avatarId:p.avatarId,photoMode:p.photoMode,photo:p.photoMode==='public'?p.photo:''};
 await network.profile(payload);
 if(network.getToken())await network.refresh();
}
function refreshLocal(){
 const root=document.getElementById('chiodo121');
 if(!root)return;
 const own=root.querySelector('.ch-seat[data-own="1"]');
 if(!own)return;
 const avatar=own.querySelector('.ch-avatar'),p=current();
 if(avatar){
  const img=visible({photo:p.photo},true);
  if(img){avatar.innerHTML=img;avatar.removeAttribute('data-ch65-portrait');}
  else if(g.NC22_AVATAR_SVG)avatar.innerHTML=g.NC22_AVATAR_SVG(p.avatarId);
 }
 const caption=own.querySelector('.ch69-caption');
 if(caption)caption.textContent=p.photoMode==='public'?'Foto visibile agli avversari':'Foto privata · solo avatar';
}
const style=document.createElement('style');
style.textContent='.ch65 .ch69-personal-photo{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none}.ch65 .ch-seat .ch69-edit{z-index:40!important;position:relative;min-width:55px;min-height:28px;padding:4px 9px!important;border-radius:10px;border:1px solid #e2c487;background:#143b2e;color:#fff0c5;font-size:11px;touch-action:manipulation}.ch65 .ch-seat .ch69-caption{font-size:9px;line-height:1.2;max-width:100px;white-space:normal;color:#c3e3ca}@media(max-height:520px) and (orientation:landscape){.ch65 .ch-seat .ch69-caption{display:none}}';
document.head.append(style);
g.NC69_PHOTO={current,visible,mount,sync,refreshLocal,openEditor};
})(window);
