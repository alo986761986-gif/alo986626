package it.napolicarte.game;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.InputStream;

/** The game's first Android screen: studio boot animation, then account access. */
public final class SplashActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable openAccount;
    private boolean transitioned;

    private int dp(float amount) {
        return (int) (getResources().getDisplayMetrics().density * amount + 0.5f);
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        FrameLayout screen = new FrameLayout(this);
        screen.setBackgroundColor(Color.BLACK);
        LinearLayout center = new LinearLayout(this);
        center.setGravity(Gravity.CENTER);
        center.setOrientation(LinearLayout.VERTICAL);
        center.setPadding(dp(20), dp(12), dp(20), dp(12));
        FrameLayout.LayoutParams centerParams = new FrameLayout.LayoutParams(
            -1, -2, Gravity.CENTER);
        screen.addView(center, centerParams);

        ImageView brand = new ImageView(this);
        brand.setContentDescription("Bootanimation GAMES STUDIOS");
        brand.setScaleType(ImageView.ScaleType.FIT_CENTER);
        int widthDp = Math.max(220, Math.min(340,
            (int)(getResources().getDisplayMetrics().widthPixels /
                getResources().getDisplayMetrics().density) - 38));
        LinearLayout.LayoutParams imageParams = new LinearLayout.LayoutParams(
            dp(widthDp), dp(260));
        center.addView(brand, imageParams);
        try (InputStream input = getAssets().open("studio.jpg")) {
            Bitmap bitmap = BitmapFactory.decodeStream(input);
            if (bitmap != null) brand.setImageBitmap(bitmap);
        } catch (Exception error) {
            android.util.Log.w("NapoliCarteStartup", "Studio image unavailable", error);
        }
        TextView byline = new TextView(this);
        byline.setText("NAPOLI CARTE 3D");
        byline.setTextSize(17);
        byline.setLetterSpacing(.16f);
        byline.setTextColor(0xfff6d796);
        byline.setGravity(Gravity.CENTER);
        byline.setPadding(dp(4), dp(16), dp(4), dp(8));
        center.addView(byline, new LinearLayout.LayoutParams(-1,-2));

        TextView tagline = new TextView(this);
        tagline.setText("Il tavolo di tutti");
        tagline.setTextColor(0xffb5b5b5);
        tagline.setGravity(Gravity.CENTER);
        tagline.setTextSize(13);
        center.addView(tagline, new LinearLayout.LayoutParams(-1,-2));
        setContentView(screen);

        brand.setAlpha(0f);
        brand.setScaleX(.79f);
        brand.setScaleY(.79f);
        brand.animate().alpha(1f).scaleX(1f).scaleY(1f)
            .setDuration(1900).start();
        byline.setAlpha(0f);
        byline.animate().alpha(1f).setStartDelay(700).setDuration(900).start();
        tagline.setAlpha(0f);
        tagline.animate().alpha(1f).setStartDelay(1250).setDuration(900).start();

        openAccount = () -> {
            if (transitioned || isFinishing() || isDestroyed()) return;
            transitioned = true;
            startActivity(new Intent(SplashActivity.this, AccountActivity.class));
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
            finish();
        };
        handler.postDelayed(openAccount, 3900);
    }
    @Override protected void onDestroy() {
        if (openAccount != null) handler.removeCallbacks(openAccount);
        super.onDestroy();
    }
}
