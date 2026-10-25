import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessLaunchReadiness, readinessReport, requirements, main } from './launch-readiness.mjs';
const blank = () => ({schemaVersion: 1, productId: 'food-product:synthetic', productVersion: 1});
// Synthetic evidence assertions for software tests only. No business approvals.
const complete = () => ({...blank(), ...Object.fromEntries(Object.entries(requirements).map(([g, keys]) => [g, Object.fromEntries(keys.map(k => [k, {status: 'PASS', evidenceReference: 'synthetic-evidence'}]))])), launchAuthorization: {status: 'PASS', evidenceReference: 'synthetic-launch', authorizedBy: 'synthetic-reviewer', authorizedOn: '2026-10-21', productId: 'food-product:synthetic', productVersion: 1}});
test('blank or missing evidence is UNVERIFIED rather than BLOCKED', () => { const r = assessLaunchReadiness(blank()); assert.equal(r.status, 'UNVERIFIED'); assert.ok(r.groups.every(g => g.status === 'UNVERIFIED')); });
test('an explicit failure is BLOCKED and dominates missing evidence', () => { const r = assessLaunchReadiness({...blank(), production: {recipeApproved: {status: 'BLOCKED', evidenceReference: null}}}); assert.equal(r.status, 'BLOCKED'); assert.equal(r.groups[1].status, 'BLOCKED'); });
test('checkbox pass without evidence remains unverified', () => { const r = complete(); r.display.accurateDescription.evidenceReference = null; assert.equal(assessLaunchReadiness(r).groups[0].status, 'UNVERIFIED'); });
test('separate production and commercial gates, no inferred authorization', () => { const r = complete(); r.launchAuthorization = null; const result = assessLaunchReadiness(r); assert.ok(result.groups.every(g => g.status === 'PASS')); assert.equal(result.authorizationStatus, 'UNVERIFIED'); assert.equal(result.status, 'UNVERIFIED'); });
test('authorization is exact-product and exact-version evidence, never a boolean', () => {
  for (const patch of [{productVersion: 2}, {productId: 'food-product:other'}, {authorizedBy: null}, {authorizedOn: '2026-02-30'}, {evidenceReference: null}]) { const r = complete(); Object.assign(r.launchAuthorization, patch); assert.equal(assessLaunchReadiness(r).authorizationStatus, 'UNVERIFIED'); }
  assert.throws(() => assessLaunchReadiness({...complete(), launchAuthorization: true}));
});
test('even complete assertions have no checkout flag and no certificate', () => { const r = assessLaunchReadiness(complete()); assert.equal(r.status, 'PASS'); assert.ok(!('orderingEnabled' in r)); assert.match(r.notice, /not compliance certification/); assert.match(r.notice, /secure server enforcement/); });
test('invalid input and unknown claims fail safely; deterministic report', () => { for (const i of [null, [], {}, {...blank(), productVersion: -1}, {...blank(), display: {madeUp: true}}, {...blank(), display: {accurateDescription: {status: true}}}]) assert.throws(() => assessLaunchReadiness(i)); assert.equal(readinessReport(blank()), readinessReport(blank())); });
test('template is wholly unverified; CLI new never overwrites and check exits 2', async () => {
  const template = JSON.parse(await readFile(new URL('./launch-readiness.template.json', import.meta.url), 'utf8')); assert.equal(assessLaunchReadiness(template).status, 'UNVERIFIED');
  const dir = await mkdtemp(join(tmpdir(), 'table-readiness-')); const file = join(dir, 'blank.json');
  try { assert.equal(await main(['new', file]), 0); await assert.rejects(main(['new', file])); assert.equal(await main(['check', file]), 2); }
  finally { await rm(file, {force: true}); await rmdir(dir); }
});
