// Local test adapter, Node.js 22. Run: node backend/local-server.js
const http = require('node:http');
const {Buffer}=require('node:buffer');
const net=require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const e = require('./engine.js');
const comm=require('./realtime.js');
const audioRelay=require('./audio-relay.js');
const persistence=require('./persistence.js');
const profileCss=fs.readFileSync(path.join(__dirname,'../frontend/profile.css'),'utf8');
const profileJs=fs.readFileSync(path.join(__dirname,'../frontend/profile.js'),'utf8');
const realtimeCss=fs.readFileSync(path.join(__dirname,'../frontend/realtime.css'),'utf8');
const realtimeJs=fs.readFileSync(path.join(__dirname,'../frontend/realtime.js'),'utf8');
const voice26Js=fs.readFileSync(path.join(__dirname,'../frontend/voice26.js'),'utf8');
const voice25Js=fs.readFileSync(path.join(__dirname,'../frontend/voice25.js'),'utf8');
const voice25Css=fs.readFileSync(path.join(__dirname,'../frontend/voice25.css'),'utf8');
const drag25Js=fs.readFileSync(path.join(__dirname,'../frontend/drag25.js'),'utf8');
const drag25Css=fs.readFileSync(path.join(__dirname,'../frontend/drag25.css'),'utf8');
const capture27Js=fs.readFileSync(path.join(__dirname,'../frontend/capture27.js'),'utf8');
const capture27Css=fs.readFileSync(path.join(__dirname,'../frontend/capture27.css'),'utf8');
const premium30Css=fs.readFileSync(path.join(__dirname,'../frontend/premium30.css'),'utf8');
const premium30Js=fs.readFileSync(path.join(__dirname,'../frontend/premium30.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../frontend/index.html'),'utf8')
 .replace('</head>','<style id="nc22-profile-css">'+profileCss+'</style><style id="nc23-realtime-css">'+realtimeCss+'</style><style id="nc25-voice-css">'+voice25Css+'</style><style id="nc25-drag-css">'+drag25Css+'</style><style id="nc27-capture-css">'+capture27Css+'</style><style id="nc30-premium-css">'+premium30Css+'</style></head>')
 .replace('</body>','<script id="nc22-profile-js">'+profileJs+'</script><script id="nc23-realtime-js">'+realtimeJs+'</script><script id="nc26-audio-js">'+voice26Js+'</script><script id="nc25-voice-js">'+voice25Js+'</script><script id="nc25-drag-js">'+drag25Js+'</script><script id="nc27-capture-js">'+capture27Js+'</script><script id="nc30-premium-js">'+premium30Js+'</script></body>');
const joinRate=new Map();
let draining=false,cleanups=0;
function limitJoin(req){
 const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
 const key=net.isIP(forwarded)?forwarded:(req.socket.remoteAddress||'unknown'),n=Date.now();
 const arr=(joinRate.get(key)||[]).filter(t=>n-t<60000);
 if(arr.length>=80)throw Error('Troppe richieste di ingresso, riprova tra poco');
 arr.push(n);joinRate.set(key,arr);
}
const sweeper=setInterval(()=>{const result=e.housekeeping();cleanups+=result.removed;
 const cutoff=Date.now()-60000;for(const [key,arr] of joinRate)if(!arr.some(t=>t>cutoff))joinRate.delete(key);
},60000);sweeper.unref();
const server=http.createServer(async(req,res)=>{
  if(draining){res.writeHead(503,{'content-type':'application/json','Retry-After':'5'});res.end(JSON.stringify({error:'Server in aggiornamento, riconnessione in corso'}));return;}
  // Browser asset in Android uses the opaque file:// origin. Public API accepts CORS.
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(!['GET','POST'].includes(req.method)){res.writeHead(405,{'Allow':'GET, POST, OPTIONS'});res.end();return;}
  if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
  if(req.method==='GET'&&req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({...e.statusInfo(),audioRelay:'wss-pcm16',audioRelayStatus:audioRelay.stats(),uptimeSeconds:Math.floor(process.uptime()),cleanupCount:cleanups,serverVersion:'3.0',persistence:persistence.status()}));return;}
  if(req.method!=='POST'||!req.url.startsWith('/api/')){res.writeHead(404);res.end();return;}
  try{
    let body='',bodyBytes=0;
    if(Number(req.headers['content-length']||0)>120000)throw Error('Richiesta troppo grande');
    for await(const chunk of req){bodyBytes+=chunk.length;if(bodyBytes>120000)throw Error('Richiesta troppo grande');body+=chunk.toString('utf8');}
    let x=body?JSON.parse(body):{};let data;
    if(req.url==='/api/join'){limitJoin(req);data=e.join(x);}
    else if(req.url==='/api/state')data=e.state(x.token);
    else if(req.url==='/api/choices')data=e.opts(x.token,x.card);
    else if(req.url==='/api/play')data=e.action(x.token,x.move||{});
    else if(req.url==='/api/leave')data=e.leave(x.token);
    else if(req.url==='/api/profile')data=e.profile(x.token,x.profile);
    else if(req.url==='/api/friend')data=e.friend(x.token,x.target,x.operation);
    else if(req.url==='/api/chat')data=comm.chat(x.token,x.text);
    else if(req.url==='/api/realtime')data=comm.poll(x.token,x.afterChat,x.afterSignal);
    else if(req.url==='/api/voice')data=comm.voice(x.token,x.enabled);
    else if(req.url==='/api/signal')data=comm.signal(x.token,x.to,x.type,x.payload);
    else if(req.url==='/api/rtc-config')data=comm.rtcConfig(x.token);
    else throw Error('Endpoint non trovato');
    if(['/api/join','/api/play','/api/leave','/api/profile','/api/friend'].includes(req.url)){
      persistence.changed();
      if(['/api/join','/api/play','/api/leave'].includes(req.url))await persistence.flush();
    }
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));
  }catch(err){if(!res.writableEnded){const status=/troppo grande/i.test(err.message)?413:/Troppe richieste/i.test(err.message)?429:400;res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:err.message}));}}
});
audioRelay.attach(server);
server.requestTimeout=15000;server.headersTimeout=16000;server.keepAliveTimeout=5000;
persistence.start().then(result=>{
 console.log('Napoli game persistence: '+(result.connected?'ready':result.configured?'degraded':'not configured'));
 server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Napoli Carte 3D at http://0.0.0.0:'+(process.env.PORT||3000)));
}).catch(err=>{console.error('Persistence recovery failed',err.message);server.listen(process.env.PORT||3000,'0.0.0.0')});
function shutdown(){
 if(draining)return;draining=true;clearInterval(sweeper);
 const kill=setTimeout(()=>process.exit(0),14000);kill.unref();
 server.close(()=>{});
 persistence.stop().finally(()=>process.exit(0));
}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
