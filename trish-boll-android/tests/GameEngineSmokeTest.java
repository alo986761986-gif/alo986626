package com.trishboll.arena;
public class GameEngineSmokeTest {
  private static void check(boolean b,String msg){if(!b)throw new AssertionError(msg);}
  static class Count implements GameEngine.Events{
    int food,kills,deaths;
    public void onFood(){food++;}
    public void onElimination(){kills++;}
    public void onGameOver(){deaths++;}
  }
  public static void main(String[] args){
    for(int mode=0;mode<4;mode++) {
      Count listener=new Count();
      GameEngine engine=new GameEngine(listener);
      engine.reset(mode,mode,"TestPlayer",true);
      check(engine.player!=null,"Missing player");
      check(engine.bots.size()==7,"Incorrect eco AI count");
      check(engine.foods.size()>30,"Missing food");
      for(int i=0;i<1200&&!engine.dead;i++){
        engine.update(.016f,(float)(i*.008f),i%12<5);
        check(Float.isFinite(engine.player.x)&&Float.isFinite(engine.player.y),"Bad coordinates");
        check(engine.player.count<320,"Exceeded trail buffer");
        check(engine.foods.size()<350,"Food memory runaway");
        check(engine.particles.size()<130,"Particle memory runaway");
      }
      if(mode==2)check(engine.arenaRadius<GameEngine.WORLD,"Survival arena did not shrink");
      System.out.println("MODE "+mode+" OK frames="+engine.frame+" score="+engine.player.score);
    }
    System.out.println("TRISH_BOLL_NATIVE_ENGINE_TEST_PASS");
  }
}
