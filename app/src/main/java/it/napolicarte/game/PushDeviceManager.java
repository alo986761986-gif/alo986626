package it.napolicarte.game;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.OutputStream;
import java.net.URL;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

/**
 * Firebase device registration and authenticated unlink at logout.
 * Does not persist or log account tokens, Google credentials or FCM tokens.
 */
public final class PushDeviceManager {
    private static final String ROOT = "https://napoli-chiodo-121.onrender.com/push/";
    private static final long REFRESH_AFTER_MS = 6L * 60L * 60L * 1000L;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static volatile boolean signingOut = false;
    private static volatile int generation = 0;
    private static volatile String registeredUid = "";
    private static volatile String registeredToken = "";
    private static volatile long registeredAt = 0L;

    private PushDeviceManager() {}

    private static boolean sameUser(String uid, int startedAt) {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        return !signingOut && generation == startedAt && current != null && uid.equals(current.getUid());
    }

    public static void register(Context context, String requestedToken) {
        try {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null || signingOut) return;
            FirebaseMessaging service = FirebaseMessaging.getInstance();
            service.setAutoInitEnabled(true);
            if (requestedToken == null) {
                service.getToken().addOnSuccessListener(token -> register(context.getApplicationContext(), token));
                return;
            }
            if (requestedToken.length() < 40 || requestedToken.length() > 2048) return;
            final String uid = user.getUid();
            final int startedAt = generation;
            if (uid.equals(registeredUid) && requestedToken.equals(registeredToken) &&
                System.currentTimeMillis() - registeredAt < REFRESH_AFTER_MS) return;
            user.getIdToken(false).addOnSuccessListener(auth -> {
                if (auth == null || auth.getToken() == null || !sameUser(uid, startedAt)) return;
                final String bearer = auth.getToken();
                new Thread(() -> {
                    if (!sameUser(uid, startedAt)) return;
                    int code = request("register", bearer, requestedToken);
                    if (code >= 200 && code < 300 && sameUser(uid, startedAt)) {
                        registeredUid = uid;
                        registeredToken = requestedToken;
                        registeredAt = System.currentTimeMillis();
                        Log.i("NapoliPush", "Device push registration verified");
                    } else if (code != 409 && code != 0) {
                        Log.w("NapoliPush", "Push registration returned HTTP " + code);
                    }
                }, "napoli-push-register").start();
            });
        } catch (RuntimeException ignored) {
            Log.w("NapoliPush", "Push registration temporarily unavailable");
        }
    }

    private static int request(String action, String firebaseIdToken, String token) {
        HttpsURLConnection conn = null;
        try {
            conn = (HttpsURLConnection) new URL(ROOT + action).openConnection();
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("X-Firebase-Token", firebaseIdToken);
            conn.setRequestProperty("Content-Type", "application/json");
            byte[] body = new JSONObject().put("token", token).toString().getBytes("UTF-8");
            try (OutputStream out = conn.getOutputStream()) { out.write(body); }
            return conn.getResponseCode();
        } catch (Exception ignored) {
            return 0;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /**
     * Best-effort authenticated server unlink followed by local FCM token revocation.
     * Callback is delivered on the UI thread even if the device is offline.
     */
    public static void unlinkOnLogout(Runnable done) {
        signingOut = true;
        generation++;
        registeredUid = "";
        registeredToken = "";
        registeredAt = 0L;
        new Thread(() -> {
            try {
                FirebaseMessaging service = FirebaseMessaging.getInstance();
                service.setAutoInitEnabled(false);
                FirebaseUser oldUser = FirebaseAuth.getInstance().getCurrentUser();
                try {
                    String token = Tasks.await(service.getToken(), 4, TimeUnit.SECONDS);
                    if (oldUser != null && token != null && !token.isEmpty()) {
                        String bearer = Tasks.await(oldUser.getIdToken(false), 4, TimeUnit.SECONDS).getToken();
                        if (bearer != null) request("unregister", bearer, token);
                    }
                } catch (Exception ignored) {
                    Log.w("NapoliPush", "Server unlink unavailable; revoking local token");
                }
                try {
                    Tasks.await(service.deleteToken(), 5, TimeUnit.SECONDS);
                } catch (Exception ignored) {
                    Log.w("NapoliPush", "FCM token deletion not yet confirmed");
                }
            } catch (RuntimeException ignored) {
                Log.w("NapoliPush", "FCM unavailable during logout");
            } finally {
                MAIN.post(() -> {
                    try { done.run(); }
                    finally { signingOut = false; }
                });
            }
        }, "napoli-push-unlink").start();
    }
}
