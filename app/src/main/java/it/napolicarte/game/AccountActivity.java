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
 private boolean register,busy;
 private GoogleSignInClient google;
 private static final int GOOGLE=707;
 @Override public void onCreate(Bundle b){super.onCreate(b);try{auth=FirebaseAuth.getInstance();}catch(Exception e){auth=null;}render();}
 private TextView label(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(0xffefd59b);t.setPadding(0,8,0,8);panel.addView(t);return t;}
 private EditText field(String hint,int type){EditText e=new EditText(this);e.setHint(hint);e.setSingleLine(true);e.setInputType(type);e.setTextColor(Color.WHITE);e.setHintTextColor(0xffb4c5b9);panel.addView(e);return e;}
 private void button(String s,Runnable r){Button b=new Button(this);b.setText(s);b.setTextColor(0xff162c20);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xffe4c58a));b.setOnClickListener(v->{if(!busy)r.run();});LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=10;panel.addView(b,lp);}
 private void enter(){startActivity(new Intent(this,MainActivity.class));finish();}
 private boolean ready(){if(auth==null){status.setText("Firebase non configurato.");return false;}return true;}
 private GoogleSignInClient client(){if(google==null){google=GoogleSignIn.getClient(this,new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).requestEmail().requestIdToken(getString(R.string.default_web_client_id)).build());}return google;}
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
  panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(32,36,32,36);panel.setBackgroundColor(0xff10291f);scroll.addView(panel);setContentView(scroll);label("NAPOLI CARTE 3D",26);label("GAMES STUDIOS",14);status=label(auth==null?"Servizio account non disponibile.":"",15);
 button("Informativa privacy",()->PrivacyLinks.privacyPolicy(this));
 button("Eliminazione account e dati",()->PrivacyLinks.accountDeletion(this));
 label("La pagina di eliminazione spiega come inviare una richiesta all’assistenza. Aprire il link non elimina automaticamente account o dati.",13);
 FirebaseUser u=auth==null?null:auth.getCurrentUser();
 if(u!=null){label("Account personale",22);label(u.getDisplayName()==null?"Giocatore":u.getDisplayName(),18);label(u.getEmail(),16);button("Entra nel gioco",this::enter);if(!u.isEmailVerified())button("Invia email di verifica",()->u.sendEmailVerification().addOnCompleteListener(t->status.setText(t.isSuccessful()?"Email inviata.":"Invio non riuscito.")));button("Disconnetti",()->{busy=true;status.setText("Disconnessione in corso…");PushDeviceManager.unlinkOnLogout(()->{auth.signOut();try{client().signOut();}catch(Exception e){}busy=false;render();});});return;}
 label(register?"Registrazione":"Accedi",22);if(register)name=field("Nome giocatore",1);email=field("Email",33);password=field("Password",129);if(register)confirm=field("Conferma password",129);CheckBox check=new CheckBox(this);check.setText("Mostra password");check.setTextColor(Color.WHITE);panel.addView(check);check.setOnCheckedChangeListener((v,on)->{password.setTransformationMethod(on?null:PasswordTransformationMethod.getInstance());password.setSelection(password.length());if(register){confirm.setTransformationMethod(on?null:PasswordTransformationMethod.getInstance());confirm.setSelection(confirm.length());}check.setText(on?"Nascondi password":"Mostra password");});button(register?"Crea account":"Accedi",this::submit);button(register?"Ho già un account":"Registrati",()->{register=!register;render();});if(!register)button("Password dimenticata",()->{if(!ready())return;String e=email.getText().toString().trim();if(e.isEmpty()){status.setText("Inserisci email.");return;}auth.sendPasswordResetEmail(e).addOnCompleteListener(t->status.setText(t.isSuccessful()?"Controlla la tua email.":"Richiesta non riuscita."));});button("Continua con Google",()->{if(!ready())return;try{startActivityForResult(client().getSignInIntent(),GOOGLE);}catch(Exception e){status.setText("Accesso Google non disponibile.");}});button("Gioca come ospite",this::enter);}
 private void submit(){if(!ready())return;String e=email.getText().toString().trim(),p=password.getText().toString();if(e.isEmpty()||p.length()<6){status.setText("Inserisci email e password di almeno 6 caratteri.");return;}if(register&&(!p.equals(confirm.getText().toString())||name.getText().toString().trim().isEmpty())){status.setText("Controlla nome e conferma password.");return;}busy=true;status.setText("Connessione in corso...");if(register){String n=name.getText().toString().trim();auth.createUserWithEmailAndPassword(e,p).addOnCompleteListener(t->{busy=false;if(t.isSuccessful()){FirebaseUser u=auth.getCurrentUser();if(u!=null)u.updateProfile(new UserProfileChangeRequest.Builder().setDisplayName(n).build()).addOnCompleteListener(x->{u.sendEmailVerification();render();});else render();}else status.setText("Registrazione non riuscita. Controlla i dati e la connessione.");});}else auth.signInWithEmailAndPassword(e,p).addOnCompleteListener(t->{busy=false;if(t.isSuccessful())render();else status.setText("Accesso non riuscito. Controlla i dati e la connessione.");});}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req!=GOOGLE)return;try{GoogleSignInAccount a=GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException.class);if(a==null||a.getIdToken()==null||auth==null)throw new IllegalStateException();busy=true;auth.signInWithCredential(GoogleAuthProvider.getCredential(a.getIdToken(),null)).addOnCompleteListener(t->{busy=false;if(t.isSuccessful())render();else {Exception ex=t.getException();status.setText("Firebase: "+(ex instanceof FirebaseAuthException?((FirebaseAuthException)ex).getErrorCode():"autenticazione non riuscita"));}});}catch(ApiException e){busy=false;int code=e.getStatusCode();status.setText(code==10?"Google: configurazione OAuth o certificato SHA non corrispondente (10).":code==12501?"Accesso Google annullato.":"Accesso Google non riuscito (codice "+code+").");}catch(Exception e){busy=false;status.setText("Accesso Google non riuscito: "+e.getClass().getSimpleName());}}
}
