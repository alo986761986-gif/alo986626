'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const engines = require('../app/src/main/assets/expansion-table.js');
const { bestia, trentuno, cirulla } = engines;
const C = (s, v) => ({ id: 'c' + (s * 10 + v - 1), s, v });
const copy = x => JSON.parse(JSON.stringify(x));
function rng(seed) { let value = seed >>> 0; return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }; }
function key(a) { const b = { ...a }; delete b.label; return JSON.stringify(b); }
function allCards(s) {
  return s.deck.concat(s.table, s.players.flatMap(p => p.hand.concat(p.pile)), s.discard || [], s.trick.map(x => x.card), s.trump ? [s.trump] : []);
}
function conservation(s) {
  const cards = allCards(s); assert.equal(cards.length, 40, '40 physical cards must remain accounted for');
  assert.equal(new Set(cards.map(c => c.id)).size, 40, 'no duplicate or lost cards');
  for (const c of cards) { assert.equal(c.id, 'c' + (c.s * 10 + c.v - 1)); assert.ok(c.s >= 0 && c.s < 4 && c.v >= 1 && c.v <= 10); }
}
function basicPlayers(s) { s.players.forEach(p => { p.hand = []; p.pile = []; p.score = 0; p.scope = 0; p.accusi = 0; p.fresh = false; }); }

test('UMD registers the same three engines in a browser global without Node', () => {
  const sandbox = { NC_EXPANSION_RULES: { existing: true } }; vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../app/src/main/assets/expansion-table.js'), 'utf8'), sandbox);
  assert.equal(sandbox.NC_EXPANSION_RULES.existing, true);
  assert.equal(sandbox.NC_EXPANSION_RULES.bestia.id, 'bestia');
  assert.equal(sandbox.NC_EXPANSION_RULES.trentuno.id, 'trentuno');
  assert.equal(sandbox.NC_EXPANSION_RULES.cirulla.id, 'cirulla');
});

test('engines reject unsupported seats and invalid random sources', () => {
  for (const engine of Object.values(engines)) {
    assert.throws(() => engine.create({ seats: 1 }));
    assert.throws(() => engine.create({ seats: 99 }));
    assert.throws(() => engine.create({ seats: engine.seats[0], random: () => 1 }));
    assert.throws(() => engine.create({ seats: engine.seats[0], random: () => NaN }));
    const s = engine.create({ seats: engine.seats[0], random: () => 0 }); conservation(s);
    assert.throws(() => engine.view(s, -1)); assert.throws(() => engine.view(s, s.n));
  }
});

test('views are detached, hide other hands and private deck, and offer no off-turn actions', () => {
  for (const engine of Object.values(engines)) {
    const s = engine.create({ seats: engine.seats[0], random: rng(7241) }), before = JSON.stringify(s);
    for (let viewer = 0; viewer < s.n; viewer++) {
      const v = engine.view(s, viewer);
      assert.deepEqual(v.hand.map(c => c.id), s.players[viewer].hand.map(c => c.id));
      for (const p of v.players) { assert.ok(!('hand' in p)); assert.ok(!('pile' in p)); }
      for (const name of ['deck', 'random', 'rng', 'discard', 'state']) assert.ok(!(name in v), name + ' must remain private');
      if (viewer !== s.turn) assert.deepEqual(v.actions, []);
      if (engine.id === 'trentuno' && s.status !== 'finished') v.scores.forEach(row => { if (row.seat !== viewer) assert.equal(row.points, null); });
      if (v.hand.length) v.hand[0].v = 99;
      if (v.table.length) v.table[0].v = 99;
      v.players[0].score = 999; v.log.push('mutation');
    }
    assert.equal(JSON.stringify(s), before, 'projection mutations and reads must not mutate authoritative state');
    const other = (s.turn + 1) % s.n;
    assert.throws(() => engine.apply(s, other, { type: 'play', card: 'c0' }));
    assert.throws(() => engine.apply(s, s.turn, { type: 'forged', card: '__proto__' }));
    assert.equal(JSON.stringify(s), before, 'invalid moves are atomic');
  }
});

test('Bestia enforces leading dominant trump, following suit, and mandatory trump', () => {
  const s = bestia.create({ seats: 3, random: rng(1) }); s.phase = 'play'; s.active = [0,1,2]; s.turn = 0; s.trump = C(0,5);
  s.players[0].hand = [C(0,1), C(1,3), C(3,7)]; s.trick = [];
  assert.deepEqual(bestia.actions(s, 0).map(a => a.card), [C(0,1).id]);
  s.trump = C(0,1); s.players[0].hand = [C(0,3), C(1,3), C(3,7)];
  assert.deepEqual(bestia.actions(s, 0).map(a => a.card), [C(0,3).id]);
  s.trick = [{ seat: 2, card: C(1,5) }];
  assert.deepEqual(bestia.actions(s, 0).map(a => a.card), [C(1,3).id]);
  assert.throws(() => bestia.apply(s, 0, { type: 'play', card: C(0,3).id }));
  s.players[0].hand = [C(0,2), C(2,3), C(3,7)];
  assert.deepEqual(bestia.actions(s, 0).map(a => a.card), [C(0,2).id]);
  s.players[0].hand = [C(2,2), C(2,3), C(3,7)];
  assert.equal(bestia.actions(s, 0).length, 3);
});

test('Bestia scores three actual tricks and marks zero-trick participants in bestia', () => {
  let s = bestia.create({ seats: 4, random: rng(4096) });
  for (let i = 0; i < 4; i++) bestia.apply(s, i, { type: 'enter', exchange: [] });
  while (s.status === 'playing') { bestia.apply(s, s.turn, bestia.chooseBot(s, s.turn)); conservation(s); s = copy(s); }
  assert.equal(s.players.reduce((n, p) => n + p.tricks, 0), 3);
  assert.ok(s.players.some(p => p.tricks === 0 && p.score === -3));
  assert.ok(s.result.winners.every(i => s.players[i].tricks === Math.max(...s.players.map(p => p.tricks))));
  assert.throws(() => bestia.apply(s, 0, { type: 'enter', exchange: [] }));
});

test('Bestia handles everyone passing, a single entrant, and stock exhaustion', () => {
  const allPass = bestia.create({ seats: 10, random: rng(5) });
  for (let i = 0; i < 10; i++) bestia.apply(allPass, i, { type: 'fold' });
  assert.equal(allPass.status, 'finished'); assert.deepEqual(allPass.result.winners, []); conservation(allPass);
  const only = bestia.create({ seats: 3, random: rng(9) });
  bestia.apply(only, 0, { type: 'fold' }); bestia.apply(only, 1, { type: 'enter', exchange: [] }); bestia.apply(only, 2, { type: 'fold' });
  assert.deepEqual(only.result.winners, [1]); assert.equal(only.players[1].score, 3); conservation(only);
  const exhausted = bestia.create({ seats: 10, random: rng(10) });
  for (let i = 0; i < 3; i++) bestia.apply(exhausted, i, { type: 'enter', exchange: exhausted.players[i].hand.map(c => c.id) });
  assert.equal(exhausted.deck.length, 0); conservation(exhausted);
  assert.deepEqual(bestia.actions(exhausted, 3).map(a => a.type), ['fold', 'enter']);
  assert.throws(() => bestia.apply(exhausted, 3, { type: 'enter', exchange: [exhausted.players[3].hand[0].id] }));
});

test('Trentuno counts only one suit, not an unrelated pair or a tris bonus', () => {
  const s = trentuno.create({ seats: 2, random: rng(12) }); s.status = 'playing'; s.phase = 'draw'; s.turn = 0;
  s.players[0].hand = [C(3,1), C(3,8), C(3,3)]; assert.equal(trentuno.view(s, 0).players[0].score, 24);
  s.players[0].hand = [C(2,10), C(2,7), C(0,10)]; assert.equal(trentuno.view(s, 0).players[0].score, 17);
  s.players[0].hand = [C(0,8), C(1,8), C(2,8)]; assert.equal(trentuno.view(s, 0).players[0].score, 10);
  s.players[0].hand = [C(0,1), C(0,8), C(0,10)]; assert.equal(trentuno.view(s, 0).players[0].score, 31);
  s.players[0].hand.push(C(0,9)); s.phase = 'discard';
  assert.equal(trentuno.view(s, 0).players[0].score, 31, 'four cards show achievable three-card score, never an impossible 41');
  assert.equal(trentuno.view(s, 1).players[0].score, null);
});

test('Trentuno knock waits for exactly one full turn by every other player', () => {
  const s = trentuno.create({ seats: 4, random: rng(72) }); s.completedTurns = 4; s.turn = 0; s.phase = 'draw';
  s.players.forEach((p, i) => { p.hand = [C(i,2), C(i,4), C(i,6)]; });
  trentuno.apply(s, 0, { type: 'knock' }); assert.equal(s.finalTurns, 3);
  for (const seat of [1,2,3]) {
    assert.equal(s.turn, seat); const id = s.deck[s.deck.length - 1].id;
    trentuno.apply(s, seat, { type: 'draw', source: 'stock' });
    assert.equal(s.status, 'playing'); assert.equal(s.turn, seat);
    trentuno.apply(s, seat, { type: 'discard', card: id });
    if (seat !== 3) assert.equal(s.status, 'playing');
  }
  assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0,1,2,3]);
  assert.ok(s.players.every(p => p.hand.length === 3));
});

test('Trentuno 31 closes immediately after a discard, with no hidden-card log leak', () => {
  const s = trentuno.create({ seats: 2, random: rng(29) }); s.status = 'playing'; s.phase = 'draw'; s.turn = 0;
  s.players[0].hand = [C(0,1), C(0,8), C(2,2)]; s.players[1].hand = [C(1,2), C(1,3), C(1,5)]; s.deck = [C(0,10)];
  const beforeLogs = s.log.length;
  trentuno.apply(s, 0, { type: 'draw', source: 'stock' });
  assert.equal(s.phase, 'discard'); assert.equal(s.log.length, beforeLogs + 1); assert.ok(!s.log.at(-1).includes('Re'));
  trentuno.apply(s, 0, { type: 'discard', card: C(2,2).id });
  assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0]); assert.equal(s.players[0].score, 31);
});

test('Trentuno cannot knock on first circuit and cannot run forever without a knock', () => {
  let s = trentuno.create({ seats: 2, random: rng(145) });
  assert.ok(!trentuno.actions(s, s.turn).some(a => a.type === 'knock'));
  assert.throws(() => trentuno.apply(s, 0, { type: 'knock' }));
  while (s.status === 'playing') {
    const seat = s.turn;
    if (s.phase === 'draw') { s = copy(s); trentuno.apply(s, seat, { type: 'draw', source: 'discard' }); }
    else { const last = s.players[seat].hand.at(-1); trentuno.apply(s, seat, { type: 'discard', card: last.id }); }
  }
  assert.equal(s.completedTurns, 20); assert.match(s.result.text, /dieci giri/);
});

test('Cirulla permits both direct capture and fifteen, but forbids avoidable discards', () => {
  const s = cirulla.create({ seats: 2, random: rng(6) }); basicPlayers(s); s.turn = 0; s.status = 'playing';
  s.players[0].hand = [C(3,4)]; s.players[1].hand = [C(3,8)]; s.table = [C(0,4), C(1,7), C(2,2)];
  const moves = cirulla.actions(s, 0);
  assert.equal(moves.length, 2);
  assert.ok(moves.some(a => a.take.length === 1 && a.take[0] === C(0,4).id));
  assert.ok(moves.some(a => a.take.length === 2 && a.take.includes(C(0,4).id) && a.take.includes(C(1,7).id)));
  assert.throws(() => cirulla.apply(s, 0, { type: 'play', card: C(3,4).id, take: [] }));
  cirulla.apply(s, 0, moves.find(a => a.take.length === 2));
  assert.deepEqual(s.table.map(c => c.id), [C(2,2).id]);
});

test('Cirulla ace must take one existing ace and cannot instead sweep or form fifteen', () => {
  const s = cirulla.create({ seats: 2, random: rng(7) }); basicPlayers(s); s.turn = 0;
  s.players[0].hand = [C(0,1)]; s.players[1].hand = [C(3,8)]; s.table = [C(1,1), C(2,5), C(3,9)];
  assert.deepEqual(cirulla.actions(s, 0).map(a => a.take), [[C(1,1).id]]);
  assert.throws(() => cirulla.apply(s, 0, { type: 'play', card: C(0,1).id, take: s.table.map(c => c.id) }));
});

test('Cirulla awards normal sweeps but excludes the very last play', () => {
  for (const last of [false, true]) {
    const s = cirulla.create({ seats: 2, random: rng(17) }); basicPlayers(s); s.turn = 0; s.deck = [];
    s.players[0].hand = [C(0,1)]; s.players[1].hand = last ? [] : [C(3,8)]; s.table = [C(1,6), C(3,9)];
    cirulla.apply(s, 0, cirulla.actions(s, 0)[0]); assert.equal(s.players[0].scope, last ? 0 : 1);
  }
});

test('Cirulla automatic accusations use the matta, prefer decino, and do not score 13', () => {
  const cases = [
    { hand: [C(1,7), C(0,6), C(2,6)], points: 10, matta: 6 },
    { hand: [C(1,7), C(0,3), C(2,4)], points: 3, matta: 1 },
    { hand: [C(0,1), C(2,1), C(3,1)], points: 10 },
    { hand: [C(0,2), C(2,3), C(3,4)], points: 3 }
  ];
  for (const row of cases) {
    const s = cirulla.create({ seats: 2, random: rng(23) }); basicPlayers(s); s.turn = 0; s.deck = [];
    s.players[0].hand = [C(3,10)]; s.players[1].hand = row.hand; s.players[1].fresh = true; s.table = [];
    cirulla.apply(s, 0, cirulla.actions(s, 0)[0]); assert.equal(s.players[1].accusi, row.points);
    if (row.matta) assert.equal(s.players[1].hand.find(c => c.id === C(1,7).id).playValue, row.matta);
    const own = cirulla.view(s, 1), enemy = cirulla.view(s, 0);
    assert.ok(!('hand' in enemy.players[1])); assert.equal(own.players[1].accusi, row.points);
  }
});

test('Cirulla a discarded matta reverts to physical seven', () => {
  const s = cirulla.create({ seats: 2, random: rng(21) }); basicPlayers(s); s.turn = 0; s.deck = []; s.table = [];
  s.players[0].hand = [{ ...C(1,7), playValue: 1 }]; s.players[1].hand = [C(2,4)];
  cirulla.apply(s, 0, cirulla.actions(s, 0)[0]);
  assert.equal(s.table[0].v, 7); assert.ok(!('playValue' in s.table[0]));
});

test('Cirulla final tally includes Grande, complete Piccola, primiera and card/denari majorities', () => {
  const s = cirulla.create({ seats: 2, random: rng(1) }); basicPlayers(s); s.deck = []; s.table = []; s.turn = 0; s.lastCapture = 1;
  const mine = [1,2,3,4,5,6,8,9,10].map(v => C(0,v)).concat([C(1,7), C(2,7), C(3,7)]), held = C(1,1);
  const ids = new Set(mine.map(c => c.id));
  s.players[0].pile = mine; s.players[0].hand = [held];
  s.players[1].pile = Array.from({length:40}, (_, i) => C(Math.floor(i / 10), i % 10 + 1)).filter(c => !ids.has(c.id) && c.id !== held.id);
  conservation(s); cirulla.apply(s, 0, cirulla.actions(s, 0)[0]); conservation(s);
  assert.equal(s.breakdown[0].grande, 5); assert.equal(s.breakdown[0].piccola, 6); assert.equal(s.breakdown[0].primiera, 1);
  assert.equal(s.breakdown[0].denari, 1); assert.equal(s.breakdown[1].settebello, 1); assert.equal(s.breakdown[1].cards, 1);
  assert.deepEqual(s.players.map(p => p.score), [13,2]); assert.deepEqual(s.result.winners, [0]);
});

test('Cirulla four-player scoring and cappotto belong to both partners', () => {
  const s = cirulla.create({ seats: 4, random: rng(33) }); basicPlayers(s); s.deck = []; s.table = [C(0,10)]; s.turn = 2;
  s.players[0].pile = [1,2,3,4,5].map(v => C(0,v)); s.players[2].pile = [6,7,8,9].map(v => C(0,v));
  s.players[2].hand = [C(1,10)]; s.players[1].hand = [C(2,8)]; s.players[3].hand = [C(3,5)];
  cirulla.apply(s, 2, cirulla.actions(s, 2).find(a => a.take.includes(C(0,10).id)));
  assert.equal(s.status, 'finished'); assert.deepEqual(s.result.winners, [0,2]); assert.match(s.result.text, /Cappotto/);
  assert.equal(s.players[0].score, s.players[2].score); assert.equal(s.players[1].score, s.players[3].score);
});

for (const engine of Object.values(engines)) {
  for (const seats of engine.seats) {
    test(engine.title + ': 24 full games at ' + seats + ' seats preserve cards, legal moves, privacy and JSON round trips', () => {
      for (let seed = 1; seed <= 24; seed++) {
        let s = engine.create({ seats, random: rng(seed * 7919 + seats * 101) }), steps = 0;
        conservation(s);
        while (s.status === 'playing') {
          assert.ok(++steps <= 500, 'bounded completion, seed ' + seed);
          const before = JSON.stringify(s), move = engine.chooseBot(s, s.turn, rng(seed));
          assert.equal(JSON.stringify(s), before, 'bot decision must be pure');
          assert.ok(engine.actions(s, s.turn).some(a => key(a) === key(move)), 'bot returns a listed legal action');
          const projected = engine.view(s, (s.turn + 1) % seats); assert.deepEqual(projected.actions, []);
          assert.ok(projected.players.every(p => !('hand' in p)));
          engine.apply(s, s.turn, move); conservation(s); s = copy(s);
        }
        assert.equal(s.turn, -1); assert.ok(s.result && Array.isArray(s.result.winners));
        assert.ok(s.result.winners.every(i => i >= 0 && i < seats));
        for (let seat = 0; seat < seats; seat++) {
          const v = engine.view(s, seat); assert.deepEqual(v.actions, []); assert.ok(v.scores.every(x => Number.isFinite(x.points)));
        }
      }
    });
  }
}
