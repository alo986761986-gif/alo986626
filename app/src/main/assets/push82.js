(function(w){'use strict';
w.NC82_OPEN_NOTIFICATION=function(destination,sender,name,inviteId){
  try{
    if(destination==='game_invites'){if(!w.NC70_SOCIAL?.open)return false;w.NC70_SOCIAL.openInvite?.(inviteId);return true;}
    if(destination==='friends'){if(!w.NC70_SOCIAL?.open)return false;w.NC70_SOCIAL.open('friends');return true;}
    if(destination==='chat'){
      if(!w.NC77_CHAT?.open)return false;
      // The backend verified the sender; use the native-provided nickname only for display.
      if(sender&&/^[A-Za-z0-9:_-]{1,128}$/.test(sender))w.NC77_CHAT.open(sender,String(name||"Amico").slice(0,24));
      else w.NC77_CHAT.open();
      return true;
    }
    if(destination==='daily_bonus'){if(!w.NC71_DAILY?.open)return false;w.NC71_DAILY.open();return true;}
  }catch(e){return false;}
  return false;
};
})(window);
