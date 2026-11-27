$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
  $root = Split-Path -Parent $MyInvocation.MyCommand.Path
  $work = Join-Path $env:TEMP 'NC3D2'
  $nodeDir = Join-Path $work 'node'
  $projectDir = Join-Path $work 'p'
  $output = Join-Path $root 'OUTPUT'
  New-Item -ItemType Directory -Force -Path $work,$output | Out-Null
  Write-Host 'NAPOLI CARTE 3D - WINDOWS EDITION 0.2' -ForegroundColor Yellow
  Write-Host 'Controllo Node.js 24 ufficiale e impronta SHA256...'
  $nodeExe = Join-Path $nodeDir 'node.exe'
  if (-not (Test-Path $nodeExe)) {
    $sumUrl = 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt'
    $sumFile = Join-Path $work 'SHASUMS256.txt'
    Invoke-WebRequest -Uri $sumUrl -OutFile $sumFile -UseBasicParsing
    $line = Get-Content $sumFile | Where-Object { $_ -match 'node-v24\.[^\s]+-win-x64\.zip$' } | Select-Object -First 1
    if (-not $line) { throw 'Archivio Node.js x64 non trovato sul server ufficiale' }
    $parts = $line.Trim() -split '\s+'
    $expected = $parts[0].ToLowerInvariant()
    $archiveName = $parts[-1]
    $archive = Join-Path $work $archiveName
    Invoke-WebRequest -Uri ('https://nodejs.org/dist/latest-v24.x/' + $archiveName) -OutFile $archive -UseBasicParsing
    $actual = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw 'Impronta SHA256 Node.js non valida' }
    $extract = Join-Path $work 'node-expand'
    New-Item -ItemType Directory -Force -Path $extract | Out-Null
    Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force
    $folder = Get-ChildItem -LiteralPath $extract -Directory | Select-Object -First 1
    if (-not $folder) { throw 'Node.js non estratto' }
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    Copy-Item -Path (Join-Path $folder.FullName '*') -Destination $nodeDir -Recurse -Force
  }
  $env:PATH = "$nodeDir;$env:PATH"
  & $nodeExe --version
  Write-Host 'Download dei sorgenti Android 9.10 da commit GitHub verificato...'
  $revision = 'a0f632e9ad88bf71590b5e5a5312d92f7995ab1d'
  $archive = Join-Path $work 'source.zip'
  Invoke-WebRequest -Uri "https://github.com/alo986761986-gif/alo986626/archive/$revision.zip" -OutFile $archive -UseBasicParsing
  if (Test-Path $projectDir) { Remove-Item $projectDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $projectDir | Out-Null
  Write-Host 'Estrazione selettiva: solo giochi, audio e configurazioni (evita percorsi lunghi)...'
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
  $copied = 0
  try {
    $destRoot = [System.IO.Path]::GetFullPath($projectDir).TrimEnd('\') + '\'
    foreach ($entry in $zip.Entries) {
      $fullName = $entry.FullName.Replace('\','/')
      $slash = $fullName.IndexOf('/')
      if ($slash -lt 0) { continue }
      $relative = $fullName.Substring($slash + 1)
      if (-not $relative -or $relative.EndsWith('/')) { continue }
      $include = $relative.StartsWith('app/src/main/assets/') -or
                 $relative.StartsWith('server/bass_audio_parts/') -or
                 $relative -eq 'app/google-services.json' -or
                 $relative -eq 'tools/prepare-expansion-index.cjs' -or
                 $relative -eq 'tools/build93-manifest.json'
      if (-not $include) { continue }
      $target = [System.IO.Path]::GetFullPath((Join-Path $projectDir $relative.Replace('/','\')))
      if (-not $target.StartsWith($destRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archivio non sicuro: percorso fuori cartella' }
      $parent = [System.IO.Path]::GetDirectoryName($target)
      [System.IO.Directory]::CreateDirectory($parent) | Out-Null
      $stream = $entry.Open()
      $outputStream = [System.IO.File]::Create($target)
      try { $stream.CopyTo($outputStream) } finally { $outputStream.Dispose(); $stream.Dispose() }
      $copied++
    }
  } finally { $zip.Dispose() }
  if ($copied -lt 60) { throw ('Sorgenti incompleti: solo ' + $copied + ' file estratti') }
  Copy-Item -LiteralPath (Join-Path $root 'desktop') -Destination $projectDir -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination $projectDir -Force
  Push-Location $projectDir
  try {
    Write-Host 'Ricostruzione e controllo della musica originale...' -ForegroundColor Yellow
    $partsDir = Join-Path $projectDir 'server\bass_audio_parts'
    $parts = @(Get-ChildItem -LiteralPath $partsDir -Filter 'part-*.b64' | Sort-Object Name)
    if ($parts.Count -ne 20) { throw ('Attese 20 parti audio, trovate ' + $parts.Count) }
    $musicDir = Join-Path $projectDir 'app\src\main\assets\music'
    New-Item -ItemType Directory -Force -Path $musicDir | Out-Null
    $musicFile = Join-Path $musicDir 'alfonso-neri-bass-on-fire.mp3'
    $base64 = New-Object System.Text.StringBuilder
    foreach ($i in 0..19) {
      $part = Join-Path $partsDir ('part-{0:D2}.b64' -f $i)
      if (-not (Test-Path $part)) { throw ('Parte audio mancante: ' + $part) }
      [void]$base64.Append([System.IO.File]::ReadAllText($part).Trim())
    }
    [System.IO.File]::WriteAllBytes($musicFile,[Convert]::FromBase64String($base64.ToString()))
    $musicHash = (Get-FileHash -Algorithm SHA256 $musicFile).Hash.ToLowerInvariant()
    if ($musicHash -ne 'fa8d6915ed5cbbef467a345eae1cfeecf46e6fd84cba5fd07580d41715865226') { throw 'Musica corrotta: SHA256 non corrisponde' }
    if ((Get-Item $musicFile).Length -ne 11464051) { throw 'Musica corrotta: dimensione diversa' }
    Write-Host 'Verifica del catalogo e di tutte le risorse dei 19 giochi...'
    & $nodeExe tools/prepare-expansion-index.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Preparazione dei giochi fallita' }
    & $nodeExe desktop/check-assets.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Asset incompleti' }
    Write-Host 'Installazione delle dipendenze Electron...'
    & (Join-Path $nodeDir 'npm.cmd') install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Installazione Electron fallita' }
    Write-Host 'Test, compilazione installer e versione portatile Windows x64...'
    & (Join-Path $nodeDir 'npm.cmd') run pack:win
    if ($LASTEXITCODE -ne 0) { throw 'Compilazione electron-builder fallita' }
    $exes = @(Get-ChildItem 'dist/windows' -Filter '*.exe')
    $setup = @($exes | Where-Object { $_.Name -like '*SETUP*' })
    $portable = @($exes | Where-Object { $_.Name -like '*PORTABLE*' })
    if ($setup.Count -ne 1 -or $portable.Count -ne 1) { throw 'Mancano installer SETUP o PORTABLE (controlla i nomi dei file)' }
    Copy-Item -LiteralPath $setup[0].FullName -Destination $output -Force
    Copy-Item -LiteralPath $portable[0].FullName -Destination $output -Force
    Get-ChildItem $output -Filter '*.exe' | ForEach-Object {
      $hash=(Get-FileHash -Algorithm SHA256 $_.FullName).Hash
      Write-Host "$($_.Name) : $hash" -ForegroundColor Green
    }
    Write-Host "Pacchetti Windows salvati in: $output" -ForegroundColor Green
    Write-Host 'Nota: eseguibili non ancora firmati Authenticode.' -ForegroundColor Yellow
  } finally { Pop-Location }
} catch {
  Write-Host "ERRORE: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
