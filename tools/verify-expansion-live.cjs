'use strict';
// A private, temporary HTTPS table verifies the deployed 9.3 backend.
// The public report never contains session tokens, invitation codes or card ids.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const manifest = require('./build93-manifest.json');

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function createClient(base) {
  const origin = new URL(base);
  assert.equal(origin.protocol, 'https:', 'Live QA requires HTTPS');
  assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash &&
    (origin.pathname === '/' || origin.pathname === ''), 'Use the backend HTTPS origin without credentials or a path');
  const agent = new https.Agent({ keepAlive: true, maxSockets: 2 });
  function request(route, options = {}) {
    const method = options.method || 'GET';
    const raw = options.body === undefined ? null : Buffer.from(JSON.stringify(options.body));
    const headers = { Accept: 'application/json', 'User-Agent': 'NapoliCarte93-Private-QA' };
    if (raw) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = raw.length; }
    if (options.token) headers.Authorization = 'Bearer ' + options.token;
    const url = new URL('/expansion/' + route, origin);
    return new Promise((resolve, reject) => {
      let complete = false, timer;
      const done = (error, value) => {
        if (complete) return;
        complete = true; clearTimeout(timer);
        error ? reject(error) : resolve(value);
      };
      const req = https.request(url, { method, headers, agent }, res => {
        let bytes = 0; const chunks = [];
        res.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > 2 * 1024 * 1024) req.destroy(new Error('QA response exceeded 2 MB: ' + route));
          else chunks.push(chunk);
        });
        res.on('error', error => done(error));
        res.on('end', () => {
          const accepted = options.accept || [200, 201];
          if (!accepted.includes(res.statusCode)) return done(new Error(method + ' /expansion/' + route + ' returned HTTP ' + res.statusCode));
          try { done(null, { status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
          catch (_) { done(new Error('Invalid JSON from /expansion/' + route)); }
        });
      });
      req.on('error', error => done(error));
      timer = setTimeout(() => req.destroy(new Error('HTTPS request timed out: /expansion/' + route)), options.timeoutMs || 15000);
      if (raw) req.write(raw);
      req.end();
    });
  }
  return { origin: origin.origin, request, close: () => agent.destroy() };
}
function stateChecks(state) {
  assert.equal(state.version, manifest.app.versionName, 'Live session version must be 9.3.0');
  assert.equal(state.game, 'tressette');
  assert.equal(state.status, 'playing');
  assert.equal(state.seats, 2);
  assert.equal(state.private, true);
  assert.equal(state.humanCount, 2);
  assert.equal(state.botCount, 0);
  assert.ok(Number.isInteger(state.seat) && state.seat >= 0 && state.seat <= 1);
  assert.ok(Number.isInteger(state.turn) && state.turn >= 0 && state.turn <= 1);
  assert.ok(Number.isInteger(state.revision));
  assert.ok(Array.isArray(state.hand) && state.hand.length > 0);
  assert.equal(state.players.length, 2);
  assert.ok(state.players.every(player => player.bot === false));
  assert.ok(Array.isArray(state.actions));
  assert.ok(state.seat === state.turn ? state.actions.length > 0 : state.actions.length === 0,
    'Only the active participant may receive legal actions');
  for (const key of ['deck', 'stock', 'random', 'rng', 'members', 'sessions', 'state']) {
    assert.ok(!(key in state), 'Private engine state leaked through ' + key);
  }
  for (const player of state.players) {
    for (const key of ['hand', 'cards', 'token', 'requests']) assert.ok(!(key in player), 'Private player data leaked through ' + key);
  }
  for (const card of state.hand) {
    assert.ok(typeof card.id === 'string' && card.id.length > 0);
    assert.ok(Number.isInteger(card.s) && card.s >= 0 && card.s <= 3);
    assert.ok(Number.isInteger(card.v) && card.v >= 1 && card.v <= 10);
  }
}
function pairedChecks(states) {
  states.forEach(stateChecks);
  const [left, right] = states;
  assert.notEqual(left.seat, right.seat, 'Independent participants must have distinct seats');
  assert.equal(left.roomId, right.roomId, 'Both participants must join the same private room');
  assert.equal(left.code, right.code);
  assert.match(left.code, /^[A-Z0-9]{8}$/);
  assert.equal(left.revision, right.revision, 'Both views must share a revision');
  assert.equal(left.turn, right.turn, 'Both views must share the active turn');
  const cards = states.flatMap(state => state.hand.map(card => card.id));
  assert.equal(new Set(cards).size, cards.length, 'Private hands must contain different cards');
  for (const state of states) {
    for (const other of states) {
      assert.equal(state.players[other.seat].handCount, other.hand.length, 'Public hand counts must match private hands');
    }
  }
}
async function runLiveQa(reportFile) {
  const root = path.resolve(__dirname, '..');
  const base = process.env.NC_LIVE_BASE_URL || manifest.backendUrl;
  const client = createClient(base), participants = [];
  const report = {
    ok: false, startedAt: new Date().toISOString(), endpoint: client.origin,
    expectedVersion: manifest.app.versionName, game: 'tressette', privateTable: true,
    catalogAttempts: 0, moves: [], cleanup: { attempted: 0, succeeded: 0, errors: [] }
  };
  try {
    const deadline = Date.now() + manifest.liveQa.catalogWaitMs;
    let catalog;
    while (Date.now() < deadline) {
      report.catalogAttempts++;
      try {
        const remaining = deadline - Date.now();
        const response = await client.request('catalog', { timeoutMs: Math.min(15000, Math.max(1, remaining)) });
        const candidate = response.data;
        if (candidate.version === manifest.app.versionName && Array.isArray(candidate.games)) {
          assert.deepEqual(candidate.games.map(game => game.id).sort(), manifest.app.expansionIds.slice().sort());
          catalog = candidate; break;
        }
        console.log('Waiting for live catalogue 9.3.0; attempt ' + report.catalogAttempts);
      } catch (error) {
        report.lastCatalogError = error.message;
        console.log('Waiting for live backend; attempt ' + report.catalogAttempts + ': ' + error.message);
      }
      if (Date.now() < deadline) await sleep(Math.min(5000, deadline - Date.now()));
    }
    assert.ok(catalog, 'Backend catalogue 9.3.0 was not ready within five minutes');
    report.catalogVersion = catalog.version;
    report.catalogGames = catalog.games.length;

    const first = (await client.request('join', { method: 'POST',
      body: { game: 'tressette', seats: 2, name: 'Verifica 9.3 A', bot: false, private: true } })).data;
    assert.ok(typeof first.token === 'string' && first.token.length >= 16);
    participants.push({ token: first.token, seat: first.state && first.state.seat });
    assert.equal(first.state.status, 'waiting');
    assert.equal(first.state.private, true);
    assert.match(first.state.code, /^[A-Z0-9]{8}$/);
    const second = (await client.request('join', { method: 'POST',
      body: { game: 'tressette', seats: 2, name: 'Verifica 9.3 B', bot: false, private: true, invite: first.state.code } })).data;
    assert.ok(typeof second.token === 'string' && second.token.length >= 16);
    participants.push({ token: second.token, seat: second.state && second.state.seat });
    assert.notEqual(first.token, second.token);
    assert.equal(second.state.roomId, first.state.roomId);

    async function refresh() {
      const responses = await Promise.all(participants.map(participant => client.request('state', { token: participant.token })));
      const states = responses.map(response => response.data);
      pairedChecks(states);
      return states;
    }
    let states = await refresh();
    report.initialHandCounts = states.map(state => state.hand.length);
    report.independentHands = true;
    for (let index = 0; index < manifest.liveQa.expectedMoves; index++) {
      const active = states.find(state => state.seat === state.turn);
      const participant = participants.find(item => item.seat === active.seat);
      const ids = new Set(active.hand.map(card => card.id));
      const action = active.actions.find(candidate => typeof candidate.card === 'string' && ids.has(candidate.card));
      assert.ok(action, 'Tressette must offer a legal card action');
      const payload = { revision: active.revision, requestId: 'nc93-' + crypto.randomUUID(), action };
      const moved = (await client.request('move', { method: 'POST', token: participant.token, body: payload })).data;
      assert.equal(moved.revision, active.revision + 1, 'One move must advance the revision once');
      assert.ok(!moved.hand.some(card => card.id === action.card), 'Played card must leave the private hand');
      const replay = (await client.request('move', { method: 'POST', token: participant.token, body: payload })).data;
      assert.equal(replay.revision, moved.revision, 'Retrying the same request must be idempotent');
      report.moves.push({ seat: active.seat, revision: moved.revision, cardLeftHand: true, replayIdempotent: true });
      states = await refresh();
    }
    assert.equal(new Set(report.moves.map(move => move.seat)).size, 2, 'Each participant must play one card');
    report.refreshConsistent = true;
    report.finalHandCounts = states.map(state => state.hand.length);
    report.ok = true;
  } catch (error) {
    report.error = error.message;
  } finally {
    for (const participant of participants) {
      report.cleanup.attempted++;
      try {
        const response = await client.request('leave', { method: 'POST', token: participant.token, body: {} });
        assert.equal(response.data.ok, true, 'Leave must confirm cleanup');
        await client.request('state', { token: participant.token, accept: [401] });
        report.cleanup.succeeded++;
      } catch (error) {
        report.cleanup.errors.push(error.message);
        report.ok = false;
      }
    }
    client.close();
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(path.resolve(reportFile)), { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  }
  if (!report.ok) throw new Error(report.error || 'Live QA cleanup failed: ' + report.cleanup.errors.join('; '));
  console.log('PASS live HTTPS: two private human sessions, distinct hands, two moves, refresh and cleanup');
  return report;
}
if (require.main === module) {
  const report = process.argv[2] || path.join(__dirname, '../dist/qa/live.json');
  runLiveQa(report).catch(error => { console.error('FAIL live HTTPS QA:', error.message); process.exitCode = 1; });
}
module.exports = { createClient, stateChecks, pairedChecks, runLiveQa };
