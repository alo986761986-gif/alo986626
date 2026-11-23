package it.napolicarte.game;

import android.app.Activity;
import android.Manifest;
import android.os.Build;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Color;
import android.provider.MediaStore;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.FileProvider;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;

public final class MainActivity extends Activity {
    private static final int PHOTO_REQUEST=2215;
    private static final String BASE_URL="https://appassets.androidplatform.net/";
    private WebView web;
    private ValueCallback<Uri[]> pendingFiles;
    private Uri cameraUri;
    private File cameraFile;
    private static final int MIC_PERMISSION_REQUEST=2307;
    private PermissionRequest pendingMicRequest;
    private String loadGame() throws Exception {
        try(InputStream in=getAssets().open("index.html")){
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            byte[] buf=new byte[16384];int n;
            while((n=in.read(buf))!=-1)out.write(buf,0,n);
            return out.toString("UTF-8");
        }
    }
    private void openGame(){
        try{web.loadDataWithBaseURL(BASE_URL,loadGame(),"text/html","UTF-8",BASE_URL);}
        catch(Exception e){new AlertDialog.Builder(this).setTitle("Errore gioco")
            .setMessage(e.getMessage()).setPositiveButton("RIPROVA",(d,w)->openGame())
            .setNegativeButton("ESCI",(d,w)->finish()).show();}
    }
    private void clearPending(){
        if(pendingFiles!=null){pendingFiles.onReceiveValue(null);pendingFiles=null;}
    }
    private boolean openPhotoChooser(ValueCallback<Uri[]> callback,WebChromeClient.FileChooserParams params){
        clearPending();pendingFiles=callback;cameraUri=null;cameraFile=null;
        try{
            Intent gallery=new Intent(Intent.ACTION_GET_CONTENT);
            gallery.setType("image/*");
            gallery.addCategory(Intent.CATEGORY_OPENABLE);
            gallery.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            boolean available=camera.resolveActivity(getPackageManager())!=null;
            if(available){
                File dir=new File(getCacheDir(),"profile-photos");
                if(!dir.exists()&&!dir.mkdirs())available=false;
                if(available){
                    cameraFile=File.createTempFile("napoli-profile-",".jpg",dir);
                    cameraUri=FileProvider.getUriForFile(this,getPackageName()+".fileprovider",cameraFile);
                    camera.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);
                    camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    camera.setClipData(android.content.ClipData.newRawUri("Foto profilo",cameraUri));
                }
            }
            Intent launch;
            if(params!=null&&params.isCaptureEnabled()&&available){launch=camera;}
            else{launch=Intent.createChooser(gallery,"Foto profilo: galleria o fotocamera");
                 if(available)launch.putExtra(Intent.EXTRA_INITIAL_INTENTS,new Intent[]{camera});}
            startActivityForResult(launch,PHOTO_REQUEST);
            return true;
        }catch(Exception e){
            clearPending();new AlertDialog.Builder(this).setTitle("Foto profilo")
            .setMessage("Impossibile aprire galleria o fotocamera")
            .setPositiveButton("OK",null).show();return false;
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=PHOTO_REQUEST||pendingFiles==null)return;
        Uri uri=null;
        if(resultCode==RESULT_OK){
            if(data!=null&&data.getData()!=null)uri=data.getData();
            else if(data!=null&&data.getClipData()!=null&&data.getClipData().getItemCount()>0)
                uri=data.getClipData().getItemAt(0).getUri();
            else if(cameraUri!=null&&cameraFile!=null&&cameraFile.exists()&&cameraFile.length()>0)uri=cameraUri;
        }
        ValueCallback<Uri[]> cb=pendingFiles;pendingFiles=null;
        cb.onReceiveValue(uri==null?null:new Uri[]{uri});
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
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url){
                return !url.startsWith(BASE_URL);
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                return openPhotoChooser(callback,params);
            }
            @Override public void onPermissionRequest(final PermissionRequest request){
                runOnUiThread(()->{
                    if(request==null)return;
                    Uri origin=request.getOrigin();
                    if(origin==null||!"https".equals(origin.getScheme())||
                       !"appassets.androidplatform.net".equals(origin.getHost())){request.deny();return;}
                    String[] asked=request.getResources();
                    if(asked==null||asked.length!=1||
                       !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(asked[0])){request.deny();return;}
                    if(Build.VERSION.SDK_INT>=23&&checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
                        if(pendingMicRequest!=null)pendingMicRequest.deny();
                        pendingMicRequest=request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC_PERMISSION_REQUEST);
                    }else request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                });
            }
            @Override public void onPermissionRequestCanceled(final PermissionRequest request){
                runOnUiThread(()->{if(pendingMicRequest==request)pendingMicRequest=null;});
            }
        });
        setContentView(web);
        openGame();
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
        super.onRequestPermissionsResult(code,permissions,results);
        if(code!=MIC_PERMISSION_REQUEST)return;
        PermissionRequest r=pendingMicRequest;pendingMicRequest=null;
        if(r==null)return;
        if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)
            r.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        else r.deny();
    }
    @Override public void onBackPressed(){
        if(web!=null)web.evaluateJavascript("if(!(window.NC23_CLOSE_CHAT&&NC23_CLOSE_CHAT())&&!(window.NC22_CLOSE_PROFILE&&NC22_CLOSE_PROFILE())&&typeof lobby==='function')lobby()",null);
        else finish();
    }
    @Override public void onPause(){if(web!=null){web.evaluateJavascript("window.NC23_DISABLE_VOICE&&NC23_DISABLE_VOICE()",null);web.onPause();}super.onPause();}
    @Override public void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){clearPending();if(pendingMicRequest!=null){pendingMicRequest.deny();pendingMicRequest=null;}if(web!=null){web.loadUrl("about:blank");web.destroy();web=null;}super.onDestroy();}
}
