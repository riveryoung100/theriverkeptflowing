import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm,stat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runOwnerPacketCLI} from './food-owner-review-packet-cli';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {initialPrivateSkuGovernance} from './food-sku-governance';
async function harness(fn:(root:string)=>Promise<void>){const root=await mkdtemp(join(tmpdir(),'food-packet-'));const old=process.cwd();
 try{process.chdir(root);await mkdir('.river-dev/state',{recursive:true});await writeFile('.river-dev/state/sku.json',JSON.stringify(initialPrivateSkuGovernance(TABLE_CATALOG[0])));await fn(root);}finally{process.chdir(old);await rm(root,{recursive:true,force:true});}}
test('write creates one redacted blocked private review packet and never overwrites',()=>harness(async()=>{
 const s='.river-dev/state/sku.json',dest='.river-dev/state/review.json';assert.equal(await runOwnerPacketCLI(['write',s,'-','-',dest]),0);
 const p=JSON.parse(await readFile(dest,'utf8'));assert.equal(p.publicCheckoutEnabled,false);assert.equal(p.launchStatus,'BLOCKED');assert.equal(p.approvedPriceMinor,null);
 await assert.rejects(runOwnerPacketCLI(['write',s,'-','-',dest]),/EEXIST/);
}));
test('output cannot overwrite input or escape private state',()=>harness(async()=>{
 const s='.river-dev/state/sku.json';await assert.rejects(runOwnerPacketCLI(['write',s,'-','-',s]),/different/);
 await assert.rejects(runOwnerPacketCLI(['write',s,'-','-','public/unsafe.json']),/state/);
 await assert.rejects(runOwnerPacketCLI(['write',s,'-','-','../unauthorized.json']),/state/);
}));
test('tampered governing document fails without creating report',()=>harness(async()=>{
 const s='.river-dev/state/sku.json';await writeFile(s,JSON.stringify({...initialPrivateSkuGovernance(TABLE_CATALOG[0]),publicCheckoutEnabled:true}));
 await assert.rejects(runOwnerPacketCLI(['write',s,'-','-','.river-dev/state/bad.json']));
 await assert.rejects(stat('.river-dev/state/bad.json'),/ENOENT/);
}));
test('missing SKU file and bad command are refused',()=>harness(async()=>{
 await assert.rejects(runOwnerPacketCLI(['inspect','-']),/required/);
 await assert.rejects(runOwnerPacketCLI(['inspect','.river-dev/state/missing.json']));
 await assert.rejects(runOwnerPacketCLI(['accept-checkout','.river-dev/state/sku.json']),/Unsupported/);
}));
test('private symlink and Windows directory junction cannot escape state boundary',()=>harness(async(root)=>{
 const outside=join(root,'outside');await mkdir(outside);
 await writeFile(join(outside,'sku.json'),JSON.stringify(initialPrivateSkuGovernance(TABLE_CATALOG[0])));
 // Directory junctions are available to non-administrators on Windows, unlike file symlinks.
 await symlink(outside,'.river-dev/state/alias',process.platform==='win32'?'junction':'dir');
 await assert.rejects(runOwnerPacketCLI(['inspect','.river-dev/state/alias/sku.json']),/symlink path escapes state folder/);
 if(process.platform!=='win32'){
  await symlink(join(outside,'sku.json'),'.river-dev/state/link.json');
  await assert.rejects(runOwnerPacketCLI(['inspect','.river-dev/state/link.json']),/regular/);
 }
}));
