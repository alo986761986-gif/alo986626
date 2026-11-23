package it.napolicarte.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.graphics.Color;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private WebView web;
    private static final String GAME_ASSET = "file:///android_asset/index.html";

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                             WindowManager.LayoutParams.FLAG_FULLSCREEN);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(3, 25, 20));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true); // Required for the packaged, local HTML asset only.
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, String address) {
                // Never allow page navigation to untrusted or arbitrary external pages.
                return !address.startsWith(GAME_ASSET);
            }
            @Override public void onReceivedError(WebView view, int code, String description, String failingUrl) {
                if (GAME_ASSET.equals(failingUrl)) new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Errore apertura")
                    .setMessage("Impossibile aprire il gioco salvato sul dispositivo.")
                    .setPositiveButton("RIPROVA",(d,w)->web.loadUrl(GAME_ASSET))
                    .setNegativeButton("ESCI",(d,w)->finish()).show();
            }
        });
        setContentView(web);
        web.loadUrl(GAME_ASSET);
    }
    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else new AlertDialog.Builder(this)
            .setTitle("Uscire da Napoli Carte 3D?")
            .setPositiveButton("ESCI",(d,w)->finish())
            .setNegativeButton("CONTINUA",null).show();
    }
    @Override public void onPause(){ if(web!=null)web.onPause(); super.onPause(); }
    @Override public void onResume(){ super.onResume(); if(web!=null)web.onResume(); }
    @Override protected void onDestroy(){
        if(web!=null){web.loadUrl("about:blank");web.destroy();web=null;}
        super.onDestroy();
    }
}
