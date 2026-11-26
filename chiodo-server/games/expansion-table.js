(function (root, factory) {
  'use strict';
  const engines = factory();
  if (typeof module === 'object' && module.exports) module.exports = engines;
  else Object.assign(root.NC_EXPANSION_RULES || (root.NC_EXPANSION_RULES = {}), engines);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Rules consulted 2026-11-26. All three modes use game points only, never a wallet.
  const SOURCES = {
    bestia: ['https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/giochi-di-carte/regolamenti-giochi/bestia.pdf'],
    trentuno: ['https://www.cavallore.it/index.php/regole-dei-giochi/giochi-d-azzardo/120-trentuno', 'https://www.agimeg.it/giochi-di-carte-italiani/trentuno/'],
    cirulla: ['https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/giochi-di-carte/regolamenti-giochi/cirulla.pdf', 'https://www.agimeg.it/giochi-di-carte-italiani/cirulla/']
  };
  const SUITS = ['Denari', 'Coppe', 'Spade', 'Bastoni'];
  const VALUES = ['','Asso','2','3','4','5','6','7','Fante','Cavallo','Re'];
  const BRISCOLA_ORDER = { 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
  const PRIMIERA = { 1: 16, 2: 12, 3: 13, 4: 14, 5: 15, 6: 18, 7: 21, 8: 10, 9: 10, 10: 10 };
  function cardCopy(c) {
    const out = { id: c.id, s: c.s, v: c.v };
    if (c.playValue && c.playValue !== c.v) out.playValue = c.playValue;
    return out;
  }
  function cardName(c) { return VALUES[c.v] + ' di ' + SUITS[c.s] + (c.playValue && c.playValue !== c.v ? ' (vale ' + VALUES[c.playValue] + ')' : ''); }
  function playerName(s, seat) { return String(s.players[seat].name || 'Giocatore ' + (seat + 1)); }
  function shuffledDeck(random) {
    const deck = Array.from({ length: 40 }, (_, i) => ({ id: 'c' + i, s: Math.floor(i / 10), v: i % 10 + 1 }));
    for (let i = deck.length - 1; i > 0; i--) {
      const r = Number(random());
      if (!Number.isFinite(r) || r < 0 || r >= 1) throw new Error('Generatore casuale non valido');
      const j = Math.floor(r * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  function setup(id, allowed, options) {
    options = options || {};
    if (!allowed.includes(options.seats)) throw new Error('Numero di giocatori non supportato');
    const random = options.random === undefined ? Math.random : options.random;
    if (typeof random !== 'function') throw new Error('Generatore casuale non valido');
    return {
      id, status: 'playing', phase: 'play', turn: 0, n: options.seats,
      players: Array.from({ length: options.seats }, (_, seat) => ({ name: 'Giocatore ' + (seat + 1), hand: [], pile: [], score: 0 })),
      deck: shuffledDeck(random), table: [], trick: [], lastTrick: [], log: [], result: null
    };
  }
  function deal(s, count) { for (let j = 0; j < count; j++) for (const p of s.players) p.hand.push(s.deck.pop()); }
  function addLog(s, message) { s.log.unshift(message); if (s.log.length > 32) s.log.length = 32; }
  function validSeat(s, seat) { return Number.isInteger(seat) && seat >= 0 && seat < s.n; }
  function canAct(s, seat) { return s.status === 'playing' && validSeat(s, seat) && s.turn === seat; }
  function arrayKey(v) { return Array.isArray(v) && v.every(x => typeof x === 'string') ? v.slice().sort().join(',') : v === undefined ? '' : '!invalid'; }
  function moveKey(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return '';
    return JSON.stringify([a.type, a.card, a.source, arrayKey(a.take), arrayKey(a.exchange)]);
  }
  function authorized(engine, s, seat, action) {
    if (!canAct(s, seat)) throw new Error('Non è il tuo turno oppure la partita è terminata');
    const move = engine.actions(s, seat).find(x => moveKey(x) === moveKey(action));
    if (!move) throw new Error('Mossa non valida');
    return move;
  }
  function removeCard(hand, id) { const i = hand.findIndex(c => c.id === id); if (i < 0) throw new Error('Carta non in mano'); return hand.splice(i, 1)[0]; }
  function finish(s, winners, text) { s.status = 'finished'; s.phase = 'finished'; s.turn = -1; s.result = { winners: winners.slice(), text }; addLog(s, text); }
  function resultCopy(s) { return s.result ? { winners: s.result.winners.slice(), text: s.result.text } : null; }
  function genericView(engine, s, seat, message) {
    if (!validSeat(s, seat)) throw new Error('Posto non valido');
    return {
      id: engine.id, title: engine.title, status: s.status, phase: s.phase, turn: s.turn, seat,
      hand: s.players[seat].hand.map(cardCopy), table: s.table.map(cardCopy),
      trick: (s.trick.length ? s.trick : s.lastTrick).map(x => ({ seat: x.seat, card: cardCopy(x.card) })),
      players: s.players.map((p, i) => ({ seat: i, name: playerName(s, i), handCount: p.hand.length, score: p.score })),
      scores: s.players.map((p, i) => ({ seat: i, points: p.score })),
      log: s.log.slice(), message: s.result ? s.result.text : message,
      deckCount: s.deck.length, result: resultCopy(s), actions: engine.actions(s, seat)
    };
  }

  // BESTIA — one three-card deal, declarations and optional stock-only exchange.
  // No re-entry "al buio". Exchange cannot exceed the remaining undealt stock.
  const bestia = {
    id: 'bestia', title: 'Bestia', seats: [3,4,5,6,7,8,9,10], sources: SOURCES.bestia,
    rules: 'Bestia sportiva: una smazzata, 3–10 giocatori, tre carte a testa. Passa oppure gioca, cambiando da zero a tre carte entro quelle rimaste nel tallone; senza rientro al buio. La carta scoperta indica la briscola. Ordine: Asso, 3, Re, Cavallo, Fante, 7, 6, 5, 4, 2. Devi seguire il seme; se non lo possiedi devi giocare briscola. Chi apre una presa deve usare l’Asso di briscola, se lo possiede; se l’Asso è la carta scoperta, deve usare il 3. Chi vince apre la presa seguente. Ogni presa vale un punto; chi partecipa senza prenderne nessuna va in bestia: −3 punti. Chi passa segna zero. Vince chi realizza più prese. Un unico partecipante ottiene le tre prese; se passano tutti la smazzata è annullata. Punti di partita, senza puntate o addebiti.',
    create(options) {
      const s = setup(this.id, this.seats, options); deal(s, 3); s.trump = s.deck.pop(); s.phase = 'declare'; s.discard = []; s.active = []; s.tricksPlayed = 0;
      s.players.forEach(p => { p.entered = false; p.folded = false; p.tricks = 0; });
      addLog(s, 'Briscola: ' + cardName(s.trump) + '. Ogni giocatore sceglie se partecipare.'); return s;
    },
    actions(s, seat) {
      if (!canAct(s, seat)) return [];
      const hand = s.players[seat].hand;
      if (s.phase === 'declare') {
        const list = [{ type: 'fold', label: 'Passa questa smazzata' }];
        for (let mask = 0; mask < 8; mask++) {
          const cards = hand.filter((_, i) => mask & (1 << i));
          if (cards.length > s.deck.length) continue;
          list.push({ type: 'enter', exchange: cards.map(c => c.id), label: cards.length ? 'Gioca e cambia: ' + cards.map(cardName).join(', ') : 'Gioca con queste tre carte' });
        }
        return list;
      }
      let legal = hand;
      if (s.trick.length) {
        const follow = hand.filter(c => c.s === s.trick[0].card.s);
        legal = follow.length ? follow : hand.some(c => c.s === s.trump.s) ? hand.filter(c => c.s === s.trump.s) : hand;
      } else {
        const dominant = hand.find(c => c.s === s.trump.s && c.v === (s.trump.v === 1 ? 3 : 1));
        if (dominant) legal = [dominant];
      }
      return legal.map(c => ({ type: 'play', card: c.id, label: 'Gioca ' + cardName(c) }));
    },
    apply(s, seat, action) {
      const m = authorized(this, s, seat, action), p = s.players[seat];
      if (s.phase === 'declare') {
        if (m.type === 'fold') { p.folded = true; addLog(s, playerName(s, seat) + ' passa.'); }
        else {
          p.entered = true; s.active.push(seat);
          for (const id of m.exchange) s.discard.push(removeCard(p.hand, id));
          for (let i = 0; i < m.exchange.length; i++) p.hand.push(s.deck.pop());
          addLog(s, playerName(s, seat) + ' partecipa e cambia ' + m.exchange.length + ' carte.');
        }
        s.turn++;
        if (s.turn === s.n) {
          s.phase = 'play';
          if (!s.active.length) finish(s, [], 'Tutti hanno passato: smazzata annullata.');
          else if (s.active.length === 1) { s.players[s.active[0]].tricks = 3; s.tricksPlayed = 3; bestiaFinish(s); }
          else s.turn = s.active[0];
        }
        return s;
      }
      const card = removeCard(p.hand, m.card); s.trick.push({ seat, card }); addLog(s, playerName(s, seat) + ' gioca ' + cardName(card) + '.');
      if (s.trick.length === s.active.length) {
        let winner = s.trick[0];
        for (const play of s.trick.slice(1)) {
          if (play.card.s === winner.card.s && BRISCOLA_ORDER[play.card.v] > BRISCOLA_ORDER[winner.card.v] || play.card.s === s.trump.s && winner.card.s !== s.trump.s) winner = play;
        }
        const wp = s.players[winner.seat]; wp.tricks++; wp.score = wp.tricks; wp.pile.push(...s.trick.map(x => x.card)); s.lastTrick = s.trick; s.trick = []; s.tricksPlayed++; s.turn = winner.seat;
        addLog(s, playerName(s, winner.seat) + ' conquista la presa ' + s.tricksPlayed + '.');
        if (s.tricksPlayed === 3) bestiaFinish(s);
      } else s.turn = s.active[(s.active.indexOf(seat) + 1) % s.active.length];
      return s;
    },
    view(s, seat) {
      const v = genericView(this, s, seat, s.phase === 'declare' ? 'Scegli se giocare; cambi disponibili nel tallone: ' + s.deck.length + '.' : 'Briscola: ' + SUITS[s.trump.s] + ' · Presa ' + (s.tricksPlayed + 1) + ' di 3.');
      v.trump = cardCopy(s.trump); v.players.forEach((p, i) => { p.folded = s.players[i].folded; p.tricks = s.players[i].tricks; }); return v;
    },
    chooseBot(s, seat) {
      const moves = this.actions(s, seat); if (!moves.length) return null;
      const hand = s.players[seat].hand;
      if (s.phase === 'declare') {
        const strong = hand.filter(c => c.s === s.trump.s || c.v === 1 || c.v === 3);
        if (!strong.length && s.deck.length < 2) return moves[0];
        const wanted = hand.filter(c => !strong.includes(c)).slice(0, s.deck.length).map(c => c.id);
        return moves.find(m => m.type === 'enter' && arrayKey(m.exchange) === arrayKey(wanted)) || moves[1];
      }
      return moves.slice().sort((a, b) => {
        const ac = hand.find(c => c.id === a.card), bc = hand.find(c => c.id === b.card);
        return (bc.s === s.trump.s ? 20 : 0) + BRISCOLA_ORDER[bc.v] - ((ac.s === s.trump.s ? 20 : 0) + BRISCOLA_ORDER[ac.v]);
      })[0];
    }
  };
  function bestiaFinish(s) {
    for (const p of s.players) p.score = p.entered ? p.tricks || -3 : 0;
    const high = Math.max(...s.active.map(i => s.players[i].tricks));
    const winners = s.active.filter(i => s.players[i].tricks === high);
    const beasts = s.active.filter(i => s.players[i].tricks === 0);
    finish(s, winners, (winners.length > 1 ? 'Parità: ' : 'Vince ') + winners.map(i => playerName(s, i)).join(', ') + ' con ' + high + ' prese.' + (beasts.length ? ' In bestia (−3): ' + beasts.map(i => playerName(s, i)).join(', ') + '.' : ''));
  }

  // TRENTUNO — a bounded, single-round version, using the Italian draw/discard game.
  function points31(hand) {
    const sums = [0,0,0,0]; for (const c of hand) sums[c.s] += c.v === 1 ? 11 : c.v >= 8 ? 10 : c.v;
    return Math.max(...sums);
  }
  function visible31(hand) {
    return hand.length === 4 ? Math.max(...hand.map(c => points31(hand.filter(x => x.id !== c.id)))) : points31(hand);
  }
  function finish31(s, reason) {
    s.players.forEach(p => { p.score = points31(p.hand); });
    const high = Math.max(...s.players.map(p => p.score)), winners = s.players.map((p, i) => p.score === high ? i : -1).filter(i => i >= 0);
    finish(s, winners, reason + ' ' + (winners.length > 1 ? 'Parità: ' : 'Vince ') + winners.map(i => playerName(s, i)).join(', ') + ' · ' + high + ' punti.');
  }
  const trentuno = {
    id: 'trentuno', title: 'Trentuno', seats: [2,3,4,5,6,7,8], sources: SOURCES.trentuno,
    rules: 'Trentuno rapido, una sola smazzata per 2–8 giocatori. Ricevi tre carte. Conta il seme che totalizza di più: Asso 11, figure 10, le altre il numero. Il tris non dà bonus. Al tuo turno pesca dal mazzo coperto o prendi l’ultimo scarto, poi scarta una carta. Dal secondo giro puoi bussare invece di pescare: ogni altro giocatore dispone di un ultimo turno. Un 31 con tre carte chiude subito, anche alla distribuzione. Vince il punteggio più alto; le parità sono condivise. Questa modalità termina al massimo dopo dieci giri completi, oppure dopo la conclusione del giro finale di una bussata già effettuata. Il tallone non si rimescola: quando è vuoto restano lo scarto e la bussata. Nessuna vita da comprare, puntata o variazione del portafoglio.',
    create(options) {
      const s = setup(this.id, this.seats, options); deal(s, 3); s.discard = [s.deck.pop()]; s.phase = 'draw'; s.completedTurns = 0; s.knocker = -1; s.finalTurns = 0;
      addLog(s, 'Tre carte a testa. Bussata disponibile dal secondo giro.');
      if (s.players.some(p => points31(p.hand) === 31)) finish31(s, 'Trentuno alla distribuzione!'); return s;
    },
    actions(s, seat) {
      if (!canAct(s, seat)) return [];
      if (s.phase === 'discard') return s.players[seat].hand.map(c => ({ type: 'discard', card: c.id, label: 'Scarta ' + cardName(c) }));
      const list = [];
      if (s.deck.length) list.push({ type: 'draw', source: 'stock', label: 'Pesca dal mazzo coperto' });
      if (s.discard.length) list.push({ type: 'draw', source: 'discard', label: 'Prendi ' + cardName(s.discard[s.discard.length - 1]) + ' dagli scarti' });
      if (s.knocker === -1 && s.completedTurns >= s.n) list.push({ type: 'knock', label: 'Bussa: ultimo turno agli altri' });
      return list;
    },
    apply(s, seat, action) {
      const m = authorized(this, s, seat, action), p = s.players[seat];
      if (m.type === 'knock') {
        s.knocker = seat; s.finalTurns = s.n - 1; s.turn = (seat + 1) % s.n;
        addLog(s, playerName(s, seat) + ' bussa. Agli altri resta un turno.'); return s;
      }
      if (m.type === 'draw') {
        const card = m.source === 'stock' ? s.deck.pop() : s.discard.pop(); p.hand.push(card); s.phase = 'discard';
        addLog(s, playerName(s, seat) + (m.source === 'stock' ? ' pesca dal mazzo coperto.' : ' prende ' + cardName(card) + ' dagli scarti.')); return s;
      }
      const discarded = removeCard(p.hand, m.card); s.discard.push(discarded); s.phase = 'draw'; s.completedTurns++;
      addLog(s, playerName(s, seat) + ' scarta ' + cardName(discarded) + '.');
      if (points31(p.hand) === 31) finish31(s, 'Trentuno!');
      else if (s.knocker >= 0 && --s.finalTurns === 0) finish31(s, 'Giro finale completato.');
      else if (s.knocker < 0 && s.completedTurns >= s.n * 10) finish31(s, 'Conclusi i dieci giri della modalità rapida.');
      else s.turn = (seat + 1) % s.n;
      return s;
    },
    view(s, seat) {
      const message = s.phase === 'discard' ? 'Scarta una carta per tornare a tre.' : s.knocker >= 0 ? 'Ha bussato ' + playerName(s, s.knocker) + ': ' + s.finalTurns + ' turni finali.' : 'Giro ' + (Math.floor(s.completedTurns / s.n) + 1) + ' di 10 · Conta un solo seme.';
      const v = genericView(this, s, seat, message); v.table = s.discard.length ? [cardCopy(s.discard[s.discard.length - 1])] : []; v.knocker = s.knocker;
      v.players.forEach((p, i) => { p.score = s.status === 'finished' || i === seat ? visible31(s.players[i].hand) : null; });
      if (s.status === 'playing' && s.phase === 'discard' && s.turn === seat) v.message += ' Miglior punteggio ottenibile dopo lo scarto: ' + visible31(s.players[seat].hand) + '.';
      v.scores = v.players.map(p => ({ seat: p.seat, points: p.score })); return v;
    },
    chooseBot(s, seat) {
      const moves = this.actions(s, seat); if (!moves.length) return null;
      const hand = s.players[seat].hand;
      if (s.phase === 'discard') return moves.slice().sort((a, b) => points31(hand.filter(c => c.id !== b.card)) - points31(hand.filter(c => c.id !== a.card)))[0];
      const knock = moves.find(a => a.type === 'knock');
      if (knock && (points31(hand) >= 27 || s.completedTurns >= s.n * 3 || !s.deck.length)) return knock;
      const open = moves.find(a => a.source === 'discard');
      if (open) {
        const four = hand.concat(s.discard[s.discard.length - 1]);
        const potential = Math.max(...four.map(c => points31(four.filter(x => x.id !== c.id))));
        if (potential > points31(hand)) return open;
      }
      return moves.find(a => a.source === 'stock') || open || knock;
    }
  };

  // CIRULLA — full captures and scoring; the two partnerships are alternating seats.
  function teamOf(s, seat) { return s.n === 4 ? seat % 2 : seat; }
  function cv(c) { return c.playValue || c.v; }
  function isMatta(c) { return c.s === 1 && c.v === 7; }
  function cirullaAccuse(s) {
    const p = s.players[s.turn]; if (!p.fresh) return; p.fresh = false;
    if (p.hand.length !== 3) return;
    const matta = p.hand.find(isMatta), rest = p.hand.filter(c => !isMatta(c));
    const same = matta ? rest.length === 2 && rest[0].v === rest[1].v : p.hand.every(c => c.v === p.hand[0].v);
    let points = 0, kind = '';
    if (same) { points = 10; kind = 'Decino'; if (matta) matta.playValue = rest[0].v; }
    else if (p.hand.reduce((sum, c) => sum + (isMatta(c) ? 1 : c.v), 0) <= 9) { points = 3; kind = 'Cirulla'; if (matta) matta.playValue = 1; }
    if (points) { p.accusi += points; p.score += points; addLog(s, playerName(s, s.turn) + ': ' + kind + ', +' + points + ' punti (accuso verificato).'); }
  }
  function initialTable(s) {
    const sum = s.table.reduce((total, c) => total + c.v, 0), matta = s.table.find(isMatta);
    const possible = [30,15].find(target => sum === target || matta && target - (sum - 7) >= 1 && target - (sum - 7) <= 10);
    if (possible) {
      const p = s.players[s.dealer], points = possible === 30 ? 2 : 1; p.accusi += points; p.score += points; p.pile.push(...s.table); s.table = []; s.lastCapture = s.dealer;
      addLog(s, 'Tavolo iniziale da ' + possible + ': ' + playerName(s, s.dealer) + ' raccoglie le carte e segna +' + points + '.');
    }
  }
  function combinations(table, target) {
    const sorted = table.slice().sort((a, b) => cv(a) - cv(b) || a.id.localeCompare(b.id)), out = [];
    function visit(start, remaining, ids) {
      if (remaining === 0) { if (ids.length) out.push(ids.slice().sort()); return; }
      for (let i = start; i < sorted.length && cv(sorted[i]) <= remaining; i++) { ids.push(sorted[i].id); visit(i + 1, remaining - cv(sorted[i]), ids); ids.pop(); }
    }
    if (target > 0) visit(0, target, []); return out;
  }
  function captureChoices(s, card) {
    if (!s.table.length) return [];
    if (cv(card) === 1) {
      const aces = s.table.filter(c => cv(c) === 1); return aces.length ? aces.map(c => [c.id]) : [s.table.map(c => c.id).sort()];
    }
    const choices = combinations(s.table, cv(card)).concat(combinations(s.table, 15 - cv(card)));
    return [...new Map(choices.map(ids => [ids.join(','), ids])).values()];
  }
  function capturedByTeam(s, team) { return s.players.flatMap((p, seat) => teamOf(s, seat) === team ? p.pile : []); }
  function cirullaBreakdown(s, team) {
    const cards = capturedByTeam(s, team), denari = new Set(cards.filter(c => c.s === 0).map(c => c.v));
    const prime = [0,1,2,3].map(suit => Math.max(0, ...cards.filter(c => c.s === suit).map(c => PRIMIERA[c.v])));
    let piccola = [1,2,3].every(v => denari.has(v)) ? 3 : 0;
    if (piccola) for (let value = 4; value <= 6 && denari.has(value); value++) piccola++;
    return { team, cardCount: cards.length, denariCount: denari.size, cards: cards.length >= 21 ? 1 : 0, denari: denari.size >= 6 ? 1 : 0, settebello: denari.has(7) ? 1 : 0,
      grande: [8,9,10].every(v => denari.has(v)) ? 5 : 0, piccola, primeValue: prime.every(Boolean) ? prime.reduce((a, b) => a + b, 0) : 0, primiera: 0,
      scope: s.players.reduce((a, p, seat) => a + (teamOf(s, seat) === team ? p.scope : 0), 0), accusi: s.players.reduce((a, p, seat) => a + (teamOf(s, seat) === team ? p.accusi : 0), 0) };
  }
  function finishCirulla(s, cappottoTeam) {
    if (cappottoTeam === undefined && s.table.length) { s.players[s.lastCapture].pile.push(...s.table); s.table = []; }
    const breakdown = [cirullaBreakdown(s, 0), cirullaBreakdown(s, 1)];
    if (breakdown[0].primeValue > breakdown[1].primeValue) breakdown[0].primiera = 1;
    else if (breakdown[1].primeValue > breakdown[0].primeValue) breakdown[1].primiera = 1;
    breakdown.forEach(b => { b.total = b.cards + b.denari + b.settebello + b.grande + b.piccola + b.primiera + b.scope + b.accusi; });
    s.breakdown = breakdown; s.players.forEach((p, i) => { p.score = breakdown[teamOf(s, i)].total; });
    if (cappottoTeam === undefined) { const cap = breakdown.find(b => b.denariCount === 10); if (cap) cappottoTeam = cap.team; }
    const high = Math.max(...breakdown.map(b => b.total));
    const winners = s.players.map((p, seat) => cappottoTeam === undefined ? p.score === high ? seat : -1 : teamOf(s, seat) === cappottoTeam ? seat : -1).filter(i => i >= 0);
    const description = winners.length === s.n ? 'Pareggio' : 'Vince ' + (s.n === 4 ? 'la coppia ' : '') + winners.map(i => playerName(s, i)).join(' e ');
    finish(s, winners, (cappottoTeam === undefined ? 'Smazzata conclusa. ' : 'Cappotto: tutti i dieci Denari! ') + description + '. Punti: ' + breakdown.map(b => b.total).join(' – ') + '.');
  }
  const cirulla = {
    id: 'cirulla', title: 'Cirulla', seats: [2,4], sources: SOURCES.cirulla,
    rules: 'Cirulla a smazzata unica: due giocatori oppure quattro a coppie alternate. Tre carte a testa e quattro in tavola; con due assi iniziali si ridistribuisce. Puoi prendere per valore uguale, per somma uguale o formando 15 insieme alla carta giocata; una presa disponibile è obbligatoria, ma puoi scegliere fra tutte. L’Asso prende un Asso presente, altrimenti tutto il tavolo; sul vuoto si scarta. Svuotare il tavolo vale una scopa, esclusa l’ultima giocata. Accusi automatici al primo turno di ogni distribuzione: somma ≤9 vale 3, tris vale 10; prevale il Decino, senza cumulo. Il 7 di Coppe è matta solo per un accuso: vale 1 nella Cirulla o il valore del tris; se scartato torna 7. Tavolo iniziale da 15/30: raccolto dal mazziere, +1/+2. A fine smazzata: scope e accusi, carte, denari, settebello, primiera, Grande (figure di Denari: 5), Piccola (1–2–3 Denari: 3, più consecutivi fino al 6). Tutti i Denari fanno cappotto e vittoria immediata. Altrimenti vince il totale maggiore, con parità condivisa. Punti locali, nessuna puntata.',
    create(options) {
      const s = setup(this.id, this.seats, options); s.dealer = s.n - 1; s.lastCapture = s.dealer;
      const random = options && options.random || Math.random;
      let attempts = 0;
      do {
        if (attempts) { s.deck = shuffledDeck(random); s.players.forEach(p => { p.hand = []; }); }
        deal(s, 3); s.table = s.deck.splice(-4);
        attempts++;
      } while (s.table.filter(c => c.v === 1).length >= 2 && attempts < 32);
      // Constant test RNGs can repeat the same invalid deal forever. Preserve all
      // 40 distinct cards, and substitute enough table aces from the unused stock.
      while (s.table.filter(c => c.v === 1).length >= 2) {
        const at = s.table.findIndex(c => c.v === 1), replacement = s.deck.findIndex(c => c.v !== 1);
        [s.table[at], s.deck[replacement]] = [s.deck[replacement], s.table[at]];
      }
      s.players.forEach(p => { p.scope = 0; p.accusi = 0; p.fresh = true; });
      if (attempts > 1) addLog(s, 'Ridistribuzione: nel tavolo iniziale erano presenti almeno due assi.');
      initialTable(s); cirullaAccuse(s); return s;
    },
    actions(s, seat) {
      if (!canAct(s, seat)) return [];
      return s.players[seat].hand.flatMap(c => {
        const choices = captureChoices(s, c);
        return choices.length ? choices.map(take => ({ type: 'play', card: c.id, take, label: cardName(c) + ' → prendi ' + take.map(id => cardName(s.table.find(t => t.id === id))).join(' + ') })) : [{ type: 'play', card: c.id, take: [], label: 'Scarta ' + cardName(c) }];
      });
    },
    apply(s, seat, action) {
      const m = authorized(this, s, seat, action), p = s.players[seat], card = removeCard(p.hand, m.card);
      const lastPlay = !s.deck.length && s.players.every(x => !x.hand.length);
      if (m.take.length) {
        const taken = s.table.filter(c => m.take.includes(c.id)); s.table = s.table.filter(c => !m.take.includes(c.id)); p.pile.push(card, ...taken); s.lastCapture = seat;
        const sweep = !s.table.length && !lastPlay; if (sweep) { p.scope++; p.score++; }
        addLog(s, playerName(s, seat) + ' prende ' + taken.length + ' carte con ' + cardName(card) + (sweep ? ': SCOPA!' : '.'));
      } else { delete card.playValue; s.table.push(card); addLog(s, playerName(s, seat) + ' scarta ' + cardName(card) + '.'); }
      const team = teamOf(s, seat);
      if (capturedByTeam(s, team).filter(c => c.s === 0).length === 10) { finishCirulla(s, team); return s; }
      if (lastPlay) { finishCirulla(s); return s; }
      if (s.players.every(x => !x.hand.length)) { deal(s, 3); s.players.forEach(x => { x.fresh = true; }); addLog(s, 'Nuova distribuzione: tre carte a testa.'); }
      s.turn = (seat + 1) % s.n; cirullaAccuse(s); return s;
    },
    view(s, seat) {
      const v = genericView(this, s, seat, 'Scegli una carta e la presa; le combinazioni possono anche sommare 15.');
      v.players.forEach((p, i) => {
        p.team = teamOf(s, i); p.scope = s.players[i].scope; p.accusi = s.players[i].accusi;
        if (s.status !== 'finished') p.score = s.players.reduce((total, row, j) => total + (teamOf(s, j) === p.team ? row.scope + row.accusi : 0), 0);
      });
      v.scores = v.players.map(p => ({ seat: p.seat, points: p.score }));
      if (s.breakdown) v.breakdown = s.breakdown.map(b => ({ ...b })); return v;
    },
    chooseBot(s, seat) {
      const moves = this.actions(s, seat); if (!moves.length) return null;
      function score(a) {
        const c = s.players[seat].hand.find(c => c.id === a.card), taken = s.table.filter(c => a.take.includes(c.id));
        const all = taken.concat(a.take.length ? [c] : []);
        return (taken.length && taken.length === s.table.length ? 14 : 0) + all.reduce((value, c) => value + 1 + (c.s === 0 ? 2 : 0) + (c.s === 0 && c.v === 7 ? 8 : 0) + (c.v === 7 ? 2 : 0), 0);
      }
      return moves.slice().sort((a, b) => score(b) - score(a))[0];
    }
  };
  return { bestia, trentuno, cirulla };
});
