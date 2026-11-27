'use strict';
// Verify the real application/server modules before Android compilation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const manifest = require('./build93-manifest.json');

function hash(buffer, kind = 'sha256') {
  return crypto.createHash(kind).update(buffer).digest('hex');
}
function filesUnder(root, relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const name = relative ? relative + '/' + entry.name : entry.name;
      assert.ok(!entry.isSymbolicLink(), 'Asset symlink is not supported: ' + name);
      return entry.isDirectory() ? filesUnder(root, name) : [name];
    });
}
function checkBundle(root) {
  const assets = path.join(root, 'app/src/main/assets');
  const expectedIds = manifest.app.expansionIds.slice().sort();
  const gradle = fs.readFileSync(path.join(root, 'app/build.gradle'), 'utf8');
  assert.match(gradle, /\bversionCode\s+96\b/, 'Android versionCode must be 96');
  assert.match(gradle, /\bversionName\s+['"]9\.6\.0['"]/, 'Android versionName must be 9.6.0');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'app/package.json'), 'utf8')).type, 'commonjs',
    'Application UMD modules need their own CommonJS package scope');

  const parity = manifest.sharedFiles.map(file => {
    const client = fs.readFileSync(path.join(assets, file));
    const server = fs.readFileSync(path.join(root, manifest.backendModulesDir, file));
    assert.ok(client.equals(server), 'App/server module mismatch: ' + file);
    return { file, bytes: client.length, sha256: hash(client) };
  });
  const engines = {};
  for (const file of manifest.engineFiles) {
    const loaded = require(path.join(assets, file));
    for (const [id, engine] of Object.entries(loaded)) {
      assert.ok(!engines[id], 'Duplicate game engine: ' + id);
      engines[id] = engine;
    }
  }
  assert.deepEqual(Object.keys(engines).sort(), expectedIds, 'Exactly eleven expansion engines must load');
  const games = expectedIds.map(id => {
    const engine = engines[id];
    assert.equal(engine.id, id, 'Engine id must match its registry key');
    assert.ok(typeof engine.title === 'string' && engine.title.trim());
    assert.ok(typeof engine.rules === 'string' && engine.rules.trim());
    assert.ok(Array.isArray(engine.seats) && engine.seats.length > 0);
    assert.equal(new Set(engine.seats).size, engine.seats.length);
    assert.ok(engine.seats.every(n => Number.isInteger(n) && n >= 2 && n <= 20));
    for (const method of ['create', 'actions', 'apply', 'view', 'chooseBot']) {
      assert.equal(typeof engine[method], 'function', id + '.' + method + ' must exist');
    }
    return { id, title: engine.title, seats: engine.seats };
  });
  const session = require(path.join(assets, 'expansion-session.js'));
  assert.equal(session.VERSION, manifest.backendProtocolVersion, 'Shared session protocol must match the multiplayer backend');
  assert.deepEqual(session.catalog().map(game => game.id).sort(), expectedIds, 'Session catalogue must expose all engines');

  const index = fs.readFileSync(path.join(assets, 'index.html'), 'utf8');
  const classicArrays = Array.from(index.matchAll(/\bconst\s+GAME_IDS\s*=\s*\[([^\]]+)\]/g));
  assert.ok(classicArrays.length > 0, 'Classic games registry must remain present');
  for (const match of classicArrays) {
    const ids = Array.from(match[1].matchAll(/['"]([a-z_]+)['"]/g), part => part[1]);
    assert.deepEqual(ids.slice().sort(), manifest.app.classicIds.slice().sort(),
      'The six original classic games must be preserved');
  }
  assert.ok(fs.readFileSync(path.join(assets, 'expansion-ui.js'), 'utf8').includes(manifest.backendUrl), 'Expansion UI and live probe must target the same backend');
  const sessionPos = index.indexOf('expansion-session.js');
  const uiPos = index.indexOf('expansion-ui.js');
  assert.ok(sessionPos >= 0 && uiPos > sessionPos, 'Load expansion session before its UI');
  for (const file of manifest.engineFiles) {
    const position = index.indexOf(file);
    assert.ok(position >= 0 && position < sessionPos, 'Load rules before session: ' + file);
  }
  for (const file of ['expansion.css', 'chiodo.js', 'banco91.js', 'banco92-online.js', 'club84.js', 'nc90-premium.js']) {
    assert.ok(index.includes(file), 'Preserved launcher module missing from index: ' + file);
  }
  assert.equal(manifest.app.classicIds.length + manifest.app.separateGames.length + games.length,
    manifest.app.gameCount, 'The product catalogue must contain nineteen distinct games');

  const sourceFiles = filesUnder(assets);
  for (const file of manifest.requiredAssets) assert.ok(sourceFiles.includes(file), 'Missing required asset: ' + file);
  const assetsReport = sourceFiles.map(file => {
    const bytes = fs.readFileSync(path.join(assets, file));
    assert.ok(bytes.length > 0, 'Empty asset: ' + file);
    return { path: file, bytes: bytes.length, sha256: hash(bytes) };
  });
  const music = assetsReport.find(file => file.path === manifest.music.path);
  assert.equal(music.bytes, manifest.music.bytes, 'Original music size must be preserved');
  assert.equal(music.sha256, manifest.music.sha256, 'Original music SHA-256 must be preserved');
  const icons = manifest.icons.densities.map(density => {
    const file = 'app/src/main/res/mipmap-' + density + '/ic_launcher.png';
    const bytes = fs.readFileSync(path.join(root, file));
    const gitBlob = hash(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]), 'sha1');
    assert.equal(gitBlob, manifest.icons.sourceGitBlob, 'Original launcher icon changed: ' + density);
    return { density, path: file, bytes: bytes.length, sha256: hash(bytes), gitBlob };
  });
  for (const file of [...manifest.tests, manifest.uiQa.script, manifest.liveQa.script]) {
    assert.ok(fs.statSync(path.join(root, file)).isFile(), 'Missing QA script: ' + file);
  }
  return {
    ok: true, version: manifest.app.versionName, gameCount: manifest.app.gameCount,
    expansionCount: games.length, games, sharedModules: parity,
    sourceAssetCount: assetsReport.length, assets: assetsReport, icons, music,
    requiredAssetsChecked: manifest.requiredAssets.length, tests: manifest.tests,
    databaseTestsExcluded: manifest.excludedDatabaseTests,
    completedAt: new Date().toISOString()
  };
}
function writeReport(file, report) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const reportFile = process.argv[2] || path.join(root, 'dist/qa/bundle.json');
  try {
    const report = checkBundle(root);
    writeReport(reportFile, report);
    console.log('PASS bundle: ' + report.gameCount + ' games, ' + report.expansionCount +
      ' expansion engines, ' + report.sourceAssetCount + ' assets, exact app/server parity');
  } catch (error) {
    writeReport(reportFile, { ok: false, error: error.message, completedAt: new Date().toISOString() });
    console.error('FAIL bundle:', error.message);
    process.exitCode = 1;
  }
}
module.exports = { checkBundle, filesUnder, hash };
