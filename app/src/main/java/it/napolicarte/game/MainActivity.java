package it.napolicarte.game;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
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
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceRequest;
import androidx.webkit.WebViewAssetLoader;

import androidx.core.content.FileProvider;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;

public final class MainActivity extends Activity {
    private static final int PHOTO_PICK_REQUEST = 2215;
    private static final String BASE_URL = "https://appassets.androidplatform.net/assets/";
    private WebView web;
    private PlayBillingBridge playBilling;
    private ValueCallback<Uri[]> pendingFiles;
    private Uri cameraUri;
    private File cameraFile;
    private static final int MIC_PERMISSION_REQUEST=2307;
    private static final int NOTIFICATION_PERMISSION_REQUEST=2308;
    private PermissionRequest pendingMicRequest;
    private Object modernBackCallback;
    private boolean exitPromptShowing=false;

    // Restricted native HTTPS transport for the three Chiodo API operations only.
    private final java.util.concurrent.ExecutorService chiodoExecutor = java.util.concurrent.Executors.newFixedThreadPool(3);
    private android.speech.tts.TextToSpeech chiodoVoice;
    private boolean chiodoVoiceReady=false;

    private String voiceChoice="female";
    private String exactVoice="";
    private void voiceEvent(String message){
        if(web!=null)web.evaluateJavascript("window.NC51_VOICE_STATUS&&window.NC51_VOICE_STATUS("+org.json.JSONObject.quote(message)+")",null);
    }
    private java.util.List<android.speech.tts.Voice> italianVoices(){
        java.util.List<android.speech.tts.Voice> out=new java.util.ArrayList<>();
        if(!chiodoVoiceReady||chiodoVoice==null)return out;
        try{
            java.util.Set<android.speech.tts.Voice> installed=chiodoVoice.getVoices();
            if(installed!=null)for(android.speech.tts.Voice voice:installed){
                if(voice==null||voice.getLocale()==null)continue;
                java.util.Set<String> features=voice.getFeatures();
                if("it".equals(voice.getLocale().getLanguage())&&
                   (features==null||!features.contains("notInstalled")))out.add(voice);
            }
            out.sort((a,b)->{int q=Integer.compare(b.getQuality(),a.getQuality());
                return q!=0?q:String.valueOf(a.getName()).compareTo(String.valueOf(b.getName()));});
        }catch(RuntimeException ex){
            android.util.Log.w("NapoliCarteStartup","Optional Android TTS voices unavailable",ex);
            out.clear();
        }
        return out;
    }
    private void playGameVoice(String text,String choice,boolean preview){
        if(!chiodoVoiceReady||chiodoVoice==null){voiceEvent("Sintesi vocale italiana non disponibile sul dispositivo.");return;}
        java.util.List<android.speech.tts.Voice> voices=italianVoices();
        android.speech.tts.Voice selected=null;
        for(android.speech.tts.Voice v:voices)if(v.getName().equals(exactVoice)){selected=v;break;}
        if(selected==null)for(android.speech.tts.Voice v:voices){
            String name=v.getName().toLowerCase(java.util.Locale.ROOT);
            boolean f=name.contains("female")||name.contains("feminine")||name.contains("alice")||name.contains("elsa")||name.contains("isabella")||name.contains("it-it-x-itb")||name.contains("it-it-x-itd");
            boolean m=!f&&(name.contains("male")||name.contains("masculine")||name.contains("diego")||name.contains("luca")||name.contains("it-it-x-ita")||name.contains("it-it-x-itc"));
            if(("female".equals(choice)&&f)||("male".equals(choice)&&m)){selected=v;break;}
        }
        boolean matched=selected!=null;
        if(selected==null&&!voices.isEmpty())selected=voices.get(0);
        if(selected!=null&&chiodoVoice.setVoice(selected)!=android.speech.tts.TextToSpeech.SUCCESS){matched=false;chiodoVoice.setLanguage(java.util.Locale.ITALY);}
        else if(selected==null)chiodoVoice.setLanguage(java.util.Locale.ITALY);
        chiodoVoice.setPitch("male".equals(choice)?.91f:1.01f);
        chiodoVoice.setSpeechRate(.91f);
        int result=chiodoVoice.speak(text,preview?android.speech.tts.TextToSpeech.QUEUE_FLUSH:android.speech.tts.TextToSpeech.QUEUE_ADD,null,"game-"+System.nanoTime());
        if(preview)voiceEvent(result!=android.speech.tts.TextToSpeech.SUCCESS?"Riproduzione non riuscita. Controlla il motore vocale Android.":matched?"Voce selezionata: "+selected.getName():"Voce italiana di riserva: genere non identificato. Prova le voci disponibili.");
    }
    private final class GameVoiceBridge {
        @android.webkit.JavascriptInterface public void configure(String gender,String name){
            if(!"male".equals(gender)&&!"female".equals(gender))return;
            if(name==null||name.length()>200)return;
            runOnUiThread(()->{voiceChoice=gender;exactVoice=name;});
        }
        @android.webkit.JavascriptInterface public void preview(){runOnUiThread(()->playGameVoice("Ciao, benvenuto a Napoli Carte. Sola! Chiodo! Buona partita.",voiceChoice,true));}
        @android.webkit.JavascriptInterface public void list(){runOnUiThread(()->{
            org.json.JSONArray a=new org.json.JSONArray();
            for(android.speech.tts.Voice v:italianVoices())a.put(v.getName());
            if(web!=null)web.evaluateJavascript("window.NC51_VOICE_LIST&&window.NC51_VOICE_LIST("+a.toString()+")",null);
        });}
    }

    private final class ChiodoTransport {
        @android.webkit.JavascriptInterface public void speak(String text) {
            if(text==null||!text.matches("((SOLA|CHIODO|CONTESTO SOLA|CONTESTO CHIODO)(! ?(SOLA|CHIODO))?!|CAMBIO PALO: (DENARI|COPPE|SPADE|BASTONI)!|PASSO!|CHIUSO!)"))return;
            runOnUiThread(()->playGameVoice(text,voiceChoice,false));
        }
        @android.webkit.JavascriptInterface public void request(String requestId,String operation,String body,String token) {
            if(requestId==null||!requestId.matches("[0-9]{1,12}"))return;
            if(!"join".equals(operation)&&!"state".equals(operation)&&!"move".equals(operation)&&!"realtime".equals(operation)&&!"leave".equals(operation)&&!"profile".equals(operation))return;
            if(body!=null&&body.length()>("profile".equals(operation)?104000:8192))return;
            if(token!=null&&!token.isEmpty()&&!token.matches("[a-f0-9]{48}"))return;
            chiodoExecutor.execute(()->{
                org.json.JSONObject result=new org.json.JSONObject();
                javax.net.ssl.HttpsURLConnection conn=null;
                try {
                    conn=(javax.net.ssl.HttpsURLConnection)new java.net.URL("https://napoli-chiodo-121.onrender.com/chiodo/"+operation).openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(30000);conn.setReadTimeout(75000);
                    conn.setRequestProperty("Accept","application/json");
                    if(token!=null&&!token.isEmpty())conn.setRequestProperty("Authorization","Bearer "+token);
                    if(!"state".equals(operation)){
                        conn.setRequestMethod("POST");conn.setDoOutput(true);
                        conn.setRequestProperty("Content-Type","application/json; charset=UTF-8");
                        try(java.io.OutputStream out=conn.getOutputStream()){out.write((body==null?"{}":body).getBytes("UTF-8"));}
                    }
                    int status=conn.getResponseCode();
                    InputStream source=status>=200&&status<300?conn.getInputStream():conn.getErrorStream();
                    ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                    if(source!=null)try(InputStream in=source){byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1){if(bytes.size()+n>524288)throw new java.io.IOException("Risposta troppo grande");bytes.write(buf,0,n);}}
                    result.put("status",status);
                    result.put("body",bytes.toString("UTF-8"));
                }catch(Exception ex){try{result.put("status",0);result.put("error",ex.getClass().getSimpleName());}catch(Exception ignored){}}
                finally{if(conn!=null)conn.disconnect();}
                final String payload=org.json.JSONObject.quote(result.toString());
                runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.NC_CHIODO_RESPONSE&&window.NC_CHIODO_RESPONSE("+requestId+","+payload+")",null);});
            });
        }
    }

    // Centralize device ownership, retry and secure logout in PushDeviceManager.
    public static void syncPushToken(android.content.Context context, String overrideToken) {
        PushDeviceManager.register(context, overrideToken);
    }

    private String pendingPushDestination;
    private String pendingPushSender;
    private String pendingPushSenderName;
    private void pushIntent(Intent intent){
        if(intent==null)return;
        String destination=intent.getStringExtra(GameNotificationService.EXTRA_DESTINATION);
        if(!GameNotificationService.FRIENDS.equals(destination)&&
           !GameNotificationService.CHAT.equals(destination)&&
           !GameNotificationService.BONUS.equals(destination))return;
        pendingPushDestination=destination;
        pendingPushSender=intent.getStringExtra("notification_sender_uid");
        pendingPushSenderName=intent.getStringExtra("notification_sender_name");
        intent.removeExtra(GameNotificationService.EXTRA_DESTINATION);
        intent.removeExtra("notification_sender_uid");
        intent.removeExtra("notification_sender_name");
        deliverPushDestination();
    }
    private void deliverPushDestination(){
        if(web==null||pendingPushDestination==null)return;
        String destination=pendingPushDestination;
        String sender=pendingPushSender==null?"":pendingPushSender;
        String name=pendingPushSenderName==null?"":pendingPushSenderName;
        web.evaluateJavascript("Boolean(window.NC82_OPEN_NOTIFICATION&&window.NC82_OPEN_NOTIFICATION("+
            org.json.JSONObject.quote(destination)+","+org.json.JSONObject.quote(sender)+","+org.json.JSONObject.quote(name)+"))",value->{
                if("true".equals(value)){pendingPushDestination=null;pendingPushSender=null;pendingPushSenderName=null;}
            });
    }
    @Override protected void onNewIntent(Intent intent){
        super.onNewIntent(intent);
        setIntent(intent);
        pushIntent(intent);
    }

    // Dedicated authenticated transport: Firebase credentials never enter the WebView.
    private final class SocialBridge {
        @android.webkit.JavascriptInterface public void request(String id,String operation,String json){
            if(id==null||!id.matches("[0-9]{1,10}")||operation==null||!operation.matches("(me|profile|search|friends|request|accept|remove|block|heartbeat|stats|progress|daily|claim|chatThreads|chatMessages|chatAudio|chatSend|chatRead|report|pSummary|pPhoto|pPhotoSave|pMissions|pMissionClaim|pBoostClaim|pNotifications|pNotifRead|pAchievements|pPerformance|pRanking|marketState|marketBuy|marketEquip|b92Rooms|b92State|b92Join|b92Start|b92Leave|inviteList|invitePreferences|inviteCandidates|inviteSend|invitePublish|inviteBrowse|inviteRespond|inviteEnter|inviteWatch)"))return;
            if(json==null||json.length()>("chatSend".equals(operation)?375000:"pPhotoSave".equals(operation)?70000:16000))return;
            com.google.firebase.auth.FirebaseUser user=rewardUser();
            if(user==null){socialCallback(id,401,"{\"error\":\"Accedi con email o Google\"}");return;}
            user.getIdToken(false).addOnCompleteListener(task->{
                if(!task.isSuccessful()||task.getResult()==null||task.getResult().getToken()==null){socialCallback(id,401,"{\"error\":\"Sessione Firebase non valida\"}");return;}
                final String access=task.getResult().getToken();
                chiodoExecutor.execute(()->{
                    javax.net.ssl.HttpsURLConnection c=null;int status=0;String result="";
                    try{
                        org.json.JSONObject body=new org.json.JSONObject(json);
                        boolean get=("me".equals(operation)||"search".equals(operation)||"friends".equals(operation)||"stats".equals(operation)||"daily".equals(operation)) ||
                            ("marketState".equals(operation)||"b92Rooms".equals(operation)||"b92State".equals(operation))||("progress".equals(operation)&&body.optBoolean("read",false))||"chatThreads".equals(operation)||"chatMessages".equals(operation)||"chatAudio".equals(operation)||"pSummary".equals(operation)||"pPhoto".equals(operation)||"pMissions".equals(operation)||"pNotifications".equals(operation)||"pAchievements".equals(operation)||"pPerformance".equals(operation)||"pRanking".equals(operation)||"inviteList".equals(operation)||"inviteCandidates".equals(operation)||"inviteBrowse".equals(operation)||("invitePreferences".equals(operation)&&body.optBoolean("read",false))||"inviteWatch".equals(operation);
                        String route="daily".equals(operation)?"daily/status":"claim".equals(operation)?"daily/claim":"chatThreads".equals(operation)?"chat/threads":"chatMessages".equals(operation)?"chat/messages":"chatAudio".equals(operation)?"chat/audio":"chatSend".equals(operation)?"chat/send":"chatRead".equals(operation)?"chat/read":"report".equals(operation)?"feedback/report":"pSummary".equals(operation)?"profile79/summary":"pPhoto".equals(operation)?"profile79/photo":"pPhotoSave".equals(operation)?"profile79/photo/save":"pMissions".equals(operation)?"profile79/missions":"pMissionClaim".equals(operation)?"profile79/mission/claim":"pBoostClaim".equals(operation)?"profile79/boost/claim":"pNotifications".equals(operation)?"profile79/notifications":"pNotifRead".equals(operation)?"profile79/notifications/read":"pAchievements".equals(operation)?"profile79/achievements":"pPerformance".equals(operation)?"profile79/performance":"pRanking".equals(operation)?"profile79/ranking":"marketState".equals(operation)?"market/state":"marketBuy".equals(operation)?"market/buy":"marketEquip".equals(operation)?"market/equip":"b92Rooms".equals(operation)?"banco92/rooms":"b92State".equals(operation)?"banco92/state":"b92Join".equals(operation)?"banco92/join":"b92Start".equals(operation)?"banco92/start":"b92Leave".equals(operation)?"banco92/leave":
                            "inviteList".equals(operation)?"invites94/list":"invitePreferences".equals(operation)?"invites94/preferences":
                            "inviteCandidates".equals(operation)?"invites94/friends-of-friends":
                            "inviteSend".equals(operation)?"invites94/send":"invitePublish".equals(operation)?"invites94/publish":
                            "inviteBrowse".equals(operation)?"invites94/browse":"inviteRespond".equals(operation)?"invites94/respond":
                            "inviteEnter".equals(operation)?"invites94/enter":"inviteWatch".equals(operation)?"invites94/watch":
                            "social/"+operation;
                        String url="https://napoli-chiodo-121.onrender.com/"+route;
                        if("search".equals(operation))url+="?q="+java.net.URLEncoder.encode(body.optString("q",""),"UTF-8");
                        if("b92State".equals(operation))url+="?roomId="+java.net.URLEncoder.encode(body.optString("roomId",""),"UTF-8");
                        if("chatMessages".equals(operation)){
                            url+="?peer="+java.net.URLEncoder.encode(body.optString("peer",""),"UTF-8");
                            if(body.has("after"))url+="&after="+java.net.URLEncoder.encode(body.optString("after",""),"UTF-8");
                            if(body.has("before"))url+="&before="+java.net.URLEncoder.encode(body.optString("before",""),"UTF-8");
                        }
                        if("chatAudio".equals(operation))url+="?id="+java.net.URLEncoder.encode(body.optString("id",""),"UTF-8");
                        if("inviteWatch".equals(operation))url+="?id="+java.net.URLEncoder.encode(body.optString("id",""),"UTF-8");
                        c=(javax.net.ssl.HttpsURLConnection)new java.net.URL(url).openConnection();
                        c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(22000);
                        c.setRequestProperty("X-Firebase-Token",access);
                        c.setRequestProperty("Accept","application/json");
                        if(!get){c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");
                            try(java.io.OutputStream os=c.getOutputStream()){os.write(json.getBytes("UTF-8"));}}
                        status=c.getResponseCode();
                        java.io.InputStream stream=status>=200&&status<300?c.getInputStream():c.getErrorStream();
                        if(stream!=null)try(java.io.InputStream input=stream;java.io.ByteArrayOutputStream output=new java.io.ByteArrayOutputStream()){
                            byte[] chunk=new byte[2048];int n;while((n=input.read(chunk))!=-1){if(output.size()+n>(operation.startsWith("chat")?480000:"pPhoto".equals(operation)?140000:65536))throw new java.io.IOException("Risposta eccessiva");output.write(chunk,0,n);}
                            result=output.toString("UTF-8");
                        }
                    }catch(Exception ex){status=0;result="{\"error\":\"Connessione non disponibile\"}";}
                    finally{if(c!=null)c.disconnect();}
                    if("profile".equals(operation)&&status>=200&&status<300)runOnUiThread(()->syncPushToken(MainActivity.this,null));
                    socialCallback(id,status,result);
                });
            });
        }
    }
    private void socialCallback(String id,int status,String payload){
        final String response=org.json.JSONObject.quote(payload==null?"":payload);
        runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.NC_SOCIAL_RESPONSE&&window.NC_SOCIAL_RESPONSE("+id+","+status+","+response+")",null);});
    }

    // Profile settings bridge: Firebase credentials and Google login remain native.
    private final class ProfileBridge {
        private void callback(String name,String value){
            if(web!=null)web.evaluateJavascript("window."+name+"&&window."+name+"("+org.json.JSONObject.quote(value)+")",null);
        }
        @android.webkit.JavascriptInterface public void info(){
            runOnUiThread(()->{
                org.json.JSONObject data=new org.json.JSONObject();
                try{
                    com.google.firebase.auth.FirebaseUser user=rewardUser();
                    data.put("signedIn",user!=null);
                    if(user!=null){
                        data.put("displayName",user.getDisplayName()==null?"":user.getDisplayName());
                        data.put("email",user.getEmail()==null?"":user.getEmail());
                        data.put("verified",user.isEmailVerified());
                        org.json.JSONArray providers=new org.json.JSONArray();
                        for(com.google.firebase.auth.UserInfo info:user.getProviderData()){
                            if(info.getProviderId()!=null)providers.put(info.getProviderId());
                        }
                        data.put("providers",providers);
                    }
                }catch(Exception ignored){}
                callback("NC79_PROFILE_INFO",data.toString());
            });
        }
        @android.webkit.JavascriptInterface public void resetPassword(){
            runOnUiThread(()->{
                com.google.firebase.auth.FirebaseUser user=rewardUser();
                if(user==null||user.getEmail()==null||user.getEmail().isEmpty()){callback("NC79_PROFILE_ACTION","Accedi con email per recuperare la password.");return;}
                boolean emailProvider=false;
                for(com.google.firebase.auth.UserInfo info:user.getProviderData()){
                    if("password".equals(info.getProviderId()))emailProvider=true;
                }
                if(!emailProvider){callback("NC79_PROFILE_ACTION","Questo account usa Google: gestisci la password nel tuo account Google.");return;}
                try{com.google.firebase.auth.FirebaseAuth.getInstance().sendPasswordResetEmail(user.getEmail())
                    .addOnCompleteListener(task->callback("NC79_PROFILE_ACTION",task.isSuccessful()?"Email di recupero inviata.":"Invio email di recupero non riuscito."));}
                catch(Exception e){callback("NC79_PROFILE_ACTION","Recupero password non disponibile.");}
            });
        }
        @android.webkit.JavascriptInterface public void logout(){
            runOnUiThread(()->{
                PushDeviceManager.unlinkOnLogout(()->{
                    try{com.google.firebase.auth.FirebaseAuth.getInstance().signOut();}catch(Exception ignored){}
                    try{
                        com.google.android.gms.auth.api.signin.GoogleSignInOptions options=
                            new com.google.android.gms.auth.api.signin.GoogleSignInOptions.Builder(
                              com.google.android.gms.auth.api.signin.GoogleSignInOptions.DEFAULT_SIGN_IN)
                              .requestEmail().requestIdToken(getString(R.string.default_web_client_id)).build();
                        com.google.android.gms.auth.api.signin.GoogleSignIn.getClient(MainActivity.this,options).signOut();
                    }catch(Exception ignored){}
                    startActivity(new Intent(MainActivity.this,AccountActivity.class));
                    finish();
                });
            });
        }
    }

    private boolean adBusy=false, adsInitialized=false;
    private final String adUnit="ca-app-pub-3210480040948197/3818748399";
    private com.google.android.ump.ConsentInformation consent;
    private final android.os.Handler rewardHandler=new android.os.Handler(android.os.Looper.getMainLooper());
    private boolean rewardSyncInFlight=false;
    private boolean rewardForeground=false;
    private final Runnable rewardPoll=new Runnable(){public void run(){
        if(!rewardForeground||isFinishing()||isDestroyed())return;
        syncVerifiedRewards();
        rewardHandler.postDelayed(this,15000);
    }};
    private com.google.firebase.auth.FirebaseUser rewardUser(){
        try{return com.google.firebase.auth.FirebaseAuth.getInstance().getCurrentUser();}catch(Exception e){return null;}
    }
    private String rewardScope(){com.google.firebase.auth.FirebaseUser u=rewardUser();return u==null?"guest":"uid:"+u.getUid();}
    private void adEvent(String status,String message){
        if(web!=null)web.evaluateJavascript("window.NC_AD_EVENT&&window.NC_AD_EVENT("+org.json.JSONObject.quote(status)+","+org.json.JSONObject.quote(message)+")",null);
    }
    private void syncVerifiedRewards(){
        if(web==null||isFinishing()||isDestroyed()||rewardSyncInFlight)return;
        final com.google.firebase.auth.FirebaseUser user=rewardUser();
        if(user==null)return;
        final String scope="uid:"+user.getUid();
        rewardSyncInFlight=true;
        user.getIdToken(false).addOnCompleteListener(task->{
            if(!task.isSuccessful()||task.getResult()==null||task.getResult().getToken()==null){
                rewardSyncInFlight=false;
                adEvent("pending","Accesso da verificare. I crediti confermati saranno sincronizzati appena possibile.");
                return;
            }
            final String token=task.getResult().getToken();
            if(isFinishing()||isDestroyed()||!scope.equals(rewardScope())){rewardSyncInFlight=false;return;}
            chiodoExecutor.execute(()->{
                org.json.JSONArray data=null;
                javax.net.ssl.HttpsURLConnection conn=null;
                try{
                    conn=(javax.net.ssl.HttpsURLConnection)new java.net.URL("https://napoli-chiodo-121.onrender.com/admob/rewards").openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(30000);conn.setReadTimeout(45000);
                    conn.setRequestProperty("Accept","application/json");
                    conn.setRequestProperty("Authorization","Bearer "+token);
                    if(conn.getResponseCode()!=200)throw new java.io.IOException("Rewards unavailable");
                    ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                    try(InputStream in=conn.getInputStream()){
                        byte[] buf=new byte[4096];int n;
                        while((n=in.read(buf))!=-1){if(bytes.size()+n>2097152)throw new java.io.IOException("Response too large");bytes.write(buf,0,n);}
                    }
                    data=new org.json.JSONObject(bytes.toString("UTF-8")).getJSONArray("rewards");
                }catch(Exception ignored){}finally{if(conn!=null)conn.disconnect();}
                final org.json.JSONArray rows=data;
                runOnUiThread(()->{
                    rewardSyncInFlight=false;
                    if(web==null||isDestroyed()||!scope.equals(rewardScope()))return;
                    if(rows==null)return;
                    web.evaluateJavascript("window.NC_AD_VERIFIED&&window.NC_AD_VERIFIED("+org.json.JSONObject.quote(scope)+","+rows.toString()+")",null);
                });
            });
        });
    }
    private final class PublicLinksBridge {
        private void open(boolean deletion){runOnUiThread(()->{
            // This bridge only opens fixed public pages from the trusted APK entry page.
            if(web==null||!(BASE_URL+"index.html").equals(web.getUrl()))return;
            if(deletion)PrivacyLinks.accountDeletion(MainActivity.this);
            else PrivacyLinks.privacyPolicy(MainActivity.this);
        });}
        @android.webkit.JavascriptInterface public void privacyPolicy(){open(false);}
        @android.webkit.JavascriptInterface public void accountDeletion(){open(true);}
    }
    private final class RewardBridge {
        @android.webkit.JavascriptInterface public String accountScope(){return rewardScope();}
        @android.webkit.JavascriptInterface public String displayName(){
            com.google.firebase.auth.FirebaseUser u=rewardUser();
            if(u==null||u.getDisplayName()==null)return "";
            String name=u.getDisplayName().trim();
            return name.length()>32?name.substring(0,32):name;
        }
        @android.webkit.JavascriptInterface public void show(){runOnUiThread(()->requestRewardAd());}
        @android.webkit.JavascriptInterface public void sync(){runOnUiThread(()->syncVerifiedRewards());}
        @android.webkit.JavascriptInterface public void privacy(){runOnUiThread(()->{
            if(adBusy)return;
            com.google.android.ump.UserMessagingPlatform.showPrivacyOptionsForm(MainActivity.this,error->{
                if(error!=null)adEvent("error","Impostazioni privacy non disponibili: "+error.getMessage());
                else adEvent("idle","Preferenze privacy aggiornate");
            });
        });}
    }
    private void requestRewardAd(){
        if(adBusy||isFinishing()||isDestroyed())return;
        if(rewardUser()==null){adEvent("error","Accedi con il tuo account per ottenere crediti pubblicitari verificati.");return;}
        adBusy=true;adEvent("loading","Verifica consenso e caricamento pubblicità…");
        consent=com.google.android.ump.UserMessagingPlatform.getConsentInformation(this);
        com.google.android.ump.ConsentRequestParameters params=new com.google.android.ump.ConsentRequestParameters.Builder().build();
        consent.requestConsentInfoUpdate(this,params,()->{
            com.google.android.ump.UserMessagingPlatform.loadAndShowConsentFormIfRequired(this,error->{
                if(consent.canRequestAds())initializeAndLoadReward();
                else {adBusy=false;adEvent("error","Consenso non disponibile. Riprova più tardi.");}
            });
        },error->{
            if(consent.canRequestAds())initializeAndLoadReward();
            else {adBusy=false;adEvent("error","Impossibile verificare il consenso. Riprova più tardi.");}
        });
    }
    private void initializeAndLoadReward(){
        if(isFinishing()||isDestroyed()){adBusy=false;return;}
        if(adsInitialized){loadReward();return;}
        com.google.android.gms.ads.MobileAds.initialize(this,status->runOnUiThread(()->{adsInitialized=true;loadReward();}));
    }
    private void loadReward(){
        if(isFinishing()||isDestroyed()){adBusy=false;return;}
        com.google.android.gms.ads.rewarded.RewardedAd.load(this,adUnit,new com.google.android.gms.ads.AdRequest.Builder().build(),
            new com.google.android.gms.ads.rewarded.RewardedAdLoadCallback(){
                @Override public void onAdFailedToLoad(com.google.android.gms.ads.LoadAdError error){
                    adBusy=false;adEvent("error","Annuncio non disponibile. Riprova più tardi. ("+error.getCode()+")");
                }
                @Override public void onAdLoaded(com.google.android.gms.ads.rewarded.RewardedAd ad){
                    if(isFinishing()||isDestroyed()){adBusy=false;return;}
                    final com.google.firebase.auth.FirebaseUser user=rewardUser();
                    if(user==null){adBusy=false;adEvent("error","Accedi prima di guardare la pubblicità.");return;}
                    ad.setServerSideVerificationOptions(new com.google.android.gms.ads.rewarded.ServerSideVerificationOptions.Builder().setUserId(user.getUid()).build());
                    final java.util.concurrent.atomic.AtomicBoolean earned=new java.util.concurrent.atomic.AtomicBoolean(false);
                    ad.setFullScreenContentCallback(new com.google.android.gms.ads.FullScreenContentCallback(){
                        @Override public void onAdFailedToShowFullScreenContent(com.google.android.gms.ads.AdError error){adBusy=false;adEvent("error","Impossibile visualizzare l'annuncio.");}
                        @Override public void onAdDismissedFullScreenContent(){adBusy=false;adEvent(earned.get()?"pending":"idle",earned.get()?"Annuncio completato. Attendo la conferma sicura di Google…":"Annuncio chiuso: nessun premio locale assegnato");syncVerifiedRewards();}
                    });
                    adEvent("showing","Pubblicità in corso");
                    ad.show(MainActivity.this,item->{
                        if(earned.compareAndSet(false,true)){
                            adEvent("pending","Ricompensa in verifica sul server. I crediti arriveranno dopo la conferma di Google.");
                            syncVerifiedRewards();
                        }
                    });
                }
            });
    }

    private String loadGame() throws Exception {
        try(InputStream in=getAssets().open("index.html")) {
            ByteArrayOutputStream data=new ByteArrayOutputStream();
            byte[] buf=new byte[16384]; int n;
            while((n=in.read(buf))!=-1) data.write(buf,0,n);
            return data.toString("UTF-8");
        }
    }
    private void openGame(){
        // A real HTTPS origin backed entirely by APK assets enables secure-context
        // WebRTC without a network connection or an opaque loadDataWithBaseURL origin.
        web.loadUrl(BASE_URL+"index.html");
    }
    private void discardPendingUpload(){
        if(pendingFiles!=null){pendingFiles.onReceiveValue(null);pendingFiles=null;}
    }
    private boolean choosePhoto(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params){
        discardPendingUpload();
        pendingFiles=callback;
        cameraUri=null;
        cameraFile=null;
        try {
            Intent gallery=new Intent(Intent.ACTION_GET_CONTENT);
            gallery.setType("image/*");
            gallery.addCategory(Intent.CATEGORY_OPENABLE);
            gallery.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            boolean cameraAvailable=camera.resolveActivity(getPackageManager())!=null;
            if(cameraAvailable){
                File folder=new File(getCacheDir(),"profile-photos");
                if(!folder.exists()&&!folder.mkdirs())cameraAvailable=false;
                if(cameraAvailable){
                    cameraFile=File.createTempFile("napoli-profile-",".jpg",folder);
                    cameraUri=FileProvider.getUriForFile(this,getPackageName()+".fileprovider",cameraFile);
                    camera.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);
                    camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    camera.setClipData(android.content.ClipData.newRawUri("Foto profilo",cameraUri));
                    // OEM camera apps need explicit temporary access to the FileProvider URI.
                    try{
                        int grants=Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                        for(android.content.pm.ResolveInfo info:getPackageManager().queryIntentActivities(camera,0)){
                            if(info.activityInfo!=null&&info.activityInfo.packageName!=null)
                                grantUriPermission(info.activityInfo.packageName,cameraUri,grants);
                        }
                    }catch(RuntimeException ex){
                        android.util.Log.w("NapoliCarteStartup","Camera URI permission compatibility",ex);
                    }
                }
            }
            boolean capture=params!=null&&params.isCaptureEnabled()&&cameraAvailable;
            Intent launch;
            if(capture){launch=camera;}
            else{
                launch=Intent.createChooser(gallery,"Foto profilo: Galleria o Fotocamera");
                if(cameraAvailable)launch.putExtra(Intent.EXTRA_INITIAL_INTENTS,new Intent[]{camera});
            }
            startActivityForResult(launch,PHOTO_PICK_REQUEST);
            return true;
        }catch(Exception ex){
            discardPendingUpload();
            new AlertDialog.Builder(this).setTitle("Foto profilo")
                .setMessage("Non posso aprire la galleria o la fotocamera. Verifica che sia installata un'app Foto.")
                .setPositiveButton("OK",null).show();
            return false;
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=PHOTO_PICK_REQUEST)return;
        if(pendingFiles==null)return;
        Uri result=null;
        if(resultCode==RESULT_OK){
            if(data!=null&&data.getData()!=null){result=data.getData();}
            else if(data!=null&&data.getClipData()!=null&&data.getClipData().getItemCount()>0){
                result=data.getClipData().getItemAt(0).getUri();
            }else if(cameraUri!=null&&cameraFile!=null&&cameraFile.exists()&&cameraFile.length()>0){
                result=cameraUri;
            }
        }
        ValueCallback<Uri[]> callback=pendingFiles;pendingFiles=null;
        callback.onReceiveValue(result==null?null:new Uri[]{result});
    }
    // Prefer the smoothest supported display mode up to 120 Hz, without changing resolution.
    private void requestHighRefreshRate(){
        if(Build.VERSION.SDK_INT<23)return;
        try{
            android.view.Display display=getWindowManager().getDefaultDisplay();
            android.view.Display.Mode current=display.getMode(),best=null;
            for(android.view.Display.Mode mode:display.getSupportedModes()){
                if(mode.getPhysicalWidth()!=current.getPhysicalWidth()||mode.getPhysicalHeight()!=current.getPhysicalHeight()||mode.getRefreshRate()>120.5f)continue;
                if(best==null||mode.getRefreshRate()>best.getRefreshRate())best=mode;
            }
            if(best!=null){
                android.view.WindowManager.LayoutParams p=getWindow().getAttributes();
                p.preferredDisplayModeId=best.getModeId();
                getWindow().setAttributes(p);
            }
        }catch(Exception ignored){}
    }
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        // Text-to-speech is optional: missing/broken speech engines must never crash the game.
        try {
            chiodoVoice=new android.speech.tts.TextToSpeech(this,status->{
                if(status==android.speech.tts.TextToSpeech.SUCCESS&&chiodoVoice!=null){
                    try {
                        int lang=chiodoVoice.setLanguage(java.util.Locale.ITALY);
                        chiodoVoiceReady=lang>=0;
                        chiodoVoice.setPitch(.92f);
                        chiodoVoice.setSpeechRate(.88f);
                    } catch(RuntimeException ignored){chiodoVoiceReady=false;}
                }
            });
        } catch(RuntimeException ex) {chiodoVoiceReady=false;chiodoVoice=null;}
        // Android 15/16 edge-to-edge: reserve safe space for display cutouts and system bars.
        // Respect the user's refresh rate and OEM thermal/battery policies.
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
        getWindow().setStatusBarColor(Color.rgb(4,21,17));
        getWindow().setNavigationBarColor(Color.rgb(4,21,17));
        try{web=new WebView(this);}
        catch(RuntimeException ex){
            android.util.Log.e("NapoliCarteStartup","Android System WebView missing or disabled",ex);
            new AlertDialog.Builder(this).setTitle("NAPOLI CARTE 3D")
                .setMessage("Android System WebView non disponibile. Aggiorna o riattiva Android System WebView e Chrome dal Play Store.")
                .setPositiveButton("Chiudi",(dialog,which)->finish()).show();
            return;
        }
        web.setBackgroundColor(Color.rgb(4,21,17));
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        web.addJavascriptInterface(new ChiodoTransport(),"NCChiodoNative");
        web.addJavascriptInterface(new SocialBridge(),"NCSocialNative");
        web.addJavascriptInterface(new ProfileBridge(),"NCProfileNative");
        web.addJavascriptInterface(new GameVoiceBridge(),"NCGameVoice");
        web.addJavascriptInterface(new RewardBridge(),"NCRewardNative");
        // Google Play Billing is optional during startup, especially on sideloaded APKs.
        try{
            playBilling=new PlayBillingBridge(this,web);
            web.addJavascriptInterface(playBilling,"NCPlayNative");
        }catch(RuntimeException ex){
            playBilling=null;
            android.util.Log.w("NapoliCarteStartup","Google Play billing not available at launch",ex);
        }
        web.addJavascriptInterface(new PublicLinksBridge(),"NCAppLinks");
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Required for user-approved gallery photos via content://
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false); // remote audio starts only after opt-in
        final WebViewAssetLoader assetLoader=new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        web.setWebViewClient(new WebViewClient(){
            @Override public void onPageFinished(WebView view,String url){
                super.onPageFinished(view,url);
                if(url.startsWith(BASE_URL)){
                    deliverPushDestination();
                    view.postDelayed(()->deliverPushDestination(),900);
                }
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,String url){
                return !url.startsWith(BASE_URL);
            }
            @Override public boolean onRenderProcessGone(WebView view,android.webkit.RenderProcessGoneDetail detail){
                // A broken / out-of-memory Android System WebView must not terminate the entire app.
                android.util.Log.e("NapoliCarteStartup","WebView render process terminated, didCrash="+detail.didCrash());
                if(view==web)web=null;
                try{view.destroy();}catch(RuntimeException ignored){}
                android.widget.LinearLayout fallback=new android.widget.LinearLayout(MainActivity.this);
                fallback.setOrientation(android.widget.LinearLayout.VERTICAL);
                fallback.setPadding(28,36,28,28);
                fallback.setBackgroundColor(Color.rgb(8,35,28));
                android.widget.TextView message=new android.widget.TextView(MainActivity.this);
                message.setText("NAPOLI CARTE 3D\n\nIl visualizzatore Android si è interrotto. Aggiorna Android System WebView e riapri il gioco.");
                message.setTextSize(19);
                message.setTextColor(Color.WHITE);
                fallback.addView(message);
                android.widget.Button retry=new android.widget.Button(MainActivity.this);
                retry.setText("RIAPRI IL GIOCO");
                retry.setOnClickListener(v->recreate());
                fallback.addView(retry);
                setContentView(fallback);
                return true;
            }

        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
                return choosePhoto(callback,params);
            }
            @Override public void onPermissionRequest(final PermissionRequest request){
                runOnUiThread(()->{
                    if(request==null)return;
                    Uri origin=request.getOrigin();
                    // Never grant camera or microphone to external pages, ads, or arbitrary URLs.
                    if(origin==null||!"https".equals(origin.getScheme())||!
                       "appassets.androidplatform.net".equals(origin.getHost())){request.deny();return;}
                    String[] asked=request.getResources();
                    if(asked==null||asked.length!=1||!
                       PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(asked[0])){request.deny();return;}
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
        android.widget.FrameLayout safeRoot=new android.widget.FrameLayout(this);
        safeRoot.setBackgroundColor(Color.rgb(4,21,17));
        safeRoot.addView(web,new android.widget.FrameLayout.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT));
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(safeRoot,(view,insets)->{
            androidx.core.graphics.Insets bars=insets.getInsets(
                androidx.core.view.WindowInsetsCompat.Type.systemBars()|
                androidx.core.view.WindowInsetsCompat.Type.displayCutout());
            androidx.core.graphics.Insets keyboard=insets.getInsets(
                androidx.core.view.WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom));
            return insets;
        });
        setContentView(safeRoot);
        if(Build.VERSION.SDK_INT>=33){
            modernBackCallback=Back33.register(this,this::handleGameBack);
        }
        GameNotificationService.createChannels(this);
        pushIntent(getIntent());
        syncPushToken(this,null);
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFICATION_PERMISSION_REQUEST);
        }
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
    // Android 16 (target SDK 36) requires modern predictive-back dispatch.
    // Keep this nested class API 33+ so Android 7-12 never loads newer APIs.
    private static final class Back33 {
        static Object register(MainActivity activity,Runnable action){
            android.window.OnBackInvokedCallback callback=action::run;
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,callback);
            return callback;
        }
        static void unregister(MainActivity activity,Object callback){
            if(callback!=null)activity.getOnBackInvokedDispatcher()
                .unregisterOnBackInvokedCallback((android.window.OnBackInvokedCallback)callback);
        }
    }
    private void showExitPrompt(){
        if(exitPromptShowing||isFinishing()||isDestroyed())return;
        exitPromptShowing=true;
        new AlertDialog.Builder(this)
            .setTitle("Uscire da NAPOLI CARTE 3D?")
            .setMessage("Sei nel menu principale. Vuoi chiudere il gioco?")
            .setNegativeButton("Resta nel gioco",(dialog,which)->{})
            .setPositiveButton("Esci",(dialog,which)->finish())
            .setOnDismissListener(dialog->exitPromptShowing=false)
            .show();
    }
    private void handleGameBack(){
        if(web==null){showExitPrompt();return;}
        try{
            web.evaluateJavascript("Boolean(window.NC81_BACK && NC81_BACK.back())",result->{
                if(!"true".equals(result))showExitPrompt();
            });
        }catch(RuntimeException ex){showExitPrompt();}
    }
    @Override public void onBackPressed(){handleGameBack();}
    @Override public void onPause(){rewardForeground=false;rewardHandler.removeCallbacks(rewardPoll);if(web!=null){web.evaluateJavascript("window.NC74_MUSIC?.systemPause?.();window.NC_CHIODO_DISABLE_VOICE&&NC_CHIODO_DISABLE_VOICE();window.NC23_DISABLE_VOICE&&NC23_DISABLE_VOICE()",null);web.onPause();}super.onPause();}
    @Override public void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.NC74_MUSIC?.systemResume?.()",null);}rewardForeground=true;rewardHandler.removeCallbacks(rewardPoll);rewardHandler.post(rewardPoll);if(playBilling!=null)playBilling.resume();syncPushToken(this,null);deliverPushDestination();}
    @Override protected void onDestroy(){
        if(Build.VERSION.SDK_INT>=33&&modernBackCallback!=null){Back33.unregister(this,modernBackCallback);modernBackCallback=null;}
        rewardForeground=false;rewardHandler.removeCallbacksAndMessages(null);
        chiodoExecutor.shutdownNow();
        if(playBilling!=null){playBilling.close();playBilling=null;}
        if(chiodoVoice!=null){chiodoVoice.stop();chiodoVoice.shutdown();chiodoVoice=null;}
        discardPendingUpload();
        if(pendingMicRequest!=null){try{pendingMicRequest.deny();}catch(RuntimeException ignored){}pendingMicRequest=null;}
        if(web!=null){web.loadUrl("about:blank");web.destroy();web=null;}
        super.onDestroy();
    }
}

