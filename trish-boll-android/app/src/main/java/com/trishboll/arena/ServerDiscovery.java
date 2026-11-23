package com.trishboll.arena;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Public, centrally managed server-discovery registry.
 * All installations automatically use one canonical configuration.
 *
 * Primary configuration is GitHub raw on the public default branch.
 * Fallback is jsDelivr GitHub CDN. Neither URL hosts game WebSockets:
 * both only point to the configured real multiplayer server.
 */
public final class ServerDiscovery {
    private static final String TAG="TRISH_BOLL_DISCOVERY";
    private static final String[] SOURCES={
       "https://raw.githubusercontent.com/alo986761986-gif/alo986626/main/trish-boll-global/server.json",
       "https://cdn.jsdelivr.net/gh/alo986761986-gif/alo986626@main/trish-boll-global/server.json"
    };
    private static final Handler main=new Handler(Looper.getMainLooper());
    public interface Callback {
        void onResult(String endpoint,String status);
    }
    private ServerDiscovery(){}

    public static void resolve(final Callback callback){
        new Thread(new Runnable(){
            @Override public void run(){
                String endpoint="";
                String status="Server globale non ancora attivo";
                for(String source:SOURCES){
                    HttpURLConnection con=null;
                    try{
                        con=(HttpURLConnection)new URL(source).openConnection();
                        con.setConnectTimeout(5500);
                        con.setReadTimeout(5500);
                        con.setUseCaches(false);
                        con.setRequestProperty("Accept","application/json");
                        con.setRequestProperty("User-Agent","TRISH-BOLL-Android/5");
                        int code=con.getResponseCode();
                        if(code!=200)continue;
                        InputStream in=con.getInputStream();
                        ByteArrayOutputStream out=new ByteArrayOutputStream();
                        byte[] bytes=new byte[1024];
                        int total=0,n;
                        while((n=in.read(bytes))>=0){
                            total+=n;if(total>8192)throw new IllegalStateException("Configurazione troppo grande");
                            out.write(bytes,0,n);
                        }
                        in.close();
                        JSONObject conf=new JSONObject(out.toString("UTF-8"));
                        if(conf.optInt("version",0)!=1){
                            status="Configurazione globale non riconosciuta";
                            continue;
                        }
                        if(!conf.optBoolean("enabled",false)){
                            status=conf.optString("message","Server multiplayer in attesa di attivazione");
                            break;
                        }
                        String candidate=conf.optString("websocket_url","").trim();
                        // Only an actual secure WebSocket endpoint can be returned.
                        if(candidate.startsWith("wss://")
                            && candidate.length()<250
                            && !candidate.contains(" ")
                            && !candidate.contains("@")
                            && !candidate.contains("#")){
                            java.net.URI uri=new java.net.URI(candidate);
                            if(uri.getHost()!=null && !uri.getHost().isEmpty()){
                                endpoint=candidate;
                                status="Server globale disponibile";
                                break;
                            }
                        }
                        status="Indirizzo del server globale non valido";
                    }catch(Exception ex){
                        Log.w(TAG,"Server discovery failed",ex);
                        status="Connessione al registro server non riuscita";
                    }finally{
                        if(con!=null)con.disconnect();
                    }
                }
                final String result=endpoint,message=status;
                main.post(new Runnable(){
                    @Override public void run(){callback.onResult(result,message);}
                });
            }
        },"TrishServerDiscovery").start();
    }
}
