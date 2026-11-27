'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const pkg=require('../../package.json');
const build=fs.readFileSync(path.join(root,'Build-Windows.ps1'),'utf8');
const main=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
const login=fs.readFileSync(path.join(root,'desktop/login.html'),'utf8');
test('setup and portable do not overwrite each other',()=>{
 assert.match(pkg.build.nsis.artifactName,/WINDOWS_SETUP/);
 assert.match(pkg.build.portable.artifactName,/WINDOWS_PORTABLE/);
 assert.notEqual(pkg.build.nsis.artifactName,pkg.build.portable.artifactName);
});
test('Windows builder uses short paths and extracts only approved source folders',()=>{
 assert.match(build,/NC3D5/);
 assert.match(build,/napoli-9-12\.apk/);
 assert.match(build,/ZipFile\]::OpenRead/);
 assert.match(build,/StartsWith\(\$assetsPrefix/);
 assert.match(build,/Get-FileHash -Algorithm SHA256/);
 assert.match(build,/npm\.cmd'\) run pack:win/);
});
test('guest mode ends any authenticated session before entering game',()=>{
 assert.match(main,/function enterGuest\(\)\{identity=null;saveSession\(\)/);
 assert.match(main,/ipcMain\.handle\('napoli:guest'/);
 assert.match(login,/NCDesktop\.guest\(\)/);
});
test('web engine is sandboxed and microphone permissions require trusted app origin',()=>{
 assert.match(main,/nodeIntegration:false,contextIsolation:true,sandbox:true/);
 assert.match(main,/setPermissionRequestHandler/);
 assert.match(main,/setPermissionCheckHandler/);
 assert.match(main,/isLocal\(source\)/);
});
