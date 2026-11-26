/* NAPOLI CARTE 3D - social card games. Shared browser/server rules, version 1. */
(function (root, factory) {
  'use strict';
  var engines = factory();
  if (typeof module === 'object' && module.exports) module.exports = engines;
  else Object.assign(root.NC_EXPANSION_RULES || (root.NC_EXPANSION_RULES = {}), engines);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SUITS = ['denari', 'coppe', 'spade', 'bastoni'];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function range(first, last) { return Array.from({ length: last - first + 1 }, function (_, i) { return first + i; }); }
  function cardName(c) { return ({ 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' }[c.v] || String(c.v)) + ' di ' + SUITS[c.s]; }
  function rankName(v) { return ({ 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' }[v] || String(v)); }
  function deck(prefix) {
    var out = [];
    for (var s = 0; s < 4; s++) for (var v = 1; v <= 10; v++) out.push({ id: (prefix || '') + s + '-' + v, s: s, v: v });
    return out;
  }
  function seed(random) {
    var value = Number((random || Math.random)());
    if (!Number.isFinite(value)) throw Error('Generatore casuale non valido');
    return ((Math.floor(Math.abs(value % 1) * 4294967296) >>> 0) || 0x8c73e1a5);
  }
  function nextRandom(s) { s.randomState = (Math.imul(s.randomState, 1664525) + 1013904223) >>> 0; return s.randomState / 4294967296; }
  function shuffle(s, cards) {
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(nextRandom(s) * (i + 1)), c = cards[i]; cards[i] = cards[j]; cards[j] = c;
    }
    return cards;
  }
  function base(id, seats, allowed, random) {
    if (!Number.isInteger(seats) || allowed.indexOf(seats) < 0) throw Error('Numero di giocatori non supportato');
    return { game: id, seats: seats, status: 'playing', phase: 'play', turn: 0, randomState: seed(random),
      players: range(0, seats - 1).map(function () { return { hand: [], score: 0 }; }), log: [], result: null, message: '' };
  }
  function say(s, text) { s.message = text; s.log.unshift(text); s.log = s.log.slice(0, 12); }
  function validViewer(s, seat) { if (!Number.isInteger(seat) || seat < 0 || seat >= s.seats) throw Error('Posto non valido'); }
  function active(s, seat) { return s.status === 'playing' && Number.isInteger(seat) && seat === s.turn && seat >= 0 && seat < s.seats; }
  function actionKey(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return '';
    return JSON.stringify(Object.keys(a).filter(function (k) { return k !== 'label'; }).sort().map(function (k) { return [k, a[k]]; }));
  }
  function requireAction(engine, s, seat, proposed) {
    validViewer(s, seat);
    if (!active(s, seat)) throw Error('Non è il tuo turno');
    var key = actionKey(proposed), action = engine.actions(s, seat).find(function (a) { return actionKey(a) === key; });
    if (!action) throw Error('Mossa non valida');
    return action;
  }
  function finish(s, winners, text) {
    s.status = 'finished'; s.phase = 'finished'; s.turn = -1;
    s.result = { winners: winners.slice(), text: text };
    say(s, text);
  }
  function viewBase(engine, s, seat) {
    validViewer(s, seat);
    return { game: engine.id, title: engine.title, seats: s.seats, seat: seat, status: s.status, turn: s.turn,
      phase: s.phase, hand: clone(s.players[seat].hand), table: [], trick: [],
      players: s.players.map(function (p) { return { handCount: p.hand.length, score: p.score }; }),
      scores: s.players.map(function (p, i) { return { seat: i, points: p.score }; }),
      log: s.log.slice(), message: s.message, result: s.result ? clone(s.result) : null,
      actions: clone(engine.actions(s, seat)) };
  }
  function randomChoice(list, random) {
    if (!list.length) return null;
    var n = Math.max(0, Math.min(0.999999999, Number((random || Math.random)()) || 0));
    return list[Math.floor(n * list.length)];
  }

  // Cucù: standard regional 40-card deck; the king blocks, no horse/fool powers.
  var cucu = {
    id: 'cucu', title: 'Cucù', seats: range(2, 20),
    rules: 'Variante napoletana a 3 vite, per 2–20 giocatori. Una carta coperta a testa: Asso vale 1, Fante 8, Cavallo 9 e Re 10. Dal giocatore dopo il mazziere, ognuno tiene la carta oppure la scambia col vicino successivo; il Re del vicino blocca lo scambio e si mostra. Il mazziere può cambiare con la prima carta del mazzo: un Re estratto blocca anche questo cambio. In questa variante il Cavallo non salta il vicino. Dopo il giro si scoprono le carte: tutti i valori minimi perdono una vita, anche a pari merito. Chi esaurisce le vite viene eliminato; vince l’ultimo in gioco. Se gli ultimi rimasti esauriscono insieme le vite, condividono la vittoria. Le vite sono solo punti di questa partita.',
    create: function (options) {
      options = options || {};
      var s = base(this.id, options.seats, this.seats, options.random);
      s.players.forEach(function (p) { p.lives = 3; p.score = 3; });
      s.dealer = s.seats - 1; s.round = 0; s.revealed = []; cucuRound(s); return s;
    },
    actions: function (s, seat) {
      if (!active(s, seat)) return [];
      if (s.phase === 'round_end') return [{ type: 'next_round', label: 'Distribuisci la prossima mano' }];
      var hand = s.players[seat].hand;
      if (!hand.length) return [];
      var a = [{ type: 'keep', label: 'Tengo la carta' }];
      if (hand[0].v !== 10) a.push({ type: 'exchange', label: seat === s.dealer ? 'Cambio con il mazzo' : 'Scambio col vicino' });
      return a;
    },
    apply: function (s, seat, proposed) {
      var a = requireAction(this, s, seat, proposed);
      if (a.type === 'next_round') { cucuRound(s); return s; }
      if (a.type === 'exchange') {
        if (seat === s.dealer) {
          var drawn = s.deck.pop();
          if (drawn.v === 10) { s.discard.push(drawn); s.revealed.push({ seat: null, card: drawn }); say(s, 'Il Re del mazzo blocca il cambio del mazziere.'); }
          else { s.discard.push(s.players[seat].hand[0]); s.players[seat].hand = [drawn]; say(s, 'Il mazziere cambia la propria carta.'); }
        } else {
          var target = s.order[s.order.indexOf(seat) + 1], other = s.players[target].hand[0];
          if (other.v === 10) { s.revealed.push({ seat: target, card: other }); say(s, 'Cucù! Il Re del giocatore ' + (target + 1) + ' blocca lo scambio.'); }
          else { var mine = s.players[seat].hand[0]; s.players[seat].hand[0] = other; s.players[target].hand[0] = mine; say(s, 'Scambio coperto tra i giocatori ' + (seat + 1) + ' e ' + (target + 1) + '.'); }
        }
      } else say(s, 'Il giocatore ' + (seat + 1) + ' tiene la carta.');
      s.position++;
      if (s.position < s.order.length) s.turn = s.order[s.position];
      else cucuResolve(s);
      return s;
    },
    view: function (s, seat) {
      var v = viewBase(this, s, seat); v.round = s.round; v.table = clone(s.revealed.map(function (x) { return x.card; }));
      v.revealed = clone(s.revealed); v.dealer = s.dealer;
      v.players.forEach(function (p, i) { p.lives = s.players[i].lives; p.eliminated = p.lives <= 0; });
      return v;
    },
    chooseBot: function (s, seat) {
      var a = this.actions(s, seat); if (a.length < 2) return a[0] || null;
      return s.players[seat].hand[0].v <= 5 ? a[1] : a[0];
    }
  };
  function cucuRound(s) {
    s.round++; s.deck = shuffle(s, deck()); s.discard = []; s.revealed = [];
    var alive = range(0, s.seats - 1).filter(function (i) { return s.players[i].lives > 0; });
    if (alive.indexOf(s.dealer) < 0) s.dealer = alive[0];
    s.order = [];
    for (var offset = 1; offset <= s.seats; offset++) { var i = (s.dealer + offset) % s.seats; if (alive.indexOf(i) >= 0) s.order.push(i); }
    s.players.forEach(function (p) { p.hand = p.lives > 0 ? [s.deck.pop()] : []; });
    s.position = 0; s.turn = s.order[0]; s.phase = 'exchange';
    say(s, 'Mano ' + s.round + ': tieni la carta o prova a scambiarla.');
  }
  function cucuResolve(s) {
    s.revealed = s.order.map(function (i) { return { seat: i, card: s.players[i].hand[0] }; });
    var lowest = Math.min.apply(null, s.order.map(function (i) { return s.players[i].hand[0].v; }));
    var losers = s.order.filter(function (i) { return s.players[i].hand[0].v === lowest; });
    losers.forEach(function (i) { s.players[i].lives--; s.players[i].score = s.players[i].lives; });
    var alive = s.order.filter(function (i) { return s.players[i].lives > 0; });
    if (alive.length <= 1) {
      var winners = alive.length ? alive : s.order.slice();
      finish(s, winners, alive.length ? 'Vince il giocatore ' + (alive[0] + 1) + ', ultimo con una vita.' : 'Gli ultimi giocatori esauriscono insieme le vite: vittoria condivisa.');
      return;
    }
    s.phase = 'round_end';
    do { s.dealer = (s.dealer + 1) % s.seats; } while (s.players[s.dealer].lives <= 0);
    s.turn = s.dealer;
    say(s, 'Valore minimo ' + rankName(lowest) + ': perdono una vita i giocatori ' + losers.map(function (i) { return i + 1; }).join(', ') + '.');
  }

  // Asino: a turn-based selection phase resolves all passes simultaneously.
  var asino = {
    id: 'asino', title: 'Asino · Quartetti', seats: range(3, 8),
    rules: 'Variante digitale dei quartetti, per 3–8 giocatori: si usano tanti valori quanti sono i partecipanti, quattro carte per valore e quattro carte a testa. Ogni giocatore sceglie in segreto una carta da passare al vicino successivo. Le scelte si fanno a turno, ma tutte le carte vengono trasferite insieme solo quando hanno scelto tutti: nessuno vede in anticipo il passaggio altrui. Vince chi riunisce quattro carte dello stesso valore; se più quartetti si completano nello stesso giro, la vittoria è condivisa. Questa variante non usa la prova di riflessi dei tappi né le lettere di penalità. Dopo 60 giri senza quartetti la partita termina in parità.',
    create: function (options) {
      options = options || {}; var s = base(this.id, options.seats, this.seats, options.random);
      var cards = shuffle(s, deck().filter(function (c) { return c.v <= s.seats; }));
      for (var k = 0; k < 4; k++) s.players.forEach(function (p) { p.hand.push(cards.pop()); });
      s.pending = Array(s.seats).fill(null); s.round = 1; s.phase = 'choose_pass';
      say(s, 'Scegli la carta da passare: il passaggio avverrà insieme per tutti.');
      asinoCheck(s); return s;
    },
    actions: function (s, seat) { return active(s, seat) ? s.players[seat].hand.map(function (c) { return { type: 'pass_card', card: c.id, label: 'Passa ' + cardName(c) }; }) : []; },
    apply: function (s, seat, proposed) {
      var a = requireAction(this, s, seat, proposed); s.pending[seat] = a.card;
      var next = s.pending.indexOf(null);
      if (next >= 0) { s.turn = next; say(s, 'Scelta registrata. Il giocatore ' + (next + 1) + ' sceglie in segreto.'); return s; }
      var passing = s.players.map(function (p, i) { var at = p.hand.findIndex(function (c) { return c.id === s.pending[i]; }); return p.hand.splice(at, 1)[0]; });
      passing.forEach(function (c, i) { s.players[(i + 1) % s.seats].hand.push(c); });
      s.pending = Array(s.seats).fill(null);
      if (!asinoCheck(s)) {
        if (s.round >= 60) finish(s, range(0, s.seats - 1), 'Sessanta giri senza quartetti: partita pari.');
        else { s.round++; s.turn = 0; say(s, 'Giro ' + s.round + ': carte passate. Scegli la prossima carta.'); }
      }
      return s;
    },
    view: function (s, seat) { var v = viewBase(this, s, seat); v.round = s.round; v.choicesReceived = s.pending.filter(Boolean).length; v.hasChosen = Boolean(s.pending[seat]); if (s.status === 'finished') v.table = clone(s.players.filter(function (_, i) { return s.result.winners.indexOf(i) >= 0; }).flatMap(function (p) { return p.hand; })); return v; },
    chooseBot: function (s, seat, random) {
      var a = this.actions(s, seat); if (!a.length) return null;
      var hand = s.players[seat].hand, counts = {};
      hand.forEach(function (c) { counts[c.v] = (counts[c.v] || 0) + 1; });
      var max = Math.max.apply(null, Object.keys(counts).map(function (v) { return counts[v]; }));
      var targets = Object.keys(counts).filter(function (v) { return counts[v] === max; }).map(Number);
      var target = randomChoice(targets, random);
      var choices = a.filter(function (move) { return hand.find(function (c) { return c.id === move.card; }).v !== target; });
      return randomChoice(choices.length ? choices : a, random);
    }
  };
  function asinoCheck(s) {
    var winners = range(0, s.seats - 1).filter(function (i) { var h = s.players[i].hand; return h.length === 4 && h.every(function (c) { return c.v === h[0].v; }); });
    if (!winners.length) return false;
    winners.forEach(function (i) { s.players[i].score = 1; });
    finish(s, winners, 'Asino! Quartetto completato ' + (winners.length === 1 ? 'dal giocatore ' : 'dai giocatori ') + winners.map(function (i) { return i + 1; }).join(', ') + '.'); return true;
  }

  // Dubito: one-card variant keeps every legal move representable in the UI.
  var dubito = {
    id: 'dubito', title: 'Dubito / Bugiardo', seats: range(3, 8),
    rules: 'Variante digitale a una carta per turno, per 3–8 giocatori, con un mazzo napoletano da 40 distribuito interamente. Le dichiarazioni obbligatorie avanzano da Asso a Re e poi ripartono dall’Asso. Si sceglie una carta coperta, anche mentendo sul valore richiesto. Il giocatore successivo può credere oppure dire «Dubito»: se la dichiarazione era falsa, chi ha mentito prende tutto il mucchio; se era vera, lo prende chi ha dubitato. Dopo una contestazione riparte chi aveva ragione, con il valore successivo. Una mano vuota vince solo dopo che l’ultima dichiarazione è stata accettata o provata vera. Per la modalità rapida, dopo 400 giocate valide vince chi conserva meno carte, ma solo dopo la relativa contestazione. Nessun valore delle carte coperte è mostrato agli avversari.',
    create: function (options) {
      options = options || {}; var s = base(this.id, options.seats, this.seats, options.random), cards = shuffle(s, deck());
      var i = 0; while (cards.length) s.players[i++ % s.seats].hand.push(cards.pop());
      s.pile = []; s.last = null; s.rank = 1; s.plays = 0; s.publicReveal = []; s.phase = 'play';
      say(s, 'Dichiara un Asso: scegli una carta coperta, vera oppure falsa.'); return s;
    },
    actions: function (s, seat) {
      if (!active(s, seat)) return [];
      if (s.phase === 'challenge') return [{ type: 'accept', label: 'Ci credo' }, { type: 'challenge', label: 'Dubito!' }];
      return s.players[seat].hand.map(function (c) { return { type: 'play_card', card: c.id, label: 'Dichiara ' + rankName(s.rank) + ' con ' + cardName(c) }; });
    },
    apply: function (s, seat, proposed) {
      var a = requireAction(this, s, seat, proposed);
      if (a.type === 'play_card') {
        var index = s.players[seat].hand.findIndex(function (c) { return c.id === a.card; });
        var played = s.players[seat].hand.splice(index, 1)[0]; s.pile.push(played);
        s.last = { seat: seat, card: played, rank: s.rank }; s.publicReveal = []; s.plays++;
        s.turn = (seat + 1) % s.seats; s.phase = 'challenge';
        say(s, 'Il giocatore ' + (seat + 1) + ' dichiara un ' + rankName(s.rank) + '. Credere o dubitare?'); return s;
      }
      var last = s.last, truth = last.card.v === last.rank, winner = null;
      if (a.type === 'challenge') {
        var collector = truth ? seat : last.seat;
        s.players[collector].hand.push.apply(s.players[collector].hand, s.pile); s.pile = [];
        s.publicReveal = [last.card]; s.turn = truth ? last.seat : seat;
        say(s, (truth ? 'Dichiarazione vera: ' : 'Bugia scoperta: ') + cardName(last.card) + '. Il giocatore ' + (collector + 1) + ' raccoglie il mucchio.');
        if (truth && s.players[last.seat].hand.length === 0) winner = last.seat;
      } else {
        s.turn = seat;
        if (s.players[last.seat].hand.length === 0) winner = last.seat;
        else say(s, 'Dichiarazione accettata. Tocca al giocatore ' + (seat + 1) + '.');
      }
      s.rank = last.rank % 10 + 1; s.last = null; s.phase = 'play';
      if (winner !== null) { s.players[winner].score = 1; finish(s, [winner], 'Vince il giocatore ' + (winner + 1) + ': nessuna carta e ultima dichiarazione confermata.'); }
      else if (s.plays >= 400) {
        var min = Math.min.apply(null, s.players.map(function (p) { return p.hand.length; }));
        var winners = range(0, s.seats - 1).filter(function (i) { return s.players[i].hand.length === min; });
        winners.forEach(function (i) { s.players[i].score = 1; });
        finish(s, winners, 'Limite della partita rapida: vince chi ha meno carte (' + min + ').');
      }
      return s;
    },
    view: function (s, seat) {
      var v = viewBase(this, s, seat); v.table = clone(s.publicReveal); v.pileCount = s.pile.length; v.declaredValue = s.rank;
      v.lastDeclaration = s.last ? { seat: s.last.seat, value: s.last.rank, count: 1 } : null; v.plays = s.plays;
      return v;
    },
    chooseBot: function (s, seat, random) {
      var a = this.actions(s, seat); if (!a.length) return null;
      if (s.phase === 'challenge') {
        var known = s.players[seat].hand.filter(function (c) { return c.v === s.last.rank; }).length;
        // Only public declaration/hand counts and the bot's OWN cards inform its decision.
        var doubt = known === 4 || (s.players[s.last.seat].hand.length === 0 && Number((random || Math.random)()) < 0.55) || Number((random || Math.random)()) < 0.09;
        return a[doubt ? 1 : 0];
      }
      var truthful = a.filter(function (m) { return s.players[seat].hand.find(function (c) { return c.id === m.card; }).v === s.rank; });
      return randomChoice(truthful.length ? truthful : a, random);
    }
  };

  // Mercante: two uniquely identified but face-matched decks. Table points only.
  var mercante = {
    id: 'mercante', title: 'Mercante in Fiera', seats: range(3, 8),
    rules: 'Variante digitale per 3–8 giocatori, con due mazzi napoletani coordinati da 40 carte: blu per i giocatori e rosso per estrazioni e premi. Sono figure napoletane, non il mazzo illustrato tradizionale. Ognuno parte con 100 punti del tavolo, totalmente separati dai crediti dell’app; 10 punti a testa formano il montepremi iniziale. Le carte blu iniziali sono distribuite in quantità uguale, le rimanenti vendute una alla volta con offerte crescenti e possibilità di passare. Chi passa esce dall’asta del lotto. Un lotto senza offerte viene assegnato gratuitamente al partecipante di turno. Gli incassi aumentano il montepremi. Dal mazzo rosso si riservano quattro carte segrete: le altre 36 eliminano le corrispondenti blu. I quattro premi valgono il 10%, 20%, 30% e il resto del montepremi, senza perdere punti per arrotondamento. Vince il saldo finale più alto: punti risparmiati più premi. Niente scambi privati, denaro, acquisti o addebiti nel portafoglio dell’app.',
    create: function (options) {
      options = options || {}; var s = base(this.id, options.seats, this.seats, options.random);
      s.players.forEach(function (p) { p.budget = 90; p.prizes = 0; p.score = 90; });
      var blue = shuffle(s, deck('blue:')), red = shuffle(s, deck('red:'));
      var initial = Math.floor(20 / s.seats);
      for (var k = 0; k < initial; k++) s.players.forEach(function (p) { p.hand.push(blue.pop()); });
      s.lots = blue; s.prizeCards = red.splice(-4); s.redDeck = red; s.redRevealed = []; s.eliminated = [];
      s.owners = {}; s.players.forEach(function (p, i) { p.hand.forEach(function (c) { s.owners[c.s + '-' + c.v] = i; }); });
      s.pot = s.seats * 10; s.paidPrizes = 0; s.lotNumber = 0; s.drawNumber = 0; s.prizeIndex = 0; s.prizeAwards = [];
      mercanteNewLot(s); return s;
    },
    actions: function (s, seat) {
      if (!active(s, seat)) return [];
      if (s.phase === 'draw') return [{ type: 'draw', label: 'Estrai la prossima carta rossa' }];
      if (s.phase === 'prizes') return [{ type: 'reveal_prize', label: 'Scopri il premio ' + (s.prizeIndex + 1) }];
      var a = [{ type: 'pass', label: 'Passo questo lotto' }], budget = s.players[seat].budget;
      var amounts = [s.highBid + 1, s.highBid + 5, s.highBid + 10];
      amounts.filter(function (n, i, all) { return n <= budget && all.indexOf(n) === i; }).forEach(function (n) { a.push({ type: 'bid', amount: n, label: 'Offro ' + n + ' punti del tavolo' }); });
      return a;
    },
    apply: function (s, seat, proposed) {
      var a = requireAction(this, s, seat, proposed);
      if (a.type === 'draw') {
        var c = s.redDeck.pop(), owner = s.owners[c.s + '-' + c.v]; s.redRevealed.push(c); s.drawNumber++;
        var hand = s.players[owner].hand, at = hand.findIndex(function (blue) { return blue.s === c.s && blue.v === c.v; });
        if (at < 0) throw Error('Carta blu non trovata');
        s.eliminated.push(hand.splice(at, 1)[0]); s.turn = (seat + 1) % s.seats;
        say(s, cardName(c) + ': carta eliminata del giocatore ' + (owner + 1) + '.');
        if (!s.redDeck.length) { s.phase = 'prizes'; say(s, 'Restano le quattro carte vincenti: scopriamo i premi.'); }
        return s;
      }
      if (a.type === 'reveal_prize') {
        var prize = s.prizeCards[s.prizeIndex], winnerSeat = s.owners[prize.s + '-' + prize.v];
        var amount = s.prizeIndex < 3 ? Math.floor(s.pot * [0.1, 0.2, 0.3][s.prizeIndex]) : s.pot - s.paidPrizes;
        s.players[winnerSeat].budget += amount; s.players[winnerSeat].prizes += amount; s.players[winnerSeat].score = s.players[winnerSeat].budget;
        s.paidPrizes += amount; s.prizeAwards.push({ card: prize, seat: winnerSeat, points: amount }); s.prizeIndex++; s.turn = (seat + 1) % s.seats;
        say(s, cardName(prize) + ': ' + amount + ' punti al giocatore ' + (winnerSeat + 1) + '.');
        if (s.prizeIndex === 4) {
          var high = Math.max.apply(null, s.players.map(function (p) { return p.budget; }));
          var winners = range(0, s.seats - 1).filter(function (i) { return s.players[i].budget === high; });
          finish(s, winners, 'Mercante concluso: saldo migliore ' + high + ' punti del tavolo, ' + (winners.length === 1 ? 'giocatore ' : 'giocatori ') + winners.map(function (i) { return i + 1; }).join(', ') + '.');
        }
        return s;
      }
      if (a.type === 'pass') { s.passed[seat] = true; say(s, 'Il giocatore ' + (seat + 1) + ' passa il lotto.'); }
      else { s.highBid = a.amount; s.highBidder = seat; say(s, 'Il giocatore ' + (seat + 1) + ' offre ' + a.amount + ' punti.'); }
      var eligible = range(1, s.seats).map(function (d) { return (seat + d) % s.seats; }).filter(function (i) { return i !== s.highBidder && !s.passed[i] && s.players[i].budget > s.highBid; });
      if (eligible.length) s.turn = eligible[0];
      else mercanteAwardLot(s);
      return s;
    },
    view: function (s, seat) {
      var v = viewBase(this, s, seat); v.pot = s.pot; v.paidPrizes = s.paidPrizes; v.lotsRemaining = s.lots.length + (s.currentLot ? 1 : 0);
      v.table = s.phase === 'auction' ? [clone(s.currentLot)] : s.prizeAwards.length ? clone(s.prizeAwards.map(function (p) { return p.card; })) : clone(s.redRevealed.slice(-8));
      v.highBid = s.highBid || 0; v.highBidder = s.highBidder == null ? null : s.highBidder;
      v.prizeAwards = clone(s.prizeAwards); v.drawNumber = s.drawNumber; v.prizeCount = 4;
      v.players.forEach(function (p, i) { p.tablePoints = s.players[i].budget; p.prizes = s.players[i].prizes; });
      return v;
    },
    chooseBot: function (s, seat, random) {
      var a = this.actions(s, seat); if (a.length < 2) return a[0] || null;
      var remaining = Math.max(1, s.lots.length + 1), targetLots = Math.max(1, Math.ceil(remaining / s.seats));
      var sensible = Math.max(1, Math.floor(s.players[seat].budget / (targetLots + 1)));
      var candidates = a.filter(function (m) { return m.type === 'bid' && m.amount <= sensible; });
      return candidates.length && Number((random || Math.random)()) < 0.6 ? randomChoice(candidates, random) : a[0];
    }
  };
  function mercanteNewLot(s) {
    if (!s.lots.length) { s.currentLot = null; s.phase = 'draw'; s.turn = 0; say(s, 'Aste concluse. Le quattro carte premio sono segrete: iniziano le estrazioni.'); return; }
    s.currentLot = s.lots.pop(); s.lotNumber++; s.highBid = 0; s.highBidder = null; s.passed = Array(s.seats).fill(false);
    s.phase = 'auction'; s.turn = (s.lotNumber - 1) % s.seats;
    say(s, 'Lotto ' + s.lotNumber + ': ' + cardName(s.currentLot) + '. Offerta minima 1 punto del tavolo.');
  }
  function mercanteAwardLot(s) {
    var winner = s.highBidder == null ? (s.lotNumber - 1) % s.seats : s.highBidder;
    var amount = s.highBidder == null ? 0 : s.highBid;
    s.players[winner].budget -= amount; s.players[winner].score = s.players[winner].budget; s.pot += amount;
    s.players[winner].hand.push(s.currentLot); s.owners[s.currentLot.s + '-' + s.currentLot.v] = winner;
    say(s, cardName(s.currentLot) + ' assegnata al giocatore ' + (winner + 1) + ' per ' + amount + ' punti.');
    mercanteNewLot(s);
  }

  return { cucu: cucu, asino: asino, dubito: dubito, mercante: mercante };
});
