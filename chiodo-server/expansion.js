'use strict';
const crypto = require('node:crypto');
const Session = require('./games/expansion-session.js');
const service = Session.createService({
  token: () => crypto.randomBytes(24).toString('hex'),
  random: () => crypto.randomInt(0x100000000) / 0x100000000,
  onError: (error, game) => console.error('Expansion turn error', game, error.message)
});
const limits = new Map();
function allowed(req) {
  const auth = req.headers.authorization || '';
  const now = Date.now(), key = auth.startsWith('Bearer ') ? 'session:' + crypto.createHash('sha256').update(auth).digest('hex') : 'ip:' + (req.socket.remoteAddress || 'local');
  let window = limits.get(key);
  if (!window || now - window.start >= 60000) { window = { start: now, hits: 0 }; limits.set(key, window); }
  if (limits.size > 20000) for (const [ip, entry] of limits) if (now - entry.start > 120000) limits.delete(ip);
  return ++window.hits <= 300;
}
async function route(req, send, path) {
  try {
    if (req.method === 'GET' && path === '/expansion/catalog') return send(200, { ok: true, version: Session.VERSION, games: service.catalog(), turnSeconds: 60, searchSeconds: 30 });
    if (!allowed(req)) return send(429, { error: 'Troppe richieste. Attendi qualche secondo.' });
    const key = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (req.method === 'GET' && path === '/expansion/state') return send(200, service.state(key));
    if (req.method !== 'POST') return send(405, { error: 'Metodo non consentito.' });
    if (!['/expansion/join', '/expansion/move', '/expansion/fill', '/expansion/leave'].includes(path)) return send(404, { error: 'Operazione non disponibile.' });
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 16384) return send(413, { error: 'Richiesta troppo grande.' }); }
    let data;
    try { data = JSON.parse(body || '{}'); } catch (_) { return send(400, { error: 'Richiesta JSON non valida.' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return send(400, { error: 'Richiesta non valida.' });
    if (path === '/expansion/join') return send(200, service.join({ game: data.game, seats: data.seats, name: data.name, private: data.private === true, invite: data.invite, bot: false }));
    if (path === '/expansion/move') return send(200, service.move(key, data));
    if (path === '/expansion/fill') return send(200, service.fill(key));
    return send(200, service.leave(key));
  } catch (error) { return send(error.status || 400, { error: error.status === 500 ? 'Impossibile aggiornare il tavolo.' : error.message }); }
}
setInterval(() => service.tick(), 500).unref();
module.exports = { route, service };
