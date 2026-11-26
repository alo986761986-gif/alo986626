#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p app/src/main/assets/music
dest="app/src/main/assets/music/alfonso-neri-bass-on-fire.mp3"
shopt -s nullglob
parts=(server/bass_audio_parts/part-*.b64)
if [ "${#parts[@]}" -ne 20 ]; then
  echo "::error::Expected 20 original audio parts; found ${#parts[@]}"
  exit 1
fi
for i in $(seq 0 19); do
  printf -v file 'server/bass_audio_parts/part-%02d.b64' "$i"
  test -s "$file" || { echo "::error::Missing audio segment $file"; exit 1; }
done
cat "${parts[@]}" | base64 --decode > "$dest"
expected="fa8d6915ed5cbbef467a345eae1cfeecf46e6fd84cba5fd07580d41715865226"
actual="$(sha256sum "$dest" | cut -d ' ' -f1)"
test "$actual" = "$expected" || { echo "::error::Bass on Fire SHA-256 mismatch"; exit 1; }
test "$(stat -c%s "$dest")" = "11464051" || { echo "::error::Bass on Fire size mismatch"; exit 1; }
test ! -e app/src/main/assets/music/napule-e-licensed.mp3 || { echo "::error::Obsolete audio found"; exit 1; }
echo "Verified Alfonso Neri - Bass on Fire: 11464051 bytes / SHA-256 $actual"
