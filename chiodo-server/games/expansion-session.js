(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(Object.assign({}, require('./expansion-tricks.js'), require('./expansion-table.js'), require('./expansion-party.js')));
  } else root.NC_EXPANSION_SESSION = factory(root.NC_EXPANSION_RULES || {});
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engines) {
  'use strict';
  const VERSION = '9.3.0';
  const TURN_MS = 60000, SEARCH_MS = 30000;
  function fail(message, status) { const error = new Error(message); error.status = status || 400; throw error; }
  function cleanName(name) { return String(name || 'Giocatore').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24) || 'Giocatore'; }
  function token() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Questo dispositivo richiede un contesto sicuro per creare la partita.');
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).filter(k => k !== 'label').sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function catalog() {
    return Object.keys(engines).map(id => { const e = engines[id]; return { id, title: e.title, seats: e.seats.slice(), rules: e.rules, status: 'playable', version: VERSION }; });
  }
  function createService(options) {
    options = options || {};
    const now = options.now || Date.now, random = options.random || Math.random, makeToken = options.token || token;
    const rooms = new Map(), sessions = new Map();
    const botDelay = options.botDelay == null ? 700 : options.botDelay;
    function auth(key) {
      const session = sessions.get(key);
      if (!session || !rooms.has(session.room.id)) fail('Partita non più disponibile. Torna alla selezione dei giochi.', 401);
      session.room.updated = now();
      return session;
    }
    function remove(room) { room.members.forEach(p => { if (p.token) sessions.delete(p.token); }); rooms.delete(room.id); }
    function begin(room) {
      if (room.state || room.members.length !== room.seats) return;
      room.state = engines[room.game].create({ seats: room.seats, random });
      if (!room.state || !Array.isArray(room.state.players)) fail('Il gioco non è stato inizializzato.');
      room.state.players.forEach((player, i) => { if (room.members[i]) player.name = room.members[i].name; });
      room.revision++; room.deadline = now() + TURN_MS; room.botDue = now() + botDelay;
    }
    function checkTurn(room) {
      if (room.state.status === 'finished') { room.deadline = 0; return; }
      if (!Number.isInteger(room.state.turn) || room.state.turn < 0 || room.state.turn >= room.seats) fail('Turno del gioco non valido.', 500);
      room.deadline = now() + TURN_MS; room.botDue = now() + botDelay;
    }
    function apply(room, seat, proposed, automatic) {
      const engine = engines[room.game];
      if (!room.state || room.state.status !== 'playing') fail('La partita non è in corso.');
      if (room.state.turn !== seat) fail('Attendi il tuo turno.', 409);
      const choices = engine.actions(room.state, seat);
      const signature = stable(proposed);
      const action = choices.find(a => stable(a) === signature);
      if (!action) fail('Questa mossa non è consentita dalle regole.');
      // A failed rule validation must never leave a partially modified room.
      const candidate = JSON.parse(JSON.stringify(room.state));
      engine.apply(candidate, seat, action);
      room.state = candidate; room.revision++; room.updated = now();
      if (automatic && Array.isArray(room.state.log)) {
        room.state.log.unshift('Tempo scaduto: mossa automatica per ' + room.members[seat].name + '.');
        room.state.log = room.state.log.slice(0, 12);
      }
      checkTurn(room);
    }
    function tickRoom(room) {
      if (!room.state || room.state.status !== 'playing') return;
      const seat = room.state.turn, player = room.members[seat];
      if (!player) fail('Posto non valido.', 500);
      if (player.bot ? now() < room.botDue : now() < room.deadline) return;
      const engine = engines[room.game];
      const choices = engine.actions(room.state, seat);
      if (!choices.length) fail('Il gioco non ha una mossa valida per il turno corrente.', 500);
      const action = engine.chooseBot ? engine.chooseBot(room.state, seat, random) : choices[0];
      apply(room, seat, action, !player.bot);
    }
    function view(session) {
      const room = session.room, seat = session.seat;
      const base = room.state ? engines[room.game].view(room.state, seat) : { status: 'waiting', turn: null, phase: 'waiting', hand: [], table: [], trick: [], players: [], actions: [], result: null, message: 'Ricerca di altri giocatori…', log: [] };
      const players = room.members.map((member, i) => Object.assign({}, base.players && base.players[i] || {}, { seat: i, name: member.name, bot: !!member.bot }));
      return Object.assign({}, base, { players, game: room.game, title: engines[room.game].title, seats: room.seats, seat, roomId: room.id, code: room.private ? room.code : null, private: room.private, revision: room.revision, serverNow: now(), turnDeadline: room.deadline || 0, searchDeadline: room.searchDeadline, canFill: !room.state && seat === 0 && now() >= room.searchDeadline, humanCount: room.members.filter(p => !p.bot).length, botCount: room.members.filter(p => p.bot).length, version: VERSION, rules: engines[room.game].rules });
    }
    function join(input) {
      input = input || {};
      if (rooms.size >= 500 || sessions.size >= 2500) fail('Le sale sono piene. Riprova tra poco.', 503);
      let game = String(input.game || ''), seats = Number(input.seats), room;
      const invite = String(input.invite || '').trim().toUpperCase();
      if (invite) {
        if (!/^[A-Z0-9]{8}$/.test(invite)) fail('Il codice sala contiene 8 caratteri.');
        room = Array.from(rooms.values()).find(r => r.private && r.code === invite && !r.state && r.members.length < r.seats);
        if (!room) fail('Sala privata non disponibile o già iniziata.', 404);
        game = room.game; seats = room.seats;
      }
      const engine = engines[game];
      if (!engine || !engine.seats.includes(seats)) fail('Gioco o numero di partecipanti non valido.');
      const withBots = input.bot === true && !invite;
      if (!room && !withBots && !input.private) room = Array.from(rooms.values()).find(r => !r.private && !r.local && r.game === game && r.seats === seats && !r.state && r.members.length < r.seats && now() - r.created < 180000);
      if (!room) {
        room = { id: makeToken(), game, seats, private: !!input.private, local: withBots, code: null, created: now(), updated: now(), searchDeadline: now() + SEARCH_MS, members: [], state: null, revision: 0, deadline: 0, botDue: 0 };
        if (room.private) {
          for (let attempt = 0; attempt < 20; attempt++) {
            const code = makeToken().replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
            if (code.length === 8 && !Array.from(rooms.values()).some(r => r.code === code)) { room.code = code; break; }
          }
          if (!room.code) fail('Impossibile creare il codice sala. Riprova.');
        }
        rooms.set(room.id, room);
      }
      const key = makeToken(), seat = room.members.length;
      room.members.push({ token: key, name: cleanName(input.name), bot: false, requests: [] });
      const session = { room, seat }; sessions.set(key, session); room.updated = now(); room.revision++;
      if (withBots) while (room.members.length < room.seats) room.members.push({ name: 'CPU ' + room.members.length, bot: true, requests: [] });
      try { begin(room); } catch (error) { sessions.delete(key); room.members.splice(seat, 1); if (!room.members.length || withBots) remove(room); throw error; }
      return { token: key, state: view(session) };
    }
    function state(key) { const session = auth(key); tickRoom(session.room); return view(session); }
    function move(key, input) {
      const session = auth(key), room = session.room, player = room.members[session.seat];
      input = input || {};
      const request = typeof input.requestId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(input.requestId) ? input.requestId : null;
      if (request && player.requests.includes(request)) return view(session);
      tickRoom(room);
      if (input.revision !== room.revision) fail('Il tavolo è cambiato. Aggiorna la partita.', 409);
      apply(room, session.seat, input.action, false);
      if (request) { player.requests.push(request); player.requests = player.requests.slice(-24); }
      return view(session);
    }
    function fill(key) {
      const session = auth(key), room = session.room;
      if (room.state || session.seat !== 0 || now() < room.searchDeadline) fail('Solo il creatore può completare il tavolo dopo 30 secondi.');
      while (room.members.length < room.seats) room.members.push({ name: 'CPU ' + room.members.length, bot: true, requests: [] });
      begin(room); return view(session);
    }
    function leave(key) {
      const session = auth(key), room = session.room, seat = session.seat;
      sessions.delete(key);
      if (!room.state) {
        room.members.splice(seat, 1);
        room.members.forEach((p, i) => { const s = sessions.get(p.token); if (s) s.seat = i; });
      } else room.members[seat] = { name: 'CPU ' + (seat + 1), bot: true, requests: [] };
      room.revision++;
      if (!room.members.some(p => !p.bot)) remove(room);
      return { ok: true };
    }
    function tick() {
      for (const room of rooms.values()) {
        if (now() - room.updated > (room.state ? 1800000 : 180000)) { remove(room); continue; }
        try { tickRoom(room); } catch (error) { if (typeof options.onError === 'function') options.onError(error, room.game); }
      }
    }
    return { catalog, join, state, move, fill, leave, tick, size: () => rooms.size };
  }
  return { VERSION, TURN_MS, SEARCH_MS, catalog, createService };
});
