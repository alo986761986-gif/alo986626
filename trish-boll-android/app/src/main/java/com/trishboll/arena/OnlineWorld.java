package com.trishboll.arena;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

/** 
 * Adapts authoritative WebSocket game snapshots to the native Android renderer.
 * No local collision or score changes are made in online mode.
 * All methods are invoked on the UI thread by OnlineClient callbacks.
 */
public final class OnlineWorld {
    private static final String TAG="TRISH_BOLL_ONLINE";
    private final GameEngine game;
    private final Map<String,GameEngine.Snake> snakeCache=new HashMap<String,GameEngine.Snake>();
    private String myId="";
    public OnlineWorld(GameEngine e){game=e;}
    public void reset(String id){
        myId=id==null?"":id;
        snakeCache.clear();
        game.player=null;game.bots.clear();game.foods.clear();
        game.particles.clear();game.dead=false;
        game.arenaRadius=2150f;game.time=0f;
        game.kills=0;game.foodEaten=0;
    }
    public void setMyId(String id){myId=id==null?"":id;}
    public boolean hasPlayer(){return game.player!=null;}
    public void apply(JSONObject state){
        JSONArray snakes=state.optJSONArray("s");
        if(snakes==null)return;
        HashMap<String,Boolean> seen=new HashMap<String,Boolean>();
        game.bots.clear();
        GameEngine.Snake myself=null;
        for(int i=0;i<snakes.length();i++){
            JSONArray s=snakes.optJSONArray(i);
            if(s==null||s.length()<9)continue;
            String id=s.optString(0,""),name=s.optString(1,"SNAKE");
            if(id.length()==0)continue;
            seen.put(id,Boolean.TRUE);
            int color=Math.max(0,Math.min(7,s.optInt(2,0)));
            float x=(float)s.optDouble(3,0),y=(float)s.optDouble(4,0);
            float ang=(float)s.optDouble(5,0);
            float score=(float)s.optDouble(6,0);
            JSONArray points=s.optJSONArray(8);
            GameEngine.Snake snake=snakeCache.get(id);
            if(snake==null){
                snake=new GameEngine.Snake(name,color,false,x,y,ang);
                snakeCache.put(id,snake);
            }
            snake.name=name;snake.color=color;snake.x=x;snake.y=y;
            snake.a=ang;snake.desired=ang;snake.score=score;snake.alive=true;
            snake.head=0;snake.acc=0f;
            // Server sends every second point. Store them as consecutive trail samples.
            // This preserves shape and avoids interpolating positions client-side.
            int n=points==null?0:Math.min(points.length(),GameEngine.CAP-1);
            snake.count=Math.max(1,n);
            if(n==0){snake.trailX[0]=x;snake.trailY[0]=y;}
            for(int j=0;j<n;j++){
                JSONArray pt=points.optJSONArray(j);
                float px=pt==null?x:(float)pt.optDouble(0,x);
                float py=pt==null?y:(float)pt.optDouble(1,y);
                int k=(GameEngine.CAP-j)%GameEngine.CAP;
                snake.trailX[k]=px;snake.trailY[k]=py;
            }
            if(id.equals(myId))myself=snake;
            else game.bots.add(snake);
        }
        game.player=myself;
        for(String id:snakeCache.keySet().toArray(new String[0])){
            if(!seen.containsKey(id))snakeCache.remove(id);
        }
        game.frame++;
    }
    public void applyFoods(JSONArray array){
        if(array==null)return;
        game.foods.clear();
        for(int i=0;i<array.length()&&i<720;i++){
            JSONArray f=array.optJSONArray(i);
            if(f==null||f.length()<4)continue;
            float x=(float)f.optDouble(0),y=(float)f.optDouble(1);
            int col=Math.max(0,Math.min(7,f.optInt(2,0)));
            int energy=f.optInt(3,8);
            float radius=(float)f.optDouble(4,3.5);
            game.foods.add(new GameEngine.Food(x,y,radius,col,energy,0f));
        }
    }
}
