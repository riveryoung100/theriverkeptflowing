import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const script='scripts/food/stripe-testmode-readonly-retrieve.ps1';
const run=command=>spawnSync('powershell',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:20000});
test('Windows PowerShell parser accepts the entire ASCII-only operator script',()=>{
 const source=readFileSync(script,'utf8');assert([...source].every(character=>character.codePointAt(0)<=0x7f));
 const result=run(`$t=$null;$e=$null;[System.Management.Automation.Language.Parser]::ParseFile((Join-Path (Get-Location) '${script}'),[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}`);
 assert.equal(result.status,0,result.stderr);
});
test('noninteractive missing Session defers without network or prompts',()=>{
 const result=spawnSync('powershell',['-NoProfile','-NonInteractive','-File',script,'-NonInteractive'],{encoding:'utf8',timeout:20000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/DEFERRED: EXISTING TEST SESSION REQUIRED/);assert.match(result.stdout,/FINAL PASS/);
});
for(const id of ['invalid','cs_test_synthetic_1234567890123456','cs_live_1234567890123456','cs_test_abcdefghijklmnop']) {
 test(`noninteractive identifier or missing credential stops: ${id}`,()=>{
 const result=spawnSync('powershell',['-NoProfile','-NonInteractive','-File',script,'-NonInteractive','-SessionId',id],{encoding:'utf8',timeout:20000});
 assert.equal(result.status,1);assert.match(result.stdout,/FINAL STOP/);assert.match(result.stdout,/ACTUAL TEST SESSION RETRIEVED: NO/);
 });
}
for(const mode of ['cancel','empty','invalid','live']) {
 test(`secure prompt ${mode} exits without leaking input or writing environment credentials`,()=>{
 const value=mode==='live'?'sk_live_DO_NOT_PRINT_123456789':mode==='invalid'?'INVALID_DO_NOT_PRINT_123456789':'';
 const command=`$before=(Get-Location).Path;$env:FOOD_OPERATOR_SENTINEL='unchanged';function global:Read-Host { param([string]$Prompt,[switch]$AsSecureString) ${mode==='cancel'?"throw 'cancelled'":mode==='empty'?"return (New-Object Security.SecureString)":`return (ConvertTo-SecureString '${value}' -AsPlainText -Force)`} }; & './${script}' -SessionId cs_test_abcdefghijklmnop`;
 const result=run(command);assert.equal(result.status,1);assert.match(result.stdout,/FINAL STOP/);
 assert.doesNotMatch(result.stdout+result.stderr,/DO_NOT_PRINT/);
 // Wrapper never writes credential-related environment variables or changes parent process state.
 assert.doesNotMatch(readFileSync(script,'utf8'),/\$env:|SetEnvironmentVariable|Set-Content|Out-File/);
 });
}
test('credentials use anonymous stdin; CLI does not expose raw provider errors',()=>{
 const source=readFileSync(script,'utf8');assert.match(source,/StandardInput.Write\(\$payload\)/);
 assert.match(source,/ZeroFreeBSTR/);assert.match(source,/Set-Location -LiteralPath \$originalLocation/);
 assert.doesNotMatch(source,/Arguments\s*=.*(?:\$plain|\$payload|\$secure)/);
 const bad=spawnSync(process.execPath,['scripts/food/stripe-testmode-real-readonly-cli.mjs'],{input:'{"secretKey":"sk_live_DO_NOT_PRINT_123456789","sessionId":"cs_test_abcdefghijklmnop"}',encoding:'utf8'});
 assert.equal(bad.status,1);assert.doesNotMatch(bad.stdout+bad.stderr,/DO_NOT_PRINT/);
});
