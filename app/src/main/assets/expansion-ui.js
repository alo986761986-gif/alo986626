(function (w, d) {
  'use strict';
  const rules = w.NC_EXPANSION_RULES || {}, Session = w.NC_EXPANSION_SESSION;
  if (!Session || w.NC_EXPANSION) return;
  const SERVER = 'https://napoli-chiodo-121.onrender.com';
  const icons = { tressette: '🃏', traversone: '🔄', briscola_chiamata: '🤝', bestia: '🐺', trentuno: '31', cucu: '🐦', cirulla: '✨', asino: '🐴', dubito: '🎭', tressette_morto: '👤', mercante: '🎪' };
  const local = Session.createService();
  let host = null, chosen = 'tressette', mode = 'cpu', current = null, key = null, timer = null, clock = null, selected = null;
  let busy = false, fetching = false, epoch = 0, rulesOpen = false, leaveOpen = false, originFocus = null, offset = 0;
  let pendingInvitation = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const by = id => host && host.querySelector('#' + id);
  const format = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value) : String(value == null ? '—' : value);
  function node(tag, className, text) { const el = d.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el; }
  function name() { return w.NC80_IDENTITY && w.NC80_IDENTITY.get ? w.NC80_IDENTITY.get() : localStorage.getItem('nc3d_name') || 'Giocatore'; }
  function music() { if (w.NC74_MUSIC && w.NC74_MUSIC.syncGame) w.NC74_MUSIC.syncGame(); }
  function announce(message) { const el = by('ncx-error'); if (el) { el.textContent = message || ''; el.hidden = !message; } }
  async function request(path, payload, auth) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(SERVER + '/expansion/' + path, { method: payload == null ? 'GET' : 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, auth ? { Authorization: 'Bearer ' + auth } : {}), body: payload == null ? undefined : JSON.stringify(payload), cache: 'no-store', signal: controller.signal });
      let data; try { data = await response.json(); } catch (_) { throw new Error('Il servizio online non è disponibile. Riprova tra poco.'); }
      if (!response.ok || data.error) { const error = new Error(data.error || 'Connessione non riuscita.'); error.status = response.status; throw error; }
      return data;
    } catch (error) { if (error.name === 'AbortError') throw new Error('La connessione impiega troppo tempo. Controlla la rete e riprova.'); throw error; }
    finally { clearTimeout(timeout); }
  }
  function shell() {
    host.innerHTML = '<div class="ncx-page"><header class="ncx-head"><button id="ncx-back" class="ncx-icon" aria-label="Torna alla selezione dei giochi">‹</button><div><small>NAPOLI CARTE 3D</small><h1>' + esc(rules[chosen].title) + '</h1></div><button id="ncx-rules" class="ncx-icon" aria-label="Leggi le regole">?</button></header><p id="ncx-error" class="ncx-error" role="status" hidden></p><main id="ncx-main"></main><div id="ncx-dialog"></div></div>';
    by('ncx-back').onclick = close;
    by('ncx-rules').onclick = () => { rulesOpen = true; dialog(); };
  }
  function dialog() {
    const target = by('ncx-dialog'); if (!target) return;
    target.replaceChildren();
    if (!rulesOpen && !leaveOpen) return;
    const box = node('section', 'ncx-dialog'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', rulesOpen ? 'Regole del gioco' : 'Lascia il tavolo');
    const panel = node('div', 'ncx-dialog-panel'); panel.append(node('h2', '', rulesOpen ? rules[chosen].title : 'Lasciare il tavolo?'));
    panel.append(node('p', 'ncx-rule-copy', rulesOpen ? rules[chosen].rules : 'Se lasci una partita online, il tuo posto sarà affidato alla CPU.'));
    const stay = node('button', 'ncx-primary', rulesOpen ? 'Ho capito' : 'Resta al tavolo'); stay.onclick = () => { rulesOpen = false; leaveOpen = false; dialog(); }; panel.append(stay);
    if (leaveOpen) { const leave = node('button', 'ncx-secondary', 'Lascia il tavolo'); leave.onclick = () => { destroy(true); }; panel.append(leave); }
    box.append(panel); target.append(box); stay.focus();
  }
  function configuration() {
    epoch++; clearInterval(timer); clearInterval(clock); busy = false; fetching = false;
    current = null; selected = null; shell();
    const engine = rules[chosen], target = by('ncx-main');
    target.innerHTML = '<section class="ncx-config"><div class="ncx-hero-icon">' + esc(icons[chosen] || '🃏') + '</div><span class="ncx-eyebrow">LA TUA PROSSIMA SFIDA</span><h2>' + esc(engine.title) + '</h2><p>Carte napoletane, regole del tavolo e avversari pronti a giocare.</p><div class="ncx-mode" role="group" aria-label="Modalità"><button id="ncx-mode-cpu" class="' + (mode === 'cpu' ? 'active' : '') + '">🤖 Contro CPU</button><button id="ncx-mode-online" class="' + (mode === 'online' ? 'active' : '') + '">🌐 Online</button></div><label class="ncx-field">Giocatori al tavolo<select id="ncx-seats">' + engine.seats.map(n => '<option value="' + n + '">' + n + ' giocatori</option>').join('') + '</select></label><label class="ncx-field">Il tuo nickname<input id="ncx-name" maxlength="24" value="' + esc(name()) + '"></label>' + (mode === 'online' ? '<label class="ncx-check"><input id="ncx-private" type="checkbox"> Crea una sala privata</label><label class="ncx-field">Hai un codice sala?<input id="ncx-invite" placeholder="8 caratteri · facoltativo" maxlength="8" autocapitalize="characters" autocomplete="off"></label><p class="ncx-note">Cerca giocatori reali. Dopo 30 secondi il creatore può scegliere di completare il tavolo con CPU.</p>' : '<p class="ncx-note">Puoi giocare anche senza Internet.</p>') + '<button id="ncx-start" class="ncx-primary">' + (mode === 'online' ? 'Cerca giocatori' : 'Inizia la partita') + '</button><button id="ncx-config-rules" class="ncx-secondary">Leggi regole e variante</button><p class="ncx-note">Partita a punti · Nessun credito viene prelevato</p><div id="ncx-resume"></div></section>';
    by('ncx-mode-cpu').onclick = () => { if (busy) return; mode = 'cpu'; configuration(); };
    by('ncx-mode-online').onclick = () => { if (busy) return; mode = 'online'; configuration(); };
    by('ncx-config-rules').onclick = () => { rulesOpen = true; dialog(); };
    by('ncx-start').onclick = start;
    try {
      const saved = JSON.parse(localStorage.getItem('ncx-online-session') || 'null');
      if (mode === 'online' && saved && saved.game === chosen && saved.token) {
        const b = node('button', 'ncx-secondary', 'Riprendi la tua partita online'); b.onclick = () => resume(saved); by('ncx-resume').append(b);
      }
    } catch (_) {}
    music();
  }
  function startPolling() {
    clearInterval(timer); clearInterval(clock);
    timer = setInterval(refresh, mode === 'cpu' ? 450 : 1200);
    clock = setInterval(tickClock, 250);
  }
  async function resume(saved) {
    if (busy) return; busy = true; const mine = epoch; mode = 'online';
    try { const next = await request('state', null, saved.token); if (!host || mine !== epoch) return; key = saved.token; accept(next); startPolling(); }
    catch (error) { if (mine === epoch) { announce(error.message); if (error.status === 401) localStorage.removeItem('ncx-online-session'); } }
    finally { if (mine === epoch) { busy = false; if (host && current) renderActions(); } }
  }
  async function start() {
    if (busy) return;
    const mine = epoch, chosenMode = mode;
    const input = { game: chosen, seats: Number(by('ncx-seats').value), name: by('ncx-name').value.trim() || name(), bot: mode === 'cpu', private: !!(by('ncx-private') && by('ncx-private').checked), invite: by('ncx-invite') ? by('ncx-invite').value.trim().toUpperCase() : '', roomId: pendingInvitation && pendingInvitation.roomId || '' };
    busy = true; by('ncx-start').disabled = true; by('ncx-start').textContent = mode === 'online' ? 'Connessione…' : 'Preparazione…'; announce('');
    try {
      if (mode === 'online') {
        const available = await request('catalog');
        if (!available.games || !available.games.some(g => g.id === chosen)) throw new Error('Le sale online di questo gioco non sono ancora disponibili. Puoi giocare contro CPU.');
      }
      const joined = chosenMode === 'cpu' ? local.join(input) : await request('join', input);
      if (!host || mine !== epoch) {
        if (chosenMode === 'cpu') local.leave(joined.token); else request('leave', {}, joined.token).catch(() => {});
        return;
      }
      pendingInvitation = null;
      key = joined.token; chosen = joined.state.game;
      if (mode === 'online') localStorage.setItem('ncx-online-session', JSON.stringify({ token: key, game: chosen }));
      accept(joined.state); startPolling();
    } catch (error) { if (host && mine === epoch) { announce(error.message); const b = by('ncx-start'); if (b) { b.disabled = false; b.textContent = chosenMode === 'cpu' ? 'Inizia la partita' : 'Riprova connessione'; } } }
    finally { if (mine === epoch) { busy = false; if (host && current) renderActions(); } }
  }
  async function refresh() {
    if (!host || !key || busy || fetching || !current || current.status === 'finished') return;
    fetching = true; const mine = epoch;
    try { const next = mode === 'cpu' ? local.state(key) : await request('state', null, key); if (host && mine === epoch) { if (!current || next.revision !== current.revision || next.canFill !== current.canFill) accept(next); else { offset = Date.now() - next.serverNow; current.turnDeadline = next.turnDeadline; } announce(''); } }
    catch (error) { if (host && mine === epoch) announce(error.message); }
    finally { if (mine === epoch) fetching = false; }
  }
  function accept(next) {
    if (!host || (current && next.roomId === current.roomId && next.revision < current.revision)) return;
    current = next; offset = Date.now() - next.serverNow;
    render(); music();
  }
  async function sendAction(action) {
    if (busy || !key || !current || current.status !== 'playing') return;
    busy = true; const mine = epoch;
    const requestId = crypto.randomUUID ? crypto.randomUUID() : 'move-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    const input = { revision: current.revision, action, requestId };
    host.querySelectorAll('[data-ncx-action]').forEach(b => { b.disabled = true; });
    try { const next = mode === 'cpu' ? local.move(key, input) : await request('move', input, key); if (host && mine === epoch) { selected = null; accept(next); } }
    catch (error) { if (host && mine === epoch) { announce(error.message); try { const next = mode === 'cpu' ? local.state(key) : await request('state', null, key); if (mine === epoch) accept(next); } catch (_) {} } }
    finally { if (mine === epoch) { busy = false; if (host && current) renderActions(); } }
  }
  function cardHTML(card) {
    if (!card || !Number.isInteger(card.v) || !Number.isInteger(card.s)) return '';
    if (typeof w.card === 'function') return w.card(card, false);
    return '<span class="ncx-simple-card">' + esc(({ 8: 'F', 9: 'C', 10: 'R' })[card.v] || card.v) + '<span>' + ['🪙', '🏆', '⚔️', '🌿'][card.s] + '</span></span>';
  }
  function addCards(target, cards, clickable) {
    (cards || []).forEach(c => {
      const enabled = clickable && current && current.actions.some(a => a.card === c.id);
      const wrapper = node(enabled ? 'button' : 'span', 'ncx-card' + (selected === c.id ? ' selected' : ''));
      wrapper.innerHTML = cardHTML(c);
      if (enabled) { wrapper.type = 'button'; wrapper.setAttribute('aria-label', 'Scegli ' + c.v + ' di ' + ['denari', 'coppe', 'spade', 'bastoni'][c.s]); wrapper.onclick = () => { selected = selected === c.id ? null : c.id; render(); }; }
      target.append(wrapper);
    });
  }
  function render() {
    if (!host || !current) return;
    shell();
    const s = current, target = by('ncx-main');
    if (s.status === 'waiting') {
      target.innerHTML = '<section class="ncx-wait"><div class="ncx-spinner" aria-hidden="true"></div><h2>Stiamo preparando il tavolo</h2><p>' + s.humanCount + ' giocatori reali · ' + s.seats + ' posti</p>' + (s.code ? '<p class="ncx-note">Invita i tuoi amici con il codice</p><strong class="ncx-code">' + esc(s.code) + '</strong>' : '') + '<div class="ncx-players">' + s.players.map(p => '<div class="ncx-player"><span>👤</span><b>' + esc(p.name) + '</b></div>').join('') + '</div><p id="ncx-search-clock" class="ncx-note"></p>' + (mode === 'online' && s.seat === 0 ? '<button type="button" id="ncx-open-invites" class="ncx-secondary">✉ Invita amici al tavolo</button>' : '') + '<button id="ncx-fill" class="ncx-primary" ' + (s.canFill ? '' : 'hidden') + '>Completa il tavolo con CPU</button><p class="ncx-note">Puoi tornare indietro in qualsiasi momento.</p></section>';
      if(by('ncx-open-invites'))by('ncx-open-invites').onclick=()=>w.NC70_SOCIAL?.open('invites');
      by('ncx-fill').onclick = async () => {
        if (busy) return; busy = true; const mine = epoch;
        try { const next = await request('fill', {}, key); if (host && mine === epoch) accept(next); } catch (error) { if (host && mine === epoch) announce(error.message); }
        finally { if (mine === epoch) { busy = false; if (host && current) renderActions(); } }
      };
      tickClock(); return;
    }
    const turnName = s.players[s.turn] ? s.players[s.turn].name : '';
    target.innerHTML = '<div class="ncx-game-meta"><span>' + (mode === 'cpu' ? 'CONTRO CPU' : 'ONLINE · ' + s.humanCount + ' reali · ' + s.botCount + ' CPU') + '</span> + (mode==='online' && s.seat===0 ? '<button type="button" id="ncx-open-invites" class="ncx-secondary">✉ Invita spettatori</button>' : '')<span>' + (s.status === 'finished' ? 'PARTITA CONCLUSA' : s.turn === s.seat ? 'IL TUO TURNO' : 'TURNO DI ' + esc(turnName.toUpperCase())) + '</span><span id="ncx-turn-clock"></span></div><section class="ncx-players" aria-label="Giocatori">' + s.players.map((p, i) => '<div class="ncx-player' + (s.status === 'playing' && i === s.turn ? ' active' : '') + (p.eliminated ? ' eliminated' : '') + '"><span>' + (p.bot ? '🤖' : '👤') + '</span><b>' + esc(p.name) + (i === s.seat ? ' · TU' : '') + '</b><small>' + (p.handCount == null ? '' : p.handCount + ' carte · ') + (p.score == null ? '—' : format(p.score)) + ' pt' + (p.team != null ? ' · Squadra ' + (Number(p.team) + 1) : '') + (p.lives != null ? ' · ' + p.lives + ' vite' : '') + '</small></div>').join('') + '</section><p class="ncx-message" role="status">' + esc(s.message || '') + '</p><div id="ncx-public-info" class="ncx-public-info"></div><section class="ncx-table" aria-label="Tavolo"><div id="ncx-table-cards" class="ncx-table-cards"></div><div id="ncx-extra"></div></section><section class="ncx-hand-wrap"><h2>' + (s.status === 'finished' ? 'La tua mano finale' : 'Le tue carte') + '</h2><div id="ncx-hand" class="ncx-hand"></div></section><section id="ncx-actions" class="ncx-actions" aria-label="Mosse disponibili"></section><section id="ncx-result"></section><details class="ncx-log"><summary>Ultime mosse</summary><ol>' + (s.log || []).slice(0, 10).map(line => '<li>' + esc(line) + '</li>').join('') + '</ol></details>';
    if(by('ncx-open-invites'))by('ncx-open-invites').onclick=()=>w.NC70_SOCIAL?.open('invites');
    publicInformation(s);
    const table = by('ncx-table-cards');
    const visibleTrick = s.trick && s.trick.length ? s.trick : s.lastTrick || [];
    if (visibleTrick.length) visibleTrick.forEach(t => { const wrap = node('div', 'ncx-trick'); addCards(wrap, [t.card || t], false); wrap.append(node('small', '', t.dummy ? 'Morto' : s.players[t.seat] ? s.players[t.seat].name : '')); table.append(wrap); });
    else addCards(table, s.table || [], false);
    if (!table.childNodes.length) table.append(node('span', 'ncx-table-hint', ({play:'Gioca una carta',auction:'Asta',call:'Scegli la carta chiamata',declare:'Dichiarazioni',exchange:'Cambio carte',draw:'Pesca',discard:'Scarta',prizes:'Scopri i premi',challenge:'Contesta o continua',choose:'Scegli una carta',finished:'Partita conclusa'})[s.phase] || 'Tavolo'));
    (s.extraHands || []).forEach(h => { const group = node('div', 'ncx-open-hand'); group.append(node('strong', '', h.label || 'Mano scoperta')); const row = node('div', 'ncx-hand'); addCards(row, h.cards || [], true); group.append(row); by('ncx-extra').append(group); });
    addCards(by('ncx-hand'), s.hand || [], true);
    if (!s.hand || !s.hand.length) by('ncx-hand').append(node('p', 'ncx-note', s.status === 'finished' ? 'Hai concluso la mano.' : 'Le azioni disponibili sono sotto il tavolo.'));
    renderActions();
    if (s.status === 'finished') {
      const result = by('ncx-result'), winners = s.result && s.result.winners || [];
      const heading = node('h2', '', winners.includes(s.seat) ? '🏆 Hai vinto!' : 'Partita conclusa'); result.append(heading);
      result.append(node('p', '', s.result && s.result.text || (winners.length ? 'Vincitori: ' + winners.map(i => s.players[i] ? s.players[i].name : '').join(', ') : '')));
      const scores = s.scores && s.scores.length ? s.scores : s.players.map((p, i) => ({ seat: i, points: p.score }));
      const list = node('div', 'ncx-score-list');
      scores.forEach((score, i) => { const seat = score.seat == null ? i : score.seat; const row = node('div'); row.append(node('span', '', score.label || (s.players[seat] ? s.players[seat].name : 'Squadra ' + (i + 1))), node('b', '', format(score.points == null ? score.score : score.points) + ' pt')); list.append(row); });
      result.append(list);
      const again = node('button', 'ncx-primary', 'Nuova partita'); again.onclick = async () => { const previous = key; key = null; clearInterval(timer); clearInterval(clock); if (mode === 'cpu') { try { local.leave(previous); } catch (_) {} } else { request('leave', {}, previous).catch(() => {}); localStorage.removeItem('ncx-online-session'); } configuration(); }; result.append(again);
      clearInterval(timer); clearInterval(clock);
    }
    tickClock(); dialog();
  }
  function publicInformation(s) {
    const target = by('ncx-public-info'); if (!target) return;
    const suits = ['Denari', 'Coppe', 'Spade', 'Bastoni'];
    const cardText = c => c ? (({ 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' })[c.v] || c.v) + ' di ' + suits[c.s] : '';
    const chip = text => target.append(node('span', 'ncx-chip', text));
    if (s.trump != null) chip('Briscola: ' + suits[typeof s.trump === 'object' ? s.trump.s : s.trump]);
    if (s.contract != null) chip('Contratto: ' + s.contract + ' punti');
    if (s.calledCard) chip('Carta chiamata: ' + cardText(s.calledCard));
    if (s.privateRole === 'socio') chip('Sei il socio segreto del chiamante');
    if (s.partnerRevealed && s.partner != null && s.players[s.partner]) chip('Socio: ' + s.players[s.partner].name);
    if (s.pileCount != null) chip('Mucchio: ' + s.pileCount + ' carte');
    if (s.declaredValue != null) chip('Valore dichiarato: ' + (({ 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' })[s.declaredValue] || s.declaredValue));
    if (s.highBid != null) chip('Offerta: ' + s.highBid + ' punti' + (s.highBidder != null && s.players[s.highBidder] ? ' · ' + s.players[s.highBidder].name : ''));
    if (s.pot != null) chip('Montepremi di partita: ' + s.pot + ' punti');
    if (s.lotsRemaining != null) chip('Carte in asta: ' + s.lotsRemaining);
    if (s.round != null) chip('Mano ' + s.round);
    if (s.deckCount != null) chip('Mazzo: ' + s.deckCount + ' carte');
    if (s.lastDraws && s.lastDraws.length) {
      const row = node('div', 'ncx-public-draws'); row.append(node('strong', '', 'Ultime pescate scoperte'));
      s.lastDraws.forEach(draw => { const item = node('div', 'ncx-trick'); addCards(item, [draw.card], false); item.append(node('small', '', s.players[draw.seat] ? s.players[draw.seat].name : '')); row.append(item); }); target.append(row);
    }
  }
  function renderActions() {
    const target = by('ncx-actions'); if (!target || !current) return;
    target.replaceChildren();
    if (current.status !== 'playing') return;
    if (current.turn !== current.seat) { target.append(node('p', 'ncx-note', 'Attendi il tuo turno.')); return; }
    const actions = current.actions || [];
    if (selected && !actions.some(a => a.card === selected)) selected = null;
    const candidates = selected ? actions.filter(a => a.card === selected) : actions;
    if (!selected && candidates.some(a => a.card)) target.append(node('p', 'ncx-note', 'Tocca una carta oppure scegli una mossa.'));
    candidates.forEach(a => { const button = node('button', 'ncx-action', a.label || a.type); button.type = 'button'; button.dataset.ncxAction = 'true'; button.disabled = busy; button.onclick = () => sendAction(a); target.append(button); });
    if (!candidates.length) target.append(node('p', 'ncx-note', 'Aggiornamento del tavolo…'));
  }
  function tickClock() {
    if (!host || !current) return;
    const serverTime = Date.now() - offset;
    const turn = by('ncx-turn-clock'); if (turn) turn.textContent = current.status === 'playing' && current.turnDeadline ? Math.max(0, Math.ceil((current.turnDeadline - serverTime) / 1000)) + ' s' : '';
    const search = by('ncx-search-clock'); if (search) { const remaining = Math.max(0, Math.ceil((current.searchDeadline - serverTime) / 1000)); search.textContent = remaining > 0 ? 'Ricerca in corso · ' + remaining + ' s' : current.seat === 0 ? 'Puoi aspettare altri giocatori o completare il tavolo con CPU.' : 'Il creatore può completare il tavolo con CPU.'; }
  }
  function close() {
    if (!host) return false;
    if (rulesOpen || leaveOpen) { rulesOpen = false; leaveOpen = false; dialog(); return true; }
    if (current && current.status === 'playing') { leaveOpen = true; dialog(); return true; }
    destroy(true); return true;
  }
  function destroy(leave) {
    epoch++; const previous = key, previousMode = mode;
    key = null; current = null; busy = false; fetching = false; selected = null; rulesOpen = false; leaveOpen = false;
    clearInterval(timer); clearInterval(clock);
    if (host) { host.remove(); host = null; }
    d.body.classList.remove('ncx-open');
    if (leave && previous) {
      if (previousMode === 'cpu') { try { local.leave(previous); } catch (_) {} }
      else { request('leave', {}, previous).catch(() => {}); localStorage.removeItem('ncx-online-session'); }
    }
    music(); if (originFocus && originFocus.isConnected) originFocus.focus();
  }
  function open(id, requestedMode) {
    if (!rules[id]) return false;
    if (host) { if (current && current.status === 'playing') return false; destroy(true); }
    epoch++; chosen = id; mode = requestedMode === 'online' ? 'online' : 'cpu'; originFocus = d.activeElement;
    host = node('section', 'ncx-screen'); host.id = 'ncx-screen'; host.setAttribute('aria-label', rules[id].title);
    d.body.append(host); d.body.classList.add('ncx-open'); configuration(); by('ncx-back').focus();
    return true;
  }
  d.addEventListener('keydown', event => { if (event.key === 'Escape' && host) { event.preventDefault(); close(); } });
  d.addEventListener('visibilitychange', () => { if (!d.hidden && host && key) refresh(); });
  function invitationContext(){
    if(mode!=='online'||!current||!key||current.seat!==0)return null;
    return {tableToken:key,roomId:current.roomId,game:current.game,
      status:current.status,private:current.private,code:current.code};
  }
  function joinInvitation(invite){
    if(!invite||invite.kind!=='join'||!rules[invite.game])return false;
    if(host && current && current.status==='playing')return false;
    if(host)destroy(true);
    if(!open(invite.game,'online'))return false;
    pendingInvitation={roomId:typeof invite.roomId==='string'?invite.roomId:''};
    if(invite.code && by('ncx-invite'))by('ncx-invite').value=String(invite.code);
    if(by('ncx-seats')&&invite.seats)by('ncx-seats').value=String(invite.seats);
    const btn=by('ncx-start');if(btn)btn.click();
    return true;
  }
  function takeoverInvitation(joined){
    if(!joined||!joined.token||!joined.state||!rules[joined.state.game])return false;
    if(host && current && current.status==='playing')return false;
    if(host)destroy(true);
    if(!open(joined.state.game,'online'))return false;
    key=joined.token;
    localStorage.setItem('ncx-online-session',JSON.stringify({token:key,game:joined.state.game}));
    accept(joined.state);startPolling();
    return true;
  }
  w.NC_EXPANSION = { open, close, isOpen: () => !!host, isPlaying: () => !!(host && current),
    catalog: () => Session.catalog(), invitationContext, joinInvitation, takeoverInvitation };
})(window, document);
