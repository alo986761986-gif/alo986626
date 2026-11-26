# Espansione sociale — varianti implementate

Questi quattro motori sono condivisi dall’app e dal server. Non accedono al
portafoglio, ai premi pubblicitari o agli acquisti dell’app. Le regole riportate
qui sono le stesse esposte dalla proprietà `rules` di ciascun motore.

| Gioco | Partecipanti | Variante e conclusione |
| --- | --- | --- |
| Cucù | Ogni numero intero da 2 a 20 | Mazzo napoletano, una carta a testa, tre vite. Re protetto; Cavallo senza poteri speciali. Si cambia col vicino o, per il mazziere, con il mazzo. Tutti i minimi perdono una vita. Vince l’ultimo superstite; eliminazione contemporanea degli ultimi significa vittoria condivisa. |
| Asino · Quartetti | 3–8 | Quattro carte per ciascuno, tanti valori quanti i giocatori. Le scelte private sono effettuate a turno e le carte passano insieme. Il quartetto vince; quartetti contemporanei condividono l’esito. Non c’è una prova di riflessi né una penalità per la latenza della rete. Dopo 60 giri senza quartetto la partita è pari. |
| Dubito / Bugiardo | 3–8 | Un mazzo da 40, una carta coperta per turno, dichiarazioni obbligatorie Asso→Re. Il successivo accetta o contesta; chi sbaglia raccoglie il mucchio. L’ultima carta resta contestabile. Dopo 400 giocate si risolve ancora la contestazione e poi prevale la mano più piccola. |
| Mercante in Fiera | 3–8 | Due serie napoletane di 40 carte con ID distinti. Aste a rilancio, 36 eliminazioni e quattro premi. Cento punti iniziali per giocatore, dieci al montepremi; importi del solo tavolo, senza addebiti nell’app. Vince il saldo finale più alto. |

## Decisioni dichiarate all’utente

L’Asino qui implementato è quello dei quartetti e del passaggio delle carte,
non la variante della carta spaiata. L’adattamento elimina la gara fisica per
afferrare un tappo: ciò permette un risultato determinato anche online.

Dubito adotta esplicitamente la variante a una carta. Il limite mantiene
l’interfaccia delle mosse leggibile e permette di scegliere liberamente
qualsiasi carta della propria mano senza una lista combinatoria di scarti.
Il bluff funziona anche sull’ultima carta; la vittoria viene verificata dopo
l’accettazione o la contestazione.

Mercante usa le figure del mazzo napoletano già presente nell’app. Non usa
illustrazioni commerciali del Mercante tradizionale. Le carte blu sono
attribuite ai partecipanti; quelle rosse stabiliscono eliminazioni e premi.
Le aste ammettono rilanci di 1, 5 o 10 sopra l’offerta attuale entro il saldo.
Passare esclude dal lotto corrente. In assenza di offerte, il lotto è
assegnato gratuitamente al posto iniziale di quell’asta. I quattro premi sono
il 10%, 20%, 30% e il residuo del montepremi: nessun punto viene perso per
arrotondamento. Le trattative private tra giocatori non fanno parte di questa
variante.

## Fonti consultate il 26 novembre 2026

- [Dal Negro — come si gioca al Mercante in Fiera](https://shop.dalnegro.com/blog/mercante-in-fiera-gioco-di-societa/).
  Fonte del produttore per due mazzi coordinati, assegnazione iniziale,
  asta, carte premio e classifica per saldo finale. I punti interni e le
  scelte digitali sopra descritte sono adattamenti di questo progetto.
- [Manuale Asino / Bugiardo](https://m.media-amazon.com/images/I/B1JeRtIBQbL.pdf),
  sezione italiana, pagine 11–12 del PDF. Il manuale descrive il passaggio
  contemporaneo e la raccolta di carte uguali, oltre alla contestazione delle
  dichiarazioni. Il suo mazzo di animali è diverso dal mazzo napoletano;
  il progetto usa quartetti e dichiara le proprie differenze.
- [Nicolino Farina, Cucù Antico Gioco di Carte, riportato da Pagat](https://www.pagat.com/cuckoo/cucu.html).
  Riferimento per il meccanismo una carta/scambio/perdita di vite e per
  l’esistenza di varianti regionali. Il mazzo speciale descritto non viene
  riprodotto: qui si usa la variante napoletana indicata in `rules`.
- [AGIMEG — Asino: variante di velocità](https://www.agimeg.it/giochi-di-carte-italiani/asino/).
  Riscontro per la preparazione con quattro carte di ogni valore selezionato.
- [AGIMEG — Dubito](https://www.agimeg.it/giochi-di-carte-italiani/dubito/).
  Riscontro per la successione dei valori e la possibilità di contestare
  una dichiarazione. Non viene presentato come un regolamento federale unico.

## Verifica

`node --test server/test-expansion-party.js` esegue prove su regole,
contabilità delle carte, invalidazione delle mosse, informazioni private,
serializzazione dello stato e scelte dei bot.

Esito del 26 novembre 2026: **50 test passati, zero falliti**. Le simulazioni
includono **740 partite complete e 131.355 mosse**: venti partite per ogni
numero di partecipanti ammesso da ciascuno dei quattro giochi. Per Mercante,
le 80 carte conservano ID univoci e la somma dei punti finali resta uguale ai
100 punti iniziali moltiplicati per il numero dei partecipanti.

Queste sono prove dei motori di regole, non un collaudo Android su telefoni
fisici o una prova del server pubblicato.
