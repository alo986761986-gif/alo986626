package com.trishboll.arena;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;
import java.io.InputStream;

/** Native offline intro for Games Studios, fully compatible with Android 5+. */
public final class StudioSplashView extends View {
    public interface Finished { void onFinished(); }
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Finished finished;
    private final Bitmap emblem;
    private long started = SystemClock.uptimeMillis();
    private boolean done;
    private static final long DURATION = 3700L;
    private static final int BG = Color.rgb(2, 9, 24);
    public StudioSplashView(Context context, Finished onFinished) {
        super(context);
        finished = onFinished;
        Bitmap logo = null;
        try {
            InputStream stream = context.getAssets().open("games_studios_logo.png");
            logo = BitmapFactory.decodeStream(stream);
            stream.close();
        } catch (Throwable ignored) { /* Vector-styled fallback keeps startup safe. */ }
        emblem = logo;
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
    }
    private float smooth(float t) {
        t = Math.max(0f, Math.min(1f, t));
        return t * t * (3f - 2f*t);
    }
    private void finish() {
        if (done) return;
        done = true;
        if (finished != null) post(new Runnable() { @Override public void run() { finished.onFinished(); } });
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (done) return;
        float w = Math.max(1f, getWidth()), h = Math.max(1f, getHeight());
        float t = (SystemClock.uptimeMillis() - started) / (float) DURATION;
        canvas.drawColor(BG);
        float fadeIn = smooth(t / .23f);
        float fadeOut = smooth((1f - t) / .18f);
        float alpha = fadeIn * fadeOut;
        float cx = w / 2f, cy = h / 2f - Math.min(w,h) * .04f;
        float size = Math.min(w * .32f, h * .68f) * (0.91f + 0.075f*smooth(t/.43f));

        paint.reset(); paint.setAntiAlias(true);
        for (int i=4; i>=1; i--) {
            paint.setColor(Color.argb((int)(alpha * 7f), 0, 151, 255));
            paint.setStyle(Paint.Style.FILL);
            canvas.drawCircle(cx,cy,size * (.45f + .18f*i),paint);
        }
        if (emblem != null) {
            paint.reset();paint.setAntiAlias(true);paint.setFilterBitmap(true);
            paint.setAlpha(Math.max(0, Math.min(255, Math.round(alpha*255))));
            canvas.drawBitmap(emblem, null,
                new RectF(cx-size/2f,cy-size/2f,cx+size/2f,cy+size/2f),paint);
        } else {
            paint.reset(); paint.setAntiAlias(true);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(size * .025f);
            paint.setColor(Color.argb((int)(alpha*220),23,207,255));
            canvas.drawRoundRect(new RectF(cx-size/2,cy-size/2,cx+size/2,cy+size/2),size*.12f,size*.12f,paint);
            paint.setStyle(Paint.Style.FILL);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTypeface(Typeface.create("sans-serif-black",Typeface.BOLD));
            paint.setColor(Color.argb((int)(alpha*255),229,246,255));
            paint.setTextSize(size*.21f);canvas.drawText("GAMES",cx,cy+size*.08f,paint);
            paint.setTextSize(size*.083f);canvas.drawText("STUDIOS",cx,cy+size*.21f,paint);
        }
        // Original-style cyan scan beam sweeps across the badge.
        if (t>.29f && t<.65f) {
            float u=(t-.29f)/.36f;
            float sx=cx-size*.78f+u*size*1.56f;
            paint.reset();paint.setAntiAlias(true);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(3f,size*.012f));
            paint.setColor(Color.argb((int)(alpha*110f),65,226,255));
            canvas.drawLine(sx-size*.12f,cy-size*.51f,sx+size*.12f,cy+size*.51f,paint);
        }
        if (t>.49f) {
            float a=alpha*smooth((t-.49f)/.15f);
            paint.reset();paint.setAntiAlias(true);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTypeface(Typeface.create("sans-serif",Typeface.BOLD_ITALIC));
            paint.setTextSize(Math.min(36f,h*.065f));
            paint.setColor(Color.argb((int)(a*235),215,247,255));
            canvas.drawText("P R E S E N T A",cx,cy+size*.71f,paint);
        }
        paint.reset();paint.setAntiAlias(true);
        paint.setStrokeWidth(2.5f);paint.setColor(Color.argb((int)(alpha*145),0,184,255));
        canvas.drawLine(cx-size*.32f,cy+size*.86f,cx+size*.32f,cy+size*.86f,paint);
        if (t>=1f) finish();
        else postInvalidateDelayed(33);
    }
    @Override public boolean onTouchEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_UP) { finish(); return true; }
        return true;
    }
    public void stop() { done = true; }
}
