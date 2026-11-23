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
    static final int MENU=0,GAME=1,PAUSE=2,RESULT=3,HELP=4,SKINS=5,SETTINGS=6,ONLINE_SETUP=7;
    static final int BG=0xff071027,PANEL=0xff101d3d,CYAN=0xff73f4ff,PINK=0xffff6ad4,WHITE=0xfff7f8ff,MUTED=0xffa5b7d7,GOLD=0xffffd675;
    static final float SW=1280f,SH=720f;
    // Visual-only update: the head is larger and more expressive, while
    // movement and collision rules remain unchanged for online and offline.
    static final float PREMIUM_HEAD_RADIUS=20f; // previous inner radius: 14
    static final float PREMIUM_PREVIEW_HEAD_RADIUS=27f;
    private final Path snakePath=new Path();
    private final Path foodPath=new Path();
    private int controlMode=1; // 0 touch-aim, 1 on-screen arrow pad
    private int sensitivity=4; // 1..5
    private int directionPointer=-1;
    private int directionButton=-1; // reused: avoids per-frame path allocations
    private final GameEngine game;
    private final OnlineWorld onlineWorld;
    private final OnlineClient onlineClient;
    private final Context context;
    private boolean onlineMode=false;
    private String serverUrl="",onlineStatus="Server non configurato";
    private int playersOnline=0;
    private int serverRequestId=0;
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
        this.context=context;
        prefs=context.getSharedPreferences("trishboll_native_v4",Context.MODE_PRIVATE);
        game=new GameEngine(this);
        onlineWorld=new OnlineWorld(game);
        onlineClient=new OnlineClient(new OnlineClient.Listener(){
            @Override public void onConnecting(){onlineStatus="Connessione al server...";invalidate();}
            @Override public void onReady(){
                onlineWorld.reset(onlineClient.playerId());
                onlineMode=true;screen=GAME;prevTime=0;scoreAwarded=0;
                cameraX=0;cameraY=0;cameraZoom=1;steer=0;boost=false;
                onlineStatus="Connesso!";directionPointer=-1;directionButton=-1;if(audio)sound.play(GameSound.START);invalidate();
            }
            @Override public void onWorld(org.json.JSONObject snapshot){
                onlineWorld.apply(snapshot);
                playersOnline=onlineClient.livePlayers();
                invalidate();
            }
            @Override public void onFood(org.json.JSONArray data){
                onlineWorld.applyFoods(data);invalidate();
            }
            @Override public void onDeath(int score){
                if(game.player!=null)game.player.score=score;
                screen=RESULT;boost=false;onlineClient.disconnect();
                finishGame();invalidate();
            }
            @Override public void onDisconnect(String reason){
                onlineMode=false;screen=ONLINE_SETUP;boost=false;
                onlineStatus=reason;invalidate();
            }
        });
        sound=new GameSound(context);
        serverUrl=prefs.getString("multiplayer_url","");
        mode=clampInt(prefs.getInt("mode",0),0,3);
        skin=clampInt(prefs.getInt("skin",0),0,7);
        coins=Math.max(0,prefs.getInt("coins",0));
        record=Math.max(260,prefs.getInt("record",260));
        audio=prefs.getBoolean("audio",true);
        vibration=prefs.getBoolean("vibration",true);
        quality=clampInt(prefs.getInt("quality",1),0,2);
        sensitivity=clampInt(prefs.getInt("sensitivity",4),1,5);
        controlMode=clampInt(prefs.getInt("controls",1),0,1);
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
    public void halt(){uiActive=false;onlineClient.disconnect();removeCallbacks(redraw);sound.close();}
    public void wake(){uiActive=true;prevTime=0;postInvalidateDelayed(40);}
    public void save(){
        prefs.edit().putInt("skin",skin).putInt("mode",mode).putInt("coins",coins).putInt("record",record)
            .putBoolean("audio",audio).putBoolean("vibration",vibration).putInt("quality",quality)
            .putString("nickname",nick).putString("multiplayer_url",serverUrl)
            .putInt("sensitivity",sensitivity).putInt("controls",controlMode).apply();
    }
    public boolean goBack(){
        if(screen==GAME){if(onlineMode){leaveOnline();screen=MENU;}else{screen=PAUSE;boost=false;}return true;}
        if(screen==PAUSE||screen==RESULT||screen==SETTINGS||screen==SKINS||screen==HELP||screen==ONLINE_SETUP){leaveOnline();screen=MENU;return true;}
        return false;
    }
    private void start(){
        leaveOnline();
        boolean eco=quality==0||Runtime.getRuntime().maxMemory()<110L*1024L*1024L;
        game.reset(mode,skin,nick,eco);
        game.player.turnRate=3.8f+(sensitivity-1)*.8f;
        screen=GAME;scoreAwarded=0;prevTime=0;cameraX=0;cameraY=0;cameraZoom=1;
        steer=game.player.a;boost=false;boostPointer=-1;joystickPointer=-1;directionPointer=-1;directionButton=-1;
        lastMode=modeName();notice="";
        if(audio)sound.play(GameSound.START);
        save();
    }
    private void leaveOnline(){
        serverRequestId++;
        onlineClient.disconnect();
        onlineMode=false;playersOnline=0;boost=false;
    }
    private void connectOnline(){
        leaveOnline();
        screen=ONLINE_SETUP;
        onlineStatus="Ricerca automatica server globale...";
        final int requestId=++serverRequestId;
        ServerDiscovery.resolve(new ServerDiscovery.Callback(){
            @Override public void onResult(String endpoint,String status){
                if(requestId!=serverRequestId || screen!=ONLINE_SETUP)return;
                if(endpoint==null||endpoint.isEmpty()){
                    onlineStatus=status;
                    invalidate();
                    return;
                }
                serverUrl=endpoint;
                onlineStatus="Connessione all'arena mondiale...";
                onlineClient.connect(endpoint,nick,skin,sensitivity);
                invalidate();
            }
        });
        invalidate();
    }
    private void editNickname(){
        final android.widget.EditText field=new android.widget.EditText(context);
        field.setSingleLine(true);
        field.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(14)});
        field.setText(nick);
        new android.app.AlertDialog.Builder(context)
            .setTitle("Il tuo nome nell'arena")
            .setView(field)
            .setPositiveButton("SALVA",new android.content.DialogInterface.OnClickListener(){
                @Override public void onClick(android.content.DialogInterface dialog,int which){
                    nick=field.getText().toString().trim().replaceAll("[<>]","");
                    if(nick.isEmpty())nick="PLAYER";
                    save();invalidate();
                }
            })
            .setNegativeButton("ANNULLA",null)
            .show();
    }
    private void editServer(){
        final android.widget.EditText field=new android.widget.EditText(context);
        field.setSingleLine(true);
        field.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        field.setHint("wss://server.example.com/ws");
        field.setText(serverUrl);
        android.app.AlertDialog.Builder builder=new android.app.AlertDialog.Builder(context);
        builder.setTitle("Server multiplayer TRISH BOLL");
        builder.setMessage("Inserisci l'indirizzo wss:// del server pubblico.");
        builder.setView(field);
        builder.setPositiveButton("SALVA",new android.content.DialogInterface.OnClickListener(){
            @Override public void onClick(android.content.DialogInterface d,int which){
                String val=field.getText().toString().trim();
                if(val.startsWith("https://"))val="wss://"+val.substring(8);
                serverUrl=val;save();
                onlineStatus=serverUrl.isEmpty()?"Server non configurato":"Pronto per connettersi";
                invalidate();
            }
        });
        builder.setNegativeButton("ANNULLA",null);
        builder.show();
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
                if(onlineMode){onlineClient.input(steer,boost);game.time+=dt;}
                else game.update(dt,steer,boost);
                if(game.player!=null){
                    float lerp=Math.min(.13f,dt*6);
                    cameraX+=(game.player.x-cameraX)*lerp;
                    cameraY+=(game.player.y-cameraY)*lerp;
                    float target=mode==1?.91f:Math.max(.61f,1.04f-game.player.len/650);
                    cameraZoom+=(target-cameraZoom)*Math.min(1,dt*3);
                }
                if(game.dead&&!onlineMode){screen=RESULT;finishGame();}
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
                if(screen==ONLINE_SETUP)drawOnlineSetup(c);
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
        // Preview uses the same round, expressive character design as the arena.
        for(int i=28;i>=0;i--){
            float ang=i*.24f+uiTime*.6f;
            float rad=55+i*1.6f;
            float px=(float)Math.cos(ang)*rad-i*3.5f;
            float py=(float)Math.sin(ang)*rad*.55f;
            if(quality>0)circle(c,px,py,18,Color.argb(42,Color.red(col),Color.green(col),Color.blue(col)));
            circle(c,px,py,16,0xff09142b);
            circle(c,px,py,13,col);
            if(i%3==0)circle(c,px-4,py-5,3,0x88ffffff);
        }
        // Head is intentionally about 35% larger than the old preview.
        circle(c,90,0,PREMIUM_PREVIEW_HEAD_RADIUS+6,0x4839c8ff);
        circle(c,90,0,PREMIUM_PREVIEW_HEAD_RADIUS+3,0xff0a1837);
        circle(c,90,0,PREMIUM_PREVIEW_HEAD_RADIUS,col);
        circle(c,81,-11,10,0x70ffffff);
        circle(c,104,-11,8,WHITE);circle(c,104,10,8,WHITE);
        circle(c,108,-11,4,0xff092246);circle(c,108,10,4,0xff092246);
        circle(c,109,-13,1.5f,0xffffffff);circle(c,109,8,1.5f,0xffffffff);
        circle(c,110,0,3.2f,0xff103253);
        c.restore();
    }
    private void drawMenu(Canvas c){
        box(c,130,58,1020,600,32,0xeb101a38);
        border(c,130,58,1020,600,32,0xff324c7d,2);
        text(c,"TRISH",183,155,70,CYAN,true);
        text(c,"BOLL",410,155,70,PINK,true);
        text(c,"NEON SNAKE ARENA",190,188,20,MUTED,false);
        if(!notice.isEmpty())text(c,notice,193,218,17,GOLD,true);
        // Soft neon orbit accent makes the hero character stand out.
        if(quality>0){
            circle(c,840,290,166,0x151e9ed9);
            p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(2.3f);p.setColor(0x524deaff);
            c.drawCircle(840,290,153,p);
            p.setColor(0x3bc76fff);p.setStrokeWidth(1.5f);
            c.drawCircle(840,290,182,p);
            p.setStyle(Paint.Style.FILL);
        }
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
        text(c,"NOME: "+nick,742,465,19,CYAN,true);
        for(int i=0;i<8;i++){
            float x=272+i*41;
            circle(c,x,460,17,0xff07162f);circle(c,x,460,i==skin?15:12,GameEngine.COLORS[i]);
            if(i==skin){
                p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(2);p.setColor(WHITE);c.drawCircle(x,460,19,p);p.setStyle(Paint.Style.FILL);
            }
        }
        button(c,"GIOCA OFFLINE",200,520,389,77,true);
        button(c,"GIOCA ONLINE",619,520,240,77,false);
        button(c,"OPZIONI",870,520,215,77,false);
        text(c,"RECORD  "+record+"     MONETE  "+coins,202,628,17,GOLD,true);
        text(c,"VERSIONE 5.3 • PREMIUM HEAD",707,628,14,MUTED,false);
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
            float shimmer=quality>0?1f+.12f*(float)Math.sin(uiTime*2.7f+f.phase):1f;
            float rr=f.r*shimmer;
            drawFoodShape(c,f.x,f.y,rr,col,(Math.abs((int)f.x*13+(int)f.y*17+f.color*23))%6);
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
    /** Six collectible shapes, shared by local and remote worlds. Visual-only. */
    private void drawFoodShape(Canvas c,float x,float y,float radius,int col,int type){
        circle(c,x,y,radius*2.25f,
            Color.argb(48,Color.red(col),Color.green(col),Color.blue(col)));
        foodPath.reset();
        float r=Math.max(2.5f,radius*1.32f);
        if(type==0){ // energy sphere
            circle(c,x,y,r,col);
        }else if(type==1){ // diamond
            foodPath.moveTo(x,y-r*1.45f);
            foodPath.lineTo(x+r,y);foodPath.lineTo(x,y+r*1.45f);
            foodPath.lineTo(x-r,y);foodPath.close();
        }else if(type==2){ // crystal triangle
            foodPath.moveTo(x,y-r*1.45f);
            foodPath.lineTo(x+r*1.25f,y+r);
            foodPath.lineTo(x-r*1.25f,y+r);foodPath.close();
        }else if(type==3){ // little star
            for(int i=0;i<10;i++){
                float ang=(float)(i*Math.PI/5f-Math.PI/2f);
                float radius2=(i%2==0?r*1.52f:r*.65f);
                float px=x+(float)Math.cos(ang)*radius2;
                float py=y+(float)Math.sin(ang)*radius2;
                if(i==0)foodPath.moveTo(px,py);else foodPath.lineTo(px,py);
            }foodPath.close();
        }else if(type==4){ // energy hexagon
            for(int i=0;i<6;i++){
                float ang=(float)(i*Math.PI/3f);
                float px=x+(float)Math.cos(ang)*r*1.2f;
                float py=y+(float)Math.sin(ang)*r*1.2f;
                if(i==0)foodPath.moveTo(px,py);else foodPath.lineTo(px,py);
            }foodPath.close();
        }else{ // mini heart
            foodPath.moveTo(x,y+r*1.25f);
            foodPath.cubicTo(x-r*2.3f,y-r*.3f,x-r*.85f,y-r*1.7f,x,y-r*.55f);
            foodPath.cubicTo(x+r*.85f,y-r*1.7f,x+r*2.3f,y-r*.3f,x,y+r*1.25f);
            foodPath.close();
        }
        if(type!=0){
            p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.FILL);p.setColor(col);
            c.drawPath(foodPath,p);
        }
        circle(c,x-r*.27f,y-r*.27f,Math.max(1.2f,r*.25f),0xcaffffff);
    }

    private void drawSnake(Canvas c,GameEngine.Snake snake,float left,float right,float top,float bottom){
        if(snake.x<left-580||snake.x>right+580||snake.y<top-580||snake.y>bottom+580)return;
        final int col=GameEngine.COLORS[snake.color%8];
        final boolean playerHead=snake==game.player;
        // One reusable path per frame: avoids repeated allocations on Android 5.
        snakePath.reset();
        snakePath.moveTo(snake.x,snake.y);
        for(int i=0;i<snake.count;i++)snakePath.lineTo(snake.tx(i),snake.ty(i));

        p.reset();p.setAntiAlias(true);
        p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
        p.setStyle(Paint.Style.STROKE);
        if(quality>0){
            p.setStrokeWidth(34);
            p.setColor(Color.argb(42,Color.red(col),Color.green(col),Color.blue(col)));
            c.drawPath(snakePath,p);
        }
        p.setStrokeWidth(27);p.setColor(0xff061026);c.drawPath(snakePath,p);
        p.setStrokeWidth(20);p.setColor(col);c.drawPath(snakePath,p);
        // A bright, directional highlight fakes 3D volume at almost no cost.
        p.setStrokeWidth(6);p.setColor(0x77ffffff);c.drawPath(snakePath,p);
        p.setStyle(Paint.Style.FILL);

        // Eight visibly different snake skins, including remote multiplayer players.
        // Patterns are derived from the existing skin ID and need no server protocol changes.
        drawSkinPattern(c,snake);
        drawPremiumHead(c,snake.x,snake.y,snake.a,col,playerHead);
        if(quality!=0){
            text(c,snake.name,snake.x-30,snake.y-43,15,WHITE,true);
        }
    }

    private void drawSkinPattern(Canvas c,GameEngine.Snake snake){
        if(quality==0)return;
        int type=snake.color%8;
        int n=Math.min(snake.count,145);
        int step=quality==2?7:12;
        for(int i=9;i<n;i+=step){
            float x=snake.tx(i),y=snake.ty(i);
            switch(type){
                case 0: // Arctic: glacial reflective beads
                    circle(c,x,y,2.6f,0xbaffffff);break;
                case 1: // Galaxy: indigo stars
                    drawTinyStar(c,x,y,3.8f,0xfff4a6ff);break;
                case 2: // Fire: amber embers
                    circle(c,x,y,3.3f,0xffffdb66);break;
                case 3: // Bio: glowing segmented rings
                    circle(c,x,y,4.3f,0xaae2ffb6);circle(c,x,y,1.8f,0xff165536);break;
                case 4: // Candy: alternating stripes
                    circle(c,x,y,4f,(i/step)%2==0?0xffffe6f7:0xffff82be);break;
                case 5: // Thunder: golden sparkles
                    drawTinyStar(c,x,y,3.5f,0xffffffae);break;
                case 6: // Cyber: electric blue circuits
                    circle(c,x,y,3.4f,0xffd3e8ff);break;
                default: // Lava: red volcanic scales
                    circle(c,x,y,3.3f,(i/step)%2==0?0xffffde83:0xffff6747);break;
            }
        }
    }
    private void drawTinyStar(Canvas c,float x,float y,float size,int color){
        line(c,x-size,y,x+size,y,color,1.7f);
        line(c,x,y-size,x,y+size,color,1.7f);
    }

    private void drawPremiumHead(Canvas c,float x,float y,float angle,int col,boolean isPlayer){
        float vx=(float)Math.cos(angle),vy=(float)Math.sin(angle);
        float qx=-vy,qy=vx;
        // The playable character's head is visually around 43% larger.
        // Head scale is presentation-only; game collision sizes are preserved.
        float radius=PREMIUM_HEAD_RADIUS;
        if(quality>0){
            circle(c,x,y,radius+9,
                Color.argb(isPlayer?55:33,Color.red(col),Color.green(col),Color.blue(col)));
        }
        circle(c,x,y,radius+4,0xff061027);
        circle(c,x,y,radius+1.2f,0xff244c6d);
        circle(c,x,y,radius,col);

        // Faux 3D lighting: broad glossy forehead and soft cheek highlights.
        circle(c,x-vx*6-qx*5,y-vy*6-qy*5,8.3f,0x56ffffff);
        circle(c,x-vx*8+qx*5,y-vy*8+qy*5,4.3f,0x4cffffff);

        // Two large eyes look forward in the direction of travel.
        float eyeX=x+vx*8.2f,eyeY=y+vy*8.2f;
        float lx=eyeX+qx*8f,ly=eyeY+qy*8f;
        float rx=eyeX-qx*8f,ry=eyeY-qy*8f;
        circle(c,lx,ly,6.5f,0xff0a2445);
        circle(c,rx,ry,6.5f,0xff0a2445);
        circle(c,lx,ly,5.5f,WHITE);
        circle(c,rx,ry,5.5f,WHITE);
        circle(c,lx+vx*2.4f,ly+vy*2.4f,2.8f,0xff081a3b);
        circle(c,rx+vx*2.4f,ry+vy*2.4f,2.8f,0xff081a3b);
        circle(c,lx+vx*3.0f-qx*0.8f,ly+vy*3.0f-qy*0.8f,1.15f,WHITE);
        circle(c,rx+vx*3.0f-qx*0.8f,ry+vy*3.0f-qy*0.8f,1.15f,WHITE);

        // Tiny smile and nostril add personality without distracting from play.
        float mouthX=x+vx*15f,mouthY=y+vy*15f;
        line(c,mouthX+qx*3.2f,mouthY+qy*3.2f,
            mouthX,mouthY,0xff0b3050,2.1f);
        line(c,mouthX,mouthY,
            mouthX-qx*3.2f,mouthY-qy*3.2f,0xff0b3050,2.1f);

        if(quality>0 && isPlayer && boost){
            p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(2.2f);p.setColor(0xa7fffae3);
            float pulse=radius+10f+(float)Math.sin(uiTime*14f)*2f;
            c.drawCircle(x,y,pulse,p);
            p.setStyle(Paint.Style.FILL);
        }
    }
    private void drawHUD(Canvas c){
        box(c,14,12,288,76,15,0xe2091935);
        text(c,"TRISH BOLL",33,42,23,CYAN,true);
        String score=game.player==null?"0":Integer.toString((int)game.player.score);
        text(c,"PUNTEGGIO  "+score,33,70,17,WHITE,true);
        box(c,977,14,289,208,17,0xdf091834);
        text(c,onlineMode?"ONLINE • "+playersOnline+" GIOCATORI":"CLASSIFICA",999,45,onlineMode?16:22,GOLD,true);
        ArrayList<GameEngine.Snake> list=game.leaderboard();
        for(int i=0;i<Math.min(5,list.size());i++){
            GameEngine.Snake s=list.get(i);
            int col=s==game.player?CYAN:WHITE;
            text(c,(i+1)+".  "+s.name,998,77+i*26,16,col,true);
            text(c,Integer.toString((int)s.score),1204,77+i*26,16,GOLD,false);
        }
        box(c,14,101,250,39,12,0xcf102143);
        text(c,(onlineMode?"ONLINE":"OFFLINE "+modeName())+"  •  "+((int)game.time)+"s",30,128,16,CYAN,true);
        button(c,onlineMode?"ESCI":"PAUSA",17,646,165,58,false);
        circle(c,1185,584,78,0x99401a59);circle(c,1185,584,65,0xffa23e86);
        p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(5);p.setColor(0xffffb8f5);
        c.drawCircle(1185,584,65,p);p.setStyle(Paint.Style.FILL);
        center(c,"BOOST",1185,592,21,WHITE,true);
        box(c,534,665,220,38,10,0xb6091e37);
        center(c,"TRASCINA PER GIRARE",644,689,14,MUTED,true);
        drawMap(c);
        if(controlMode==1)drawDirectionPad(c);
    }
    private void drawDirectionPad(Canvas c){
        // Four 56px controls: large targets compatible with Android 5 landscape.
        int[] xs={322,322,260,384};
        int[] ys={478,602,540,540};
        String[] labels={"▲","▼","◀","▶"};
        for(int i=0;i<4;i++){
            boolean active=directionButton==i;
            circle(c,xs[i],ys[i],34,active?0xdd2479ca:0xb10c2546);
            p.reset();p.setAntiAlias(true);p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(active?3:2);
            p.setColor(active?CYAN:0xff77acdf);
            c.drawCircle(xs[i],ys[i],34,p);p.setStyle(Paint.Style.FILL);
            center(c,labels[i],xs[i],ys[i]+10,28,active?WHITE:0xffb6e7ff,true);
        }
        circle(c,322,540,18,0x914da9ca);
        center(c,"D-PAD",322,699,13,MUTED,true);
    }
    private void drawMap(Canvas c){
        circle(c,1186,318,69,0xd40a1531);
        p.setColor(0xff587bb6);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(2);
        c.drawCircle(1186,318,65,p);p.setStyle(Paint.Style.FILL);
        if(game.player==null)return;
        float radius=Math.max(1,game.arenaRadius);
        for(GameEngine.Snake b:game.bots)if(b.alive)circle(c,1186+b.x*64/radius,318+b.y*64/radius,3,GameEngine.COLORS[b.color%8]);
        circle(c,1186+game.player.x*64/radius,318+game.player.y*64/radius,5,WHITE);
    }
    private void overlay(Canvas c){box(c,0,0,SW,SH,0,0xd9050b1c);}
    private void drawPause(Canvas c){
        overlay(c);box(c,372,143,536,430,26,PANEL);
        border(c,372,143,536,430,26,0xff4f74ba,2);
        center(c,"PARTITA IN PAUSA",640,239,39,WHITE,true);
        center(c,(onlineMode?"ONLINE":modeName())+" • "+(int)game.time+" secondi",640,290,20,MUTED,false);
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
        text(c,"8 SKIN: ARTICO, GALASSIA, FUOCO, BIO, CANDY, TUONO, CYBER, LAVA",260,191,16,MUTED,true);
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
    private void drawOnlineSetup(Canvas c){
        screenPanel(c,"MULTIPLAYER ONLINE");
        center(c,"Gioca contro persone reali nella stessa arena",640,214,22,MUTED,false);
        center(c,"SERVER GLOBALE AUTOMATICO",640,289,20,CYAN,true);
        center(c,onlineStatus.length()>68?onlineStatus.substring(0,68):onlineStatus,640,333,19,GOLD,true);
        button(c,"CERCA SERVER ONLINE",395,381,490,63,true);
        button(c,"AGGIORNA CONNESSIONE",395,462,490,63,false);
        button(c,"GIOCA OFFLINE",395,545,490,63,false);
        center(c,"Nessuna configurazione manuale: server unico per tutti i giocatori",640,645,16,MUTED,false);
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
        text(c,"SENSIBILITA STERZATA: "+sensitivity+"/5",282,482,20,CYAN,true);
        for(int i=0;i<5;i++){
            float x=285+i*142;
            box(c,x,497,118,34,10,sensitivity==i+1?0xff287dc6:0xff213252);
            border(c,x,497,118,34,10,sensitivity==i+1?CYAN:0xff415b82,1.6f);
            center(c,""+(i+1),x+59,522,17,WHITE,true);
        }
        button(c,controlMode==1?"COMANDI: FRECCE":"COMANDI: TOUCH",304,544,676,48,false);
        button(c,"INDIETRO",395,611,490,48,true);
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
            if(hit(x,y,619,520,240,77)){playClick();connectOnline();return;}
            if(hit(x,y,870,520,215,77)){screen=SETTINGS;playClick();return;}
            if(hit(x,y,185,441,92,38)){screen=SKINS;return;}
            if(hit(x,y,690,431,330,55)){editNickname();return;}
        }else if(screen==GAME){
            if(hit(x,y,17,646,165,58)){if(onlineMode){leaveOnline();screen=MENU;}else{screen=PAUSE;boost=false;}playClick();return;}
        }else if(screen==PAUSE){
            if(hit(x,y,444,346,392,68)){screen=GAME;prevTime=0;playClick();return;}
            if(hit(x,y,444,439,392,64)){leaveOnline();screen=MENU;playClick();return;}
        }else if(screen==RESULT){
            if(hit(x,y,431,430,418,65)){if(onlineMode)connectOnline();else start();return;}
            if(hit(x,y,431,524,418,59)){leaveOnline();screen=MENU;playClick();return;}
        }else if(screen==ONLINE_SETUP){
            if(hit(x,y,395,381,490,63)){connectOnline();return;}
            if(hit(x,y,395,462,490,63)){connectOnline();return;}
            if(hit(x,y,395,545,490,63)){start();return;}
        }else if(screen==SETTINGS){
            for(int i=0;i<3;i++)if(hit(x,y,279+i*244,240,219,75)){quality=i;playClick();save();return;}
            if(hit(x,y,293,372,330,64)){audio=!audio;save();playClick();return;}
            if(hit(x,y,645,372,330,64)){vibration=!vibration;playClick();save();return;}
            for(int i=0;i<5;i++)if(hit(x,y,285+i*142,497,118,34)){
                sensitivity=i+1;playClick();save();return;
            }
            if(hit(x,y,304,544,676,48)){
                controlMode=1-controlMode;playClick();save();return;
            }
            if(hit(x,y,395,611,490,48)){screen=MENU;playClick();return;}
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
    private int directionHit(float x,float y){
        int[] px={322,322,260,384},py={478,602,540,540};
        for(int i=0;i<4;i++){
            float dx=x-px[i],dy=y-py[i];
            if(dx*dx+dy*dy<43f*43f)return i;
        }
        return -1;
    }
    private void applyDirection(int index){
        // Cardinal controls: up, down, left, right (absolute screen axes).
        if(index==0)steer=-(float)Math.PI/2;
        else if(index==1)steer=(float)Math.PI/2;
        else if(index==2)steer=(float)Math.PI;
        else if(index==3)steer=0f;
        directionButton=index;
    }
    private void aimFromTouch(float x,float y){
        // Aim directly relative to the center player (no old 90px drag threshold).
        float dx=x-640,dy=y-360;
        if(dx*dx+dy*dy>16f*16f)steer=(float)Math.atan2(dy,dx);
    }
    @Override public boolean onTouchEvent(MotionEvent event){
        try{
            int action=event.getActionMasked(),index=event.getActionIndex();
            if(action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN){
                float x=xLogical(event.getX(index)),y=yLogical(event.getY(index));
                int pointer=event.getPointerId(index);
                if(screen==GAME&&hit(x,y,1090,480,190,220)){
                    boostPointer=pointer;boost=true;invalidate();return true;
                }
                if(screen==GAME&&controlMode==1){
                    int which=directionHit(x,y);
                    if(which>=0){directionPointer=pointer;applyDirection(which);invalidate();return true;}
                }
                if(screen==GAME&&!hit(x,y,17,646,165,58)){
                    if(joystickPointer<0){
                        joystickPointer=pointer;dragAnchorX=x;dragAnchorY=y;
                        dragX=x;dragY=y;
                        if(controlMode==0)aimFromTouch(x,y);
                    }
                    invalidate();return true;
                }
                tap(x,y);invalidate();return true;
            }
            if(action==MotionEvent.ACTION_MOVE){
                if(screen==GAME&&directionPointer>=0){
                    int idx=event.findPointerIndex(directionPointer);
                    if(idx>=0){
                        int which=directionHit(xLogical(event.getX(idx)),yLogical(event.getY(idx)));
                        if(which>=0)applyDirection(which);
                    }
                }
                if(screen==GAME&&joystickPointer>=0){
                    int idx=event.findPointerIndex(joystickPointer);
                    if(idx>=0){
                        float x=xLogical(event.getX(idx)),y=yLogical(event.getY(idx));
                        if(controlMode==0){
                            aimFromTouch(x,y);
                        }else {
                            float dx=x-dragAnchorX,dy=y-dragAnchorY;
                            if(dx*dx+dy*dy>18f*18f){
                                steer=(float)Math.atan2(dy,dx);
                                dragAnchorX=x;dragAnchorY=y;
                            }
                        }
                        dragX=x;dragY=y;
                    }
                }
                return true;
            }
            if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP||action==MotionEvent.ACTION_CANCEL){
                int pointer=event.getPointerId(index);
                if(pointer==boostPointer){boostPointer=-1;boost=false;}
                if(pointer==directionPointer){directionPointer=-1;directionButton=-1;}
                if(pointer==joystickPointer)joystickPointer=-1;
                if(action==MotionEvent.ACTION_CANCEL){
                    joystickPointer=-1;directionPointer=-1;directionButton=-1;
                    boostPointer=-1;boost=false;
                }
                invalidate();return true;
            }
        }catch(Exception ex){android.util.Log.w("TRISH_BOLL_NATIVE","Touch exception",ex);}
        return true;
    }
    @Override public void onFood(){if(audio)sound.play(GameSound.FOOD);}
    @Override public void onElimination(){if(audio)sound.play(GameSound.KILL);}
    @Override public void onGameOver(){/* game over saved on next render */}
}
