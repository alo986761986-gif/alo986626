(function(g){'use strict';
const css=document.createElement('style');css.textContent=`
.board .player b,.ch-premium .ch-seat b,.myname{font-family:system-ui,sans-serif!important;font-size:clamp(14px,3.8vw,18px)!important;font-weight:850!important;color:#fff!important;text-shadow:0 2px 3px #000!important;letter-spacing:.15px;max-width:145px!important;line-height:1.2!important}
.myname{max-width:95vw!important}.board .player.turn{border-color:#39ed85!important;box-shadow:0 0 15px #36f38366!important}
.nc59-clock{display:inline-grid;place-items:center;position:relative;vertical-align:middle;border-radius:50%;padding:6px;background:conic-gradient(#36ff83 var(--nc59-progress,100%),#163b2c 0);box-shadow:0 0 12px #36ff8388;margin:3px;flex-shrink:0}
.nc59-clock>.avatar,.nc59-clock>.ch-avatar,.nc59-clock>.nc-self-avatar{margin:0!important;border:0!important;box-shadow:none!important;animation:none!important}
.nc59-clock>.nc-self-avatar{width:38px!important;height:38px!important}.nc59-clock>.nc-self-avatar svg{width:32px!important;height:32px!important}
.nc59-clock .nc59-seconds{position:absolute;bottom:-6px;right:-8px;background:#06281b;color:#b9ffd0;border:1px solid #42f28b;border-radius:12px;font:800 12px system-ui;padding:2px 5px;min-width:22px;text-align:center;z-index:3}
.nc59-clock.expired{box-shadow:0 0 8px #2ab76544}.nc59-clock.expired .nc59-seconds{color:#fff}
`;document.head.append(css);
const clocks=new Map();
function clear(root){clocks.delete(root);root.querySelectorAll('.nc59-clock').forEach(w=>{const avatar=w.firstElementChild;if(avatar)w.replaceWith(avatar);else w.remove();});}
function paint(root,s,kind){if(!root)return;if(!s||s.status!=='playing'){clear(root);return;}const key=String(s.roomId||s.id||kind)+'/'+s.turn;let rec=clocks.get(root);if(!rec||rec.key!==key){rec={key,deadline:Date.now()+60000};clocks.set(root,rec);}if(Number.isFinite(s.turnDeadline)&&s.turnDeadline>0)rec.deadline=s.turnDeadline;else if(kind==='ch'&&s.turnDeadline===0){clear(root);return;}
const avatar=kind==='ch'?root.querySelector('.ch-seat.active .ch-avatar'):s.turn===s.seat?root.querySelector('.myname .nc-self-avatar'):root.querySelector('.player.turn .avatar');
root.querySelectorAll('.nc59-clock').forEach(w=>{if(w.firstElementChild!==avatar){const a=w.firstElementChild;if(a)w.replaceWith(a);else w.remove();}});
if(avatar&&!avatar.parentElement.classList.contains('nc59-clock')){const w=document.createElement('span');w.className='nc59-clock';avatar.replaceWith(w);w.append(avatar);const t=document.createElement('span');t.className='nc59-seconds';w.append(t);}tick();}
function tick(){for(const [root,r] of clocks){if(!root.isConnected){clocks.delete(root);continue;}const ms=Math.max(0,r.deadline-Date.now());const w=root.querySelector('.nc59-clock');if(!w)continue;w.style.setProperty('--nc59-progress',Math.min(100,ms/600)+'%');w.classList.toggle('expired',ms===0);const t=w.querySelector('.nc59-seconds');if(t)t.textContent=Math.ceil(ms/1000)+'s';}}
const draw=g.drawGame;if(typeof draw==='function')g.drawGame=function(s){const out=draw.apply(this,arguments);paint(document.getElementById('root'),s,'classic');return out;};
const lobby=g.drawLobby;if(typeof lobby==='function')g.drawLobby=function(){const root=document.getElementById('root');if(root)clear(root);return lobby.apply(this,arguments);};
const ch=g.NC_CHIODO_TABLE;if(typeof ch==='function')g.NC_CHIODO_TABLE=function(root,s){const out=ch.apply(this,arguments);paint(root,s,'ch');return out;};setInterval(tick,100);
})(window);