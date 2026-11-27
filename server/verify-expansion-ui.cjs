'use strict';
// Local, isolated UI smoke test. No request can reach an external service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.NC_UI_PLAYWRIGHT_MODULE || 'playwright');
const Session = require('../app/src/main/assets/expansion-session.js');
const ASSETS = path.resolve(process.env.NC_UI_ASSETS_ROOT || path.resolve(__dirname, '../app/src/main/assets'));
const OUT = path.resolve(process.env.NC_UI_QA_DIR || process.env.NAPOLI_QA_DIR || path.resolve(__dirname, '../dist/qa/ui'));
const games = ['tressette', 'traversone', 'briscola_chiamata', 'bestia', 'trentuno', 'cucu', 'cirulla', 'asino', 'dubito', 'tressette_morto', 'mercante'];
const report = { ok:false, startedAt:new Date().toISOString(), games: [], online: [], errors: [], pageErrors: [], localFailures: [], blockedExternal: {}, screenshots: [] };
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg' };
const server = http.createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(ASSETS, '.' + (route === '/' ? '/index.html' : decodeURIComponent(route)));
  if (file !== ASSETS && !file.startsWith(ASSETS + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => {
    if (error) { report.localFailures.push(route); res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(bytes);
  });
});
const online = Session.createService({ botDelay: 10 });
let browser, base;
function externalCount(url) { const host = new URL(url).host; report.blockedExternal[host] = (report.blockedExternal[host] || 0) + 1; }
async function prepare(context) {
  await context.addInitScript(() => {
    localStorage.setItem('nc74_welcome_seen:guest', '1');
    localStorage.setItem('nc74_music_enabled', '0');
    localStorage.setItem('nc3d_name', 'Collaudo');
    let seed = 28741;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    externalCount(req.url());
    if (url.hostname === 'napoli-chiodo-121.onrender.com' && url.pathname.startsWith('/expansion/')) {
      const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':base, 'Access-Control-Allow-Headers':'content-type,authorization', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status:204, headers, body:'' });
      const key = (req.headers().authorization || '').replace(/^Bearer /, ''), operation = url.pathname.split('/').pop();
      let payload = {}; try { payload = req.postDataJSON() || {}; } catch (_) {}
      try {
        let data;
        if (operation === 'catalog') data = { games:Session.catalog() };
        else if (operation === 'join') data = online.join(payload);
        else if (operation === 'state') data = online.state(key);
        else if (operation === 'move') data = online.move(key, payload);
        else if (operation === 'leave') data = online.leave(key);
        else if (operation === 'fill') data = online.fill(key);
        else throw new Error('Unsupported mocked route');
        return route.fulfill({ status:200, headers, body:JSON.stringify(data) });
      } catch (error) { return route.fulfill({ status:error.status || 400, headers, body:JSON.stringify({error:error.message}) }); }
    }
    return route.fulfill({ status:503, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body:JSON.stringify({ error:'External services disabled in isolated QA' }) });
  });
}
async function load(context) {
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push({ message:error.message, stack:error.stack }));
  await page.goto(base, { waitUntil:'load' });
  await page.waitForFunction(() => !!(window.NC_EXPANSION && window.NC74_MUSIC && window.NC81_BACK));
  await page.locator('#nc-studio-boot').waitFor({ state:'detached', timeout:10000 });
  assert.equal(await page.locator('.ncx-entry').count(), 11, 'all 11 new launcher tiles');
  await page.waitForFunction(() => {
    const sheet=document.getElementById('nc96-cartoon-theme');
    return !!sheet && !!sheet.sheet && sheet.sheet.cssRules.length>50;
  },null,{timeout:12000});
  const cartoon=await page.evaluate(()=>{
    const button=document.querySelector('#root button.game');
    return {
      body:document.body.classList.contains('nc96-cartoon'),
      theme:document.getElementById('nc96-cartoon-theme')?.href||'',
      border:button?parseFloat(getComputedStyle(button).borderTopWidth):0,
      background:getComputedStyle(document.body).backgroundImage
    };
  });
  assert.ok(cartoon.body && cartoon.theme.includes('nc96-cartoon.css'),'Cartoon theme is loaded');
  assert.ok(cartoon.border>=3,'Cartoon game tiles have bold borders');
  assert.ok(cartoon.background.includes('nc96-cartoon-golfo.svg'),'Original Napoli drawing loaded');

  return page;
}
async function shot(page, name) {
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path:file, animations:'disabled' }); report.screenshots.push(file);
}
async function layout(page) {
  const result = await page.evaluate(() => {
    const host = document.getElementById('ncx-screen');
    return { client:host.clientWidth, width:host.scrollWidth, document:document.documentElement.scrollWidth, viewport:innerWidth,
      clippedActions:[...host.querySelectorAll('[data-ncx-action]')].filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.textContent),
      horizontalContainers:[...host.querySelectorAll('.ncx-hand')].map(el => ({ width:el.scrollWidth, client:el.clientWidth })) };
  });
  assert.ok(result.width <= result.client + 2, 'expansion overlay has no horizontal overflow: ' + JSON.stringify(result));
  assert.deepEqual(result.clippedActions, [], 'action labels wrap'); return result;
}
async function exitGame(page) {
  const playing = await page.evaluate(() => NC_EXPANSION.isPlaying());
  await page.locator('#ncx-back').click();
  if (playing && await page.locator('.ncx-dialog').count()) {
    assert.ok(await page.getByRole('button', { name:'Resta al tavolo', exact:true }).isVisible());
    assert.equal(await page.evaluate(() => NC81_BACK.back()), true);
    assert.equal(await page.locator('.ncx-dialog').count(), 0, 'native Back closes exit confirmation first');
    assert.equal(await page.evaluate(() => NC_EXPANSION.isOpen()), true);
    await page.locator('#ncx-back').click();
    await page.getByRole('button', { name:'Lascia il tavolo', exact:true }).click();
  }
  await page.locator('#ncx-screen').waitFor({ state:'detached' });
  assert.equal(await page.evaluate(() => NC74_MUSIC.isInGame()), false, 'music state returns to lobby');
}
async function smokeCPU(page, game, viewport) {
  await page.locator('.ncx-entry[onclick*="\'' + game + '\'"]').click();
  await page.locator('#nc98-launcher').waitFor({timeout:8000});
  await page.locator('#nc98-start').click();
  await page.locator('#ncx-start').waitFor();
  const overlayCartoon=await page.locator('#ncx-screen').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.ok(overlayCartoon.includes('nc96-cartoon-golfo.svg'), 'Cartoon panorama present in '+game);

  assert.equal(await page.evaluate(() => NC74_MUSIC.isInGame()), false, 'configuration is not an active game');
  const title = await page.locator('.ncx-head h1').textContent();
  await page.locator('#ncx-config-rules').click();
  assert.ok((await page.locator('.ncx-rule-copy').textContent()).length > 100, 'game-specific rules present');
  assert.equal(await page.evaluate(() => NC81_BACK.back()), true);
  assert.equal(await page.locator('.ncx-dialog').count(), 0, 'Back closes rules only');
  await page.locator('#ncx-start').click();
  await page.locator('.ncx-game-meta').waitFor({ timeout:10000 });
  assert.equal(await page.evaluate(() => NC74_MUSIC.isInGame()), true, 'background music stops in active expansion game');
  const visibleError = await page.locator('#ncx-error').evaluate(el => !el.hidden && el.textContent);
  assert.equal(visibleError, false, 'start error');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-ncx-action]')].some(el => !el.disabled), null, { timeout:10000 });
  const buttons = page.locator('[data-ncx-action]:not([disabled])');
  let button = buttons.first();
  if (game === 'bestia') button = page.getByRole('button', { name:'Gioca con queste tre carte', exact:true });
  if (game === 'briscola_chiamata') button = page.getByRole('button', { name:/Offri/ }).first().or(button).first();
  const actionLabel = await button.textContent();
  const beforeLog = await page.locator('.ncx-log').textContent();
  await button.click();
  await page.waitForFunction(previous => {
    const log = document.querySelector('.ncx-log');
    return !!log && log.textContent !== previous;
  }, beforeLog, { timeout:10000 });
  assert.equal(await page.locator('#ncx-error').evaluate(el => !el.hidden && el.textContent), false, 'legal move accepted');
  const dimensions = await layout(page);
  if (['tressette', 'bestia', 'briscola_chiamata'].includes(game)) {
    await page.locator('#ncx-screen').evaluate(el => { el.scrollTop = 0; });
    await shot(page, game + '-' + viewport.width + 'x' + viewport.height);
  }
  await page.locator('#ncx-rules').click();
  assert.ok(await page.getByRole('button', { name:'Ho capito', exact:true }).isVisible());
  await page.getByRole('button', { name:'Ho capito', exact:true }).click();
  await exitGame(page);
  report.games.push({ game, title, viewport, action:actionLabel, layout:dimensions, ok:true });
}
async function smokeLaunch98() {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await prepare(context);
 const page=await load(context);
 try{
  await page.waitForFunction(()=>!!window.NC98_LAUNCHER && !!document.getElementById('nc98-chiodo-layout-style'),null,{timeout:12000});
  const catalog=await page.evaluate(()=>window.NC98_LAUNCHER.catalog());
  assert.equal(catalog.length,19,'All 19 games have a selectable entry');
  await page.locator('#root main.wrap .games button.game').first().click();
  await page.locator('#nc98-launcher').waitFor();
  assert.equal(await page.locator('#nc98-launcher [data-opponent]').count(),2);
  assert.equal(await page.locator('#nc98-launcher [data-format]').count(),3);
  const bar=page.locator('#nc98-progress .nc98-track');
  assert.equal(await bar.getAttribute('role'),'progressbar');
  await page.locator('#nc98-launcher [data-opponent="online"]').click();
  await page.locator('#nc98-launcher [data-format="pairs"]').click();
  assert.equal(await page.locator('#nc98-launcher [data-seats="4"]').getAttribute('aria-pressed'),'true');
  await shot(page,'nc98-game-selector-pairs');
  await page.locator('#nc98-cancel').click();
  await page.locator('#root .ncx-entry').first().click();
  await page.locator('#nc98-launcher').waitFor();
  assert.equal(await page.locator('#nc98-launcher [data-format="pairs"]').isDisabled(),true,'No unsupported expansion pairs');
  await shot(page,'nc98-expansion-selector');
  await page.locator('#nc98-start').click();
  await page.locator('#ncx-screen .ncx-config').waitFor({timeout:12000});
  await page.locator('#ncx-back').click();
  await page.locator('#ncx-screen').waitFor({state:'detached'});
  report.launcher98={ok:true,games:catalog.length,pairsRestricted:true,loadingBar:true};
 }finally{await context.close();}
}
async function smokeChiodoCartoon() {
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await prepare(ctx);
  const page=await load(ctx);
  try {
    await page.waitForFunction(() => {
      const sheet=document.querySelector('#nc97-chiodo-theme');
      return !!sheet && !!sheet.sheet && sheet.sheet.cssRules.length>40;
    });
    await page.locator('#chiodo-entry').click();
    await page.locator('#nc98-launcher').waitFor();
    await page.locator('#nc98-start').click();
    await page.locator('#chiodo121 .ch-lobby').waitFor();
    if(await page.locator('.ch-rules [data-rule="close"]').count())
      await page.locator('.ch-rules [data-rule="close"]').click();
    const lobby=await page.locator('#chiodo121').evaluate(el=>({
      background:getComputedStyle(el).backgroundImage,
      badge:getComputedStyle(el.querySelector('.ch-lobby'),'::before').backgroundImage
    }));
    assert.ok(lobby.background.includes('nc96-cartoon-golfo.svg'),'Offline cartoon panorama loaded');
    assert.ok(lobby.badge.includes('nc97-chiodo-emblem.svg'),'Chiodo emblem loaded');
    await shot(page,'chiodo97-offline-cartoon-lobby');
    await page.locator('#chiodo121 [data-n="2"]').click();
    await page.locator('#chiodo121.ch65 .ch-arena').waitFor({timeout:8000});
    const felt=await page.locator('#chiodo121 .ch-felt').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(felt,/gradient/i);
    await shot(page,'chiodo97-offline-cartoon-table');
    await page.locator('#chiodo121 #ch-back').click();
    await page.locator('#chiodo121').waitFor({state:'detached'});
    await page.locator('#chiodo-online-entry').click();
    await page.locator('#nc98-launcher').waitFor();
    await page.locator('#nc98-start').click();
    await page.locator('#chiodo121-online #co-name').waitFor({timeout:8000});
    const online=await page.locator('#chiodo121-online').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.ok(online.includes('nc96-cartoon-golfo.svg'),'Multiplayer cartoon panorama loaded');
    await shot(page,'chiodo97-online-cartoon-lobby');
    // The game can keep its first-visit illustrated rules open over the online lobby.
    // Close the real modal before testing the visible Back button.
    if(await page.locator('.ch-rules [data-rule="close"]').count())
      await page.locator('.ch-rules [data-rule="close"]').click();
    await page.locator('#chiodo121-online #co-close').click();
    await page.locator('#chiodo121-online').waitFor({state:'detached'});
    report.chiodoCartoon={ok:true,offline:true,multiplayer:true};
  } finally { await ctx.close(); }
}
async function smokeOnline() {
  const contextA = await browser.newContext({ viewport:{width:360,height:640}, reducedMotion:'reduce' });
  const contextB = await browser.newContext({ viewport:{width:360,height:640}, reducedMotion:'reduce' });
  await prepare(contextA); await prepare(contextB);
  const [a,b] = await Promise.all([load(contextA), load(contextB)]);
  for (const [page, nickname] of [[a,'Anna QA'],[b,'Bruno QA']]) {
    await page.locator('.ncx-entry[onclick*="\'tressette\'"]').click();
    await page.locator('#nc98-launcher').waitFor({timeout:8000});
    await page.locator('#nc98-start').click();
    await page.locator('#ncx-mode-online').click();
    await page.locator('#ncx-seats').selectOption('2');
    await page.locator('#ncx-name').fill(nickname);
  }
  await a.locator('#ncx-start').click(); await a.locator('.ncx-wait').waitFor();
  assert.equal(await a.evaluate(() => NC74_MUSIC.isInGame()), true, 'online waiting is muted');
  await b.locator('#ncx-start').click();
  await Promise.all([a.locator('.ncx-game-meta').waitFor(), b.locator('.ncx-game-meta').waitFor()]);
  assert.match(await a.locator('.ncx-game-meta').innerText(), /2 reali/);
  assert.match(await b.locator('.ncx-game-meta').innerText(), /2 reali/);
  const handA = await a.locator('#ncx-hand').innerHTML(), handB = await b.locator('#ncx-hand').innerHTML(); assert.notEqual(handA, handB, 'independent private hands');
  await a.locator('[data-ncx-action]:not([disabled])').first().click();
  await b.waitForFunction(() => [...document.querySelectorAll('[data-ncx-action]')].some(el => !el.disabled));
  const beforeSecondMove = await a.locator('.ncx-log').textContent();
  await b.locator('[data-ncx-action]:not([disabled])').first().click();
  await a.waitForFunction(previous => document.querySelector('.ncx-log').textContent !== previous, beforeSecondMove);
  await shot(a, 'tressette-online-two-sessions');
  await exitGame(a); await exitGame(b);
  report.online.push({ game:'tressette', humans:2, moves:2, independentHands:true, mock:'real Node expansion-session service, network intercepted', ok:true });
  await contextA.close(); await contextB.close();
}
(async () => {
  if (process.env.NC_UI_BASE_URL) {
    const supplied = new URL(process.env.NC_UI_BASE_URL);
    assert.ok(['localhost','127.0.0.1','[::1]'].includes(supplied.hostname), 'QA base must be a local HTTP server');
    base = supplied.origin;
  } else {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port;
  }
  browser = await chromium.launch({ headless:true, executablePath:process.env.NC_UI_CHROME_EXECUTABLE || process.env.NAPOLI_CHROMIUM || (fs.existsSync('/usr/lib/chromium/chromium') ? '/usr/bin/chromium' : undefined), args:['--no-sandbox'] });
  report.browserVersion = browser.version();
  for (const viewport of [{width:360,height:640},{width:800,height:360}]) {
    const context = await browser.newContext({ viewport, reducedMotion:'reduce' }); await prepare(context);
    const page = await load(context);
    await page.locator('.ncx-entry').first().scrollIntoViewIfNeeded(); await shot(page, 'lobby-expansion-' + viewport.width + 'x' + viewport.height);
    for (const game of games) {
      try { await smokeCPU(page, game, viewport); console.log('PASS', viewport.width + 'x' + viewport.height, game); }
      catch (error) {
        report.errors.push({ game, viewport, message:error.message, stack:error.stack });
        await shot(page, 'failure-' + game + '-' + viewport.width + 'x' + viewport.height);
        console.error('FAIL', viewport.width + 'x' + viewport.height, game, error.message);
        await page.reload({ waitUntil:'load' }); await page.locator('#nc-studio-boot').waitFor({ state:'detached', timeout:10000 });
      }
    }
    await context.close();
  }
  try { await smokeOnline(); console.log('PASS two independent online sessions'); } catch (error) { report.errors.push({stage:'online',message:error.message,stack:error.stack}); console.error('FAIL online',error.message); }
  try { await smokeChiodoCartoon(); console.log('PASS Chiodo 121 offline/online cartoon visual tests'); } catch (error) { report.errors.push({stage:'chiodo97',message:error.message,stack:error.stack}); console.error('FAIL Chiodo 121 cartoon',error.message); }
  try { await smokeLaunch98(); console.log('PASS 19-game launcher, loading bar and pair restrictions'); } catch(error) { report.errors.push({stage:'launch98',message:error.message,stack:error.stack}); console.error('FAIL launcher 9.8',error.message); }
})().catch(error => { report.errors.push({stage:'setup',message:error.message,stack:error.stack}); console.error(error); })
  .finally(async () => {
    if (browser) await browser.close();
    if (server.listening) { if (server.closeAllConnections) server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    report.localFailures = [...new Set(report.localFailures)];
    report.passed = report.games.length;
    report.onlinePassed = report.online.length;
    report.finishedAt = new Date().toISOString();
    report.ok = report.passed === 22 && report.onlinePassed === 1 && report.errors.length === 0 && report.pageErrors.length === 0 && report.localFailures.length === 0;
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed:report.games.length, online:report.online.length, errors:report.errors.length, pageErrors:report.pageErrors.length, localFailures:report.localFailures, output:OUT }));
    process.exitCode = report.ok ? 0 : 1;
  });
