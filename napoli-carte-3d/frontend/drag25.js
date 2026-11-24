/* Napoli Carte 3D 2.5 - touch and mouse drag-to-play. Same authoritative rules as tap. */
(function(){'use strict';
 if(window.NC25_DRAG_READY)return;window.NC25_DRAG_READY=true;
 const THRESHOLD=10;let gesture=null,blockedUntil=0,blockedId='';
 const el=(s)=>document.querySelector(s);
 function canMove(){try{return !!(stateCache&&stateCache.status==='playing'&&stateCache.turn===stateCache.seat&&stateCache.game!=='sette'&&!choosing)}catch(e){return false}}
 function cardId(button){return button&&button.getAttribute('data-nc-id')||''}
 function pointOnBoard(x,y){const board=el('.board');if(!board)return false;const r=board.getBoundingClientRect();return x>r.left+r.width*.09&&x<r.right-r.width*.09&&y>r.top+r.height*.19&&y<r.bottom-r.height*.13}
 function ensureZone(){const center=el('.board .centerarea');if(!center)return null;let zone=center.querySelector('.nc25-target');if(!zone){zone=document.createElement('div');zone.className='nc25-target';zone.innerHTML='<span>RILASCIA QUI LA CARTA</span>';zone.setAttribute('aria-hidden','true');center.appendChild(zone)}return zone}
 function label(){const actions=el('.actions');if(!actions||!canMove())return; if(actions.querySelector('.nc25-drag-tip'))return;
 const hint=document.createElement('p');hint.className='nc25-drag-tip';hint.textContent='Trascina una carta sul tavolo per giocarla, oppure toccala.';actions.appendChild(hint);}
 function preview(g,x,y){if(!g.ghost){const c=g.source.cloneNode(true);c.removeAttribute('onclick');c.removeAttribute('id');c.removeAttribute('tabindex');c.setAttribute('aria-hidden','true');c.setAttribute('role','presentation');c.classList.add('nc25-ghost');const rect=g.source.getBoundingClientRect();c.style.width=rect.width+'px';c.style.height=rect.height+'px';document.body.appendChild(c);g.ghost=c;g.source.classList.add('nc25-source');}
 g.ghost.style.left=(x-g.offsetX)+'px';g.ghost.style.top=(y-g.offsetY-11)+'px';ensureZone();const board=el('.board');if(board)board.classList.toggle('nc25-over-table',pointOnBoard(x,y));document.documentElement.classList.add('nc25-dragging');}
 function finish(g,played){const board=el('.board');if(board)board.classList.remove('nc25-over-table');document.documentElement.classList.remove('nc25-dragging');if(g.source&&g.source.isConnected)g.source.classList.remove('nc25-source');
 if(g.ghost){const ghost=g.ghost;if(played){const area=el('.board .centerarea');if(area){const r=area.getBoundingClientRect();ghost.style.left=(r.left+r.width/2-ghost.offsetWidth/2)+'px';ghost.style.top=(r.top+r.height/2-ghost.offsetHeight/2)+'px';}ghost.classList.add('nc25-played');}else{const source=g.source&&g.source.isConnected?g.source.getBoundingClientRect():g.sourceRect;ghost.style.left=source.left+'px';ghost.style.top=source.top+'px';ghost.classList.add('nc25-return');}setTimeout(()=>ghost.remove(),220)} }
 function down(e){if(e.isPrimary===false||e.button>0||gesture||!canMove())return;const b=e.target.closest&&e.target.closest('.myhand .user-card');if(!b)return;
 const id=cardId(b);if(!id)return;const rect=b.getBoundingClientRect();gesture={pointer:e.pointerId,source:b,id,x:e.clientX,y:e.clientY,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,sourceRect:rect,moved:false,ghost:null};}
 function move(e){const g=gesture;if(!g||e.pointerId!==g.pointer)return;const delta=Math.hypot(e.clientX-g.x,e.clientY-g.y);if(!g.moved&&delta<THRESHOLD)return;if(!g.moved)g.moved=true;if(e.cancelable)e.preventDefault();preview(g,e.clientX,e.clientY);}
 function up(e){const g=gesture;if(!g||e.pointerId!==g.pointer)return;gesture=null;if(!g.moved)return;
 const wasValid=canMove()&&pointOnBoard(e.clientX,e.clientY);
 blockedId=g.id;blockedUntil=Date.now()+750;
 finish(g,wasValid);if(wasValid){try{if(navigator.vibrate)navigator.vibrate(14);window.selectCard(g.id)}catch(err){console.warn('Carta non giocata:',err)}}}
 function cancel(e){const g=gesture;if(!g||e.pointerId!==g.pointer)return;gesture=null;if(g.moved){blockedId=g.id;blockedUntil=Date.now()+450;finish(g,false)}}
 document.addEventListener('pointerdown',down,{capture:true,passive:true});
 document.addEventListener('pointermove',move,{capture:true,passive:false});
 document.addEventListener('pointerup',up,{capture:true,passive:true});
 document.addEventListener('pointercancel',cancel,{capture:true,passive:true});
 // Prevent the synthetic click following a drag from playing twice, or after canceling.
 document.addEventListener('click',function(e){if(Date.now()>blockedUntil)return;const b=e.target.closest&&e.target.closest('.myhand .user-card');if(!b||cardId(b)!==blockedId)return;e.preventDefault();e.stopImmediatePropagation();},{capture:true});
 const prev=window.drawGame;if(typeof prev==='function')window.drawGame=function(s){const r=prev.apply(this,arguments);if(!gesture)label();return r};
 window.NC25_DRAG_STATUS=function(){return {ready:true,active:!!gesture,moved:!!gesture?.moved,canMove:canMove()}};
 if(el('.board'))label();
})();
