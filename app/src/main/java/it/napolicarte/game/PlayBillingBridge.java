package it.napolicarte.game;
import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.android.billingclient.api.*;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import org.json.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
/** Consumable Google Play purchases; only a verified server ledger may grant credits. */
final class PlayBillingBridge implements PurchasesUpdatedListener {
 private static final String BASE="https://napoli-chiodo-121.onrender.com";
 private static final String[] SKUS={"coins_1000","coins_2200","coins_6000","coins_13000","coins_28000","coins_75000"};
 private final Activity activity;private final WebView web;
 private final ExecutorService io=Executors.newFixedThreadPool(2);
 private final Map<String,ProductDetails> products=new HashMap<>();
 private final Set<String> inFlight=Collections.synchronizedSet(new HashSet<>());
 private BillingClient client;private boolean connecting,closed;private boolean backendReady;
 PlayBillingBridge(Activity a,WebView w){activity=a;web=w;client=BillingClient.newBuilder(a).setListener(this)
   .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).build();
   connect();}
 private FirebaseUser user(){try{return FirebaseAuth.getInstance().getCurrentUser();}catch(Exception e){return null;}}
 private void js(String name,String json){activity.runOnUiThread(()->{if(!closed&&!activity.isFinishing()&&!activity.isDestroyed())
    web.evaluateJavascript("window."+name+"&&window."+name+"("+json+")",null);});}
 private void event(String status,String message){js("NC_PLAY_EVENT",JSONObject.quote(status)+","+JSONObject.quote(message));}
 private void connect(){
  if(closed||connecting||client.isReady())return;connecting=true;
  client.startConnection(new BillingClientStateListener(){
   public void onBillingSetupFinished(BillingResult b){connecting=false;if(b.getResponseCode()==BillingClient.BillingResponseCode.OK){refresh();restore();}else event("unavailable","Google Play Billing non disponibile ("+b.getResponseCode()+")");}
   public void onBillingServiceDisconnected(){connecting=false;event("unavailable","Connessione a Google Play interrotta");}
  });
 }
 private static byte[] readFully(InputStream in)throws IOException{try(InputStream source=in;ByteArrayOutputStream buffer=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=source.read(b))!=-1){if(buffer.size()+n>262144)throw new IOException("Risposta eccessiva");buffer.write(b,0,n);}return buffer.toByteArray();}}
 private void backendStatus(Runnable onReady){
  io.execute(()->{
   boolean ok=false;HttpsURLConnection con=null;
   try{con=(HttpsURLConnection)new URL(BASE+"/play/health").openConnection();con.setConnectTimeout(12000);con.setReadTimeout(12000);
       if(con.getResponseCode()==200){JSONObject data=new JSONObject(new String(readFully(con.getInputStream()),StandardCharsets.UTF_8));ok=data.optBoolean("ready");}}
   catch(Exception ignored){}finally{if(con!=null)con.disconnect();}
   final boolean ready=ok;backendReady=ready;
   if(!ready)event("unavailable","Acquisti in preparazione: la verifica Google Play non è ancora attiva");
   else if(onReady!=null)activity.runOnUiThread(onReady);
  });
 }
 private void refresh(){
  if(closed||!client.isReady())return;
  List<QueryProductDetailsParams.Product> list=new ArrayList<>();
  for(String s:SKUS)list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(s).setProductType(BillingClient.ProductType.INAPP).build());
  client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),(result,details)->{
   products.clear();JSONArray rows=new JSONArray();
   if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){
    for(ProductDetails d:details.getProductDetailsList()){
     if(!Arrays.asList(SKUS).contains(d.getProductId()))continue;
     products.put(d.getProductId(),d);
     ProductDetails.OneTimePurchaseOfferDetails offer=offer(d);
     if(offer==null)continue;
     JSONObject o=new JSONObject();
     try{o.put("id",d.getProductId());o.put("price",offer.getFormattedPrice());}catch(Exception ignored){}
     rows.put(o);
    }
   }
   js("NC_PLAY_CATALOG",rows.toString());
   if(products.isEmpty())event("unavailable","Pacchetti non ancora disponibili sulla Play Console");
   backendStatus(null);
  });
 }
 private ProductDetails.OneTimePurchaseOfferDetails offer(ProductDetails p){
  List<ProductDetails.OneTimePurchaseOfferDetails> all=p.getOneTimePurchaseOfferDetailsList();
  if(all!=null&&!all.isEmpty())return all.get(0);
  return p.getOneTimePurchaseOfferDetails();
 }
 @JavascriptInterface public void buy(String sku){activity.runOnUiThread(()->{
  if(closed||!Arrays.asList(SKUS).contains(sku))return;
  FirebaseUser u=user();if(u==null){event("error","Accedi con Google o email per acquistare crediti");return;}
  if(!client.isReady()){connect();event("unavailable","Riconnessione a Google Play");return;}
  ProductDetails d=products.get(sku);if(d==null){refresh();event("unavailable","Prodotto ancora da attivare in Google Play");return;}
  ProductDetails.OneTimePurchaseOfferDetails o=offer(d);if(o==null){event("unavailable","Nessuna offerta disponibile");return;}
  backendStatus(()->{
    if(closed||!client.isReady()||!u.getUid().equals(user()==null?"":user().getUid()))return;
    BillingFlowParams.ProductDetailsParams.Builder item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d);
    if(o.getOfferToken()!=null&&!o.getOfferToken().isEmpty())item.setOfferToken(o.getOfferToken());
    BillingFlowParams p=BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build()))
      .setObfuscatedAccountId(obfuscated(u.getUid())).build();
    BillingResult r=client.launchBillingFlow(activity,p);
    if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK)event("error","Google Play non può avviare l'acquisto ("+r.getResponseCode()+")");
  });
 });}
 static String obfuscated(String uid){
  try{byte[] b=MessageDigest.getInstance("SHA-256").digest(("NAPOLI_CARTE_3D:"+uid).getBytes(StandardCharsets.UTF_8));
   StringBuilder s=new StringBuilder();for(byte a:b)s.append(String.format(java.util.Locale.ROOT,"%02x",a&255));return s.toString();
  }catch(Exception e){throw new IllegalStateException(e);}
 }
 @JavascriptInterface public void sync(){activity.runOnUiThread(()->{if(closed)return;if(client.isReady())restore();else connect();syncLedger();});}
 private void restore(){if(closed||!client.isReady())return;client.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
  .setProductType(BillingClient.ProductType.INAPP).build(),(r,list)->{
    if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK)return;
    for(Purchase p:list)process(p);
  });}
 @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> purchases){
  if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED){event("idle","Acquisto annullato");return;}
  if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){event("error","Acquisto non confermato ("+result.getResponseCode()+")");return;}
  if(purchases!=null)for(Purchase p:purchases)process(p);
 }
 private void process(Purchase p){
  if(p.getPurchaseState()==Purchase.PurchaseState.PENDING){event("pending","Pagamento in attesa di conferma da Google");return;}
  if(p.getPurchaseState()!=Purchase.PurchaseState.PURCHASED)return;
  if(p.getProducts()==null||p.getProducts().size()!=1)return;
  String sku=p.getProducts().get(0),token=p.getPurchaseToken();
  if(!Arrays.asList(SKUS).contains(sku)||token==null||!inFlight.add(token))return;
  FirebaseUser u=user();if(u==null){inFlight.remove(token);event("error","Accedi per recuperare il tuo acquisto");return;}
  String uid=u.getUid();
  u.getIdToken(false).addOnCompleteListener(task->{
   if(!task.isSuccessful()||task.getResult()==null||task.getResult().getToken()==null){inFlight.remove(token);event("pending","Accesso da verificare; riapri il Negozio");return;}
   String idToken=task.getResult().getToken();
   io.execute(()->{
    boolean valid=false;HttpsURLConnection con=null;
    try{
     con=(HttpsURLConnection)new URL(BASE+"/play/verify").openConnection();
     con.setRequestMethod("POST");con.setDoOutput(true);con.setConnectTimeout(18000);con.setReadTimeout(25000);
     con.setRequestProperty("Authorization","Bearer "+idToken);
     con.setRequestProperty("Content-Type","application/json; charset=UTF-8");
     JSONObject body=new JSONObject();body.put("productId",sku);body.put("purchaseToken",token);
     try(OutputStream out=con.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}
     valid=con.getResponseCode()==200&&new JSONObject(new String(readFully(con.getInputStream()),StandardCharsets.UTF_8)).optBoolean("verified");
    }catch(Exception ignored){}finally{if(con!=null)con.disconnect();}
    final boolean ok=valid;
    activity.runOnUiThread(()->{
     inFlight.remove(token);
     if(closed||!uid.equals(user()==null?"":user().getUid()))return;
     if(!ok){event("pending","Verifica acquisto non ancora disponibile. Nessun credito perso: riproveremo dalla ricevuta Google Play");return;}
     client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(),(result,purchaseToken)->{
       if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)event("pending","Credito confermato; consumo acquisto in verifica");
       syncLedger();
     });
         });
   });
  });
 }
 private void syncLedger(){
  FirebaseUser u=user();if(closed||u==null)return;
  String uid=u.getUid();
  u.getIdToken(false).addOnCompleteListener(task->{
   if(!task.isSuccessful()||task.getResult()==null||task.getResult().getToken()==null)return;
   String token=task.getResult().getToken();io.execute(()->{
    HttpsURLConnection con=null;JSONArray rows=null;
    try{con=(HttpsURLConnection)new URL(BASE+"/play/credits").openConnection();
     con.setConnectTimeout(15000);con.setReadTimeout(20000);con.setRequestProperty("Authorization","Bearer "+token);
     if(con.getResponseCode()==200)rows=new JSONObject(new String(readFully(con.getInputStream()),StandardCharsets.UTF_8)).getJSONArray("purchases");
    }catch(Exception ignored){}finally{if(con!=null)con.disconnect();}
    final JSONArray copy=rows;
    if(copy!=null&&uid.equals(user()==null?"":user().getUid()))js("NC_PLAY_VERIFIED",JSONObject.quote("uid:"+uid)+","+copy.toString());
   });
  });
 }
 void resume(){if(closed)return;if(client.isReady()){refresh();restore();syncLedger();}else connect();}
 void close(){closed=true;inFlight.clear();if(client!=null)client.endConnection();io.shutdownNow();}
}