# Motori di presa — varianti 9.3

Questi sorgenti sono stati ricostruiti dopo la perdita del runtime locale: non sono dichiarati identici al primo prototipo. Il contratto pubblico e le varianti concordate sono conservati, con verifiche ripetute sul nuovo sorgente.

## Varianti disponibili

| Motore | Posti | Variante |
|---|---:|---|
| Tressette | 2, 4 | Una smazzata senza accusi; a quattro coppie alternate; a due dieci carte e tallone da venti, pesca pubblica dal vincitore della presa |
| Traversone | 3, 4, 5 | Una smazzata individuale a penalità; a tre distribuzione 14/13/13 e scarto coperto del mazziere assegnato all'ultima presa |
| Tressette col morto | 3 | Solista al posto 1 contro i posti 2 e 3; quattro mani, ordine solista/difensore/morto/difensore, prima giocata del primo difensore |
| Briscola chiamata | 5 | Una smazzata; asta crescente in punti da 61 a 120; carta chiamata non posseduta dal chiamante, socio segreto fino alla giocata |

Tressette e Morto conservano i punti come terzi interi; sommano quelli dei compagni prima di arrotondare. L'ultima presa aggiunge tre terzi. Il totale finale delle due squadre è sempre 11.

Nel Traversone i giocatori diversi dall'ultimo prenditore arrotondano per difetto; l'ultimo riceve la differenza fino a 11. Il cappotto assegna zero al suo autore e undici a ciascun avversario. Sono ammesse vittorie condivise per minor punteggio.

Il morto viene scoperto dopo la prima carta. Il solista controlla due mani distinte e deve rispettare il seme nella mano effettivamente di turno. Il servizio vede sempre un turno umano compreso fra 0 e 2.

In Briscola chiamata chi passa non rientra nell'asta; l'ultimo senza offerte è obbligato ad aprire. La squadra chiamante deve raggiungere il contratto, anche quando supera 61. Le squadre effettive non sono esposte prima della carta chiamata; ciascun partecipante vede soltanto il proprio ruolo privato. Le carte valgono complessivamente 120 punti. Nessun motore gestisce denaro o puntate.

## Interfaccia

Il modulo UMD esporta gli stessi quattro motori con CommonJS e in NC_EXPANSION_RULES nel browser. create riceve seats e una funzione random facoltativa; lo stato è interamente JSON. apply muta lo stato soltanto dopo aver verificato azione e turno. chooseBot restituisce una delle azioni legali senza modificare lo stato.

view espone la mano del richiedente, le informazioni pubbliche, azioni solo al giocatore di turno e result con winners e text. extraHands contiene il morto pubblico. Briscola usa i campi piatti contract, highBid, highBidder, calledCard, trump, partnerRevealed, partner e privateRole. Non vengono esposti tallone, scarto coperto o mani avversarie.

## Fonti consultate

- [Modiano: Tressette](https://www.modiano.it/it/gioco/tressette/) — ordine, terzi e conteggio per coppia.
- [Sisal: regolamento Tressette](https://www.sisal.it/Store/Skill/Download/tressette-ga.pdf) — obbligo di seme, partite a smazzate e pesca scoperta nello Spizzichino.
- [Pagat: Traversone](https://www.pagat.com/tressette/ciapano.html) — posti, scarto a tre, residui dell'ultima presa e cappotto.
- [Pagat: Tressette in due](https://www.pagat.com/tressette/spizzichino.html) — variante con tallone.
- [Lottomatica: regolamenti](https://lottomatica.zendesk.com/hc/it/articles/29336364199837-Regolamenti-Giochi) — valori della Briscola e struttura della chiamata.
- [Pagat: Briscola chiamata](https://www.pagat.com/aceten/briscola_chiamata.html) — varianti d'asta e socio. Qui si usa esplicitamente l'asta a punti con libera carta non posseduta, anziché limitare la chiamata al Due.

## Verifica della ricostruzione

Il file server/test-expansion-tricks.js contiene 22 test, comprese 175 partite complete con RNG riproducibile. Controlla mosse illegali senza mutazioni, bot puri, serializzazione, conservazione delle 40 carte, informazioni private, punteggi e varianti. Il sorgente dei test è stato eseguito in un interprete JavaScript V8 con gli assert equivalenti disponibili; l'esecuzione con node:test rimane un passaggio distinto della pipeline di build.
