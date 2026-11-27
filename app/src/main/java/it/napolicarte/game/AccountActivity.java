package it.napolicarte.game;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.*;
import android.graphics.Color;
import android.text.method.PasswordTransformationMethod;
import com.google.firebase.auth.*;
import com.google.android.gms.auth.api.signin.*;
import com.google.android.gms.common.api.ApiException;
public final class AccountActivity extends Activity {
 private FirebaseAuth auth;
 private LinearLayout panel;
 private EditText email,password,confirm,name;
 private TextView status;
 private static final int GOLD=0xffffda82, INK=0xff183e34;
 private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
 private android.graphics.drawable.GradientDrawable bg(int a,int b,int radius){android.graphics.drawable.GradientDrawable d=new android.graphics.drawable.GradientDrawable(android.graphics.drawable.GradientDrawable.Orientation.TL_BR,new int[]{a,b});d.setCornerRadius(dp(radius));return d;}

 private boolean register,busy;
 private GoogleSignInClient google;
 private static final int GOOGLE=707;
 @Override public void onCreate(Bundle b){super.onCreate(b);try{auth=FirebaseAuth.getInstance();}catch(Exception e){auth=null;}render();}
 private TextView label(String s,int size){TextView t=new TextView(this);t.setText(s==null?"":s);t.setTextSize(size);t.setTextColor(size>=22?GOLD:0xfff3e5c8);t.setPadding(0,dp(6),0,dp(8));panel.addView(t);return t;}
 private EditText field(String hint,int type){EditText e=new EditText(this);e.setHint(hint);e.setSingleLine(true);e.setInputType(type);e.setTextColor(0xff123a31);e.setHintTextColor(0xff657e72);e.setTextSize(16);e.setPadding(dp(17),dp(10),dp(17),dp(10));android.graphics.drawable.GradientDrawable d=bg(0xfffff8e9,0xfff2e5ca,17);d.setStroke(dp(2),0xffbc9a5b);e.setBackground(d);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(54));lp.bottomMargin=dp(11);panel.addView(e,lp);return e;}
 private void button(String s,Runnable r){Button b=new Button(this);b.setAllCaps(false);b.setText(s);b.setTextSize(15);b.setTypeface(null,android.graphics.Typeface.BOLD);b.setTextColor(INK);b.setBackground(bg(0xffffe49a,0xffe9a64b,18));b.setElevation(dp(4));b.setOnClickListener(v->{if(!busy)r.run();});LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(54));lp.topMargin=dp(10);panel.addView(b,lp);}
 private void enter(){startActivity(new Intent(this,MainActivity.class));finish();}
 private boolean ready(){if(auth==null){status.setText("Firebase non configurato.");return false;}return true;}
 private String signingSha1(){
  try{
   android.content.pm.PackageInfo info;
   android.content.pm.Signature[] certificates;
   if(android.os.Build.VERSION.SDK_INT>=28){
    info=getPackageManager().getPackageInfo(getPackageName(),android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES);
    certificates=info.signingInfo.getApkContentsSigners();
   }else{
    info=getPackageManager().getPackageInfo(getPackageName(),android.content.pm.PackageManager.GET_SIGNATURES);
    certificates=info.signatures;
   }
   if(certificates==null||certificates.length==0)return "non disponibile";
   byte[] hash=java.security.MessageDigest.getInstance("SHA-1").digest(certificates[0].toByteArray());
   StringBuilder hex=new StringBuilder();
   for(byte n:hash){if(hex.length()>0)hex.append(':');hex.append(String.format(java.util.Locale.ROOT,"%02X",n&255));}
   return hex.toString();
  }catch(Exception e){return "non disponibile";}
 }
 private GoogleSignInClient client(){
  if(google==null){
   String webClient=getString(R.string.default_web_client_id);
   if(webClient==null||!webClient.matches("[0-9]+-[a-z0-9-]+\\.apps\\.googleusercontent\\.com"))
     throw new IllegalStateException("Client ID Google Web mancante in google-services.json");
   google=GoogleSignIn.getClient(this,new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
       .requestEmail().requestIdToken(webClient).build());
  }
  return google;
 }
 private void render(){ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);
  androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
  scroll.setClipToPadding(false);
  androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(scroll,(view,insets)->{
    androidx.core.graphics.Insets safe=insets.getInsets(
      androidx.core.view.WindowInsetsCompat.Type.systemBars()|
      androidx.core.view.WindowInsetsCompat.Type.displayCutout());
    androidx.core.graphics.Insets keyboard=insets.getInsets(
      androidx.core.view.WindowInsetsCompat.Type.ime());
    view.setPadding(safe.left,safe.top,safe.right,Math.max(safe.bottom,keyboard.bottom));
    return insets;
  });
  scroll.setBackground(bg(0xff082b35,0xff063f35,0));panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(dp(22),dp(23),dp(22),dp(28));panel.setBackground(bg(0xff164b42,0xff102d32,27));LinearLayout outer=new LinearLayout(this);outer.setGravity(android.view.Gravity.CENTER_HORIZONTAL);outer.setOrientation(1);outer.setPadding(dp(16),dp(22),dp(16),dp(28));scroll.addView(outer,new ScrollView.LayoutParams(-1,-2));TextView hero=new TextView(this);hero.setText("🃏");hero.setTextSize(56);hero.setGravity(android.view.Gravity.CENTER);hero.setBackground(bg(0xff1d8364,0xff0a4d52,30));LinearLayout.LayoutParams iconLp=new LinearLayout.LayoutParams(dp(112),dp(112));iconLp.bottomMargin=dp(12);outer.addView(hero,iconLp);TextView title=new TextView(this);title.setText("NAPOLI CARTE 3D");title.setTextSize(27);title.setTypeface(null,android.graphics.Typeface.BOLD);title.setTextColor(GOLD);title.setGravity(android.view.Gravity.CENTER);outer.addView(title);TextView subtitle=new TextView(this);subtitle.setText(register?"✨ Crea il tuo giocatore":"🎴 Il tavolo di tutti ti aspetta");subtitle.setTextSize(15);subtitle.setTextColor(0xffdeebda);subtitle.setGravity(android.view.Gravity.CENTER);subtitle.setPadding(0,dp(4),0,dp(19));outer.addView(subtitle);outer.addView(panel,new LinearLayout.LayoutParams(-1,-2));setContentView(scroll);status=label(auth==null?"Servizio account non disponibile.":"",15);
 button("Informativa privacy",()->PrivacyLinks.privacyPolicy(this));
 button("Eliminazione account e dati",()->PrivacyLinks.accountDeletion(this));
 label("La pagina di eliminazione spiega come inviare una richiesta all’assistenza. Aprire il link non elimina automaticamente account o dati.",13);
 FirebaseUser u=auth==null?null:auth.getCurrentUser();
 if(u!=null){label("Account personale",22);label(u.getDisplayName()==null?"Giocatore":u.getDisplayName(),18);label(u.getEmail(),16);button("Entra nel gioco",this::enter);if(!u.isEmailVerified())button("Invia email di verifica",()->u.sendEmailVerification().addOnCompleteListener(t->status.setText(t.isSuccessful()?"Email inviata.":"Invio non riuscito.")));button("Disconnetti",()->{busy=true;status.setText("Disconnessione in corso…");PushDeviceManager.unlinkOnLogout(()->{auth.signOut();try{client().signOut();}catch(Exception e){}busy=false;render();});});return;}
 label(register?"✨ Registrazione":"🎮 Accedi e gioca",22);if(register)name=field("Nome giocatore",1);email=field("Email",33);password=field("Password",129);if(register)confirm=field("Conferma password",129);CheckBox check=new CheckBox(this);check.setText("Mostra password");check.setTextColor(0xfff3dfb8);panel.addView(check);check.setOnCheckedChangeListener((v,on)->{password.setTransformationMethod(on?null:PasswordTransformationMethod.getInstance());password.setSelection(password.length());if(register){confirm.setTransformationMethod(on?null:PasswordTransformationMethod.getInstance());confirm.setSelection(confirm.length());}check.setText(on?"Nascondi password":"Mostra password");});button(register?"Crea account":"Accedi",this::submit);button(register?"Ho già un account":"Registrati",()->{register=!register;render();});if(!register)button("Password dimenticata",()->{if(!ready())return;String e=email.getText().toString().trim();if(e.isEmpty()){status.setText("Inserisci email.");return;}auth.sendPasswordResetEmail(e).addOnCompleteListener(t->status.setText(t.isSuccessful()?"Controlla la tua email.":"Richiesta non riuscita."));});button("Continua con Google",()->{if(!ready())return;busy=true;status.setText("Apertura accesso Google...");try{startActivityForResult(client().getSignInIntent(),GOOGLE);}catch(Exception e){busy=false;status.setText("Google: "+e.getMessage());}});button("Gioca come ospite",this::enter);}
 private void submit(){if(!ready())return;String e=email.getText().toString().trim(),p=password.getText().toString();if(e.isEmpty()||p.length()<6){status.setText("Inserisci email e password di almeno 6 caratteri.");return;}if(register&&(!p.equals(confirm.getText().toString())||name.getText().toString().trim().isEmpty())){status.setText("Controlla nome e conferma password.");return;}busy=true;status.setText("Connessione in corso...");if(register){String n=name.getText().toString().trim();auth.createUserWithEmailAndPassword(e,p).addOnCompleteListener(t->{busy=false;if(t.isSuccessful()){FirebaseUser u=auth.getCurrentUser();if(u!=null)u.updateProfile(new UserProfileChangeRequest.Builder().setDisplayName(n).build()).addOnCompleteListener(x->{u.sendEmailVerification();render();});else render();}else status.setText("Registrazione non riuscita. Controlla i dati e la connessione.");});}else auth.signInWithEmailAndPassword(e,p).addOnCompleteListener(t->{busy=false;if(t.isSuccessful())render();else status.setText("Accesso non riuscito. Controlla i dati e la connessione.");});}
 @Override protected void onActivityResult(int req,int result,Intent data){
  super.onActivityResult(req,result,data);
  if(req!=GOOGLE)return;
  if(result!=RESULT_OK||data==null){busy=false;status.setText("Accesso Google annullato o non completato.");return;}
  try{
   GoogleSignInAccount account=GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException.class);
   if(account==null||account.getIdToken()==null||auth==null)throw new IllegalStateException("Token Google mancante");
   auth.signInWithCredential(GoogleAuthProvider.getCredential(account.getIdToken(),null))
       .addOnCompleteListener(task->{
        busy=false;
        if(task.isSuccessful()&&auth.getCurrentUser()!=null){
         enter();
        }else{
         Exception ex=task.getException();
         String code=ex instanceof FirebaseAuthException?((FirebaseAuthException)ex).getErrorCode():ex==null?"unknown":ex.getClass().getSimpleName();
         status.setText("Google autenticato, ma Firebase ha rifiutato l'accesso: "+code);
        }
       });
  }catch(ApiException e){
   busy=false;int code=e.getStatusCode();
   status.setText(code==10
     ?"Google non riconosce la firma di questa versione. Aggiungi in Firebase la SHA-1 dell'APK: "+signingSha1()+" (errore 10)."
     :code==12501?"Accesso Google annullato."
     :"Accesso Google non riuscito (codice "+code+"). Controlla connessione e configurazione OAuth.");
  }catch(Exception e){busy=false;status.setText("Accesso Google non riuscito: "+e.getMessage());}
 }

}
