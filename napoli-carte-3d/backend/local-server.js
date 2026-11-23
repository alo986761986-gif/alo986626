// Local test adapter, Node.js 22. Run: node backend/local-server.js
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const e = require('./engine.js');
const html=fs.readFileSync(path.join(__dirname,'../frontend/index.html'));
http.createServer(async(req,res)=>{
  // Browser asset in Android uses the opaque file:// origin. Public API accepts CORS.
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}
  if(req.method==='GET'&&req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(e.statusInfo()));return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Richiesta troppo grande');}
    let x=body?JSON.parse(body):{};let data;
    if(req.url==='/api/join')data=e.join(x);
    else if(req.url==='/api/state')data=e.state(x.token);
    else if(req.url==='/api/choices')data=e.opts(x.token,x.card);
    else if(req.url==='/api/play')data=e.action(x.token,x.move||{});
    else throw Error('Endpoint non trovato');
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));
  }catch(err){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:err.message}));}
}).listen(process.env.PORT||3000,()=>console.log('Napoli Carte 3D at http://localhost:'+(process.env.PORT||3000)));
