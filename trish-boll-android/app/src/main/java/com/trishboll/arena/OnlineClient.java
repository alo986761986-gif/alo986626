package com.trishboll.arena;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

/**
 * Genuine Android 5+ RFC6455 WebSocket client. Never uses WebView or external libraries.
 * Network IO always runs on one dedicated thread; callbacks always run on the UI thread.
 * Public servers require wss:// and a valid system-trusted TLS certificate.
 */
public final class OnlineClient {
    public interface Listener {
        void onConnecting();
        void onReady();
        void onWorld(JSONObject state);
        void onFood(JSONArray foods);
        void onDeath(int score);
        void onDisconnect(String reason);
    }
    private static final String TAG="TRISH_BOLL_ONLINE";
    private final Handler main=new Handler(Looper.getMainLooper());
    private final SecureRandom random=new SecureRandom();
    private final Listener listener;
    private volatile boolean active=false, joined=false;
    private volatile float angle=0f;
    private volatile boolean boosting=false;
    private volatile Socket socket;
    private volatile Thread thread;
    private final Object writing=new Object();
    private OutputStream output;
    private String url,playerName;
    private int skin;
    private String playerId="";
    private int livePlayers=0;
    public OnlineClient(Listener l){listener=l;}
    public boolean isActive(){return active;}
    public boolean isJoined(){return joined;}
    public String playerId(){return playerId;}
    public int livePlayers(){return livePlayers;}
    public void input(float a,boolean boost){
        angle=a;boosting=boost;
    }
    public synchronized void connect(String endpoint,String nick,int color){
        disconnect();
        url=endpoint;playerName=nick;skin=Math.max(0,Math.min(7,color));
        active=true;joined=false;playerId="";livePlayers=0;
        main.post(new Runnable(){public void run(){listener.onConnecting();}});
        thread=new Thread(new Runnable(){public void run(){runConnection();}},"TrishOnlineWebSocket");
        thread.setDaemon(true);
        thread.start();
    }
    public synchronized void disconnect(){
        active=false;joined=false;playerId="";
        Socket old=socket;socket=null;
        if(old!=null)try{old.close();}catch(Exception ignored){}
        // The old thread exits without notifying the user because active is false.
    }
    private void notifyError(final String message){
        if(!active)return;
        active=false;joined=false;playerId="";
        main.post(new Runnable(){public void run(){listener.onDisconnect(message);}});
    }
    private void runConnection(){
        Socket current=null;
        try {
            URI address=new URI(url.trim());
            String scheme=address.getScheme(),host=address.getHost();
            boolean tls="wss".equalsIgnoreCase(scheme);
            if(!tls)throw new IllegalArgumentException("Serve un indirizzo sicuro wss://");
            if(host==null || host.length()>240 || address.getUserInfo()!=null)
                throw new IllegalArgumentException("Indirizzo server non valido");
            int port=address.getPort()>0?address.getPort():443;
            String uriPath=address.getRawPath();
            if(uriPath==null||uriPath.length()==0)uriPath="/ws";
            else if(uriPath.equals("/"))uriPath="/ws";
            if(address.getRawQuery()!=null)uriPath+="?"+address.getRawQuery();
            // Use a bounded connect timeout and system-trusted SSL; never bypass TLS validation.
            Socket tcp=new Socket();
            tcp.connect(new InetSocketAddress(host,port),9000);
            tcp.setSoTimeout(15000);
            SSLSocket ssl=(SSLSocket)SSLSocketFactory.getDefault()
                .createSocket(tcp,host,port,true);
            ssl.startHandshake();
            current=ssl;socket=ssl;
            InputStream in=new BufferedInputStream(ssl.getInputStream());
            OutputStream out=new BufferedOutputStream(ssl.getOutputStream());
            output=out;
            byte[] nonce=new byte[16];random.nextBytes(nonce);
            String key=android.util.Base64.encodeToString(nonce,android.util.Base64.NO_WRAP);
            String hostHeader=host+(port==443?"":":"+port);
            String request="GET "+uriPath+" HTTP/1.1\r\n"
                +"Host: "+hostHeader+"\r\n"
                +"Upgrade: websocket\r\nConnection: Upgrade\r\n"
                +"Sec-WebSocket-Key: "+key+"\r\nSec-WebSocket-Version: 13\r\n"
                +"Origin: https://"+hostHeader+"\r\n\r\n";
            out.write(request.getBytes(StandardCharsets.ISO_8859_1));out.flush();
            ByteArrayOutputStream header=new ByteArrayOutputStream();
            int b,limit=0,last4=0;
            while((b=in.read())!=-1 && limit++<8000){
                header.write(b);last4=((last4<<8)|b);
                if(last4==0x0d0a0d0a)break;
            }
            String response=header.toString("ISO-8859-1");
            if(!response.startsWith("HTTP/1.1 101")&&!response.startsWith("HTTP/1.0 101"))
                throw new IllegalStateException("Server non disponibile (HTTP "+(response.length()>12?response.substring(9,12):"?")+")");
            String accept=null;
            for(String line:response.split("\r\n")){
                if(line.toLowerCase(Locale.US).startsWith("sec-websocket-accept:"))
                    accept=line.substring(line.indexOf(':')+1).trim();
            }
            MessageDigest sha=MessageDigest.getInstance("SHA-1");
            byte[] expected=sha.digest((key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").getBytes(StandardCharsets.US_ASCII));
            String expectedString=android.util.Base64.encodeToString(expected,android.util.Base64.NO_WRAP);
            if(!expectedString.equals(accept))throw new IllegalStateException("Risposta WebSocket non autenticata");
            JSONObject join=new JSONObject();
            join.put("t","join");join.put("name",playerName);join.put("skin",skin);
            sendFrame(1,join.toString().getBytes(StandardCharsets.UTF_8));
            long inputAt=0,pingAt=System.currentTimeMillis();
            current.setSoTimeout(110);
            while(active && socket==current){
                long now=System.currentTimeMillis();
                if(joined && now-inputAt>=100){
                    JSONObject input=new JSONObject();
                    input.put("t","input");input.put("a",angle);input.put("b",boosting?1:0);
                    sendFrame(1,input.toString().getBytes(StandardCharsets.UTF_8));
                    inputAt=now;
                }
                if(now-pingAt>12000){
                    sendFrame(9,new byte[]{0x54,0x42});
                    pingAt=now;
                }
                try{
                    int first=in.read();if(first<0)break;
                    int second=read(in);
                    int op=first&15;
                    if((first&0x80)==0)throw new IllegalStateException("Frame frammentato non supportato");
                    if((second&0x80)!=0)throw new IllegalStateException("Frame server non valido");
                    long length=second&127;
                    if(length==126)length=(read(in)<<8)|read(in);
                    else if(length==127){
                        length=0;for(int i=0;i<8;i++)length=(length<<8)|read(in);
                    }
                    if(length>1100000||length<0)throw new IllegalStateException("Pacchetto troppo grande");
                    byte[] body=new byte[(int)length];int offset=0;
                    while(offset<body.length){
                        int n=in.read(body,offset,body.length-offset);
                        if(n<0)throw new IllegalStateException("Connessione chiusa durante il pacchetto");
                        offset+=n;
                    }
                    if(op==8)break;
                    if(op==9){sendFrame(10,body);continue;}
                    if(op==10)continue;
                    if(op==1)receive(new JSONObject(new String(body,StandardCharsets.UTF_8)));
                }catch(SocketTimeoutException timeout){
                    // Idle sockets are expected. Keep the thread alive until disconnection.
                }
            }
            if(active)notifyError("Connessione persa. Puoi rientrare o giocare offline.");
        }catch(Exception error){
            Log.w(TAG,"Network connection failed",error);
            if(active)notifyError("Connessione online non riuscita: "+error.getMessage());
        }finally{
            if(current!=null)try{current.close();}catch(Exception ignored){}
        }
    }
    private int read(InputStream in)throws Exception {
        int b=in.read();if(b<0)throw new IllegalStateException("Connessione interrotta");return b;
    }
    private void sendFrame(int type,byte[] payload)throws Exception{
        if(payload.length>65000)throw new IllegalStateException("Messaggio troppo lungo");
        synchronized(writing){
            OutputStream out=output;if(out==null)return;
            int len=payload.length;
            out.write(0x80|type);
            if(len<126)out.write(0x80|len);
            else{out.write(0x80|126);out.write((len>>8)&255);out.write(len&255);}
            byte[] mask=new byte[4];random.nextBytes(mask);out.write(mask);
            byte[] encoded=new byte[len];
            for(int i=0;i<len;i++)encoded[i]=(byte)(payload[i]^mask[i&3]);
            out.write(encoded);out.flush();
        }
    }
    private void receive(JSONObject data)throws Exception{
        String type=data.optString("t","");
        if(type.equals("joined")){
            playerId=data.optString("id","");
            if(playerId.isEmpty())throw new IllegalStateException("ID giocatore assente");
            joined=true;
            main.post(new Runnable(){public void run(){if(active)listener.onReady();}});
        }else if(type.equals("state")){
            livePlayers=data.optInt("p",0);
            final JSONObject snapshot=data;
            main.post(new Runnable(){public void run(){if(active)listener.onWorld(snapshot);}});
        }else if(type.equals("food")){
            final JSONArray food=data.optJSONArray("f");
            if(food!=null)main.post(new Runnable(){public void run(){if(active)listener.onFood(food);}});
        }else if(type.equals("dead")){
            final int score=data.optInt("score",0);
            main.post(new Runnable(){public void run(){if(active)listener.onDeath(score);}});
        }else if(type.equals("error")){
            throw new IllegalStateException(data.optString("message","Server non disponibile"));
        }
    }
}
