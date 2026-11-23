'use strict';
/* TRISH BOLL v5 multiplayer server.
 * Node 20+, no external dependencies. Server controls movement, collisions and scores.
 */
const http=require('node:http'),crypto=require('node:crypto');
const PORT=+(process.env.PORT||3000),R=2150,TAU=Math.PI*2,DT=.05;
const MAX_PLAYERS=30,MAX_CONNECTIONS=45,MAX_FOOD=420;
const BOT_NAMES=['NOVA','VIPER','LUNA','SPARK','NITRO','GHOST','PIXEL','ORBIT','BLAZE','ASTRA'];
const clients=new Set(),snakes=new Map(),food=[];
let serial=0,ticks=0,started=Date.now();
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
const length=(x,y)=>Math.hypot(x,y);
// Shared growth curve with Android's GameEngine.growthScale(score).
const growthScale=score=>1+1.5*(1-Math.exp(-Math.max(0,score-260)/900));
const headRadius=score=>20*growthScale(score);
const collisionRadius=(headScore,bodyScore)=>13*growthScale(headScore)+10*growthScale(bodyScore);
function pos(){const a=rand(0,TAU),r=Math.sqrt(Math.random())*(R-150);return [Math.cos(a)*r,Math.sin(a)*r];}
function addFood(x,y,c,e){if(x===undefined)[x,y]=pos();food.push({x,y,c:c===undefined?Math.floor(rand(0,8)):c,e:e||Math.floor(rand(6,16)),r:rand(2.8,4.5)});}
function refill(){while(food.length<MAX_FOOD)addFood();if(food.length>650)food.splice(0,food.length-650);}
function newSnake(id,name,color,bot,owner){
  let [x,y]=pos(),a=rand(-Math.PI,Math.PI),size=bot?Math.floor(rand(28,46)):41;
  for(let i=0;i<20;i++){
    if([...snakes.values()].every(o=>length(o.x-x,o.y-y)>270))break;
    [x,y]=pos();
  }
  const trail=[];
  for(let i=1;i<size;i++)trail.push([x-Math.cos(a)*i*6.8,y-Math.sin(a)*i*6.8]);
  return {id,name,color,bot,owner,x,y,a,dir:a,trail,size,score:size*7,carry:0,boost:false,brain:0,alive:true,turnRate:bot?3.15:5.4};
}
function kill(s){
  if(!s.alive)return;
  s.alive=false;snakes.delete(s.id);
  for(let i=0;i<s.trail.length;i+=2){
    const p=s.trail[i];addFood(p[0]+rand(-12,12),p[1]+rand(-12,12),s.color,15);
  }
  if(!s.bot&&s.owner){
    s.owner.player=null;
    send(s.owner,{t:'dead',score:Math.floor(s.score)});
  }
  if(s.bot)setTimeout(()=>{
    if(!snakes.has(s.id))snakes.set(s.id,newSnake(s.id,s.name,s.color,true,null));
  },rand(1500,2600)).unref();
}
function botAI(s){
  s.brain-=DT;if(s.brain>0)return;
  s.brain=rand(.18,.36);
  let dx=rand(-120,120),dy=rand(-120,120),best=550*550;
  for(let i=0;i<food.length;i+=3){
    const f=food[i],px=f.x-s.x,py=f.y-s.y,d=px*px+py*py;
    if(d<best){best=d;dx=px;dy=py;}
  }
  if(length(s.x,s.y)>R-320){dx-=s.x*.75;dy-=s.y*.75;}
  s.dir=Math.atan2(dy,dx);
  s.boost=s.size>36&&Math.random()<.03;
}
function step(){
  ticks++;
  const all=Array.from(snakes.values());
  for(const s of all){
    if(!s.alive)continue;
    if(s.bot)botAI(s);
    s.a+=clamp(norm(s.dir-s.a),-s.turnRate*DT,s.turnRate*DT);
    const accelerated=s.boost&&s.size>25;
    const speed=(s.bot?127:145)*(accelerated?1.7:1);
    const oldX=s.x,oldY=s.y;
    s.x+=Math.cos(s.a)*speed*DT;s.y+=Math.sin(s.a)*speed*DT;
    const moved=length(s.x-oldX,s.y-oldY);
    for(let d=6.8-s.carry;d<=moved;d+=6.8){
      const t=d/moved;
      s.trail.unshift([oldX+(s.x-oldX)*t,oldY+(s.y-oldY)*t]);
    }
    s.carry=(s.carry+moved)%6.8;
    if(accelerated){s.size=Math.max(25,s.size-DT*.95);s.score=Math.max(170,s.score-DT*5);}
    if(s.trail.length>Math.ceil(s.size))s.trail.length=Math.ceil(s.size);
    const border=R-headRadius(s.score)*.7;
    if(s.x*s.x+s.y*s.y>border*border){kill(s);continue;}
    for(let i=food.length-1;i>=0;i--){
      const f=food[i],xx=s.x-f.x,yy=s.y-f.y;
      const reach=headRadius(s.score)*.74+f.r;
      if(xx*xx+yy*yy<reach*reach){
        s.score+=f.e;s.size+=f.e/11;food.splice(i,1);break;
      }
    }
  }
  for(const s of all){
    if(!s.alive)continue;
    let collision=false;
    for(const other of all){
      if(other===s||!other.alive)continue;
      if(Math.abs(other.x-s.x)>850||Math.abs(other.y-s.y)>850)continue;
      for(let i=5;i<other.trail.length;i+=3){
        let pt=other.trail[i],dx=s.x-pt[0],dy=s.y-pt[1];
        const hit=collisionRadius(s.score,other.score);
        if(dx*dx+dy*dy<hit*hit){collision=true;break;}
      }
      if(collision)break;
    }
    if(collision)kill(s);
  }
  refill();
  if(ticks%2===0){
    const alive=Array.from(snakes.values()).filter(s=>s.alive);
    const data={t:'state',s:alive.map(s=>[s.id,s.name,s.color,Math.round(s.x),Math.round(s.y),
      +s.a.toFixed(3),Math.floor(s.score),10.5,
      s.trail.filter((_,i)=>i%2===0).slice(0,150).map(p=>[Math.round(p[0]),Math.round(p[1])]),s.boost?1:0]),
      p:alive.filter(s=>!s.bot).length,ts:Date.now()};
    for(const c of clients)if(c.player)send(c,data);
  }
  if(ticks%10===0){
    const data={t:'food',f:food.map(f=>[Math.round(f.x),Math.round(f.y),f.c,f.e,+f.r.toFixed(1)])};
    for(const c of clients)if(c.player)send(c,data);
  }
}
function wsFrame(op,payload){
  const data=Buffer.isBuffer(payload)?payload:Buffer.from(payload);
  let head;
  if(data.length<126)head=Buffer.from([128|op,data.length]);
  else if(data.length<65536){
    head=Buffer.alloc(4);head[0]=128|op;head[1]=126;head.writeUInt16BE(data.length,2);
  }else{
    head=Buffer.alloc(10);head[0]=128|op;head[1]=127;
    head.writeBigUInt64BE(BigInt(data.length),2);
  }
  return Buffer.concat([head,data]);
}
function send(c,body){if(!c.open||c.socket.destroyed)return;
  try{
    if(c.socket.writableLength>700000){end(c);return;}
    c.socket.write(wsFrame(1,Buffer.from(JSON.stringify(body),'utf8')));
  }catch(e){end(c);}
}
function end(c){
  if(!c.open)return;
  c.open=false;clients.delete(c);
  if(c.player&&snakes.has(c.player))kill(snakes.get(c.player));
  try{c.socket.destroy();}catch(e){}
}
function message(c,b){
  if(b.length>1200)return;
  const now=Date.now();
  if(now-c.rateAt>1000){c.rateAt=now;c.rate=0;}
  if(++c.rate>35){end(c);return;}
  let m;try{m=JSON.parse(b.toString('utf8'));}catch(e){return;}
  if(!m||typeof m!=='object')return;
  if(m.t==='join'){
    if(c.player)return;
    const count=Array.from(snakes.values()).filter(s=>!s.bot).length;
    if(count>=MAX_PLAYERS){send(c,{t:'error',message:'Arena piena'});return;}
    let name=String(m.name||'Giocatore').replace(/[<>\r\n\u0000-\u001f]/g,'').trim().slice(0,14)||'Giocatore';
    let color=Number.isInteger(m.skin)?clamp(m.skin,0,7):0;
    let id='p'+(++serial).toString(36);
    const player=newSnake(id,name,color,false,c);
    const sensitivity=Number.isInteger(m.sensitivity)?clamp(m.sensitivity,1,5):4;
    player.turnRate=3.5+(sensitivity-1)*.72;
    snakes.set(id,player);c.player=id;
    send(c,{t:'joined',id,r:R,max:MAX_PLAYERS});
    send(c,{t:'food',f:food.map(f=>[Math.round(f.x),Math.round(f.y),f.c,f.e,+f.r.toFixed(1)])});
  }else if(m.t==='input'&&c.player){
    let s=snakes.get(c.player);if(!s)return;
    if(typeof m.a==='number'&&Number.isFinite(m.a))s.dir=norm(m.a);
    s.boost=m.b===1;
  }else if(m.t==='ping')send(c,{t:'pong',n:typeof m.n==='number'?m.n:0});
}
function read(c,chunk){
  if(!c.open)return;
  c.buffer=Buffer.concat([c.buffer,chunk]);
  if(c.buffer.length>16384){end(c);return;}
  while(c.buffer.length>=2){
    const b=c.buffer,opcode=b[0]&15,fin=(b[0]&128)!==0,masked=(b[1]&128)!==0;
    if(!fin||!masked){end(c);return;}
    let len=b[1]&127,off=2;
    if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4;}
    else if(len===127){if(b.length<10)return;let n=b.readBigUInt64BE(2);
      if(n>4096n){end(c);return;}len=Number(n);off=10;
    }
    if(len>4096){end(c);return;}
    if(b.length<off+4+len)return;
    let mask=b.subarray(off,off+4);off+=4;
    let payload=Buffer.from(b.subarray(off,off+len));
    for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
    c.buffer=b.subarray(off+len);
    if(opcode===8){end(c);return;}
    if(opcode===9){c.socket.write(wsFrame(10,payload));continue;}
    if(opcode===1)message(c,payload);
    else if(opcode!==10){end(c);return;}
  }
}
const server=http.createServer((req,res)=>{
  if(req.url==='/health'||req.url==='/stats'){
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store',
      'access-control-allow-origin':'*'});
    res.end(JSON.stringify({ok:true,game:'TRISH BOLL',version:'5.6',
      onlinePlayers:Array.from(snakes.values()).filter(s=>!s.bot).length,
      capacity:MAX_PLAYERS,uptime:Math.floor((Date.now()-started)/1000)}));return;
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
  res.end('<!doctype html><html lang="it"><meta name="viewport" content="width=device-width, initial-scale=1">'+
    '<body style="background:#071329;color:#76eeff;font:20px Arial;text-align:center;padding:45px">'+
    '<h1>TRISH BOLL ONLINE</h1><p>Server multiplayer WebSocket attivo.</p>'+
    '<p>Inserisci questo dominio con prefisso wss:// e percorso /ws nelle impostazioni del gioco Android.</p></body></html>');
});
server.on('upgrade',(req,socket,head)=>{
  if((req.url||'').split('?')[0]!=='/ws'||String(req.headers.upgrade||'').toLowerCase()!=='websocket'
    ||clients.size>=MAX_CONNECTIONS){socket.destroy();return;}
  const key=req.headers['sec-websocket-key'];
  if(typeof key!=='string'||!/^[-A-Za-z0-9+/]{22}==$/.test(key)){socket.destroy();return;}
  const accept=crypto.createHash('sha1')
    .update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n'+
    'Connection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  let c={socket,open:true,buffer:Buffer.alloc(0),player:null,rateAt:Date.now(),rate:0};
  clients.add(c);
  socket.on('data',b=>read(c,b));
  socket.on('close',()=>end(c));socket.on('error',()=>end(c));
  socket.setTimeout(65000,()=>end(c));
  if(head&&head.length)read(c,head);
});
function start(){
  if(server.listening)return;
  for(let i=0;i<BOT_NAMES.length;i++)snakes.set('bot'+i,newSnake('bot'+i,BOT_NAMES[i],(i+1)%8,true,null));
  refill();
  const timer=setInterval(step,50);timer.unref();
  server.listen(PORT,'0.0.0.0',()=>console.log('TRISH_BOLL_MULTIPLAYER_READY port='+PORT));
}
if(require.main===module)start();
module.exports={server,start,step,snakes,food,clients,growthScale,collisionRadius};
