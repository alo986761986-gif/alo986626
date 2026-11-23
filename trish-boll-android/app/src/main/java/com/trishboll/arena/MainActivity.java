package com.trishboll.arena;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.util.Log;
import android.widget.TextView;
import android.view.Gravity;

public final class MainActivity extends Activity {
    private GameView game;
    private StudioSplashView splash;
    private boolean destroyed = false;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                             WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(
             android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            |android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            |android.view.View.SYSTEM_UI_FLAG_FULLSCREEN);
        try {
            splash = new StudioSplashView(this,new StudioSplashView.Finished() {
                @Override public void onFinished() { showGame(); }
            });
            setContentView(splash);
        } catch(Throwable error) {
            Log.e("TRISH_BOLL_NATIVE","Splash startup failed",error);
            showGame();
        }
    }
    private void showGame() {
        if(destroyed || game != null || isFinishing()) return;
        try {
            if(splash != null) splash.stop();
            splash = null;
            game = new GameView(this);
            setContentView(game);
        } catch(Throwable error) {
            Log.e("TRISH_BOLL_NATIVE","Native game initialization failed",error);
            TextView message = new TextView(this);
            message.setGravity(Gravity.CENTER);
            message.setTextSize(19f);
            message.setTextColor(0xffffffff);
            message.setBackgroundColor(0xff071027);
            message.setText("TRISH BOLL\n\nErrore di inizializzazione.\n"
                +"Riavvia il telefono oppure aggiorna il sistema Android.\n\n"
                +error.getClass().getSimpleName()+": "+error.getMessage());
            setContentView(message);
        }
    }
    @Override public void onBackPressed() {
        if(splash != null) { showGame(); return; }
        if(game != null && game.goBack()) { game.invalidate(); return; }
        super.onBackPressed();
    }
    @Override protected void onPause() {
        super.onPause();
        if(game!=null)game.save();
    }
    @Override protected void onResume() {
        super.onResume();
        if(game!=null)game.wake();
    }
    @Override protected void onDestroy() {
        destroyed = true;
        if(splash!=null) {splash.stop();splash=null;}
        if(game!=null){game.save();game.halt();game=null;}
        super.onDestroy();
    }
}
