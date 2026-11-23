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
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public final class MainActivity extends Activity {
    private WebView web;
    private static final String BASE_URL = "https://appassets.androidplatform.net/";

    private String loadGame() throws Exception {
        try(InputStream in=getAssets().open("index.html")){
            ByteArrayOutputStream data=new ByteArrayOutputStream();
            byte[] buf=new byte[16384]; int n;
            while((n=in.read(buf))!=-1) data.write(buf,0,n);
            return data.toString("UTF-8");
        }
    }
    private void openGame(){
        try{
            // HTTPS origin for embedded content: secure CORS requests can reach the global server.
            web.loadDataWithBaseURL(BASE_URL,loadGame(),"text/html","UTF-8",BASE_URL);
        }catch(Exception ex){
            new AlertDialog.Builder(this).setTitle("Errore apertura gioco")
                .setMessage("Non riesco a leggere i file del gioco: "+ex.getMessage())
                .setPositiveButton("RIPROVA",(d,w)->openGame())
                .setNegativeButton("ESCI",(d,w)->finish()).show();
        }
    }
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);
        web=new WebView(this);
        web.setBackgroundColor(Color.rgb(4,21,17));
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,String url){
                // Block all main-frame navigation except the bundled game's virtual origin.
                return !url.startsWith(BASE_URL);
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        setContentView(web);
        openGame();
    }
    @Override public void onBackPressed(){
        if(web!=null)web.evaluateJavascript("if(typeof lobby==='function')lobby()",null);
        else finish();
    }
    @Override public void onPause(){if(web!=null)web.onPause();super.onPause();}
    @Override public void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null){web.loadUrl("about:blank");web.destroy();web=null;}super.onDestroy();}
}
