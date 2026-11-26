# Build e verifica NAPOLI CARTE 3D 9.3

Questa pipeline aggiorna il builder Render già esistente. La base letta è
`alo986761986-gif/alo986626`, commit
`c1c61bfcc79c755052406adc99e93146c24de749` (versione 9.2).
Il risultato previsto è una release **9.3.0 / versionCode 93**, con 19 giochi:
i sei classici, Chiodo, Il Banco e undici nuovi motori. Scopone resta contato
una sola volta tra i classici già presenti.

## Avvio

```sh
bash tools/render-build-apk82.sh
```

Il builder richiede Linux x86_64, Node.js 20 o successivo, npm e i normali
strumenti da riga di comando elencati all’inizio dello script. Usa le quattro
variabili di firma già configurate: `UPLOAD_KEYSTORE_BASE64`,
`UPLOAD_STORE_PASSWORD`, `UPLOAD_KEY_ALIAS`, `UPLOAD_KEY_PASSWORD`.
Non crea chiavi sostitutive e non produce un APK debug come risultato finale.
Il keystore decodificato esiste solo nella directory temporanea e viene
eliminato anche in caso di errore.

`tools/build93-manifest.json` contiene versioni, hash attesi, asset obbligatori
e nomi dei test. JDK, Gradle e Android Command-line Tools hanno SHA-256 attesi
fissati. La versione della piattaforma Android è 36 e i Build Tools sono
35.0.0, richiesti dall’Android Gradle Plugin del progetto.

## Ordine delle verifiche

1. Scarica l’APK 9.2 pubblico, necessario al confronto del certificato.
2. Ripristina la musica originale dai venti frammenti già nel repository.
3. Controlla sintassi, CommonJS sotto `app/package.json`, moduli app/server
   identici, catalogo degli undici motori, classici preservati e asset.
4. Esegue i quattordici file di test elencati nel manifest con `node --test`.
5. Esegue da zero il collaudo Playwright: 22 casi dei giochi nei due formati
   di schermo e un caso online con due sessioni separate.
6. Stampa `NC93_PREDEPLOY_QA_PASSED`, punto dal quale il coordinatore può
   pubblicare il backend 9.3 già verificato. Lo script non modifica il backend.
7. Compila `:app:assembleRelease` con la configurazione di firma esistente.
8. Verifica l’APK: manifest, firma, certificato, ZIP, asset, musica e icone.
9. Attende al massimo cinque minuti il catalogo 9.3 sul backend HTTPS
   e verifica un tavolo Tressette privato con due partecipanti umani.
10. Solo dopo tutti gli esiti positivi prepara APK e rapporti in `dist`.

I processi dei test ricevono un ambiente privo di `DATABASE_URL` e delle
credenziali di firma. `test-formats-feedback78.js` e `test-profile79.js`
richiedono un database locale e sono esclusi dalla pipeline APK; il primo
contiene anche scritture dei report di assistenza e non è un test senza DB.
`test-social-daily-routes.js` verifica invece le risposte di autenticazione
su un server HTTP locale e può essere eseguito senza database.

Le sole modifiche ai quattro test storici Banco/Club/Premium sono l’aggiunta
di 93 e 9.3.0 alle regex delle versioni accettate. Il verificatore del bundle
e quello dell’APK richiedono sempre esattamente 93 / 9.3.0.

## Browser e riproducibilità

Playwright 1.65.1 viene installato in una directory temporanea con gli script
di installazione disabilitati. Il relativo `package-lock.json` viene copiato
nei rapporti. Chrome Headless Shell 158.0.8127.88 viene scaricato dal dominio
ufficiale di Chrome for Testing; URL e versione vengono confrontati con
il manifest ufficiale.

Il manifest Chrome for Testing **non pubblica un SHA-256**. Di conseguenza
`expectedSha256` è `null`: il report conserva lo SHA-256 calcolato sul file
scaricato e dichiara che non è stato confrontato con un checksum ufficiale.
Non confonde questo dato con una verifica contro un hash atteso. Per JDK,
Gradle e Android Command-line Tools, invece, il confronto con l’hash atteso
è obbligatorio.

La pipeline controlla le librerie condivise del browser con `ldd`: se
nell’immagine Render ne manca una, si ferma riportando i nomi effettivi.
Non salta il collaudo dell’interfaccia. Il rapporto registra la versione
effettiva del browser e le revisioni degli strumenti Android installati.

## Firma e contenuto dell’APK

`tools/verify-release-apk93.cjs` esegue `apksigner verify --verbose
--print-certs` sia sul nuovo APK sia sul precedente. Le impronte SHA-256
dei certificati devono essere identiche. Il nuovo APK deve avere una firma
v2 o v3 valida e non può usare un certificato Android Debug.

Il manifest deve indicare `it.napolicarte.game`, versione 9.3.0 / 93,
minSdk 24 e targetSdk 36; `debuggable` deve essere falso. Il pacchetto
precedente deve essere la versione 92 dello stesso applicationId.

Tutti i file della directory sorgente degli asset vengono confrontati
byte per byte con il contenuto del nuovo APK, oltre al controllo CRC ZIP.
I 50 asset obbligatori sono elencati nel manifest. Il numero effettivo
rimane registrato nel rapporto: spostare `package.json` fuori dagli asset
non deve far fallire un conteggio storico di 51.

La musica deve avere 11.464.051 byte e SHA-256
`fa8d6915ed5cbbef467a345eae1cfeecf46e6fd84cba5fd07580d41715865226`.
Le cinque icone sorgente devono conservare il blob Git originale
`fdec54a0262337de36b8365ecda1510ab6a261c5`. Nel pacchetto vengono controllati
presenza, formato PNG e dimensioni per tutte le densità; il report registra
anche gli hash degli asset compilati e il confronto con il precedente APK.

## Collaudo online

Il test usa esclusivamente `/expansion/catalog`, `/expansion/join`,
`/expansion/state`, `/expansion/move` e `/expansion/leave`.
Il catalogo deve dichiarare 9.3.0 e tutti gli undici giochi.
Il primo partecipante crea una sala privata; il secondo entra tramite
`state.code`. Entrambe le viste devono essere coerenti, mostrare due umani,
nascondere le mani avversarie e contenere mani distinte.

Ogni partecipante gioca una carta. Ripetere la stessa richiesta non deve
incrementare nuovamente la revisione. Il test ricarica entrambe le sessioni
e infine le chiude, anche in caso di errore. Il report pubblico contiene
solo conteggi ed esiti: non contiene token, codici invito o identificativi
delle carte. Non chiama portafoglio, acquisti o matchmaking pubblico.

Il test online del browser usa invece il servizio Node reale intercettato
dal collaudo locale: il report lo distingue dalla prova HTTPS sul backend
pubblicato. Un esito UI storico non viene riutilizzato per una nuova build.

## File prodotti

- `NAPOLI_CARTE_3D_9_3_19GIOCHI_FIRMATO.apk`: nuova release.
- `NAPOLI_CARTE_3D_9_2_FINALE_FIRMATO.apk`: archivio originale, conservato
  per rendere ripetibile il confronto del certificato nei rebuild successivi.
- `SHA256SUMS.txt`: hash dei due APK.
- `qa/release.json`: riepilogo con commit sorgente, versione, certificato
  e conteggi delle verifiche.
- `qa/bundle.json`, `qa/apk.json`, `qa/live.json`: risultati dettagliati.
- `qa/ui/report.json` e schermate: nuovo collaudo dell’interfaccia.
- `qa/node-tests.tap`: output completo della suite Node.
- `qa/toolchain.json`, `qa/chrome-source.json`,
  `qa/playwright-package-lock.json`: provenienza e versioni degli strumenti.

## Verifica di un APK scaricato

Usare il checkout del commit indicato da `qa/release.json`, con la musica
ripristinata, e un SDK contenente Build Tools 35.0.0. Il seguente comando
confronta il nuovo pacchetto con il precedente senza modificarli:

```sh
bash server/restore_bass_audio.sh
node tools/verify-release-apk93.cjs \
  --apk /percorso/NAPOLI_CARTE_3D_9_3_19GIOCHI_FIRMATO.apk \
  --previous /percorso/NAPOLI_CARTE_3D_9_2_FINALE_FIRMATO.apk \
  --sdk /percorso/android-sdk \
  --source "$PWD" \
  --report /percorso/verifica-apk93.json
```

Questi controlli non sostituiscono l’installazione e l’uso su telefoni Android
fisici. La presenza integra della musica non prova da sola la riproduzione
audio con le impostazioni e i permessi di un particolare telefono.

## Fonti degli strumenti

- [Chrome for Testing: manifest e download](https://github.com/GoogleChromeLabs/chrome-for-testing).
- [Playwright 1.65.1](https://github.com/microsoft/playwright/releases/tag/v1.65.1).
- [Playwright: configurazione CI](https://playwright.dev/docs/ci).
- [Temurin 17.0.21.1+2](https://github.com/adoptium/temurin17-binaries/releases/tag/jdk-17.0.21.1%2B2).
- [Android apksigner](https://developer.android.com/tools/apksigner).
- [Android AAPT2 e compilazione delle risorse](https://developer.android.com/tools/aapt2).
