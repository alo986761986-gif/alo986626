# Napoli Carte 3D v2.4 - UI & microfono

- Chat e Microfono spostati in una barra persistente fra l'intestazione e il tavolo: nessuna sovrapposizione al pulsante Esci dal tavolo.
- Il pannello chat espande la pagina senza oscurare le carte e conserva il testo digitato durante gli aggiornamenti di partita.
- Android: dichiarato MODIFY_AUDIO_SETTINGS oltre a RECORD_AUDIO.
- HTML incluso nell'APK caricato con androidx.webkit.WebViewAssetLoader da origine HTTPS locale anziche' da loadDataWithBaseURL.
- Microfono: acquisizione audio di base compatibile, miglioramento audio opzionale, retry per fallimenti temporanei e messaggio diagnostico comprensibile.
- Sei giochi e server multiplayer invariati.
- Restano necessari test con microfoni reali e configurazione TURN per le reti con NAT restrittivi.
