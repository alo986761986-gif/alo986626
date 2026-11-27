$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
  $root = Split-Path -Parent $MyInvocation.MyCommand.Path
  $work = Join-Path $env:TEMP 'NC3D4'
  $nodeDir = Join-Path $work 'node'
  $projectDir = Join-Path $work 'p'
  $output = Join-Path $root 'OUTPUT'
  New-Item -ItemType Directory -Force -Path $work,$output | Out-Null
  Write-Host 'NAPOLI CARTE 3D - WINDOWS EDITION 0.4' -ForegroundColor Yellow
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
  Write-Host 'Download del pacchetto Android 9.11 firmato e verifica risorse...' -ForegroundColor Yellow
  $apkUrl = 'https://napoli-carte-82-apk-build.onrender.com/NAPOLI_CARTE_3D_9_11_CHIODO_LAYOUT_LEGGIBILE_FIRMATO.apk'
  $apkFile = Join-Path $work 'napoli-9-11.apk'
  Invoke-WebRequest -Uri $apkUrl -OutFile $apkFile
  if ((Get-Item $apkFile).Length -lt 10000000) { throw 'APK Android incompleto' }
  if (Test-Path $projectDir) { Remove-Item $projectDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $projectDir | Out-Null
  $revision = 'a0f632e9ad88bf71590b5e5a5312d92f7995ab1d'
  foreach ($pair in @(@('app/google-services.json','app/google-services.json'),@('tools/build93-manifest.json','tools/build93-manifest.json'))) {
    $target = Join-Path $projectDir $pair[1]
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Invoke-WebRequest -Uri ("https://raw.githubusercontent.com/alo986761986-gif/alo986626/"+$revision+"/"+$pair[0]) -OutFile $target
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $assetsDir = Join-Path $projectDir 'app\src\main\assets'
  [System.IO.Directory]::CreateDirectory($assetsDir) | Out-Null
  $sep=[System.IO.Path]::DirectorySeparatorChar
  $assetsPrefix=[System.IO.Path]::GetFullPath($assetsDir).TrimEnd($sep)+$sep
  $zip=[System.IO.Compression.ZipFile]::OpenRead($apkFile)
  $copied=0
  try {
    foreach($entry in $zip.Entries) {
      if (-not $entry.FullName.StartsWith('assets/')) { continue }
      $rel=$entry.FullName.Substring(7)
      if (-not $rel -or $rel.EndsWith('/')) { continue }
      $target=[System.IO.Path]::GetFullPath((Join-Path $assetsDir $rel.Replace('/',$sep)))
      if (-not $target.StartsWith($assetsPrefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'Percorso APK non sicuro' }
      [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
      $inputStream=$entry.Open();$outputStream=[System.IO.File]::Create($target)
      try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose();$inputStream.Dispose() }
      $copied++
    }
  } finally { $zip.Dispose() }
  if ($copied -lt 55) { throw ('APK incompleto: '+$copied+' risorse') }
  $indexHash=(Get-FileHash -Algorithm SHA256 (Join-Path $assetsDir 'index.html')).Hash.ToLowerInvariant()
  $musicFile=Join-Path $assetsDir 'music\alfonso-neri-bass-on-fire.mp3'
  $musicHash=(Get-FileHash -Algorithm SHA256 $musicFile).Hash.ToLowerInvariant()
  if ($indexHash -ne '397f2f0574da6a6d6a69659cd2b6fb5edd372f8c611ce20d488ce0c4b3d78f7c') { throw 'Indice 19 giochi non approvato' }
  if ($musicHash -ne 'fa8d6915ed5cbbef467a345eae1cfeecf46e6fd84cba5fd07580d41715865226') { throw 'Audio originale corrotto' }
  Copy-Item -LiteralPath (Join-Path $root 'desktop') -Destination $projectDir -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination $projectDir -Force
  Push-Location $projectDir
  try {
    Write-Host ('Verifica '+$copied+' risorse del gioco...')
    & $nodeExe desktop/check-assets.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Catalogo 19 giochi o risorse non verificati' }
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
