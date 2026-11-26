# NAPOLI CARTE 3D 9.3

## Ambito

La base distribuita 9.2 comprende otto giochi e modalità: Scopa, Scopone scientifico, Briscola, Sette e mezzo, Asso piglia tutto, Rubamazzetto, Chiodo 121 e Il Banco/Tombola. Le modalità offline e online dello stesso gioco non vengono contate due volte.

Il progetto originario dei dodici giochi comprende lo Scopone scientifico, già presente. Questa espansione aggiunge quindi undici motori distinti e porta il catalogo a diciannove.

| Voce del progetto | Stato in 9.3 | Giocatori |
| --- | --- | --- |
| Scopone scientifico | Già disponibile, mantenuto nella voce Scopone | 4 |
| Tressette | Aggiunto, CPU e online | 2, 4 |
| Traversone | Aggiunto, CPU e online | 3, 4, 5 |
| Tressette col morto | Aggiunto, CPU e online | 3 |
| Briscola chiamata | Aggiunto, CPU e online | 5 |
| Bestia | Aggiunto, CPU e online | 3, 4, 5, 6, 7, 8, 9, 10 |
| Trentuno | Aggiunto, CPU e online | 2, 3, 4, 5, 6, 7, 8 |
| Cirulla | Aggiunto, CPU e online | 2, 4 |
| Cucù | Aggiunto, CPU e online | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 |
| Asino · Quartetti | Aggiunto, CPU e online | 3, 4, 5, 6, 7, 8 |
| Dubito / Bugiardo | Aggiunto, CPU e online | 3, 4, 5, 6, 7, 8 |
| Mercante in Fiera | Aggiunto, CPU e online | 3, 4, 5, 6, 7, 8 |

## Comportamento

- Gli undici nuovi giochi condividono le medesime regole tra app e server. Le copie in `app/src/main/assets` e `chiodo-server/games` devono essere identiche.
- Le partite CPU funzionano senza rete. L'online ricerca persone reali, separa gioco e numero di posti, permette inviti privati e mostra esplicitamente gli avversari CPU.
- Dopo trenta secondi il creatore può scegliere di riempire i posti mancanti con CPU. Il turno ha un limite di sessanta secondi e, alla scadenza, il server applica una mossa lecita.
- Le mani avversarie restano private. Il server verifica azioni, turno e revisione; una richiesta già accettata con lo stesso identificativo non viene applicata due volte.
- I nuovi giochi usano punti interni alla partita. Non prelevano crediti dal portafoglio, non effettuano acquisti e non assegnano ricompense al conto.
- Chi lascia una partita online viene sostituito da CPU. Una sala senza partecipanti umani viene eliminata. Le sale risiedono nella memoria del processo e non sopravvivono al riavvio del server.
- Le funzioni esistenti di Banco, Premium Club, musica, account, market, premi e messaggi sono preservate.
- Chiodo 121 a coppie somma i punti dei posti alternati, distingue fine mano da fine partita e assegna correttamente il risultato della squadra.

## Varianti dichiarate nell'app

### Tressette

Partita breve di una smazzata, senza accusi. Nessuna briscola: obbligo di rispondere al seme. Ordine di presa: 3, 2, Asso, Re, Cavallo, Fante, 7, 6, 5, 4. Asso 1 punto; 2, 3 e figure un terzo; ultima presa 1 punto. Si sommano i terzi della squadra e solo alla fine si arrotonda per difetto: 11 punti complessivi. A quattro, coppie alternate 1+3 contro 2+4. A due, variante con 10 carte ciascuno e 20 nel tallone: dopo ogni presa pesca prima chi ha preso, poi l’altro, mostrando le due carte pescate. Vince chi ottiene più punti.

### Traversone

Traversone a 3, 4 o 5: una smazzata, ognuno per sé, senza accusi. Ordine e obbligo di seme del Tressette; vince chi fa meno penalità. A tre, il mazziere riceve 14 carte, gli altri 13: il mazziere scarta una carta coperta, assegnata a chi fa l’ultima presa. Gli altri arrotondano per difetto; chi fa l’ultima presa riceve i punti mancanti fino a 11. Cappotto: chi ottiene tutti gli 11 punti segna 0, ciascun avversario 11. Parità ammessa.

### Tressette col morto

Tressette col morto: tre persone e quattro mani da 10 carte, una sola smazzata senza accusi. Il posto 1 è solista e controlla anche il morto, seduto di fronte: ordine fisico solista, difensore 1, morto, difensore 2. Comincia il primo difensore. La mano del morto si scopre dopo la prima carta giocata e diventa pubblica. Ogni mano deve rispondere al seme separatamente. Solista+morto contro i due difensori; punti in terzi sommati per squadra prima dell’arrotondamento, ultima presa 1 punto, totale 11.

### Briscola chiamata

Briscola chiamata in cinque: una smazzata, 8 carte ciascuno. Variante con asta crescente a punti da 61 a 120; chi passa esce dall’asta. Se tutti gli altri passano senza offerte, l’ultimo deve aprire almeno a 61. Il vincitore chiama una carta che non possiede: il seme diventa briscola e il possessore è il socio segreto. Il socio viene rivelato pubblicamente solo quando gioca quella carta. Nessun obbligo di seme. Asso 11, Tre 10, Re 4, Cavallo 3, Fante 2; altre carte 0, totale 120. Chiamante e socio devono raggiungere il contratto; altrimenti vincono gli altri tre. Nessuna puntata o denaro reale.

### Bestia

Bestia sportiva: una smazzata, 3–10 giocatori, tre carte a testa. Passa oppure gioca, cambiando da zero a tre carte entro quelle rimaste nel tallone; senza rientro al buio. La carta scoperta indica la briscola. Ordine: Asso, 3, Re, Cavallo, Fante, 7, 6, 5, 4, 2. Devi seguire il seme; se non lo possiedi devi giocare briscola. Chi apre una presa deve usare l’Asso di briscola, se lo possiede; se l’Asso è la carta scoperta, deve usare il 3. Chi vince apre la presa seguente. Ogni presa vale un punto; chi partecipa senza prenderne nessuna va in bestia: −3 punti. Chi passa segna zero. Vince chi realizza più prese. Un unico partecipante ottiene le tre prese; se passano tutti la smazzata è annullata. Punti di partita, senza puntate o addebiti.

### Trentuno

Trentuno rapido, una sola smazzata per 2–8 giocatori. Ricevi tre carte. Conta il seme che totalizza di più: Asso 11, figure 10, le altre il numero. Il tris non dà bonus. Al tuo turno pesca dal mazzo coperto o prendi l’ultimo scarto, poi scarta una carta. Dal secondo giro puoi bussare invece di pescare: ogni altro giocatore dispone di un ultimo turno. Un 31 con tre carte chiude subito, anche alla distribuzione. Vince il punteggio più alto; le parità sono condivise. Questa modalità termina al massimo dopo dieci giri completi, oppure dopo la conclusione del giro finale di una bussata già effettuata. Il tallone non si rimescola: quando è vuoto restano lo scarto e la bussata. Nessuna vita da comprare, puntata o variazione del portafoglio.

### Cirulla

Cirulla a smazzata unica: due giocatori oppure quattro a coppie alternate. Tre carte a testa e quattro in tavola; con due assi iniziali si ridistribuisce. Puoi prendere per valore uguale, per somma uguale o formando 15 insieme alla carta giocata; una presa disponibile è obbligatoria, ma puoi scegliere fra tutte. L’Asso prende un Asso presente, altrimenti tutto il tavolo; sul vuoto si scarta. Svuotare il tavolo vale una scopa, esclusa l’ultima giocata. Accusi automatici al primo turno di ogni distribuzione: somma ≤9 vale 3, tris vale 10; prevale il Decino, senza cumulo. Il 7 di Coppe è matta solo per un accuso: vale 1 nella Cirulla o il valore del tris; se scartato torna 7. Tavolo iniziale da 15/30: raccolto dal mazziere, +1/+2. A fine smazzata: scope e accusi, carte, denari, settebello, primiera, Grande (figure di Denari: 5), Piccola (1–2–3 Denari: 3, più consecutivi fino al 6). Tutti i Denari fanno cappotto e vittoria immediata. Altrimenti vince il totale maggiore, con parità condivisa. Punti locali, nessuna puntata.

### Cucù

Variante napoletana a 3 vite, per 2–20 giocatori. Una carta coperta a testa: Asso vale 1, Fante 8, Cavallo 9 e Re 10. Dal giocatore dopo il mazziere, ognuno tiene la carta oppure la scambia col vicino successivo; il Re del vicino blocca lo scambio e si mostra. Il mazziere può cambiare con la prima carta del mazzo: un Re estratto blocca anche questo cambio. In questa variante il Cavallo non salta il vicino. Dopo il giro si scoprono le carte: tutti i valori minimi perdono una vita, anche a pari merito. Chi esaurisce le vite viene eliminato; vince l’ultimo in gioco. Se gli ultimi rimasti esauriscono insieme le vite, condividono la vittoria. Le vite sono solo punti di questa partita.

### Asino · Quartetti

Variante digitale dei quartetti, per 3–8 giocatori: si usano tanti valori quanti sono i partecipanti, quattro carte per valore e quattro carte a testa. Ogni giocatore sceglie in segreto una carta da passare al vicino successivo. Le scelte si fanno a turno, ma tutte le carte vengono trasferite insieme solo quando hanno scelto tutti: nessuno vede in anticipo il passaggio altrui. Vince chi riunisce quattro carte dello stesso valore; se più quartetti si completano nello stesso giro, la vittoria è condivisa. Questa variante non usa la prova di riflessi dei tappi né le lettere di penalità. Dopo 60 giri senza quartetti la partita termina in parità.

### Dubito / Bugiardo

Variante digitale a una carta per turno, per 3–8 giocatori, con un mazzo napoletano da 40 distribuito interamente. Le dichiarazioni obbligatorie avanzano da Asso a Re e poi ripartono dall’Asso. Si sceglie una carta coperta, anche mentendo sul valore richiesto. Il giocatore successivo può credere oppure dire «Dubito»: se la dichiarazione era falsa, chi ha mentito prende tutto il mucchio; se era vera, lo prende chi ha dubitato. Dopo una contestazione riparte chi aveva ragione, con il valore successivo. Una mano vuota vince solo dopo che l’ultima dichiarazione è stata accettata o provata vera. Per la modalità rapida, dopo 400 giocate valide vince chi conserva meno carte, ma solo dopo la relativa contestazione. Nessun valore delle carte coperte è mostrato agli avversari.

### Mercante in Fiera

Variante digitale per 3–8 giocatori, con due mazzi napoletani coordinati da 40 carte: blu per i giocatori e rosso per estrazioni e premi. Sono figure napoletane, non il mazzo illustrato tradizionale. Ognuno parte con 100 punti del tavolo, totalmente separati dai crediti dell’app; 10 punti a testa formano il montepremi iniziale. Le carte blu iniziali sono distribuite in quantità uguale, le rimanenti vendute una alla volta con offerte crescenti e possibilità di passare. Chi passa esce dall’asta del lotto. Un lotto senza offerte viene assegnato gratuitamente al partecipante di turno. Gli incassi aumentano il montepremi. Dal mazzo rosso si riservano quattro carte segrete: le altre 36 eliminano le corrispondenti blu. I quattro premi valgono il 10%, 20%, 30% e il resto del montepremi, senza perdere punti per arrotondamento. Vince il saldo finale più alto: punti risparmiati più premi. Niente scambi privati, denaro, acquisti o addebiti nel portafoglio dell’app.

## Verifica di rilascio

La compilazione configurata su Render esegue i test Node, confronta i moduli condivisi e prova tutti gli undici nuovi giochi in due viewport (360×640 e 800×360), oltre a una partita tra due contesti browser indipendenti. Successivamente compila l'APK release e confronta il suo certificato con quello dell'APK 9.2.

Il controllo HTTPS usa esclusivamente un tavolo Tressette privato temporaneo con due sessioni, verifica mani separate, mosse e richieste idempotenti, quindi chiude le sessioni. Non usa il matchmaking pubblico né il portafoglio.

Il risultato effettivo della distribuzione è contenuto in `qa/release.json` sul sito di download, insieme ai rapporti Node, UI, APK e online. La presenza di questi script nel repository non costituisce da sola prova di una build riuscita.

Non è stato eseguito un collaudo su telefoni fisici. La compatibilità dichiarata dal manifest è Android 7 o superiore (minSdk 24), con targetSdk 36; l'APK finale deve riportare versionName 9.3.0 e versionCode 93.

## Manutenzione

Prima di pubblicare modifiche alle regole eseguire `python3 tools/sync-expansion-engines.py`, poi la suite elencata in `tools/build93-manifest.json`. Il builder di rilascio è `tools/render-build-apk82.sh`.

Il backend degli undici nuovi giochi è `https://napoli-chiodo-121.onrender.com/expansion/`; il file `server_url.txt` continua a identificare il servizio dei giochi classici.

## Preparazione dell'HTML

Il file HTML di base 9.2 rimane nel repository. Il catalogo 9.3 viene generato da `tools/prepare-expansion-index.cjs` con sostituzioni puntuali, controllo dell'impronta della base e verifica idempotente. La pipeline lo esegue prima dei test; anche il task Gradle `preBuild` lo richiama. Le verifiche UI e APK riguardano l'HTML generato. Il codice sorgente della trasformazione è quindi parte necessaria della build e richiede Node.js.
