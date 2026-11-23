# NAPOLI CARTE 3D — Versione 1.0 (prototipo)

Applicazione Android e gioco browser per sei giochi con carte napoletane. Contiene un motore condiviso di logica per match singoli, bot e tavoli tra giocatori. La grafica usa CSS prospettico (effetto tridimensionale 2.5D), **non un motore 3D nativo**. Le facce delle carte sono rappresentazioni stilizzate e non riproduzioni fedeli delle carte napoletane tradizionali.

## Contenuti

- `frontend/index.html`: lobby, tavolo 2.5D, carte cliccabili, regole, profili nickname, bot e matchmaking.
- `backend/engine.js`: regole e punteggio dei sei giochi, turni, prese, seme di briscola, server-authoritative play.
- `backend/local-server.js`: server per test locali con Node.js 22+.
- `backend/railway-function.ts`: server completo con web frontend incluso, pronto per creare una **Railway Function** (unico file Bun TypeScript).
- `backend/build_function.py`: aggiorna il file della funzione dopo modifiche a HTML/motore.
- `android/`: progetto Android Studio/Gradle, minSdk 21 (Android 5.0), applicazione con WebView e icone personalizzate.
- `.github/workflows/android-apk.yml`: script automatico GitHub Actions per produrre un APK debug.
- `tests/engine.test.js`: partite complete automatiche di ogni gioco a due e quattro giocatori.

## Limitazioni attuali da conoscere

1. **Il server globale non è stato pubblicato.** Il piano Railway collegato non consente un nuovo progetto (errore: «Free plan resource provision limit exceeded»). Per giocare su Internet devi pubblicare il codice e impostare l'indirizzo HTTPS nel progetto Android.
2. **Non è stato compilato un APK in questo ambiente**: mancano Android SDK, Gradle e accesso diretto ai repository di dipendenze. Il progetto può essere compilato su una macchina con Android Studio o con GitHub Actions.
3. I tavoli e i token sono tenuti **solo nella memoria del processo server**. Un riavvio annulla i tavoli; non c'è salvataggio permanente, login, classifiche o sistema antispam avanzato. Per scalare a molte repliche nel mondo serve database/Redis e autorizzazioni più robuste.
4. Il matchmaking usa code globali per gioco e numero di giocatori, senza codici di stanza, inviti o friend list. Online ci vogliono 2 o 4 giocatori reali collegati contemporaneamente.
5. Questa release realizza varianti specifiche: Scopa classica, Scopone scientifico a 10 carte, Briscola a 2 o 4, Sette e mezzo senza matta e senza puntate, Asso piglia tutto con asso che raccoglie tutte le carte, Rubamazzetto individuale. Regole locali possono differire.
6. La release è **sperimentale**: test logici completati, ma nessun test APK su telefoni reali né test di carico multiplayer. Il server usa HTTP request/polling a 1,9 secondi, non WebSocket.

## Avvio locale

```bash
node backend/local-server.js
```

Apri `http://localhost:3000` su un browser desktop. Il test motore si esegue con:

```bash
node tests/engine.test.js
```

## Server online (Railway Function)

Crea un nuovo progetto Railway, aggiungi una Function, incolla il contenuto di `backend/railway-function.ts`. Dopo che la funzione è online, aggiungi un dominio pubblico HTTPS. Controlla `https://DOMINIO/api/health`: deve rispondere con `{"ok":true,...}`. Tutti gli APK devono usare lo **stesso** URL per condividere i tavoli.

Il piano Railway attuale risulta già al limite di provision di risorse: prima sarà necessario liberare risorse in modo consapevole o aggiornare il piano. Non eliminare progetti esistenti senza verificarne l'uso.

## Compilazione APK

1. Configura prima un server HTTPS funzionante.
2. Apri `android/app/src/main/assets/server_url.txt` e inserisci **unicamente** l'URL del server, per esempio `https://tuo-dominio.up.railway.app`.
3. Apri la cartella `android` in Android Studio, con Android SDK 35 e JDK 17.
4. Esegui `Build > Build APK(s)` oppure `gradle assembleDebug` dalla cartella `android` (Gradle 8.9).
5. Troverai `app-debug.apk` in `android/app/build/outputs/apk/debug/`.

Puoi anche caricare tutta questa cartella in un repository GitHub e avviare il workflow **Android APK build**. L'APK debug generato è installabile per test; non è una build firmata per Google Play. Se l'indirizzo server è vuoto, l'APK si apre comunque su una schermata di configurazione e regole, anziché far finta che il multiplayer sia operativo.

## Sicurezza e GDPR

Non raccogliere email o dati personali senza informative e sistemi adeguati. Qui i nickname e i token di sessione sono in memoria; pubblicare per utenti globali richiede moderazione, rate limit, privacy policy, logging, misure antiabuso, monitoraggio e un database. Sette e mezzo è esclusivamente a punti e non prevede denaro reale.
