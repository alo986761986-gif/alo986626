// Local test adapter, Node.js 22. Run: node backend/local-server.js
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const e = require('./engine.js');
const comm=require('./realtime.js');
const profileCss=fs.readFileSync(path.join(__dirname,'../frontend/profile.css'),'utf8');
const profileJs=fs.readFileSync(path.join(__dirname,'../frontend/profile.js'),'utf8');
const realtimeCss=fs.readFileSync(path.join(__dirname,'../frontend/realtime.css'),'utf8');
const realtimeJs=fs.readFileSync(path.join(__dirname,'../frontend/realtime.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../frontend/index.html'),'utf8')
 .replace('</head>','<style id="nc22-profile-css">'+profileCss+'</style><style id="nc23-realtime-css">'+realtimeCss+'</style></head>')
 .replace('</body>','<script id="nc22-profile-js">'+profileJs+'</script><script id="nc23-realtime-js">'+realtimeJs+'</script></body>');
http.createServer(async(req,res)=>{
  // Browser asset in Android uses the opaque file:// origin. Public API accepts CORS.
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}
  if(req.method==='GET'&&req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(e.statusInfo()));return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>120000)throw Error('Richiesta troppo grande');}
    let x=body?JSON.parse(body):{};let data;
    if(req.url==='/api/join')data=e.join(x);
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
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));
  }catch(err){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:err.message}));}
}).listen(process.env.PORT||3000,()=>console.log('Napoli Carte 3D at http://localhost:'+(process.env.PORT||3000)));
