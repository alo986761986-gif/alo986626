#!/usr/bin/env bash
set -euo pipefail
# Disposable Render static-site pipeline; does not modify the online game backend.
ROOT="$PWD"
TOOLS="$ROOT/.apk82-toolchain"
export ANDROID_SDK_ROOT="$TOOLS/android-sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
mkdir -p "$TOOLS" "$ROOT/dist"
fetch(){ echo "Downloading $(basename "$2")"; curl --fail --location --retry 3 --retry-delay 4 --silent --show-error "$1" --output "$2"; test -s "$2"; }

if ! command -v java >/dev/null 2>&1 || ! java -version 2>&1 | grep -Eq '(version "(17|21)|openjdk (17|21))'; then
  fetch 'https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse' "$TOOLS/jdk17.tar.gz"
  mkdir -p "$TOOLS/jdk17"
  tar -xzf "$TOOLS/jdk17.tar.gz" -C "$TOOLS/jdk17" --strip-components=1
  export JAVA_HOME="$TOOLS/jdk17"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
java -version

fetch 'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip' "$TOOLS/cmdline-tools.zip"
echo "4abbbcdc842f3d4879206e9695d52709603e52dd68d3c1fff04b3b5e7a308ecf  $TOOLS/cmdline-tools.zip" | sha256sum --check --status
mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
unzip -q "$TOOLS/cmdline-tools.zip" -d "$ANDROID_SDK_ROOT/cmdline-tools"
mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/build-tools/35.0.0:$PATH"
set +o pipefail
yes | sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses >/dev/null 2>&1
set -o pipefail
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" 'platforms;android-36' 'build-tools;35.0.0'

fetch 'https://services.gradle.org/distributions/gradle-8.11.1-bin.zip' "$TOOLS/gradle.zip"
echo "f397b287023acdba1e9f6fc5ea72d22dd63669d59ed4a289a29b1a76eee151c6  $TOOLS/gradle.zip" | sha256sum --check --status
unzip -q "$TOOLS/gradle.zip" -d "$TOOLS"
export PATH="$TOOLS/gradle-8.11.1/bin:$PATH"
gradle --version

if [[ -n "${UPLOAD_KEYSTORE_BASE64:-}" && -n "${UPLOAD_STORE_PASSWORD:-}" && -n "${UPLOAD_KEY_ALIAS:-}" && -n "${UPLOAD_KEY_PASSWORD:-}" ]]; then
  umask 077
  printf '%s' "$UPLOAD_KEYSTORE_BASE64" | base64 --decode > "$TOOLS/upload-keystore.p12"
  export UPLOAD_KEYSTORE="$TOOLS/upload-keystore.p12"
  gradle --no-daemon --console=plain --max-workers=2 :app:assembleRelease
  APK="$ROOT/app/build/outputs/apk/release/app-release.apk"
  test -s "$APK"
  "$ANDROID_SDK_ROOT/build-tools/35.0.0/apksigner" verify --verbose "$APK"
  cp "$APK" "$ROOT/dist/NAPOLI_CARTE_3D_8_2_FINALE_FIRMATO.apk"
  rm -f "$UPLOAD_KEYSTORE"
else
  gradle --no-daemon --console=plain --max-workers=2 :app:assembleDebug
  APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
  test -s "$APK"
  "$ANDROID_SDK_ROOT/build-tools/35.0.0/apksigner" verify --verbose "$APK"
  cp "$APK" "$ROOT/dist/NAPOLI_CARTE_3D_8_2_DEBUG_SOLO_TEST.apk"
fi
(cd "$ROOT/dist" && sha256sum *.apk > SHA256SUMS.txt)
printf '%s\n' 'NAPOLI CARTE 3D 8.2.0' 'DEBUG_SOLO_TEST e una build di prova e non aggiorna installazioni con firme diverse.' 'FINALE_FIRMATO e prodotto solo con la chiave upload originale.' > "$ROOT/dist/README.txt"
echo "APK signing verification completed"
ls -lh "$ROOT/dist"
