'use strict';
// Usage: node tools/verify-release-apk93.cjs --apk new.apk --previous old.apk
//        --sdk /path/to/android-sdk --java /path/to/jdk/bin/java
//        --source /path/to/repository --report qa.json
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const manifest = require('./build93-manifest.json');
const { filesUnder } = require('./verify-expansion-bundle.cjs');

function digest(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function run(file, args, binary = false) {
  return execFileSync(file, args, {
    encoding: binary ? null : 'utf8', maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}
function certDigests(output) {
  const hashes = Array.from(output.matchAll(/^Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9:]+)\s*$/gm),
    match => match[1].replace(/:/g, '').toLowerCase());
  assert.ok(hashes.length > 0 && hashes.every(value => /^[0-9a-f]{64}$/.test(value)),
    'apksigner did not return a valid signing-certificate SHA-256');
  return Array.from(new Set(hashes)).sort();
}
function packageInfo(badging) {
  const line = badging.match(/^package:\s*(.+)$/m);
  assert.ok(line, 'aapt did not return package metadata');
  const attribute = key => {
    const found = line[1].match(new RegExp('(?:^|\\s)' + key + "='([^']*)'"));
    assert.ok(found, 'Missing package metadata: ' + key);
    return found[1];
  };
  const sdk = badging.match(/^sdkVersion:'(\d+)'/m);
  const target = badging.match(/^targetSdkVersion:'(\d+)'/m);
  assert.ok(sdk && target, 'Missing Android SDK metadata');
  return {
    packageName: attribute('name'), versionCode: Number(attribute('versionCode')),
    versionName: attribute('versionName'), minSdk: Number(sdk[1]), targetSdk: Number(target[1]),
    debuggable: /^application-debuggable(?:\s|$)/m.test(badging)
  };
}
function launcherIcons(badging) {
  const icons = new Map();
  for (const match of badging.matchAll(/^application-icon-(\d+):'([^']+)'\s*$/gm)) {
    const dpi = Number(match[1]);
    assert.ok(!icons.has(dpi), 'Duplicate application icon metadata for density ' + dpi);
    icons.set(dpi, match[2]);
  }
  return icons;
}
function readEntry(apk, name) { return run('unzip', ['-p', apk, name], true); }
function listEntries(apk) { return run('unzip', ['-Z1', apk]).trim().split(/\r?\n/).filter(Boolean); }
function verifySignature(java, signerJar, apk) {
  const output = run(java, ['-jar', signerJar, 'verify', '--verbose', '--print-certs', apk]);
  assert.ok(!/certificate DN:.*(?:CN=Android Debug|CN=AndroidDebug)/i.test(output),
    'A debug certificate cannot be published as a release');
  return { certificateSha256: certDigests(output), verified: true,
    v2: /Verified using v2 scheme[^:\n]*:\s*true/i.test(output),
    v3: /Verified using v3 scheme[^:\n]*:\s*true/i.test(output) };
}
function iconDimensions(bytes) {
  assert.ok(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'Launcher icon must be a PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
function checkApk(options) {
  const apk = path.resolve(options.apk), previous = path.resolve(options.previous);
  const source = path.resolve(options.source);
  const buildTools = path.join(path.resolve(options.sdk), 'build-tools', manifest.toolchain.androidBuildTools);
  // Use the pinned JDK directly: the SDK shell wrapper depends on an ambient PATH.
  assert.ok(path.isAbsolute(options.java), '--java must be an absolute path to the pinned JDK executable');
  const java = options.java, signerJar = path.join(buildTools, 'lib', 'apksigner.jar');
  const aapt = path.join(buildTools, 'aapt');
  fs.accessSync(java, fs.constants.X_OK);
  assert.ok(fs.statSync(signerJar).isFile(), 'The Android SDK apksigner JAR must exist');
  assert.ok(fs.statSync(apk).size > 0 && fs.statSync(previous).size > 0, 'Both APKs must exist');
  run('unzip', ['-t', apk]);
  run('unzip', ['-t', previous]);
  const signature = verifySignature(java, signerJar, apk);
  const previousSignature = verifySignature(java, signerJar, previous);
  assert.deepEqual(signature.certificateSha256, previousSignature.certificateSha256,
    'Release certificate differs from the previously published APK');
  assert.ok(signature.v2 || signature.v3, 'Release APK must support Android APK Signature Scheme v2 or v3');

  const badging = run(aapt, ['dump', 'badging', apk]);
  const previousBadging = run(aapt, ['dump', 'badging', previous]);
  const info = packageInfo(badging), previousInfo = packageInfo(previousBadging);
  for (const key of ['packageName', 'versionCode', 'versionName', 'minSdk', 'targetSdk']) {
    assert.equal(info[key], manifest.app[key], 'Unexpected APK manifest field: ' + key);
  }
  assert.equal(info.debuggable, false, 'Release APK must not be debuggable');
  assert.equal(previousInfo.packageName, manifest.app.packageName, 'Previous APK has the wrong package id');
  assert.equal(previousInfo.versionCode, manifest.previousRelease.versionCode, 'Unexpected previous APK version');
  assert.ok(info.versionCode > previousInfo.versionCode, 'An update must have a higher versionCode');

  const entries = listEntries(apk), previousEntries = listEntries(previous);
  assert.equal(new Set(entries).size, entries.length, 'Duplicate ZIP entries are not allowed');
  const assetsRoot = path.join(source, 'app/src/main/assets');
  const sourceFiles = filesUnder(assetsRoot);
  const assets = sourceFiles.map(file => {
    const entry = 'assets/' + file;
    assert.ok(entries.includes(entry), 'APK asset missing: ' + file);
    const input = fs.readFileSync(path.join(assetsRoot, file));
    const packaged = readEntry(apk, entry);
    assert.ok(input.equals(packaged), 'APK asset differs from source: ' + file);
    return { path: file, bytes: packaged.length, sha256: digest(packaged), sourceMatches: true };
  });
  for (const file of manifest.requiredAssets) assert.ok(entries.includes('assets/' + file), 'Required APK asset missing: ' + file);
  const music = assets.find(item => item.path === manifest.music.path);
  assert.ok(music, 'Original music must be packaged');
  assert.equal(music.bytes, manifest.music.bytes, 'Music size changed');
  assert.equal(music.sha256, manifest.music.sha256, 'Music hash changed');

  // Release resource optimization may rename or deduplicate ZIP entries.
  // Resolve the application icon through Android's compiled resource table.
  const densityDpi = { mdpi: 160, hdpi: 240, xhdpi: 320, xxhdpi: 480, xxxhdpi: 640 };
  const currentIcons = launcherIcons(badging), previousIcons = launcherIcons(previousBadging);
  const icons = manifest.icons.densities.map(density => {
    const dpi = densityDpi[density], entry = currentIcons.get(dpi), oldEntry = previousIcons.get(dpi);
    assert.ok(entry, 'Missing compiled application icon at ' + density + '; available densities: ' +
      Array.from(currentIcons.keys()).join(', '));
    assert.ok(oldEntry, 'Previous APK is missing its application icon at ' + density);
    assert.ok(entries.includes(entry), 'Resolved launcher icon is absent from the APK: ' + entry);
    assert.ok(previousEntries.includes(oldEntry), 'Resolved previous launcher icon is absent: ' + oldEntry);
    const packaged = readEntry(apk, entry), old = readEntry(previous, oldEntry);
    const dimensions = iconDimensions(packaged);
    assert.deepEqual(dimensions, iconDimensions(old), 'Launcher icon dimensions changed: ' + density);
    const rawSource = fs.readFileSync(path.join(source, 'app/src/main/res/mipmap-' + density + '/ic_launcher.png'));
    const gitBlob = crypto.createHash('sha1').update(Buffer.from('blob ' + rawSource.length + '\0')).update(rawSource).digest('hex');
    assert.equal(gitBlob, manifest.icons.sourceGitBlob, 'Original launcher source icon changed');
    return { density, dpi, entry, previousEntry: oldEntry, resolution: 'aapt dump badging',
      ...dimensions, sha256: digest(packaged), previousSha256: digest(old),
      compiledBytesMatchPrevious: packaged.equals(old), sourceGitBlob: gitBlob };
  });
  const extraAssets = entries.filter(entry => entry.startsWith('assets/') && !entry.endsWith('/') &&
    !sourceFiles.includes(entry.slice(7)));
  return {
    ok: true, completedAt: new Date().toISOString(), manifest: info,
    apk: { file: path.basename(apk), bytes: fs.statSync(apk).size, sha256: digest(fs.readFileSync(apk)) },
    previous: { file: path.basename(previous), manifest: previousInfo,
      sha256: digest(fs.readFileSync(previous)), certificateSha256: previousSignature.certificateSha256 },
    signature: { ...signature, matchesPreviousRelease: true },
    zipIntegrity: true, sourceAssetCount: sourceFiles.length, checkedAssetCount: assets.length,
    extraAssets, assets, music, icons, gameCount: manifest.app.gameCount,
    limitations: ['This verification does not replace installation and device testing on physical Android phones.']
  };
}
function argumentsFor(argv) {
  const options = { source: path.resolve(__dirname, '..') };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index].replace(/^--/, '');
    assert.ok(['apk', 'previous', 'sdk', 'java', 'source', 'report'].includes(key) && argv[index + 1],
      'Expected --apk, --previous, --sdk, --java, --source and --report arguments');
    options[key] = argv[index + 1];
  }
  for (const key of ['apk', 'previous', 'sdk', 'java', 'report']) assert.ok(options[key], 'Missing --' + key);
  return options;
}
if (require.main === module) {
  let options;
  try {
    options = argumentsFor(process.argv.slice(2));
    const report = checkApk(options);
    fs.mkdirSync(path.dirname(path.resolve(options.report)), { recursive: true });
    fs.writeFileSync(options.report, JSON.stringify(report, null, 2) + '\n');
    console.log('PASS APK 9.5.0: release signature matches version 9.4, ' + report.checkedAssetCount +
      ' source assets match, music and five launcher icons verified');
  } catch (error) {
    if (options && options.report) {
      fs.mkdirSync(path.dirname(path.resolve(options.report)), { recursive: true });
      fs.writeFileSync(options.report, JSON.stringify({ ok: false, error: error.message,
        completedAt: new Date().toISOString() }, null, 2) + '\n');
    }
    console.error('FAIL APK verification:', error.message);
    process.exitCode = 1;
  }
}
module.exports = { certDigests, packageInfo, launcherIcons, checkApk, argumentsFor };
