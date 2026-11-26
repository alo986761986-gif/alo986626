package it.napolicarte.game;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

/** Public information pages; never include account or session data in these URLs. */
final class PrivacyLinks {
    private static final String PRIVACY_URL="https://napoli-carte-3d-global.onrender.com/privacy";
    private static final String DELETION_URL="https://napoli-carte-3d-global.onrender.com/account-deletion";

    private PrivacyLinks() {}

    static void privacyPolicy(Activity activity){open(activity,PRIVACY_URL);}
    static void accountDeletion(Activity activity){open(activity,DELETION_URL);}

    private static void open(Activity activity,String url){
        if(!PRIVACY_URL.equals(url)&&!DELETION_URL.equals(url))return;
        if(activity.isFinishing()||activity.isDestroyed())return;
        try{
            Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(url));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            activity.startActivity(intent);
        }catch(ActivityNotFoundException|SecurityException error){
            Toast.makeText(activity,"Impossibile aprire la pagina. Verifica che sia disponibile un browser.",Toast.LENGTH_LONG).show();
        }
    }
}
