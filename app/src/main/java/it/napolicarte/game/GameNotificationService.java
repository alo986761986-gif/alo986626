package it.napolicarte.game;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Receives user-targeted FCM events; the authenticated backend must send them. */
public final class GameNotificationService extends FirebaseMessagingService {
    public static final String FRIENDS = "friends";
    public static final String CHAT = "chat";
    public static final String BONUS = "daily_bonus";
    public static final String INVITES = "game_invites";
    public static final String EXTRA_DESTINATION = "notification_destination";

    public static void createChannels(android.content.Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel friends = new NotificationChannel(FRIENDS, "Richieste di amicizia", NotificationManager.IMPORTANCE_HIGH);
        friends.setDescription("Richieste di amicizia e risposte dagli altri giocatori");
        NotificationChannel chat = new NotificationChannel(CHAT, "Messaggi chat", NotificationManager.IMPORTANCE_HIGH);
        chat.setDescription("Nuovi messaggi dei tuoi amici");
        NotificationChannel bonus = new NotificationChannel(BONUS, "Bonus giornalieri", NotificationManager.IMPORTANCE_DEFAULT);
        bonus.setDescription("Promemoria dei bonus disponibili");
        nm.createNotificationChannel(friends);
        nm.createNotificationChannel(chat);
        nm.createNotificationChannel(bonus);
        NotificationChannel gameInvites = new NotificationChannel(INVITES, "Inviti a giocare", NotificationManager.IMPORTANCE_HIGH);
        gameInvites.setDescription("Richieste private per entrare o assistere a una partita");
        nm.createNotificationChannel(gameInvites);
    }

    @Override public void onNewToken(String token) {
        super.onNewToken(token);
        MainActivity.syncPushToken(getApplicationContext(),token);
    }

    private static String safeUid(String s){return s!=null&&s.length()<=128&&s.matches("[A-Za-z0-9:_-]+")?s:"";}
    private static String safeName(String s){return s!=null&&s.length()>0? s.replaceAll("[\\r\\n\\t]"," ").substring(0,Math.min(24,s.length())):"un giocatore";}

    @Override public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        // Never show a push meant for an account that was signed out or replaced.
        String recipientUid = data.get("recipientUid");
        com.google.firebase.auth.FirebaseUser current =
            com.google.firebase.auth.FirebaseAuth.getInstance().getCurrentUser();
        if (current == null || recipientUid == null ||
            !recipientUid.equals(current.getUid())) return;
        String type = data.get("type");
        String channel;
        String title;
        String body;
        if ("friend_request".equals(type)) {
            channel = FRIENDS;
            title = "Nuova richiesta di amicizia";
            body = "Hai ricevuto una richiesta di amicizia da "+safeName(data.get("senderNickname"));
        } else if ("chat_message".equals(type)) {
            channel = CHAT;
            title = "Nuovo messaggio";
            body = "Nuovo messaggio da "+safeName(data.get("senderNickname"));
            MainActivity.notifyIncomingChat(safeUid(data.get("senderUid")));
        } else if ("game_invite".equals(type)) {
            if (data.get("inviteId") == null || !data.get("inviteId").matches("[0-9a-fA-F-]{36}")) return;
            channel = INVITES;
            title = "Invito a giocare";
            body = safeName(data.get("senderNickname")) + " ti ha invitato a Napoli Carte 3D";
        } else if ("daily_bonus".equals(type)) {
            channel = BONUS;
            title = "Bonus giornaliero disponibile";
            body = "Apri Napoli Carte 3D per riscattare il bonus";
        } else {
            return; // Ignore unexpected payload types.
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        createChannels(this);
        // Distinct actions prevent FLAG_UPDATE_CURRENT from redirecting older notifications
        // to the sender of the newest chat message or friend request.
        String messageId = message.getMessageId();
        if (messageId == null || messageId.isEmpty()) messageId = java.util.UUID.randomUUID().toString();
        int notificationId = messageId.hashCode() & 0x7fffffff;
        Intent intent = new Intent(this, MainActivity.class)
            .setAction(getPackageName() + ".PUSH." + messageId)
            .putExtra(EXTRA_DESTINATION, channel)
            .putExtra("notification_sender_uid",safeUid(data.get("senderUid")))
            .putExtra("notification_sender_name",safeName(data.get("senderNickname")))
            .putExtra("notification_invite_id",INVITES.equals(channel)?data.get("inviteId"):"")
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(this, notificationId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(open)
            .setPriority(channel.equals(BONUS) ? NotificationCompat.PRIORITY_DEFAULT : NotificationCompat.PRIORITY_HIGH)
            .build();
        NotificationManager nm = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(notificationId, notification);
    }
}
