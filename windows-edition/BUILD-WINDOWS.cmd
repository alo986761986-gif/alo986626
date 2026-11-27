@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-Windows.ps1"
if errorlevel 1 (
 echo.
 echo Compilazione non riuscita. Controlla il messaggio sopra.
 pause
 exit /b 1
)
echo.
echo Compilazione completata. Controlla la cartella OUTPUT.
pause
