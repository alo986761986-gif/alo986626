package com.trishboll.arena;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Build;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayList;
import java.util.Locale;
import java.util.Random;

/**
 * GPU-free native Canvas view. Scales to any Android 5+ screen.
 * The game simulation runs on the main view loop with capped dt and frame pacing.
 * All interface elements are drawn in logical 1280x720 game-space.
 */
public final class GameView extends View implements GameEngine.Events {
    static final int MENU=0,GAME=1,PAUSE=2,RESULT=3,HELP=4,SKINS=5,SETTINGS=6;
    static final int BG=0xff071027,PANEL=0xff101d3d,CYAN=0xff73f4ff,PINK=0xffff6ad4,WHITE=0xfff7f8ff,MUTED=0xffa5b7d7,GOLD=0xffffd675;
    static final float SW=1280f,SH=720f;
    private final GameEngine game;
    private final SharedPreferences prefs;
    private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF r=new RectF();
    private final Random rand=new Random(776);
    private final float[] starX=new float[90],starY=new float[90],starR=new float[90];
    private int screen=MENU,mode=0,skin=0,coins=0,record=260,scoreAwarded=0;
    private int fps=60,quality=1;
    private boolean audio=true,vibration=true,boost=false,uiActive=true,initialized=false;
    private boolean controlStick=false;
    private int joystickPointer=-1,boostPointer=-1;
    private float dragX=300,dragY=350, steer=0,dragAnchorX=300,dragAnchorY=350;
    private float cameraX=0,cameraY=0,cameraZoom=1;
    private long prevTime=0,lastTap=0;
    private float uiTime=0,flashTime=0,zoomTarget=1,hitPulse=0;
    private float sx=1,sy=1,ox=0,oy=0;
    private String nick="PLAYER",notice="",lastMode="";
    private final Runnable redraw=new Runnable(){@Override public void run(){if(uiActive){invalidate();}}};
    private final GameSound sound;

    public GameView(Context context){
        super(context);
        prefs=context.getSharedPreferences("trishboll_native_v4",Context.MODE_PRIVATE);
        game=new GameEngine(this);
        sound=new GameSound(context);
        mode=clampInt(prefs.getInt("mode",0),0,3);
        skin=clampInt(prefs.getInt("skin",0),0,7);
        coins=Math.max(0,prefs.getInt("coins",0));
        record=Math.max(260,prefs.getInt("record",260));
        audio=prefs.getBoolean("audio",true);
        vibration=prefs.getBoolean("vibration",true);
        quality=clampInt(prefs.getInt("quality",1),0,2);
        nick=prefs.getString("nickname","PLAYER");
        if(nick==null||nick.trim().isEmpty())nick="PLAYER";
        setLayerType(View.LAYER_TYPE_SOFTWARE,null); // stable Android 5 fallback for complex strokes/shadows
        setFocusable(true);
        for(int i=0;i<starX.length;i++){
            starX[i]=rand.nextFloat()*SW;starY[i]=rand.nextFloat()*SH;
            starR[i]=.6f+rand.nextFloat()*2.0f;
        }
        initialized=true;
    }
    private static int clampInt(int x,int a,int b){return Math.max(a,Math.min(b,x));}
    public void halt(){uiActive=false;removeCallbacks(redraw);sound.close();}
    public void wake(){uiActive=true;prevTime=0;postInvalidateDelayed(40);}
    public void save(){
        prefs.edit().putInt("skin",skin).putInt("mode",mode).putInt("coins",coins).putInt("record",record)
            .putBoolean("audio",audio).putBoolean("vibration",vibration).putInt("quality",quality)
            .putString("nickname",nick).apply();
    }
    public boolean goBack(){
        if(screen==GAME){screen=PAUSE;boost=false;return true;}
        if(screen==PAUSE||screen==RESULT||screen==SETTINGS||screen==SKINS||screen==HELP){screen=MENU;return true;}
        return false;
    }
    private void start(){
        boolean eco=quality==0||Runtime.getRuntime().maxMemory()<110L*1024L*1024L;
        game.reset(mode,skin,nick,eco);
        screen=GAME;scoreAwarded=0;prevTime=0;cameraX=0;cameraY=0;cameraZoom=1;
        steer=game.player.a;boost=false;boostPointer=-1;joystickPointer=-1;
        lastMode=modeName();notice="";
        if(audio)sound.play(GameSound.START);
        save();
    }
    private String modeName(){return mode==0?"CLASSIC":mode==1?"TURBO":mode==2?"SURVIVAL":"TEAM";}
    @Override protected void onDraw(Canvas real){
        super.onDraw(real);
        if(!initialized)return;
        float sw=getWidth(),sh=getHeight();if(sw<1||sh<1)return;
        final float scale=Math.min(sw/SW,sh/SH);
        sx=scale;sy=scale;ox=(sw-SW*scale)*.5f;oy=(sh-SH*scale)*.5f;
        Canvas c=real;
        c.drawColor(BG);c.save();c.translate(ox,oy);c.scale(scale,scale);
        long now=SystemClock.uptimeMillis();
        float dt=prevTime<=0?.016f:Math.min(.045f,(now-prevTime)*.001f);
        prevTime=now; uiTime+=dt;
        try{
            if(screen==GAME){
                game.update(dt,steer,boost);
                if(game.player!=null){
                    float lerp=Math.min(.13f,dt*6);
                    cameraX+=(game.player.x-cameraX)*lerp;
                    cameraY+=(game.player.y-cameraY)*lerp;
                    float target=mode==1?.91f:Math.max(.61f,1.04f-game.player.len/650);
                    cameraZoom+=(target-cameraZoom)*Math.min(1,dt*3);
                }
                if(game.dead){screen=RESULT;finishGame();}
            }
            if(screen==GAME||screen==PAUSE||screen==RESULT){
                drawArena(c);
                drawHUD(c);
                if(screen==PAUSE)drawPause(c);
                if(screen==RESULT)drawResult(c);
            }else{
                drawBackground(c);
                if(screen==MENU)drawMenu(c);
                if(screen==HELP)drawHelp(c);
                if(screen==SKINS)drawSkins(c);
                if(screen==SETTINGS)drawSettings(c);
            }
        }catch(Throwable error){
            android.util.Log.e("TRISH_BOLL_NATIVE","Renderer failed",error);
            screen=MENU;notice="Modalita grafica compatibile attivata";
            quality=0;
        }
        c.restore();
        if(uiActive)postInvalidateDelayed(quality==0?33:17);
    }
    private void box(Canvas c,float x,float y,float w,float h,float radius,int color){
        p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.FILL);p.setColor(color);
        r.set(x,y,x+w,y+h);c.drawRoundRect(r,radius,radius,p);
    }
    private void border(Canvas c,float x,float y,float w,float h,float radius,int color,float thick){
        p.reset();p.setAntiAlias(true);p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(thick);
        r.set(x,y,x+w,y+h);c.drawRoundRect(r,radius,radius,p);p.setStyle(Paint.Style.FILL);
    }
    private void text(Canvas c,String t,float x,float y,float size,int color,boolean bold){
        p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.FILL);p.setColor(color);
        p.setTypeface(bold?android.graphics.Typeface.create("sans-serif",android.graphics.Typeface.BOLD)
                          :android.graphics.Typeface.create("sans-serif",android.graphics.Typeface.NORMAL));
        p.setTextSize(size);
        c.drawText(t,x,y,p);
    }
    private void center(Canvas c,String t,float x,float y,float size,int color,boolean bold){
        p.reset();p.setAntiAlias(true);p.setTextSize(size);
        p.setTypeface(bold?android.graphics.Typeface.DEFAULT_BOLD:android.graphics.Typeface.DEFAULT);
        text(c,t,x-p.measureText(t)/2f,y,size,color,bold);
    }
    private void circle(Canvas c,float x,float y,float radius,int color){
        p.reset();p.setAntiAlias(true);p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawCircle(x,y,radius,p);
    }
    private void line(Canvas c,float x,float y,float x2,float y2,int col,float thick){
        p.reset();p.setAntiAlias(true);p.setColor(col);p.setStrokeWidth(thick);p.setStrokeCap(Paint.Cap.ROUND);c.drawLine(x,y,x2,y2,p);
    }
    private void drawBackground(Canvas c){
        c.drawColor(BG);
        p.setColor(0xff121b43);p.setStyle(Paint.Style.FILL);
        for(int i=0;i<starX.length;i++){
            float flicker=.64f+(float)Math.sin(uiTime*(i%4+1)+i)*.3f;
            int col=Color.argb((int)(140*flicker),121,181,250);
            circle(c,starX[i],starY[i],starR[i],col);
        }
        for(int i=0;i<12;i++){
            float x=i*114-(uiTime*8%114);
            line(c,x,0,x-160,SH,0x1719afff,1);
        }
        for(int i=0;i<9;i++)line(c,0,i*90,SW,i*90,0x1019aaff,1);
        circle(c,SW/2,SH/2+130,245,0x1306ffff);
        circle(c,SW/2,SH/2+130,180,0x132b6aff);
    }
    private void button(Canvas c,String t,float x,float y,float w,float h,boolean main){
        box(c,x,y,w,h,18,main?0xff1d84e3:0xff1b2952);
        border(c,x,y,w,h,18,main?0xff61f4ff:0xff425b94,main?2.8f:1.4f);
        if(main)box(c,x+4,y+4,w-8,4,4,0x557cfbff);
        center(c,t,x+w/2,y+h/2+8,23,WHITE,true);
    }
    private void drawPreviewSnake(Canvas c,float x,float y,float sc,int col){
        c.save();c.translate(x,y);c.scale(sc,sc);
        for(int i=28;i>=0;i--){
            float ang=i*.24f+uiTime*.6f;
            float rad=55+i*1.6f;
            float px=(float)Math.cos(ang)*rad-i*3.5f;
            float py=(float)Math.sin(ang)*rad*.55f;
            circle(c,px,py,16,0xff0d1834);
            circle(c,px,py,13,col);
            if(i%3==0)circle(c,px-4,py-5,3,0x99ffffff);
        }
        circle(c,90,0,23,0xff071027);circle(c,90,0,19,col);
        circle(c,100,-10,7,WHITE);circle(c,100,9,7,WHITE);
        circle(c,102,-10,3,0xff0a1740);circle(c,102,9,3,0xff0a1740);
        c.restore();
    }
    private void drawMenu(Canvas c){
        box(c,130,58,1020,600,32,0xeb101a38);
        border(c,130,58,1020,600,32,0xff324c7d,2);
        text(c,"TRISH",183,155,70,CYAN,true);
        text(c,"BOLL",410,155,70,PINK,true);
        text(c,"NEON SNAKE ARENA",190,188,20,MUTED,false);
        if(!notice.isEmpty())text(c,notice,193,218,17,GOLD,true);
        drawPreviewSnake(c,730,274,1.55f,GameEngine.COLORS[skin]);
        box(c,180,250,415,168,24,0xff172346);
        text(c,"SCEGLI UNA MODALITA",205,290,18,MUTED,true);
        String[] names={"CLASSIC","TURBO","SURVIVAL","TEAM"};
        for(int i=0;i<4;i++){
            float x=203+(i%2)*188,y=308+(i/2)*49;
            box(c,x,y,177,42,11,i==mode?0xff235a9e:0xff223154);
            border(c,x,y,177,42,11,i==mode?CYAN:0xff3d5681,i==mode?2:1);
            center(c,names[i],x+88,y+28,18,WHITE,true);
        }
        text(c,"SKIN",197,467,18,MUTED,true);
        for(int i=0;i<8;i++){
            float x=272+i*41;
            circle(c,x,460,17,0xff07162f);circle(c,x,460,i==skin?15:12,GameEngine.COLORS[i]);
            if(i==skin){
                p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(2);p.setColor(WHITE);c.drawCircle(x,460,19,p);p.setStyle(Paint.Style.FILL);
            }
        }
        button(c,"GIOCA ORA",200,520,389,77,true);
        button(c,"SKIN E PREMI",619,520,240,77,false);
        button(c,"OPZIONI",870,520,215,77,false);
        text(c,"RECORD  "+record+"     MONETE  "+coins,202,628,17,GOLD,true);
        text(c,"VERSIONE 4.0  •  MOTORE ANDROID NATIVO",707,628,14,MUTED,false);
    }
    private void drawArena(Canvas c){
        c.drawColor(0xff071329);
        float zoom=cameraZoom;
        c.save();c.translate(640-cameraX*zoom,360-cameraY*zoom);c.scale(zoom,zoom);
        float left=cameraX-640/zoom,right=cameraX+640/zoom,top=cameraY-360/zoom,bottom=cameraY+360/zoom;
        float step=64;
        int gx=(int)Math.floor(left/step),gy=(int)Math.floor(top/step);
        for(int i=gx;i<gx+Math.ceil((right-left)/step)+2;i++)line(c,i*step,top,i*step,bottom,0x19396ba4,1);
        for(int i=gy;i<gy+Math.ceil((bottom-top)/step)+2;i++)line(c,left,i*step,right,i*step,0x19396ba4,1);
        p.reset();p.setAntiAlias(true);p.setColor(0xff153362);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(20);
        c.drawCircle(0,0,game.arenaRadius,p);
        p.setStrokeWidth(5);p.setColor(CYAN);c.drawCircle(0,0,game.arenaRadius,p);p.setStyle(Paint.Style.FILL);
        for(int i=0;i<game.foods.size();i++){
            GameEngine.Food f=game.foods.get(i);
            if(f.x<left-20||f.x>right+20||f.y<top-20||f.y>bottom+20)continue;
            int col=GameEngine.COLORS[f.color%8];
            circle(c,f.x,f.y,f.r*2.35f,Color.argb(46,Color.red(col),Color.green(col),Color.blue(col)));
            circle(c,f.x,f.y,f.r,col);circle(c,f.x-1,f.y-1,f.r*.4f,0xddffffff);
        }
        for(int i=0;i<game.particles.size();i++){
            GameEngine.Particle part=game.particles.get(i);
            int col=GameEngine.COLORS[part.color%8];
            float alpha=Math.max(0,Math.min(1,part.t/part.max));
            circle(c,part.x,part.y,Math.max(1,3.5f*alpha),
               Color.argb((int)(alpha*225),Color.red(col),Color.green(col),Color.blue(col)));
        }
        for(GameEngine.Snake bot:game.bots)if(bot.alive)drawSnake(c,bot,left,right,top,bottom);
        if(game.player!=null&&game.player.alive)drawSnake(c,game.player,left,right,top,bottom);
        c.restore();
    }
    private void drawSnake(Canvas c,GameEngine.Snake snake,float left,float right,float top,float bottom){
        if(snake.x<left-580||snake.x>right+580||snake.y<top-580||snake.y>bottom+580)return;
        int col=GameEngine.COLORS[snake.color%8];
        Path path=new Path();
        path.moveTo(snake.x,snake.y);
        for(int i=0;i<snake.count;i++)path.lineTo(snake.tx(i),snake.ty(i));
        p.reset();p.setAntiAlias(true);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(26);p.setColor(0xff071020);c.drawPath(path,p);
        p.setStrokeWidth(19);p.setColor(col);c.drawPath(path,p);
        p.setStrokeWidth(6);p.setColor(0x66ffffff);c.drawPath(path,p);
        p.setStyle(Paint.Style.FILL);
        circle(c,snake.x,snake.y,17,0xff101733);
        circle(c,snake.x,snake.y,14,col);
        float vx=(float)Math.cos(snake.a),vy=(float)Math.sin(snake.a);
        float qx=-vy,qy=vx;
        float eye1x=snake.x+vx*9+qx*7,eye1y=snake.y+vy*9+qy*7;
        float eye2x=snake.x+vx*9-qx*7,eye2y=snake.y+vy*9-qy*7;
        circle(c,eye1x,eye1y,5,WHITE);circle(c,eye2x,eye2y,5,WHITE);
        circle(c,eye1x+vx*2,eye1y+vy*2,2,0xff04122b);
        circle(c,eye2x+vx*2,eye2y+vy*2,2,0xff04122b);
        if(quality!=0){
            text(c,snake.name,snake.x-25,snake.y-30,15,WHITE,true);
        }
    }
    private void drawHUD(Canvas c){
        box(c,14,12,288,76,15,0xe2091935);
        text(c,"TRISH BOLL",33,42,23,CYAN,true);
        String score=game.player==null?"0":Integer.toString((int)game.player.score);
        text(c,"PUNTEGGIO  "+score,33,70,17,WHITE,true);
        box(c,977,14,289,208,17,0xdf091834);
        text(c,"CLASSIFICA",999,45,22,GOLD,true);
        ArrayList<GameEngine.Snake> list=game.leaderboard();
        for(int i=0;i<Math.min(5,list.size());i++){
            GameEngine.Snake s=list.get(i);
            int col=s==game.player?CYAN:WHITE;
            text(c,(i+1)+".  "+s.name,998,77+i*26,16,col,true);
            text(c,Integer.toString((int)s.score),1204,77+i*26,16,GOLD,false);
        }
        box(c,14,101,250,39,12,0xcf102143);
        text(c,modeName()+"  •  "+((int)game.time)+"s",30,128,16,CYAN,true);
        button(c,"PAUSA",17,646,165,58,false);
        circle(c,1185,584,78,0x99401a59);circle(c,1185,584,65,0xffa23e86);
        p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(5);p.setColor(0xffffb8f5);
        c.drawCircle(1185,584,65,p);p.setStyle(Paint.Style.FILL);
        center(c,"BOOST",1185,592,21,WHITE,true);
        box(c,534,665,220,38,10,0xb6091e37);
        center(c,"TRASCINA PER GIRARE",644,689,14,MUTED,true);
        drawMap(c);
    }
    private void drawMap(Canvas c){
        circle(c,1186,318,69,0xd40a1531);
        p.setColor(0xff587bb6);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(2);
        c.drawCircle(1186,318,65,p);p.setStyle(Paint.Style.FILL);
        if(game.player==null)return;
        for(GameEngine.Snake b:game.bots)if(b.alive)circle(c,1186+b.x*64/GameEngine.WORLD,318+b.y*64/GameEngine.WORLD,3,GameEngine.COLORS[b.color%8]);
        circle(c,1186+game.player.x*64/GameEngine.WORLD,318+game.player.y*64/GameEngine.WORLD,5,WHITE);
    }
    private void overlay(Canvas c){box(c,0,0,SW,SH,0,0xd9050b1c);}
    private void drawPause(Canvas c){
        overlay(c);box(c,372,143,536,430,26,PANEL);
        border(c,372,143,536,430,26,0xff4f74ba,2);
        center(c,"PARTITA IN PAUSA",640,239,39,WHITE,true);
        center(c,modeName()+" • "+(int)game.time+" secondi",640,290,20,MUTED,false);
        button(c,"RIPRENDI",444,346,392,68,true);
        button(c,"TORNA AL MENU",444,439,392,64,false);
    }
    private void finishGame(){
        if(scoreAwarded>0)return;
        int score=game.player==null?0:(int)game.player.score;
        if(score>record)record=score;
        scoreAwarded=1;
        coins+=game.earnedCoins+Math.min(100,score/15);
        if(audio)sound.play(GameSound.LOSE);
        save();
    }
    private void drawResult(Canvas c){
        overlay(c);box(c,330,90,620,555,30,PANEL);
        border(c,330,90,620,555,30,0xff557cb8,2);
        center(c,"FINE PARTITA",640,181,45,PINK,true);
        center(c,"PUNTEGGIO",640,242,19,MUTED,true);
        center(c,game.player==null?"0":Integer.toString((int)game.player.score),640,330,64,GOLD,true);
        center(c,"RECORD  "+record+"     KILL  "+game.kills+"     MONETE  +"+(coins),640,386,19,CYAN,true);
        button(c,"RIGIOCA",431,430,418,65,true);
        button(c,"MENU",431,524,418,59,false);
    }
    private void screenPanel(Canvas c,String title){
        box(c,197,58,885,610,27,PANEL);border(c,197,58,885,610,27,0xff3c72b6,2);
        center(c,title,640,138,45,CYAN,true);
    }
    private void drawHelp(Canvas c){
        screenPanel(c,"COME SI GIOCA");
        String[] rules={"• Trascina un dito per orientare il serpente.",
          "• Raccogli le sfere luminose per crescere.",
          "• Evita gli avversari e il bordo dell'arena.",
          "• Tocca BOOST per accelerare: consuma lunghezza.",
          "• SURVIVAL: l'arena si restringe nel tempo.",
          "• TEAM: non puoi scontrarti con i compagni.",
          "• Completa le sfide per guadagnare monete."};
        for(int i=0;i<rules.length;i++)text(c,rules[i],275,205+i*48,22,WHITE,false);
        button(c,"INDIETRO",395,558,490,69,true);
    }
    private void drawSkins(Canvas c){
        screenPanel(c,"SKIN E PREMI");
        text(c,"GUADAGNA MONETE GIOCANDO PER SBLOCCARE I COLORI",265,191,18,MUTED,true);
        for(int i=0;i<8;i++){
            int x=300+(i%4)*178,y=238+(i/4)*145;
            boolean locked=i>=3 && coins<(i-2)*50 && i!=skin;
            drawPreviewSnake(c,x+33,y+14,.44f,GameEngine.COLORS[i]);
            box(c,x-40,y+58,142,46,12,i==skin?0xff2d6da5:0xff253152);
            center(c,locked?((i-2)*50)+" MONETE":i==skin?"SCELTA":"SCEGLI",x+31,y+87,17,locked?GOLD:WHITE,true);
        }
        text(c,"MONETE DISPONIBILI: "+coins,278,530,21,GOLD,true);
        button(c,"INDIETRO",395,563,490,69,true);
    }
    private void drawSettings(Canvas c){
        screenPanel(c,"IMPOSTAZIONI");
        text(c,"GRAFICA",292,216,20,MUTED,true);
        String[] opts={"ECO / 30 FPS","BILANCIATA","ALTA / 60 FPS"};
        for(int i=0;i<3;i++){
            int x=279+i*244;
            box(c,x,240,219,75,15,quality==i?0xff265e98:0xff203154);
            border(c,x,240,219,75,15,quality==i?CYAN:0xff476196,quality==i?3:1);
            center(c,opts[i],x+110,287,18,WHITE,true);
        }
        button(c,"AUDIO: "+(audio?"ON":"OFF"),293,372,330,64,false);
        button(c,"VIBRAZIONE: "+(vibration?"ON":"OFF"),645,372,330,64,false);
        text(c,"La modalita ECO migliora fluidita e temperatura sui telefoni piu vecchi.",280,496,17,MUTED,false);
        button(c,"INDIETRO",395,560,490,70,true);
    }
    private boolean hit(float x,float y,float left,float top,float width,float height){
        return x>=left&&x<=left+width&&y>=top&&y<=top+height;
    }
    private void playClick(){if(audio)sound.play(GameSound.SELECT);}
    private void tap(float x,float y){
        if(screen==MENU){
            if(hit(x,y,203,308,177,42)){mode=0;playClick();save();return;}
            if(hit(x,y,391,308,177,42)){mode=1;playClick();save();return;}
            if(hit(x,y,203,357,177,42)){mode=2;playClick();save();return;}
            if(hit(x,y,391,357,177,42)){mode=3;playClick();save();return;}
            for(int i=0;i<8;i++)if(Math.abs(x-(272+i*41))<20&&Math.abs(y-460)<25){
                if(i<3 || coins>=(i-2)*50 || skin==i){skin=i;playClick();save();}
                else{notice="Servono "+((i-2)*50)+" monete per sbloccare questa skin";}return;
            }
            if(hit(x,y,200,520,389,77)){start();return;}
            if(hit(x,y,619,520,240,77)){screen=SKINS;playClick();return;}
            if(hit(x,y,870,520,215,77)){screen=SETTINGS;playClick();return;}
        }else if(screen==GAME){
            if(hit(x,y,17,646,165,58)){screen=PAUSE;boost=false;playClick();return;}
        }else if(screen==PAUSE){
            if(hit(x,y,444,346,392,68)){screen=GAME;prevTime=0;playClick();return;}
            if(hit(x,y,444,439,392,64)){screen=MENU;playClick();return;}
        }else if(screen==RESULT){
            if(hit(x,y,431,430,418,65)){start();return;}
            if(hit(x,y,431,524,418,59)){screen=MENU;playClick();return;}
        }else if(screen==SETTINGS){
            for(int i=0;i<3;i++)if(hit(x,y,279+i*244,240,219,75)){quality=i;playClick();save();return;}
            if(hit(x,y,293,372,330,64)){audio=!audio;save();playClick();return;}
            if(hit(x,y,645,372,330,64)){vibration=!vibration;playClick();save();return;}
            if(hit(x,y,395,560,490,70)){screen=MENU;playClick();return;}
        }else if(screen==SKINS){
            for(int i=0;i<8;i++){
                int xx=300+(i%4)*178,yy=238+(i/4)*145;
                if(hit(x,y,xx-45,yy-45,155,150)){
                    int cost=(i-2)*50;
                    if(i>=3&&i!=skin && coins<cost){notice="Skin non ancora sbloccata";return;}
                    skin=i;playClick();save();return;
                }
            }
            if(hit(x,y,395,563,490,69)){screen=MENU;playClick();return;}
        }else if(screen==HELP){
            if(hit(x,y,395,558,490,69)){screen=MENU;playClick();return;}
        }
    }
    private float xLogical(float x){return (x-ox)/Math.max(.01f,sx);}
    private float yLogical(float y){return (y-oy)/Math.max(.01f,sy);}
    @Override public boolean onTouchEvent(MotionEvent event){
        try{
            int action=event.getActionMasked(),index=event.getActionIndex();
            if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){
                float x=xLogical(event.getX(index)),y=yLogical(event.getY(index));
                int pointer=event.getPointerId(index);
                if(screen==GAME && hit(x,y,1090,480,190,220)){
                    boostPointer=pointer;boost=true;invalidate();return true;
                }
                if(screen==GAME && !hit(x,y,17,646,165,58)){
                    if(joystickPointer<0){joystickPointer=pointer;dragAnchorX=x;dragAnchorY=y;dragX=x;dragY=y;}
                    return true;
                }
                tap(x,y);invalidate();return true;
            }
            if(action==MotionEvent.ACTION_MOVE){
                if(screen==GAME&&joystickPointer>=0){
                    int idx=event.findPointerIndex(joystickPointer);
                    if(idx>=0){
                        float x=xLogical(event.getX(idx)),y=yLogical(event.getY(idx));
                        float dx=x-dragAnchorX,dy=y-dragAnchorY;
                        if(dx*dx+dy*dy>90){
                            steer=(float)Math.atan2(dy,dx);
                            dragX=x;dragY=y;
                            dragAnchorX=x;dragAnchorY=y;
                        }
                    }
                }
                return true;
            }
            if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP||action==MotionEvent.ACTION_CANCEL){
                int pointer=event.getPointerId(index);
                if(pointer==boostPointer){boostPointer=-1;boost=false;}
                if(pointer==joystickPointer)joystickPointer=-1;
                if(action==MotionEvent.ACTION_CANCEL){joystickPointer=-1;boostPointer=-1;boost=false;}
                return true;
            }
        }catch(Exception ex){android.util.Log.w("TRISH_BOLL_NATIVE","Touch exception",ex);}
        return true;
    }
    @Override public void onFood(){if(audio)sound.play(GameSound.FOOD);}
    @Override public void onElimination(){if(audio)sound.play(GameSound.KILL);}
    @Override public void onGameOver(){/* game over saved on next render */}
}
