# NAPOLI CARTE 3D — WINDOWS EDITION 0.3

## Stato reale (27 novembre 2026)

Questo ZIP contiene il **port desktop Electron** e un compilatore Windows, non un installer `.exe` gia compilato. Riutilizza i **19 giochi** Android 9.10.0 e ne conserva le risorse: tavoli, regole, carte, animazioni, audio originale, menu e grafica. Non include i file Android completi per ragioni di dimensioni: il compilatore li scarica dal commit approvato `a0f632e9ad88bf71590b5e5a5312d92f7995ab1d` di `alo986761986-gif/alo986626`.

### Cosa e stato migliorato nella 0.3

- Riparata la modalita *Ospite*: chiude davvero l'eventuale sessione precedente prima di entrare nel gioco.
- Integrato il flusso facoltativo **Google OAuth Desktop** tramite browser di sistema con PKCE, stato e callback locale sicuro, con scambio Firebase. Per attivarlo occorre un client OAuth **Desktop** registrato nello **stesso progetto Firebase** e il consenso/configurazione Google corretti. Senza configurazione il pulsante Google rimane disabilitato.
- Controlli di sicurezza del microfono e notifiche tramite il permesso del protocollo locale; no condivisione schermo consentita per impostazione predefinita.
- Supporto voci italiane Windows tramite le voci installate in Windows/Chromium.
- Compilatore Windows che estrae dal repository **solo le risorse necessarie**, evitando di copiare directory Android con percorsi molto lunghi.
- Installer SETUP e EXE PORTABLE **con nomi differenti**: non si sovrascrivono piu a vicenda.
- Verifica catalogo 19 giochi, integrita dell'index e SHA256 del brano originale prima della build.
- Test del callback OAuth e del catalogo, verifiche di sicurezza e script di compilazione.

### Miglioramenti introdotti nella versione 0.3
- Collegate al processo Electron, con endpoint limitati, le richieste multiplayer degli 11 giochi espansi e lo stato lobby. Le API del server rimangono quelle originali; nessun server di gioco modificato.
- Verifica del protocollo personalizzato `napoli://`, dei permessi microfono, e protezione da accessi a endpoint non autorizzati.
- Corretta la pipeline Windows remota: usa `windows-edition` come working directory, copia le risorse Android approvate e ricostruisce il brano prima di compilare.
- Aggiunti test automatici delle richieste multiplayer e della sicurezza IPC. L'EXE resta da produrre e collaudare su Windows.
  
## Come generare i due file EXE

1. Estrai lo ZIP sul tuo PC Windows 10 o Windows 11 a 64 bit, per esempio in `C:\NAPOLI_WINDOWS`.
2. Apri la cartella `napoli-windows-edition` e fai doppio clic su **BUILD-WINDOWS.cmd**. La prima volta serve Internet.
3. Lo script scarica Node.js 24 dal sito ufficiale, verifica SHA256, poi scarica dal repository GitHub il codice Android 9.10 del gioco, ripristina l'audio, installa Electron 45.5.0 e electron-builder 26.18.0, esegue i test e costruisce i due programmi.
4. Se tutto riesce, trovi in **OUTPUT**: `NAPOLI_CARTE_3D_WINDOWS_SETUP_0.3.0_x64.exe` e `NAPOLI_CARTE_3D_WINDOWS_PORTABLE_0.3.0_x64.exe`.

Il pacchetto **non ha una firma Authenticode Windows**; una distribuzione al pubblico richiede una firma valida e collaudo antivirus/SmartScreen. Non disabilitare antivirus o SmartScreen per aggirare avvisi.

## Login e sincronizzazione con Android

- **Ospite**: offline e saldo locale separato dal proprio account; non conserva l'account precedente.
- **Email e password Firebase**: adapter REST che riusa lo stesso progetto del gioco Android. La chiave Web potrebbe essere soggetta a restrizioni API sul progetto: in quel caso imposta la variabile ambiente `NAPOLI_FIREBASE_WEB_API_KEY` con una chiave Web autorizzata dello stesso progetto. La sessione refresh viene conservata con `safeStorage` se disponibile.
- **Google (opzionale)**: configura nel progetto Google Cloud/Firebase un client OAuth di tipo **Desktop app** con accesso Google abilitato, quindi definisci `NAPOLI_GOOGLE_DESKTOP_CLIENT_ID` con il Client ID completo (esempio: `123456789-example.apps.googleusercontent.com`) prima di avviare il programma. Se il client non e autorizzato in Firebase, Google rifiuta l'accesso; nessuna credenziale viene simulata.
- **Amici, nickname, statistiche, chat, missioni, bonus e market**: ponte desktop autenticato con token Firebase e gli endpoint del server attuale. Le funzioni dipendono dalle autorizzazioni server e dalla disponibilita online.
- **Multiplayer 19 giochi**: usa i motori e gli indirizzi esistenti Android. Cross-play Windows/Android **non ancora verificato** su dispositivi reali; non dichiarato garantito.

## Cosa NON e ancora equivalente alla versione Android

1. **Acquisti**: Google Play Billing Android non puo eseguire acquisti sul desktop. Il pulsante Windows non addebita nulla e non accredita crediti fittizi. Serve un sistema Windows autorizzato e verifica server.
2. **Annunci premio**: AdMob Android non e riutilizzabile come se fosse desktop. Nessun bonus viene generato senza verifica del server.
3. **Notifiche FCM Android**: su Windows la versione iniziale usa polling delle notifiche account, non token FCM.
4. **Google Sign-In**: il codice Desktop e pronto ma il flusso reale richiede la registrazione del client OAuth del progetto; non testato con un account reale.
5. **Esecuzione `.exe`**: in questo ambiente non c'erano accesso a npm/GitHub per scaricare le dipendenze ne un computer Windows; non posso certificare l'installazione o tutte le partite. I test locali sono test statici / unitari e il test end-to-end rimane necessario.

## Verifiche necessarie prima della release definitiva

- Installer e portable eseguiti su Windows 10 e 11.
- Tutte le **19** modalita CPU: apertura, tre turni, chiusura partita, salvataggio e ritorno al menu.
- Multiplayer Windows vs Android per ogni gioco, sfide in coppia e amici / chat / audio vocale con due account distinti.
- Login email/password e Google, cambio account, logout, rigenerazione token e ripristino sessione.
- Market, crediti, missioni e bonus con backend autorizzato e senza discrepanze di saldo.
- Display 1366x768, Full HD e 4K; prova delle carte sul tavolo e dei pulsanti.
- Firma Authenticode e verifica antivirus prima di distribuire l'app al pubblico.

## Repository e librerie

Repository Android utilizzato: `https://github.com/alo986761986-gif/alo986626` · Commit `a0f632e9ad88bf71590b5e5a5312d92f7995ab1d`.

Tecnologia desktop: Electron 45.5.0, electron-builder 26.18.0. Tutti gli URL remoti sono limitati agli host gia configurati dal gioco; nessun proxy arbitrario e nessun token Firebase esposto al WebView. Le credenziali restano in main process Electron.
