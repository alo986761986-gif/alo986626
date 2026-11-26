'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const engines = require('../app/src/main/assets/expansion-party.js');
const copy = x => JSON.parse(JSON.stringify(x));
const key = a => JSON.stringify(Object.keys(a).filter(k => k !== 'label').sort().map(k => [k, a[k]]));
const rng = initial => { let n = initial >>> 0; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); };
const card = (s, v, prefix = '') => ({ id: prefix + s + '-' + v, s, v });
const totals = { games: 0, moves: 0, byGame: {} };

function assertCards(state, id) {
  let cards;
  if (id === 'cucu') cards = [...state.deck, ...state.discard, ...state.players.flatMap(p => p.hand)];
  if (id === 'asino') cards = state.players.flatMap(p => p.hand);
  if (id === 'dubito') cards = [...state.pile, ...state.players.flatMap(p => p.hand)];
  if (id === 'mercante') {
    cards = [...state.lots, ...(state.currentLot ? [state.currentLot] : []), ...state.eliminated,
      ...state.players.flatMap(p => p.hand), ...state.redDeck, ...state.prizeCards, ...state.redRevealed];
    assert.equal(state.players.reduce((n, p) => n + p.budget, 0) + state.pot - state.paidPrizes, state.seats * 100, 'Punti interni conservati');
    assert.ok(state.players.every(p => p.budget >= 0), 'Nessun saldo negativo');
  }
  assert.equal(cards.length, id === 'asino' ? state.seats * 4 : id === 'mercante' ? 80 : 40, 'Numero di carte costante');
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length, 'Nessuna carta duplicata');
}

test('Quattro moduli caricabili in Node e browser senza dipendenze', () => {
  assert.deepEqual(Object.keys(engines), ['cucu', 'asino', 'dubito', 'mercante']);
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/src/main/assets/expansion-party.js'), 'utf8'), ctx);
  assert.deepEqual(Object.keys(ctx.NC_EXPANSION_RULES), Object.keys(engines));
  for (const engine of Object.values(engines)) {
    assert.throws(() => engine.create({ seats: 1 }), /giocatori/);
    assert.ok(engine.rules.length > 100);
  }
});

test('Cucù: Re del vicino protegge la carta senza rivelare le altre mani', () => {
  const e = engines.cucu, s = e.create({ seats: 3, random: rng(12) });
  s.players[0].hand = [card(0, 2)]; s.players[1].hand = [card(1, 10)]; s.players[2].hand = [card(2, 7)];
  s.order = [0, 1, 2]; s.turn = 0; s.dealer = 2; s.position = 0;
  const before = copy(s.players.map(p => p.hand));
  const v0 = e.view(s, 0);
  assert.ok(!JSON.stringify(v0).includes('1-10'), 'Re segreto fino alla richiesta di scambio');
  e.apply(s, 0, { type: 'exchange' });
  assert.deepEqual(s.players.map(p => p.hand), before);
  assert.equal(s.turn, 1);
  assert.ok(e.view(s, 0).table.some(c => c.id === '1-10'));
  assert.ok(!JSON.stringify(e.view(s, 0)).includes('2-7'));
  assert.deepEqual(e.actions(s, 1).map(a => a.type), ['keep']);
});

test('Cucù: Re dal mazzo blocca il mazziere; minimi pari perdono una vita', () => {
  const e = engines.cucu, s = e.create({ seats: 3, random: rng(12) });
  s.players.forEach((p, i) => { p.hand = [card(i, i === 1 ? 7 : 2)]; p.lives = 3; });
  s.deck = [card(3, 10)]; s.turn = 2; s.dealer = 2; s.position = 2; s.order = [0, 1, 2];
  e.apply(s, 2, { type: 'exchange' });
  assert.equal(s.players[2].hand[0].v, 2);
  assert.deepEqual(s.players.map(p => p.lives), [2, 3, 2]);
  assert.equal(s.phase, 'round_end');
  assert.equal(s.revealed.length, 3);
});

test('Cucù: eliminazione e parità finale sono determinate', () => {
  const e = engines.cucu, s = e.create({ seats: 2, random: rng(22) });
  s.players.forEach((p, i) => { p.hand = [card(i, 1)]; p.lives = 1; });
  s.turn = 1; s.position = 1; s.order = [0, 1];
  e.apply(s, 1, { type: 'keep' });
  assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0, 1]);
});

test('Asino: scelte private, passaggio simultaneo e quartetti simultanei', () => {
  const e = engines.asino, s = e.create({ seats: 3, random: rng(1) });
  Object.assign(s, { status: 'playing', phase: 'choose_pass', turn: 0, result: null, round: 1, pending: [null, null, null] });
  s.players[0].hand = [card(0, 1), card(1, 1), card(2, 1), card(0, 2)];
  s.players[1].hand = [card(1, 2), card(2, 2), card(3, 2), card(0, 3)];
  s.players[2].hand = [card(1, 3), card(2, 3), card(3, 3), card(3, 1)];
  const before = copy(s.players.map(p => p.hand));
  e.apply(s, 0, { type: 'pass_card', card: '0-2' });
  assert.deepEqual(s.players.map(p => p.hand), before, 'Nessuna carta passa prima che scelgano tutti');
  assert.ok(!JSON.stringify(e.view(s, 1)).includes('0-2'), 'Scelta altrui privata');
  e.apply(s, 1, { type: 'pass_card', card: '0-3' });
  e.apply(s, 2, { type: 'pass_card', card: '3-1' });
  assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0, 1, 2]);
  assert.ok(s.players.every(p => new Set(p.hand.map(c => c.v)).size === 1));
  assertCards(s, 'asino');
});

test('Asino: limite giri dichiarato evita cicli infiniti', () => {
  const e = engines.asino, s = e.create({ seats: 3, random: rng(4) });
  s.status = 'playing'; s.phase = 'choose_pass'; s.turn = 0; s.round = 60; s.pending = [null, null, null]; s.result = null;
  s.players[0].hand = [card(0, 1), card(1, 1), card(0, 2), card(0, 3)];
  s.players[1].hand = [card(2, 1), card(1, 2), card(2, 2), card(1, 3)];
  s.players[2].hand = [card(3, 1), card(3, 2), card(2, 3), card(3, 3)];
  while (s.status === 'playing') e.apply(s, s.turn, e.actions(s, s.turn)[0]);
  assert.equal(s.status, 'finished'); assert.equal(s.result.winners.length, 3);
});

function dubitoFixture(value = 1) {
  const s = engines.dubito.create({ seats: 3, random: rng(1) });
  s.players[0].hand = [card(0, value)]; s.players[1].hand = [card(1, 7)]; s.players[2].hand = [card(2, 6)];
  s.turn = 0; s.phase = 'play'; s.rank = 1; s.pile = [card(3, 10)]; s.last = null; s.publicReveal = [];
  return s;
}

test('Dubito: ultima carta non vince prima della contestazione; bugia riprende tutto', () => {
  const e = engines.dubito, s = dubitoFixture(2);
  e.apply(s, 0, { type: 'play_card', card: '0-2' });
  assert.equal(s.status, 'playing'); assert.equal(s.phase, 'challenge');
  for (const seat of [1, 2]) {
    const view = e.view(s, seat);
    assert.deepEqual(view.table, []); assert.ok(!JSON.stringify(view).includes('0-2'));
    assert.deepEqual(view.lastDeclaration, { seat: 0, value: 1, count: 1 });
  }
  e.apply(s, 1, { type: 'challenge' });
  assert.equal(s.players[0].hand.length, 2); assert.equal(s.players[1].hand.length, 1);
  assert.equal(s.turn, 1); assert.equal(s.rank, 2); assert.equal(s.status, 'playing');
  assert.deepEqual(e.view(s, 2).table, [card(0, 2)]);
});

test('Dubito: verità contestata penalizza chi dubita e conferma la vittoria', () => {
  const e = engines.dubito, s = dubitoFixture(1);
  e.apply(s, 0, { type: 'play_card', card: '0-1' }); e.apply(s, 1, { type: 'challenge' });
  assert.equal(s.players[1].hand.length, 3); assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0]);
});

test('Dubito: accettare una dichiarazione finale conclude; bot non legge la carta coperta', () => {
  const e = engines.dubito, s = dubitoFixture(2);
  e.apply(s, 0, { type: 'play_card', card: '0-2' });
  const t = copy(s); t.last.card = card(0, 1); t.pile[t.pile.length - 1] = t.last.card;
  assert.deepEqual(e.chooseBot(s, 1, rng(2)), e.chooseBot(t, 1, rng(2)), 'Stessa informazione pubblica, stessa scelta CPU');
  e.apply(s, 1, { type: 'accept' }); assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0]);
});

test('Mercante: asta crescente, addebito interno al solo vincitore, doppio mazzo conservato', () => {
  const e = engines.mercante, s = e.create({ seats: 3, random: rng(3) }), face = copy(s.currentLot);
  assert.equal(s.turn, 0); e.apply(s, 0, { type: 'bid', amount: 10 });
  e.apply(s, 1, { type: 'pass' }); e.apply(s, 2, { type: 'pass' });
  assert.deepEqual(s.players.map(p => p.budget), [80, 90, 90]); assert.equal(s.pot, 40);
  assert.ok(s.players[0].hand.some(c => c.id === face.id)); assertCards(s, 'mercante');
  assert.throws(() => e.apply(s, s.turn, { type: 'bid', amount: 10000 }), /Mossa/);
});

test('Mercante: quattro premi restano segreti fino all’estrazione; punti tutti assegnati', () => {
  const e = engines.mercante, s = e.create({ seats: 3, random: rng(34) });
  const secret = s.prizeCards.map(c => c.id);
  while (s.phase === 'auction') {
    const v = e.view(s, s.turn), str = JSON.stringify(v);
    assert.ok(!Object.hasOwn(v, 'redDeck') && !Object.hasOwn(v, 'prizeCards') && !Object.hasOwn(v, 'owners'));
    secret.forEach(id => assert.ok(!str.includes(id)));
    e.apply(s, s.turn, { type: 'pass' }); assertCards(s, 'mercante');
  }
  assert.ok(s.players.every(p => p.budget === 90));
  for (let n = 0; n < 36; n++) { e.apply(s, s.turn, { type: 'draw' }); assertCards(s, 'mercante'); }
  assert.equal(s.players.reduce((n, p) => n + p.hand.length, 0), 4);
  assert.equal(s.phase, 'prizes');
  for (let n = 0; n < 4; n++) { e.apply(s, s.turn, { type: 'reveal_prize' }); assertCards(s, 'mercante'); }
  assert.equal(s.status, 'finished'); assert.equal(s.paidPrizes, s.pot);
  assert.equal(s.players.reduce((n, p) => n + p.budget, 0), 300);
  assert.equal(new Set(s.prizeAwards.map(a => a.card.id)).size, 4);
  assert.equal(e.view(s, 0).table.length, 4);
});

test('Tutti i giochi rifiutano mosse fuori turno, carte altrui e modifiche extra senza mutare lo stato', () => {
  for (const e of Object.values(engines)) {
    const s = e.create({ seats: e.seats[0], random: rng(19) });
    if (s.status === 'finished') continue;
    const before = JSON.stringify(s), action = e.actions(s, s.turn)[0];
    assert.throws(() => e.apply(s, (s.turn + 1) % s.seats, action), /turno/);
    assert.equal(JSON.stringify(s), before);
    assert.throws(() => e.apply(s, s.turn, { ...action, forceWin: true }), /Mossa/);
    assert.equal(JSON.stringify(s), before);
    const v = e.view(s, s.turn); assert.ok(!JSON.stringify(v).includes('randomState'));
    const fresh = JSON.stringify(s); if (v.hand.length) v.hand[0].v = 99;
    assert.equal(JSON.stringify(s), fresh, 'Le view non espongono riferimenti mutabili');
  }
});

for (const e of Object.values(engines)) {
  for (const seats of e.seats) test(e.title + ': 20 partite complete con ' + seats + ' posti', () => {
    let maxMoves = 0, draws = 0;
    for (let match = 0; match < 20; match++) {
      const random = rng(137 + seats * 9109 + match * 491);
      let s = e.create({ seats, random }), moves = 0;
      assertCards(s, e.id);
      while (s.status === 'playing') {
        const before = JSON.stringify(s), action = e.chooseBot(s, s.turn, random);
        assert.equal(JSON.stringify(s), before, 'Bot puro');
        assert.ok(action, 'Il turno dispone di una mossa');
        assert.ok(e.actions(s, s.turn).some(a => key(a) === key(action)), 'Bot sceglie mossa lecita');
        if (moves % 17 === 0) for (let viewer = 0; viewer < seats; viewer++) {
          const view = e.view(s, viewer);
          assert.ok(!Object.hasOwn(view, 'randomState'));
          assert.ok(view.players.every(p => !Object.hasOwn(p, 'hand')));
          if (viewer !== s.turn) assert.deepEqual(view.actions, []);
        }
        // Mirrors server clone-before-apply: no function/Set/Map state dependencies.
        s = copy(s); e.apply(s, s.turn, copy(action));
        assertCards(s, e.id);
        assert.ok(++moves < 5000, 'Partita deve terminare');
      }
      assert.ok(s.result && s.result.winners.length > 0);
      assert.ok(s.result.winners.every(i => Number.isInteger(i) && i >= 0 && i < seats));
      if (s.result.winners.length === seats) draws++;
      assert.deepEqual(e.actions(s, 0), []);
      maxMoves = Math.max(maxMoves, moves); totals.games++; totals.moves += moves;
    }
    (totals.byGame[e.id] ||= []).push({ seats, completed: 20, maxMoves, draws });
  });
}

test('Riepilogo simulazioni sociali', () => { console.log('PARTY_SIMULATIONS ' + JSON.stringify(totals)); });
