package com.trishboll.arena;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Random;

/**
 * Native, allocation-light Slither-style arena.
 * No WebView, JS runtime, external graphics libraries, network or permissions needed.
 * Coordinates and collisions stay in game-space independent of screen resolution.
 */
public final class GameEngine {
    public static final float WORLD = 1700f;
    public static final int CLASSIC=0, TURBO=1, SURVIVAL=2, TEAM=3;
    public static final int[] COLORS={
       0xff54f3ff,0xffc17aff,0xffffb46a,0xff5af6a3,
       0xffff70ae,0xfff9f17e,0xff719fff,0xffff7868
    };
    static final String[] BOT_NAMES={
       "NOVA","VIPER","SPARK","ORBIT","LUNA","NITRO",
       "GHOST","PIXEL","BLAZE","VENOM","TITAN","COSMO"
    };
    static final int CAP=320;
    static final float SPACING=6.2f;
    static final float TAU=(float)(Math.PI*2);
    final Random random = new Random();
    final ArrayList<Snake> bots = new ArrayList<Snake>();
    final ArrayList<Food> foods = new ArrayList<Food>();
    final ArrayList<Particle> particles = new ArrayList<Particle>();
    final ArrayList<Snake> sorted = new ArrayList<Snake>();
    public Snake player;
    public int mode=CLASSIC, foodEaten=0, kills=0, highCombo=0;
    public float time=0, arenaRadius=WORLD, comboClock=0;
    public boolean dead=false, lowPower=false, boost=false;
    public int frame=0, lastFoodPoints=0, newKillCount=0;
    public int earnedCoins=0;
    private int targetFoods=165;
    private float foodFillTimer=0;

    public interface Events {
        void onFood();
        void onElimination();
        void onGameOver();
    }
    private final Events events;
    public GameEngine(Events cb) { events=cb; }

    public static class Snake {
        public float x,y,a,desired,score=260,len=42,acc=0;
        public float turnRate=3f,brain=0f,deathAt=0;
        public float[] trailX=new float[CAP],trailY=new float[CAP];
        public int head=0,count=42,color=0,team=0;
        public boolean bot=true,alive=true;
        public String name;
        Snake(String n, int col, boolean ai,float px,float py,float ang){
            name=n;color=col;bot=ai;x=px;y=py;a=ang;desired=ang;
            for(int i=0;i<count;i++){
                int pos=(CAP-i)%CAP;
                trailX[pos]=x-(float)Math.cos(a)*i*SPACING;
                trailY[pos]=y-(float)Math.sin(a)*i*SPACING;
            }
        }
        public float tx(int back){return trailX[(head-back+CAP)%CAP];}
        public float ty(int back){return trailY[(head-back+CAP)%CAP];}
    }
    public static class Food {
        public float x,y,r,phase;
        public int color,energy;
        Food(float xx,float yy,float rr,int cc,int en,float ph){
            x=xx;y=yy;r=rr;color=cc;energy=en;phase=ph;
        }
    }
    public static class Particle {
        public float x,y,vx,vy,t,max;
        public int color;
        Particle(float xx,float yy,float vvx,float vvy,int col,float life){
            x=xx;y=yy;vx=vvx;vy=vvy;color=col;t=max=life;
        }
    }
    private float rand(float lo,float hi){return lo+random.nextFloat()*(hi-lo);}
    private float norm(float angle){while(angle>Math.PI)angle-=TAU;while(angle<-Math.PI)angle+=TAU;return angle;}
    private float length(float x,float y){return (float)Math.sqrt(x*x+y*y);}
    private float clamp(float v,float min,float max){return Math.max(min,Math.min(max,v));}
    private float[] randomPlace(){
        float a=rand(0,TAU),r=(float)Math.sqrt(random.nextFloat())*(WORLD-130);
        return new float[]{(float)Math.cos(a)*r,(float)Math.sin(a)*r};
    }
    private Snake create(String name,int color,boolean bot,int team){
        float[] p=randomPlace();
        if(!bot){p[0]=0;p[1]=0;}
        else if(player!=null)for(int n=0;n<30;n++){
            if(length(p[0]-player.x,p[1]-player.y)>440)break;
            p=randomPlace();
        }
        Snake s=new Snake(name,color,bot,p[0],p[1],rand(-3.14f,3.14f));
        s.team=team;
        s.score=bot?rand(220,900):260;
        s.len=42+(int)(s.score/60);
        s.turnRate=bot?rand(2.0f,2.8f):3.6f;
        if(s.len>s.count){int n=(int)Math.min(s.len,CAP-1);for(int i=s.count;i<n;i++){
            int pos=(s.head-i+CAP)%CAP;
            s.trailX[pos]=s.x-(float)Math.cos(s.a)*i*SPACING;
            s.trailY[pos]=s.y-(float)Math.sin(s.a)*i*SPACING;
        }s.count=n;}
        return s;
    }
    private Food spawnFood(float x,float y,int col,int en){
        float[] p=x==Float.MAX_VALUE?randomPlace():new float[]{x,y};
        return new Food(p[0],p[1],rand(3.1f,5.5f),col,en,rand(0,6.28f));
    }
    public void reset(int gameMode,int skin,String name,boolean eco){
        mode=gameMode;lowPower=eco;targetFoods=eco?112:190;
        player=null;bots.clear();foods.clear();particles.clear();sorted.clear();
        time=0;dead=false;foodEaten=0;kills=0;highCombo=0;comboClock=0;
        frame=0;arenaRadius=WORLD;foodFillTimer=0;lastFoodPoints=0;
        earnedCoins=0;newKillCount=0;boost=false;
        player=create(name,skin,false,0);
        int n=eco?7:11;
        for(int i=0;i<n;i++){
            int team=mode==TEAM?i%2:2+i;
            int col=mode==TEAM?(team==0?0:2):(i+1)%COLORS.length;
            bots.add(create(BOT_NAMES[i%BOT_NAMES.length],col,true,team));
        }
        for(int i=0;i<targetFoods;i++){
            foods.add(spawnFood(Float.MAX_VALUE,0,random.nextInt(COLORS.length),8));
        }
    }
    public void update(float dt,float steerAngle,boolean boosting){
        if(dead||player==null)return;
        dt=clamp(dt,0f,0.04f);time+=dt;frame++;
        lastFoodPoints=0;newKillCount=0;
        boost=boosting;
        if(mode==SURVIVAL)arenaRadius=Math.max(760f,WORLD-6.4f*time);
        if(comboClock>0)comboClock-=dt;
        for(int i=particles.size()-1;i>=0;i--){
            Particle p=particles.get(i);p.t-=dt;
            if(p.t<=0){particles.remove(i);continue;}
            p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985f;p.vy*=.985f;
        }
        player.desired=steerAngle;
        stepSnake(player,dt,boosting);
        if(dead)return;
        for(int i=0;i<bots.size();i++){
            Snake bot=bots.get(i);
            if(!bot.alive){
                if(time>bot.deathAt){bots.set(i,create(bot.name,bot.color,true,bot.team));}
                continue;
            }
            ai(bot,dt);
            stepSnake(bot,dt,bot.len>34 && random.nextInt(1000)<2);
        }
        collision(player);
        if(dead)return;
        for(int i=0;i<bots.size();i++)if(bots.get(i).alive)collision(bots.get(i));
        foodFillTimer-=dt;
        if(foodFillTimer<=0){
            foodFillTimer=.17f;
            while(foods.size()<targetFoods)foods.add(spawnFood(Float.MAX_VALUE,0,random.nextInt(COLORS.length),8));
            while(foods.size()>targetFoods+100)foods.remove(0);
        }
    }
    private void ai(Snake s,float dt){
        s.brain-=dt;if(s.brain>0)return;
        s.brain=rand(.20f,.55f);
        float vx=rand(-100f,100f),vy=rand(-100f,100f);
        float closest=400f*400f;
        for(int i=0;i<foods.size();i+=2){
            Food f=foods.get(i);
            float dx=f.x-s.x,dy=f.y-s.y,d=dx*dx+dy*dy;
            if(d<closest){closest=d;vx=dx;vy=dy;}
        }
        float boundary=length(s.x,s.y);
        if(boundary>arenaRadius-320){
            vx-=s.x/Math.max(1f,boundary)*1200;
            vy-=s.y/Math.max(1f,boundary)*1200;
        }
        if(player!=null && !dead){
            float dx=s.x-player.x,dy=s.y-player.y;
            float d=dx*dx+dy*dy;
            if(d<240*240 && d>1 && mode!=TEAM){
                float k=340f/(float)Math.sqrt(d);
                vx+=dx*k;vy+=dy*k;
            }
        }
        s.desired=(float)Math.atan2(vy,vx);
    }
    private void stepSnake(Snake s,float dt,boolean accelerate){
        if(!s.alive)return;
        float diff=norm(s.desired-s.a);
        s.a+=clamp(diff,-s.turnRate*dt,s.turnRate*dt);
        float speed=(s.bot?125f:142f);
        if(mode==TURBO)speed*=1.5f;
        boolean running=accelerate && s.len>27;
        if(running){speed*=1.58f;s.len=Math.max(27f,s.len-2.5f*dt);}
        float oldX=s.x,oldY=s.y;
        s.x+=(float)Math.cos(s.a)*speed*dt;
        s.y+=(float)Math.sin(s.a)*speed*dt;
        float d=length(s.x-oldX,s.y-oldY);
        float before=s.acc; s.acc+=d;
        float marker=SPACING-before;
        while(marker<=d && d>0){
            float f=marker/d;
            s.head=(s.head+1)%CAP;
            s.trailX[s.head]=oldX+(s.x-oldX)*f;
            s.trailY[s.head]=oldY+(s.y-oldY)*f;
            if(s.count<CAP-1)s.count++;
            marker+=SPACING;
        }
        if(s.acc>=SPACING)s.acc%=SPACING;
        int max=(int)Math.min(CAP-1,Math.max(23,s.len));
        if(s.count>max)s.count=max;
        if(length(s.x,s.y)>arenaRadius-10f){
            eliminate(s);return;
        }
        for(int i=foods.size()-1;i>=0;i--){
            Food f=foods.get(i);float dx=s.x-f.x,dy=s.y-f.y;
            if(dx*dx+dy*dy<290){
                foods.remove(i);s.score+=f.energy;s.len+=.70f;
                if(s==player){
                    foodEaten++;lastFoodPoints+=f.energy;
                    if(foodEaten%4==0 && events!=null)events.onFood();
                    comboClock=2.2f;
                    if(foodEaten%25==0){earnedCoins+=8;highCombo=Math.max(highCombo,foodEaten);}
                }
                burst(f.x,f.y,f.color,4);
            }
        }
    }
    private void collision(Snake s){
        if(!s.alive)return;
        for(int k=-1;k<bots.size();k++){
            Snake other=k<0?player:bots.get(k);
            if(other==null||other==s||!other.alive)continue;
            if(mode==TEAM&&s.team==other.team)continue;
            float dx=s.x-other.x,dy=s.y-other.y;
            if(dx*dx+dy*dy>700*700)continue;
            int size=other.count;
            for(int i=7;i<size;i+=3){
                float xx=s.x-other.tx(i),yy=s.y-other.ty(i);
                if(xx*xx+yy*yy<19*19){
                    eliminate(s);
                    if(s!=player&&other==player){
                        kills++;newKillCount++;earnedCoins+=12;
                        if(events!=null)events.onElimination();
                    }
                    return;
                }
            }
        }
    }
    private void eliminate(Snake s){
        if(!s.alive)return;
        s.alive=false;s.deathAt=time+rand(1.4f,3f);
        for(int i=0;i<s.count;i+=4){
            if(foods.size()>targetFoods+85)break;
            float dx=rand(-15,15),dy=rand(-15,15);
            foods.add(spawnFood(s.tx(i)+dx,s.ty(i)+dy,s.color,12));
        }
        burst(s.x,s.y,s.color,24);
        if(s==player){
            dead=true;
            earnedCoins+=Math.min(90,(int)(time/14f));
            if(events!=null)events.onGameOver();
        }
    }
    private void burst(float x,float y,int color,int n){
        int limit=lowPower?65:120;
        for(int i=0;i<n&&particles.size()<limit;i++){
            float a=rand(0,TAU),v=rand(25,155);
            particles.add(new Particle(x,y,(float)Math.cos(a)*v,(float)Math.sin(a)*v,color,rand(.15f,.6f)));
        }
    }
    public ArrayList<Snake> leaderboard(){
        sorted.clear();if(player!=null)sorted.add(player);
        for(Snake b:bots)if(b.alive)sorted.add(b);
        Collections.sort(sorted,new Comparator<Snake>(){
            @Override public int compare(Snake a,Snake b){return Float.compare(b.score,a.score);}
        });
        return sorted;
    }
    public int position(){
        ArrayList<Snake> leaderboard=leaderboard();
        for(int i=0;i<leaderboard.size();i++)if(leaderboard.get(i)==player)return i+1;
        return leaderboard.size();
    }
}
