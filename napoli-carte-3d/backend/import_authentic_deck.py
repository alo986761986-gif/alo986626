#!/usr/bin/env python3
"""Build a genuine 40-card Neapolitan deck for both the web and offline Android."""
from pathlib import Path
from PIL import Image
import hashlib,base64,io,json
root=Path(__file__).resolve().parents[1]
source=root/'source/napoletane-original.jpg'
assert hashlib.sha1(source.read_bytes()).hexdigest()=='86c87ccb01fc9f02cda01157a3cef73fc4ca1342'
im=Image.open(source).convert('RGB')
assert im.size==(3507,2398)
out=root/'frontend/carte-napoletane'
out.mkdir(parents=True,exist_ok=True)
deck={}
for suit,row in enumerate((0,1,3,2)):
 for rank in range(1,11):
  x0=round((rank-1)*im.width/10)+9
  x1=round(rank*im.width/10)-11
  y0=round(row*im.height/4)+11
  y1=round((row+1)*im.height/4)-13
  crop=im.crop((x0,y0,x1,y1)).resize((210,360),Image.Resampling.LANCZOS)
  buf=io.BytesIO()
  crop.save(buf,format='WEBP',quality=85,method=6)
  raw=buf.getvalue()
  (out/f'{suit}-{rank}.webp').write_bytes(raw)
  deck[f'{suit}_{rank}']='data:image/webp;base64,'+base64.b64encode(raw).decode('ascii')
assert len(deck)==40
htmlfile=root/'frontend/index.html'
html=htmlfile.read_text(encoding='utf-8')
assert 'id="premium-script"' in html
if 'id="napoli-traditional-deck-script"' in html:
 print('Deck already embedded')
else:
 css='''<style id="napoli-authentic-style">
.playing-card.napoli-authentic{background:#fffdf9!important;border:2px solid #e9d9b3!important;width:60px;height:101px;overflow:hidden;border-radius:5px;box-shadow:1px 5px 9px #0009,0 0 0 1px #71533a40;line-height:0;padding:0;isolation:isolate}
.playing-card.napoli-authentic:before{display:none!important}
.playing-card.napoli-authentic img{position:relative;width:100%;height:100%;display:block;object-fit:fill;user-select:none;-webkit-user-drag:none;pointer-events:none}
.playing-card.napoli-authentic.user-card{width:clamp(55px,15vw,86px);height:clamp(93px,25.5vw,145px);background:white!important}
.playing-card.napoli-authentic.user-card:focus-visible{outline:3px solid #ffeaa0;outline-offset:3px}
.floatcard.napoli-preview-card{background-color:#faf8f2!important;background-position:center center!important;background-repeat:no-repeat!important;background-size:cover!important;color:transparent!important;border:3px solid #f7d9a0!important}
@media(max-width:650px){.board .playing-card.napoli-authentic{width:clamp(38px,10.7vw,48px);height:clamp(64px,18.1vw,81px)}.myhand .playing-card.napoli-authentic{flex-shrink:0}}
</style>'''
 js='''<script id="napoli-traditional-deck-script">
/* 40 traditional Neapolitan cards: Florixc / Wikimedia Commons, Public Domain Mark.
   https://commons.wikimedia.org/wiki/File:Carte_napoletane_al_completo.jpg */
(function(){'use strict';
const deck=__DATA__;
window.NC3D_AUTHENTIC_DECK=deck;
const suits=['Denari','Coppe','Spade','Bastoni'];
const figures={8:'Fante',9:'Cavallo',10:'Re'};
window.NC3D_CARD_RENDER=function(c,clickable){
 if(!c||!Number.isInteger(c.s)||!Number.isInteger(c.v)||c.s<0||c.s>3||c.v<1||c.v>10)return '';
 const url=deck[c.s+'_'+c.v];
 const label=(figures[c.v]||String(c.v))+' di '+suits[c.s];
 const id=String(c.id).replace(/[^a-zA-Z0-9_-]/g,'');
 const pic='<img src="'+url+'" alt="" decoding="async" draggable="false">';
 return clickable?'<button type="button" class="playing-card napoli-authentic user-card" data-suit="'+c.s+'" aria-label="Gioca '+label+'" title="'+label+'" onclick="selectCard(\\''+id+'\\')">'+pic+'</button>':'<div class="playing-card napoli-authentic" data-suit="'+c.s+'" role="img" aria-label="'+label+'" title="'+label+'">'+pic+'</div>';
};
const hero=document.querySelectorAll('.floatcard');
for(const [i,key] of ['0_1','2_7','3_3'].entries()){
 if(!hero[i])continue;
 hero[i].classList.add('napoli-preview-card');
 hero[i].style.backgroundImage='url("'+deck[key]+'")';
 hero[i].textContent='';
}
})();
</script>'''
 html=html.replace('</head><body>',css+'</head><body>',1).replace('</body>',js.replace('__DATA__',json.dumps(deck,separators=(',',':')) )+'</body>',1)
 html=html.replace('Napoli Carte 3D v1.2 - original illustrated deck','Napoli Carte 3D v1.3 - traditional scanned deck').replace('<title>Napoli Carte 3D · Online</title>','<title>Napoli Carte 3D · Mazzo Napoletano Originale</title>')
 htmlfile.write_text(html,encoding='utf-8')
 print('Embedded 40 Neapolitan cards:',len(deck), 'HTML bytes:',htmlfile.stat().st_size)
