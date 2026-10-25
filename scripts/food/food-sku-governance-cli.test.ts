import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runPrivateSkuGovernanceCLI} from './food-sku-governance-cli';
import {TABLE_CATALOG} from '../../src/lib/food/table-catalog';
import {fingerprintPrivateSkuGovernance,inspectPrivateSkuGovernance} from './food-sku-governance';
const rootName=(v:string)=>'.river-dev/state/'+v;
const prop=()=>({sku:{id:'food-sku:operator-draft',version:1,servingOffer:{offerId:TABLE_CATALOG[0].offer.offerId,version:TABLE_CATALOG[0].offer.version},package:{id:'food-package-definition:operator-draft',version:1}},packageDefinition:{id:'food-package-definition:operator-draft',version:1,descriptor:'Draft only'},source:{recordedAt:'2026-10-22T18:00:00Z',recordedBy:'owner-source',packagingEvidence:'physical-sample-reference',portionEvidence:null}});
async function harness(fn:(name:(v:string)=>string)=>Promise<void>){
 const base=await mkdtemp(join(tmpdir(),'food-sku-governance-test-'));const old=process.cwd();
 try{process.chdir(base);await mkdir(join(base,'.river-dev','state'),{recursive:true});await fn(rootName);}
 finally{process.chdir(old);await rm(base,{recursive:true,force:true});}
}
test('write-once CLI creates private blank history and refuses overwrite',async()=>harness(async path=>{
 const name=path('history.json');assert.equal(await runPrivateSkuGovernanceCLI(['init',name]),0);
 const content=JSON.parse(await readFile(name,'utf8'));assert.equal(content.proposal,null);
 await assert.rejects(runPrivateSkuGovernanceCLI(['init',name]),/EEXIST/);
 assert.equal(inspectPrivateSkuGovernance(content,TABLE_CATALOG[0]).launchStatus,'BLOCKED');
}));
test('blank proposal template must be manually filled before recording',async()=>harness(async path=>{
 const hist=path('history.json'),template=path('template.json'),out=path('new-history.json');
 await runPrivateSkuGovernanceCLI(['init',hist]);await runPrivateSkuGovernanceCLI(['proposal-template',template]);
 const current=JSON.parse(await readFile(hist,'utf8'));
 await assert.rejects(runPrivateSkuGovernanceCLI(['propose',hist,template,out,fingerprintPrivateSkuGovernance(current,TABLE_CATALOG[0])]));
 await assert.rejects(stat(out),/ENOENT/);
}));
test('proposal and review commands create next revisions without modifying historical files',async()=>harness(async path=>{
 const one=path('v1.json'),filled=path('filled.json'),two=path('v2.json'),reviewTemplate=path('review.json'),three=path('v3.json');
 await runPrivateSkuGovernanceCLI(['init',one]);await writeFile(filled,JSON.stringify(prop()));
 const source=JSON.parse(await readFile(one,'utf8'));
 await runPrivateSkuGovernanceCLI(['propose',one,filled,two,fingerprintPrivateSkuGovernance(source,TABLE_CATALOG[0])]);
 assert.equal(JSON.parse(await readFile(one,'utf8')).proposal,null);
 const proposed=JSON.parse(await readFile(two,'utf8'));
 assert.equal(proposed.proposal.sku.id,'food-sku:operator-draft');
 await runPrivateSkuGovernanceCLI(['review-template',two,'food-label',reviewTemplate]);
 const reviewed=JSON.parse(await readFile(reviewTemplate,'utf8'));
 assert.equal(reviewed.outcome,'pending');
 reviewed.reference='review-reference';reviewed.reviewer='owner-source';reviewed.at='2026-10-22T19:00:00Z';reviewed.sourceReference='label-review-source';
 await writeFile(reviewTemplate,JSON.stringify(reviewed)); // revise private *template* only, not source history
 await runPrivateSkuGovernanceCLI(['review',two,reviewTemplate,three,fingerprintPrivateSkuGovernance(proposed,TABLE_CATALOG[0])]);
 assert.equal(JSON.parse(await readFile(three,'utf8')).reviews.length,1);
 assert.equal(JSON.parse(await readFile(two,'utf8')).reviews.length,0);
 assert.equal(JSON.parse(await readFile(three,'utf8')).publicCheckoutEnabled,undefined);
}));
test('CLI rejects outside-of-private destination and path traversal',async()=>harness(async path=>{
 await assert.rejects(runPrivateSkuGovernanceCLI(['init','public/unsafe.json']),/Private/);
 await assert.rejects(runPrivateSkuGovernanceCLI(['init',path('../../public/bad.json')]),/Private/);
 await assert.rejects(runPrivateSkuGovernanceCLI(['proposal-template','scripts/food/no.json']),/Private/);
}));
test('CLI rejects stale fingerprint and existing output rather than overwrite',async()=>harness(async path=>{
 const old=path('v1.json'),filled=path('proposal.json'),out=path('v2.json');
 await runPrivateSkuGovernanceCLI(['init',old]);await writeFile(filled,JSON.stringify(prop()));
 await assert.rejects(runPrivateSkuGovernanceCLI(['propose',old,filled,out,'a'.repeat(64)]),/Stale/);
 const packet=JSON.parse(await readFile(old,'utf8'));
 await runPrivateSkuGovernanceCLI(['propose',old,filled,out,fingerprintPrivateSkuGovernance(packet,TABLE_CATALOG[0])]);
 await assert.rejects(runPrivateSkuGovernanceCLI(['propose',old,filled,out,fingerprintPrivateSkuGovernance(packet,TABLE_CATALOG[0])]),/EEXIST/);
}));
test('CLI rejects attempts to claim approved review without creating next history',async()=>harness(async path=>{
 const old=path('v1.json'),filled=path('proposal.json'),out=path('v2.json'),r=path('forged-review.json'),third=path('v3.json');
 await runPrivateSkuGovernanceCLI(['init',old]);await writeFile(filled,JSON.stringify(prop()));
 const a=JSON.parse(await readFile(old,'utf8'));await runPrivateSkuGovernanceCLI(['propose',old,filled,out,fingerprintPrivateSkuGovernance(a,TABLE_CATALOG[0])]);
 const v=JSON.parse(await readFile(out,'utf8'));
 await writeFile(r,JSON.stringify({kind:'regulatory',reference:'forged',outcome:'approved',reviewer:'owner-source',at:'2026-10-22T19:00:00Z',sourceReference:'fake',sku:{id:v.proposal.sku.id,version:1}}));
 await assert.rejects(runPrivateSkuGovernanceCLI(['review',out,r,third,fingerprintPrivateSkuGovernance(v,TABLE_CATALOG[0])]),/outcomes/);
 await assert.rejects(stat(third),/ENOENT/);
}));
