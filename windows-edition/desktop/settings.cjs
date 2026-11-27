'use strict';
const fs = require('node:fs');
const path = require('node:path');
const URLS = Object.freeze({
  classic: 'https://napoli-carte-3d-global.onrender.com',
  social: 'https://napoli-chiodo-121.onrender.com',
  chiodo: 'https://napoli-chiodo-121.onrender.com'
});
const OPERATIONS = Object.freeze({
 me:'social/me',profile:'social/profile',search:'social/search',friends:'social/friends',request:'social/request',accept:'social/accept',remove:'social/remove',block:'social/block',heartbeat:'social/heartbeat',stats:'social/stats',progress:'social/progress',daily:'daily/status',claim:'daily/claim',
 chatThreads:'chat/threads',chatMessages:'chat/messages',chatAudio:'chat/audio',chatSend:'chat/send',chatRead:'chat/read',report:'feedback/report',
 pSummary:'profile79/summary',pPhoto:'profile79/photo',pPhotoSave:'profile79/photo/save',pMissions:'profile79/missions',pMissionClaim:'profile79/mission/claim',pBoostClaim:'profile79/boost/claim',pNotifications:'profile79/notifications',pNotifRead:'profile79/notifications/read',pAchievements:'profile79/achievements',pPerformance:'profile79/performance',pRanking:'profile79/ranking',
 marketState:'market/state',marketBuy:'market/buy',marketEquip:'market/equip',b92Rooms:'banco92/rooms',b92State:'banco92/state',b92Join:'banco92/join',b92Start:'banco92/start',b92Leave:'banco92/leave',
 inviteList:'invites94/list',invitePreferences:'invites94/preferences',inviteCandidates:'invites94/friends-of-friends',inviteSend:'invites94/send',invitePublish:'invites94/publish',inviteBrowse:'invites94/browse',inviteRespond:'invites94/respond',inviteEnter:'invites94/enter',inviteWatch:'invites94/watch'
});
const GET_OPS=new Set(['me','search','friends','stats','daily','marketState','b92Rooms','b92State','chatThreads','chatMessages','chatAudio','pSummary','pPhoto','pMissions','pNotifications','pAchievements','pPerformance','pRanking','inviteList','inviteCandidates','inviteBrowse','inviteWatch']);
function socialRequest(op,data={}){
 if(!Object.prototype.hasOwnProperty.call(OPERATIONS,op)) throw Error('Operazione non consentita');
 if(!data || typeof data !=='object' || Array.isArray(data))throw Error('Payload non valido');
 const get=GET_OPS.has(op) || (op==='progress'||op==='invitePreferences')&&data.read===true;
 const url=new URL(OPERATIONS[op],URLS.social+'/');
 if(op==='search')url.searchParams.set('q',String(data.q||'').slice(0,100));
 if(op==='b92State')url.searchParams.set('roomId',String(data.roomId||'').slice(0,128));
 if(op==='chatMessages'){url.searchParams.set('peer',String(data.peer||'').slice(0,128));for(const key of ['after','before'])if(data[key]!=null)url.searchParams.set(key,String(data[key]).slice(0,128));}
 if(op==='chatAudio')url.searchParams.set('id',String(data.id||'').slice(0,128));
 if(op==='inviteWatch')url.searchParams.set('id',String(data.id||'').slice(0,128));
 return {url:url.toString(),method:get?'GET':'POST',body:get?undefined:JSON.stringify(data)};
}
function fileIn(base, requestPath){
 const name=decodeURIComponent(String(requestPath||'').split('?')[0]).replace(/^\/+/, '');
 if(name.includes('\\')||name.split('/').some(p=>p==='..'||p==='.')||name.includes('\0'))throw Error('Percorso non valido');
 const file=path.resolve(base,name);
 if(!file.startsWith(path.resolve(base)+path.sep))throw Error('Fuori percorso');
 return file;
}
function paths(repoRoot,resourcesPath,isPackaged){
 return {assets:isPackaged?path.join(resourcesPath,'game'):path.join(repoRoot,'app','src','main','assets'),
 google:isPackaged?path.join(resourcesPath,'config','google-services.json'):path.join(repoRoot,'app','google-services.json')};
}
function firebaseKey(configFile){
 try {const cfg=JSON.parse(fs.readFileSync(configFile,'utf8'));return cfg.client?.[0]?.api_key?.[0]?.current_key||'';}catch{return '';}
}
module.exports={URLS,OPERATIONS,socialRequest,fileIn,paths,firebaseKey};
