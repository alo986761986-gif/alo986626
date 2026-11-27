#!/usr/bin/env bash
set -euo pipefail
# Existing Render APK builder, upgraded to 9.10. This script publishes only a
# verified release and never substitutes a debug APK for the final artifact.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
bash -n "$ROOT/tools/render-build-apk82.sh"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
for command in node npm curl unzip tar sha256sum base64 git timeout ldd; do
  command -v "$command" >/dev/null 2>&1 || die "Required command is unavailable: $command"
done
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || die "The pinned build tools require Linux x86_64"
node -e 'if(Number(process.versions.node.split(".")[0])<20)throw Error("Node.js 20 or newer is required")'
for variable in UPLOAD_KEYSTORE_BASE64 UPLOAD_STORE_PASSWORD UPLOAD_KEY_ALIAS UPLOAD_KEY_PASSWORD; do
  [[ -n "${!variable:-}" ]] || die "Missing release-signing variable: $variable"
done

config() {
  node -e 'const m=require("./tools/build93-manifest.json");let x=m;for(const k of process.argv[1].split("."))x=x[k];if(x===undefined)throw Error("Unknown manifest key");process.stdout.write(String(x));' "$1"
}
TOOLS="$ROOT/.apk93-toolchain"
mkdir -p "$TOOLS"
RUN_DIR="$(mktemp -d "$TOOLS/run.XXXXXX")"
DIST="$ROOT/dist"
cleanup() {
  if [[ -n "${RUN_DIR:-}" && "$RUN_DIR" == "$TOOLS"/run.* ]]; then rm -rf -- "$RUN_DIR"; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
rm -rf -- "$DIST"
mkdir -p "$DIST/qa"
SOURCE_COMMIT="$(git rev-parse HEAD)"
printf 'NAPOLI CARTE 3D 9.12 build source: %s\n' "$SOURCE_COMMIT"

fetch() {
  local url="$1" destination="$2"
  printf 'Downloading %s\n' "$(basename "$destination")"
  curl --fail --location --proto '=https' --proto-redir '=https' \
    --connect-timeout 20 --max-time 900 --retry 3 --retry-delay 4 \
    --silent --show-error "$url" --output "$destination.download"
  test -s "$destination.download"
  mv -- "$destination.download" "$destination"
}
verified_archive() {
  local url="$1" destination="$2" expected="$3"
  [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || die "Invalid expected SHA-256 for $(basename "$destination")"
  if [[ ! -s "$destination" ]] || ! printf '%s  %s\n' "$expected" "$destination" | sha256sum --check --status; then
    fetch "$url" "$destination"
  fi
  printf '%s  %s\n' "$expected" "$destination" | sha256sum --check --status
}

# Fetch the public 9.2 reference before this deployment replaces the static site.
# It will retain its original filename in dist so subsequent builds can compare.
PREVIOUS_NAME="$(config previousRelease.file)"
PREVIOUS_APK="$RUN_DIR/$PREVIOUS_NAME"
fetch "$(config previousRelease.url)" "$PREVIOUS_APK"
unzip -t "$PREVIOUS_APK" >/dev/null

# Local QA has no database or release-signing credentials in its child processes.
QA_ENV=(env -u DATABASE_URL -u UPLOAD_KEYSTORE_BASE64 -u UPLOAD_KEYSTORE \
  -u UPLOAD_STORE_PASSWORD -u UPLOAD_KEY_ALIAS -u UPLOAD_KEY_PASSWORD \
  -u GOOGLE_APPLICATION_CREDENTIALS)
"${QA_ENV[@]}" node tools/prepare-expansion-index.cjs
bash server/restore_bass_audio.sh
for file in app/src/main/assets/*.js chiodo-server/expansion*.js chiodo-server/games/expansion*.js \
  chiodo-server/http.js chiodo-server/banco92-core.js chiodo-server/banco92.js \
  chiodo-server/market83.js chiodo-server/admob-ssv.js \
  tools/verify-expansion-bundle.cjs tools/verify-release-apk93.cjs \
  tools/verify-expansion-live.cjs server/verify-expansion-ui.cjs; do
  "${QA_ENV[@]}" node --check "$file"
done
"${QA_ENV[@]}" node tools/verify-expansion-bundle.cjs "$DIST/qa/bundle.json"
TEST_LIST="$(node -e 'console.log(require("./tools/build93-manifest.json").tests.join("\n"))')"
mapfile -t TEST_FILES <<< "$TEST_LIST"
[[ "${#TEST_FILES[@]}" -gt 0 ]] || die "The Node QA suite is empty"
timeout 600 "${QA_ENV[@]}" node --test --test-concurrency=1 --test-reporter=tap \
  "${TEST_FILES[@]}" | tee "$DIST/qa/node-tests.tap"

# Playwright is isolated from the application dependencies. Browser installation
# scripts are disabled; Chrome is fetched from the official, fixed CfT URL.
PW_VERSION="$(config toolchain.playwright.version)"
mkdir -p "$RUN_DIR/ui"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --prefix "$RUN_DIR/ui" \
  --ignore-scripts --no-audit --no-fund --save-exact "playwright@$PW_VERSION"
export NC_UI_PLAYWRIGHT_MODULE="$RUN_DIR/ui/node_modules/playwright"
CHROME_VERSION="$(config toolchain.chrome.version)"
fetch "$(config toolchain.chrome.manifestUrl)" "$RUN_DIR/chrome-known-versions.json"
node - "$RUN_DIR/chrome-known-versions.json" "$DIST/qa/chrome-source.json" <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict');
const m=require('./tools/build93-manifest.json').toolchain.chrome;
const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const version=data.versions.find(v=>v.version===m.version);
assert.ok(version,'Pinned Chrome version is absent from the official CfT manifest');
const binary=version.downloads['chrome-headless-shell'].find(d=>d.platform===m.platform);
assert.ok(binary,'Official Linux headless-shell download is missing');
assert.equal(binary.url,m.url,'Pinned Chrome URL differs from the official manifest');
fs.writeFileSync(process.argv[3],JSON.stringify({
  version:version.version,revision:version.revision,platform:m.platform,url:binary.url,
  manifestUrl:m.manifestUrl,expectedSha256:m.expectedSha256,integrityPolicy:m.integrityPolicy
},null,2)+'\n');
NODE
fetch "$(config toolchain.chrome.url)" "$RUN_DIR/chrome.zip"
CHROME_EXPECTED_SHA="$(config toolchain.chrome.expectedSha256)"
if [[ "$CHROME_EXPECTED_SHA" != null ]]; then
  printf '%s  %s\n' "$CHROME_EXPECTED_SHA" "$RUN_DIR/chrome.zip" | sha256sum --check --status
fi
mkdir -p "$RUN_DIR/chrome"
unzip -q "$RUN_DIR/chrome.zip" -d "$RUN_DIR/chrome"
export NC_UI_CHROME_EXECUTABLE="$RUN_DIR/chrome/chrome-headless-shell-linux64/chrome-headless-shell"
export NC_UI_QA_DIR="$DIST/qa/ui"
export NC_UI_ASSETS_ROOT="$ROOT/app/src/main/assets"
unset NC_UI_BASE_URL
test -x "$NC_UI_CHROME_EXECUTABLE"
BROWSER_LIBS="$(ldd "$NC_UI_CHROME_EXECUTABLE")"
if [[ "$BROWSER_LIBS" == *"not found"* ]]; then
  printf '%s\n' "$BROWSER_LIBS" >&2
  die "The Render build image is missing the Chrome shared libraries listed above; UI QA cannot run"
fi
CHROME_ACTUAL="$("$NC_UI_CHROME_EXECUTABLE" --version)"
[[ "$CHROME_ACTUAL" == *"$CHROME_VERSION"* ]] || die "Downloaded Chrome version differs from the manifest"
timeout "$(config uiQa.timeoutSeconds)" "${QA_ENV[@]}" node server/verify-expansion-ui.cjs \
  | tee "$DIST/qa/ui-console.log"
node - "$DIST/qa/ui/report.json" <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict'),m=require('./tools/build93-manifest.json');
const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(r.ok,true);assert.equal(r.passed,m.uiQa.expectedGameCases);
assert.equal(r.onlinePassed,m.uiQa.expectedOnlineCases);
assert.ok(String(r.browserVersion).includes(m.toolchain.chrome.version));
for(const key of ['errors','pageErrors','localFailures'])assert.equal(r[key].length,0,key);
NODE
printf '%s\n' 'NC98_PREDEPLOY_QA_PASSED: rule tests, app/server parity and fresh browser UI checks are green.'

# Pin a complete JDK instead of relying on a partial Java runtime in the image.
verified_archive "$(config toolchain.jdk.url)" "$TOOLS/jdk17.tar.gz" "$(config toolchain.jdk.sha256)"
mkdir -p "$RUN_DIR/jdk17"
tar -xzf "$TOOLS/jdk17.tar.gz" -C "$RUN_DIR/jdk17" --strip-components=1
export JAVA_HOME="$RUN_DIR/jdk17"
export PATH="$JAVA_HOME/bin:$PATH"
test -x "$JAVA_HOME/bin/javac"
test -x "$JAVA_HOME/bin/jlink"
"$JAVA_HOME/bin/java" -version

export ANDROID_SDK_ROOT="$TOOLS/android-sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
verified_archive "$(config toolchain.androidCli.url)" "$TOOLS/cmdline-tools.zip" "$(config toolchain.androidCli.sha256)"
mkdir -p "$RUN_DIR/android-cli" "$ANDROID_SDK_ROOT/cmdline-tools"
unzip -q "$TOOLS/cmdline-tools.zip" -d "$RUN_DIR/android-cli"
rm -rf -- "$ANDROID_SDK_ROOT/cmdline-tools/latest"
mv "$RUN_DIR/android-cli/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
BUILD_TOOLS="$(config toolchain.androidBuildTools)"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/build-tools/$BUILD_TOOLS:$PATH"
(yes || true) | sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses >/dev/null
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" "platforms;android-$(config toolchain.androidPlatform)" "build-tools;$BUILD_TOOLS"
printf 'sdk.dir=%s\n' "$ANDROID_SDK_ROOT" > "$ROOT/local.properties"

GRADLE_VERSION="$(config toolchain.gradle.version)"
verified_archive "$(config toolchain.gradle.url)" "$TOOLS/gradle.zip" "$(config toolchain.gradle.sha256)"
unzip -q "$TOOLS/gradle.zip" -d "$RUN_DIR"
export PATH="$RUN_DIR/gradle-$GRADLE_VERSION/bin:$PATH"
gradle --version

# Preserve the existing release signing configuration and secrets.
(umask 077; printf '%s' "$UPLOAD_KEYSTORE_BASE64" | base64 --decode > "$RUN_DIR/upload-keystore.p12")
export UPLOAD_KEYSTORE="$RUN_DIR/upload-keystore.p12"
test -s "$UPLOAD_KEYSTORE"
gradle --no-daemon --console=plain --max-workers=2 :app:assembleRelease
APK="$ROOT/app/build/outputs/apk/release/app-release.apk"
test -s "$APK"
node tools/verify-release-apk93.cjs --apk "$APK" --previous "$PREVIOUS_APK" \
  --sdk "$ANDROID_SDK_ROOT" --java "$JAVA_HOME/bin/java" \
  --source "$ROOT" --report "$DIST/qa/apk.json"
rm -f -- "$UPLOAD_KEYSTORE"
unset UPLOAD_KEYSTORE

# The coordinator deploys backend 9.3 after the predeploy marker above.
# This probe waits up to five minutes for its catalogue, then opens and closes
# one private two-person table. No wallet, purchase, or public matchmaking API.
timeout 600 "${QA_ENV[@]}" node tools/verify-expansion-live.cjs "$DIST/qa/live.json" \
  | tee "$DIST/qa/live-console.log"

APK_NAME="$(config app.apkFile)"
cp -- "$APK" "$DIST/$APK_NAME"
cp -- "$PREVIOUS_APK" "$DIST/$PREVIOUS_NAME"
cp -- tools/build93-manifest.json "$DIST/qa/build-manifest.json"
cp -- "$RUN_DIR/ui/package-lock.json" "$DIST/qa/playwright-package-lock.json"
node - "$RUN_DIR" "$TOOLS" "$DIST" "$SOURCE_COMMIT" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const [run,tools,dist,commit]=process.argv.slice(2),m=require('./tools/build93-manifest.json');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(dist,file),'utf8'));
const bundle=read('qa/bundle.json'),ui=read('qa/ui/report.json'),apk=read('qa/apk.json'),live=read('qa/live.json');
for(const r of [bundle,ui,apk,live])assert.equal(r.ok,true,'Every QA stage must pass');
const chromeSource=read('qa/chrome-source.json');
chromeSource.downloadedSha256=sha(path.join(run,'chrome.zip'));
chromeSource.checksumVerifiedAgainstExpected=!!m.toolchain.chrome.expectedSha256;
fs.writeFileSync(path.join(dist,'qa/chrome-source.json'),JSON.stringify(chromeSource,null,2)+'\n');
const java=spawnSync(path.join(run,'jdk17/bin/java'),['-version'],{encoding:'utf8'});
assert.equal(java.status,0,'The pinned JDK must be available for the toolchain report');
const toolchain={
  node:process.version,npm:spawnSync('npm',['--version'],{encoding:'utf8'}).stdout.trim(),
  java:(java.stdout+java.stderr).trim(),jdkArchiveSha256:sha(path.join(tools,'jdk17.tar.gz')),
  gradleVersion:m.toolchain.gradle.version,gradleArchiveSha256:sha(path.join(tools,'gradle.zip')),
  androidCliVersion:m.toolchain.androidCli.version,androidCliArchiveSha256:sha(path.join(tools,'cmdline-tools.zip')),
  androidPlatform:fs.readFileSync(path.join(process.env.ANDROID_SDK_ROOT,'platforms','android-'+m.toolchain.androidPlatform,'source.properties'),'utf8'),
  androidBuildTools:fs.readFileSync(path.join(process.env.ANDROID_SDK_ROOT,'build-tools',m.toolchain.androidBuildTools,'source.properties'),'utf8'),
  playwrightVersion:require(path.join(run,'ui/node_modules/playwright/package.json')).version,
  chrome:chromeSource,browserVersion:ui.browserVersion
};
assert.equal(toolchain.playwrightVersion,m.toolchain.playwright.version);
fs.writeFileSync(path.join(dist,'qa/toolchain.json'),JSON.stringify(toolchain,null,2)+'\n');
const tap=fs.readFileSync(path.join(dist,'qa/node-tests.tap'),'utf8');
const count=Array.from(tap.matchAll(/^# tests (\d+)$/gm)).at(-1);
assert.ok(count&&Number(count[1])>0,'Node test summary is missing');
const summary={
  ok:true,version:m.app.versionName,versionCode:m.app.versionCode,sourceCommit:commit,
  generatedAt:new Date().toISOString(),apk:{...apk.apk,file:m.app.apkFile},
  signingCertificateSha256:apk.signature.certificateSha256,signatureMatchesPreviousRelease:true,
  games:bundle.gameCount,expansionEngines:bundle.expansionCount,assetsChecked:apk.checkedAssetCount,
  nodeTestsPassed:Number(count[1]),uiGameCasesPassed:ui.passed,uiOnlineCasesPassed:ui.onlinePassed,
  livePrivateParticipants:2,liveMoves:live.moves.length,liveCleanup:live.cleanup.succeeded,
  musicSha256:apk.music.sha256,
  reports:{bundle:'qa/bundle.json',node:'qa/node-tests.tap',ui:'qa/ui/report.json',apk:'qa/apk.json',live:'qa/live.json',toolchain:'qa/toolchain.json'},
  screenshots:ui.screenshots.map(file=>path.relative(dist,file).split(path.sep).join('/')),
  previousRelease:{file:m.previousRelease.file,versionCode:m.previousRelease.versionCode,sha256:apk.previous.sha256},
  limitations:['No physical Android phone installation test was performed by this build.']
};
fs.writeFileSync(path.join(dist,'qa/release.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(dist,'README.txt'),[
  'NAPOLI CARTE 3D 9.12.0 — Chiodo 121 senza sovrapposizioni e caricamento cartoon centrato',
  'APK release: '+m.app.apkFile,
  'Certificato identico alla versione 9.11 pubblicata.',
  'Verifiche: regole, parità app/server, interfaccia, asset, musica, firma e tavolo HTTPS privato a due.',
  'Il file 9.9 resta come archivio e riferimento per il certificato.',
  'Il collaudo su telefoni Android fisici non è incluso in questa build.',
  'Rapporto completo: qa/release.json',
  'Sorgente: '+commit,''
].join('\n'));
const html='<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>NAPOLI CARTE 3D 9.12</title><style>body{margin:0;background:#082937;color:#f5f4ed;font:18px system-ui;line-height:1.6}'+
  'main{max-width:760px;margin:auto;padding:56px 24px}h1{line-height:1.15}a{color:#ffc966}'+
  '.download{display:inline-block;padding:14px 22px;background:#ffd06f;color:#142d36;border-radius:12px;font-weight:700;text-decoration:none}'+
  'code{overflow-wrap:anywhere;font-size:.8em}small{color:#c3d6da}</style><main><p>NAPOLI CARTE 3D</p>'+
  '<h1>19 giochi. Versione 9.12. Avatar separati, tavolo Chiodo 121 ordinato e caricamento cartoon centrato.</h1><p>APK Android firmato con lo stesso certificato della versione 9.11.</p>'+
  '<p><a class="download" href="'+m.app.apkFile+'">Scarica NAPOLI CARTE 3D 9.12</a></p>'+
  '<p>Verifiche completate: regole dei giochi, interfaccia, musica, firma e un tavolo online privato con due partecipanti.</p>'+
  '<p><a href="qa/release.json">Rapporto delle verifiche</a> · <a href="SHA256SUMS.txt">SHA-256 dei file APK</a></p>'+
  '<p><small>La verifica su telefoni Android fisici resta da eseguire.</small></p>'+
  '<details><summary>Archivio 9.11</summary><p>Questa versione precedente è conservata per confrontare il certificato.</p>'+
  '<a href="'+m.previousRelease.file+'">APK 9.11 precedente</a></details></main></html>\n';
fs.writeFileSync(path.join(dist,'index.html'),html);
NODE
(
  cd "$DIST"
  sha256sum "$APK_NAME" "$PREVIOUS_NAME" > SHA256SUMS.txt
)
printf '%s\n' 'NC912_RELEASE_QA_PASSED: signed release APK and public QA reports are ready.'
ls -lh "$DIST"
