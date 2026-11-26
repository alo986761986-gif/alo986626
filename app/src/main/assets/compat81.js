(function(w,d){
'use strict';
if(w.NC81_BACK)return;
// One back stack for Android 7-16 gestures, Samsung/Xiaomi/OPPO back keys and on-screen back.
function back(){
 try{
  if(w.NC_BANCO_ONLINE_CLOSE?.())return true;
  if(w.NC_BANCO_CLOSE?.())return true;
  if(w.NC79_PROFILE?.isOpen?.()){w.NC79_PROFILE.back();return true;}
  if(w.NC71_DAILY?.isOpen?.()){w.NC71_DAILY.close();return true;}
  if(w.NC78_FEEDBACK?.isOpen?.()){w.NC78_FEEDBACK.close();return true;}
  if(w.NC77_CHAT?.isOpen?.()){w.NC77_CHAT.close();return true;}
  if(w.NC76_MENU?.isOpen?.()){w.NC76_MENU.close();return true;}
  if(d.getElementById('nc70-overlay')){w.NC70_SOCIAL?.close?.();return true;}
  if(w.NC_MARKET_CLOSE?.())return true;
  if(w.NC52_CLOSE_STORE?.())return true;
  if(w.NC_CHIODO_CLOSE_RULES?.())return true;
  if(w.NC_CHIODO_CLOSE_CHAT?.())return true;
  if(w.NC23_CLOSE_CHAT?.())return true;
  if(w.NC22_CLOSE_PROFILE?.())return true;
  if(d.getElementById('nc72-hub')){w.NC72_ONLINE_CLOSE?.();return true;}
  if(d.getElementById('nc74-welcome')){w.NC74_WELCOME?.close?.();return true;}
  if(w.NC81_CHIODO_CPU_CLOSE?.())return true;
  const modal=d.getElementById('modal');
  if(modal?.classList.contains('open')){w.closeRules?.();return true;}
  const host=d.getElementById('root');
  if(host&&!host.querySelector('.setup')&&(host.querySelector('.board')||host.querySelector('.waiting')||host.querySelector('.scoreboard'))){
   w.lobby?.();return true;
  }
 }catch(e){try{console.warn('Napoli back navigation',e);}catch(_){}}
 return false; // Native layer asks whether to exit when already at the main lobby.
}
w.NC81_BACK={back};
})(window,document);
