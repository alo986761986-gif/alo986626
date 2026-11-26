'use strict';
// Reproduce the four reviewed 9.3 launcher edits from the preserved 9.2 asset.
// Base: alo986761986-gif/alo986626 @ c1c61bfcc79c755052406adc99e93146c24de749.
// Run before bundle/UI QA and before Gradle packages app/src/main/assets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const BASE = {"sha256":"57e431b14747c3658d9076f326ab7bf9f5776401ee0722500065c5c069d84396","gitBlob":"1fd1c48dae192cc02638496e6425b039e5cfe0b5","bytes":961477};
const OUTPUT = {"sha256":"397f2f0574da6a6d6a69659cd2b6fb5edd372f8c611ce20d488ce0c4b3d78f7c","gitBlob":"7b0802bf4c4d56c95713260c33ccce8317c8b19b","bytes":964434};
const IDS = ["tressette","traversone","briscola_chiamata","bestia","trentuno","cucu","cirulla","asino","dubito","tressette_morto","mercante"];
const PATCHES = [
  {
    "before": "Sette giochi, sfide online e divertimento con soli crediti virtuali.",
    "after": "19 giochi, sfide online e divertimento con soli crediti virtuali."
  },
  {
    "before": "</section><section class=\"setup\"><h2>♠ Preparati a giocare</h2>",
    "after": "</section><div class=\"section-h\"><h2>✦ Undici nuove sfide da giocare</h2></div><p class=\"quiet\">Scegli un gioco, leggi la variante e apri il tuo tavolo. Lo Scopone scientifico è già disponibile nella sezione Scopone.</p><section class=\"games ncx-games\" aria-label=\"Nuovi giochi\"><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('tressette','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🃏</span><strong>TRESSETTE</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('traversone','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🔄</span><strong>TRAVERSONE</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('briscola_chiamata','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🤝</span><strong>BRISCOLA CHIAMATA</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('bestia','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🐺</span><strong>BESTIA</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('trentuno','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">31</span><strong>TRENTUNO</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('cucu','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🐦</span><strong>CUCÙ</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('cirulla','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">✨</span><strong>CIRULLA</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('asino','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🐴</span><strong>ASINO</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('dubito','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🎭</span><strong>DUBITO</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('tressette_morto','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">👤</span><strong>TRESSETTE COL MORTO</strong><small>Contro CPU e online</small></button><button type=\"button\" class=\"game ncx-entry\" onclick=\"NC_EXPANSION.open('mercante','cpu')\"><span class=\"sel\">GIOCA</span><span class=\"art\">🎪</span><strong>MERCANTE IN FIERA</strong><small>Contro CPU e online</small></button></section><section class=\"setup\"><h2>♠ Preparati a giocare</h2>"
  },
  {
    "before": "<script src=\"online-hub72.js\"></script>",
    "after": "<script src=\"expansion-tricks.js\"></script><script src=\"expansion-table.js\"></script><script src=\"expansion-party.js\"></script><script src=\"expansion-session.js\"></script><script src=\"online-hub72.js\"></script>"
  },
  {
    "before": "<script src=\"banco92-online.js\"></script>",
    "after": "<script src=\"banco92-online.js\"></script><link rel=\"stylesheet\" href=\"expansion.css\"><script src=\"expansion-ui.js\"></script>"
  }
];

function digest(bytes, algorithm) { return crypto.createHash(algorithm).update(bytes).digest('hex'); }
function gitBlob(bytes) { return digest(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]), 'sha1'); }
function scriptSources(html) { return Array.from(html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/g), match => match[1]); }
function synthesize(source) {
  let output = source;
  for (const {before, after} of PATCHES) {
    const index = output.indexOf(before);
    assert.ok(index >= 0 && output.indexOf(before, index + before.length) < 0, 'Integration anchor must occur exactly once');
    output = output.slice(0, index) + after + output.slice(index + before.length);
  }
  let reverse = output;
  for (const {before, after} of PATCHES.slice().reverse()) reverse = reverse.replace(after, before);
  assert.equal(reverse, source, 'All content outside the four edits must remain unchanged');
  const scripts = scriptSources(output);
  assert.deepEqual(scripts.filter(file => !file.startsWith('expansion-')), scriptSources(source), 'Preserve every existing script and its order');
  assert.equal((output.match(/class="game ncx-entry"/g) || []).length, 11, 'Exactly eleven new launcher tiles');
  for (const id of IDS) assert.ok(output.includes("NC_EXPANSION.open('" + id + "','cpu')"), 'Missing launcher route: ' + id);
  const session = output.indexOf('src="expansion-session.js"');
  for (const file of ['expansion-tricks.js', 'expansion-table.js', 'expansion-party.js']) {
    const position = output.indexOf('src="' + file + '"');
    assert.ok(position >= 0 && position < session, 'Load rules before shared session');
  }
  assert.ok(session >= 0 && session < output.indexOf('src="online-hub72.js"') && session < output.indexOf('src="welcome74.js"'));
  assert.ok(output.indexOf('src="expansion-ui.js"') > output.indexOf('src="banco92-online.js"'), 'Preserve Banco before expansion UI');
  assert.ok(output.indexOf('href="expansion.css"') > output.indexOf('src="banco92-online.js"'), 'Load expansion CSS after Banco');
  for (const match of output.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=|\btype\s*=\s*["'](?:application\/ld\+json|application\/json)/i.test(match[1]) && match[2].trim()) new Function(match[2]);
  }
  return output;
}
function prepare(file) {
  const input = fs.readFileSync(file), current = digest(input, 'sha256');
  if (current === OUTPUT.sha256) {
    assert.equal(input.length, OUTPUT.bytes); assert.equal(gitBlob(input), OUTPUT.gitBlob);
    return {ok:true, changed:false, file, sha256:current, gitBlob:OUTPUT.gitBlob};
  }
  assert.equal(input.length, BASE.bytes, 'Unexpected 9.2 index size; refusing to rewrite another base');
  assert.equal(current, BASE.sha256, 'Unexpected 9.2 index hash; refusing to rewrite another base');
  assert.equal(gitBlob(input), BASE.gitBlob);
  const text = input.toString('utf8');
  assert.ok(Buffer.from(text, 'utf8').equals(input), 'Source must be valid UTF-8');
  const output = Buffer.from(synthesize(text), 'utf8');
  assert.equal(output.length, OUTPUT.bytes); assert.equal(digest(output, 'sha256'), OUTPUT.sha256);
  assert.equal(gitBlob(output), OUTPUT.gitBlob, 'Generated index differs from the reviewed output');
  const temporary = file + '.nc93-' + process.pid + '.tmp';
  try {
    fs.writeFileSync(temporary, output, {mode:fs.statSync(file).mode});
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return {ok:true, changed:true, file, sha256:OUTPUT.sha256, gitBlob:OUTPUT.gitBlob};
}
if (require.main === module) {
  try { console.log(JSON.stringify(prepare(path.resolve(process.argv[2] || path.join(__dirname, '../app/src/main/assets/index.html'))))); }
  catch (error) { console.error('FAIL prepare-expansion-index:', error.message); process.exitCode = 1; }
}
module.exports = {prepare, synthesize, BASE, OUTPUT};
