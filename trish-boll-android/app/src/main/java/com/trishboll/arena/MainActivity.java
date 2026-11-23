package com.trishboll.arena;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String TAG = "TrishBollAndroid";
    private WebView webView;
    private boolean destroyed = false;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN);
        showNativeScreen("TRISH BOLL", "Caricamento del gioco...");
        // Show native content first. Never let WebView startup be the first UI operation.
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override public void run() { if (!destroyed) startGameSafely(); }
        });
    }

    private void showNativeScreen(String title, String description) {
        TextView message = new TextView(this);
        message.setGravity(Gravity.CENTER);
        message.setTextSize(20);
        message.setTextColor(0xffffffff);
        message.setBackgroundColor(0xff0a1126);
        message.setPadding(32, 32, 32, 32);
        message.setText(title + "\n\n" + description);
        setContentView(message);
    }

    private void startGameSafely() {
        try {
            WebView view = new WebView(this);
            webView = view;
            WebSettings settings = view.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setSupportZoom(false);
            if (Build.VERSION.SDK_INT <= 23) {
                view.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            }
            view.setWebViewClient(new WebViewClient());
            view.setWebChromeClient(new WebChromeClient());
            view.setBackgroundColor(0xff0a1126);
            setContentView(view);
            view.loadUrl("file:///android_asset/index.html");
        } catch (Throwable error) {
            Log.e(TAG, "WebView failed", error);
            showNativeScreen("TRISH BOLL - ERRORE DI AVVIO",
                "Il motore Android WebView non e disponibile.\n" +
                "Aggiorna Android System WebView e Google Chrome dal Play Store.\n\n" +
                error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage()));
        }
    }

    @Override public void onBackPressed() {
        if (webView != null) {
            try { webView.loadUrl("javascript:window.trishBack&&window.trishBack()"); return; }
            catch (Throwable ignored) { }
        }
        super.onBackPressed();
    }

    @Override protected void onDestroy() {
        destroyed = true;
        if (webView != null) {
            try { webView.stopLoading(); webView.destroy(); }
            catch (Throwable ignored) { }
            webView = null;
        }
        super.onDestroy();
    }
}
