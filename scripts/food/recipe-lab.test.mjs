import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyze, report, validate, scoreKeys, safetyKeys } from './recipe-lab.mjs';

// SYNTHETIC SOFTWARE FIXTURES ONLY: not kitchen results, temperatures or approvals.
const trial = () => ({ trialId: 'synthetic-1', recipeVersion: 'fixture-B', preparationDate: '2026-10-21', batchId: 'fixture-batch', storageCondition: 'frozen', storageDays: 7, portionGrams: 500, sauceGrams: 25, toppingGrams: 12, containerId: 'fixture-container', fillDepthMm: 35, configuration: 'Synthetic separated arrangement', thawMethod: 'direct from frozen', sauceStorage: 'separate refrigerated test cup', toppingPackaging: 'separate dry packet', measurementNotes: 'Synthetic fixture only', laborMinutes: 20, microwaveWatts: 700, startingTemperatureF: 0, addedWaterGrams: 5, standingSeconds: 120, standingCovered: true, stages: [{seconds: 60, powerPercent: 100, covered: true, action: 'synthetic stir and rearrange'}], temperaturesF: {center: 165, edge: 166, bottom: 167}, scores: Object.fromEntries(scoreKeys.map(k => [k, 4])), safety: Object.fromEntries(safetyKeys.map(k => [k, {status: 'pass', evidence: 'Synthetic evidence for software testing only'}])) });
const input = (...trials) => ({schemaVersion: 1, trials});
test('empty collection and unmeasured trial remain untested without invented values', async () => {
  assert.match(report(input()), /No trials recorded/);
  const template = JSON.parse(await readFile(new URL('./recipe-lab.template.json', import.meta.url), 'utf8'));
  const before = structuredClone(template);
  const r = analyze(template)[0];
  assert.match(r.safetyStatus, /UNVERIFIED/); assert.ok(r.gaps.includes('portionGrams'));
  assert.match(report(template), /overallEnjoyment: UNTESTED/); assert.deepEqual(template, before);
});
test('recorded synthetic trial reports supplied observations, never approval', () => {
  const r = analyze(input(trial()))[0]; assert.equal(r.gaps.length, 0); assert.equal(r.failures.length, 0);
  assert.match(r.safetyStatus, /independent review/); assert.match(report(input(trial())), /center 165/);
});
test('invalid temperature values rejected while missing remains untested', () => {
  for (const value of ['165', NaN, Infinity, -101, 301]) { const t = trial(); t.temperaturesF.center = value; assert.throws(() => validate(input(t))); }
  const t = trial(); t.temperaturesF.center = null; assert.ok(analyze(input(t))[0].gaps.includes('post-standing temperature: center'));
});
test('invalid wattages rejected; absent watts are a verification gap', () => {
  for (const value of [0, -1, 700.5, '700', 3001]) assert.throws(() => validate(input({...trial(), microwaveWatts: value})));
  assert.match(analyze(input({...trial(), microwaveWatts: null}))[0].safetyStatus, /UNVERIFIED/);
});
test('invalid scores rejected', () => { for (const value of [0, 6, 2.5, '5', NaN]) { const t = trial(); t.scores.crunch = value; assert.throws(() => validate(input(t))); } });
test('missing measurements and stage details reported clearly', () => {
  const t = trial(); delete t.temperaturesF; delete t.stages[0].seconds; t.standingSeconds = null;
  const r = analyze(input(t))[0]; assert.match(r.safetyStatus, /UNVERIFIED/); assert.ok(r.gaps.includes('stages[0].seconds')); assert.match(report(input(t)), /bottom UNTESTED/);
});
test('multiple trials per recipe keep storage, wattage and checkpoints separate', () => {
  const a = trial(), b = {...trial(), trialId: 'synthetic-2'}, c = {...trial(), trialId: 'synthetic-3', storageCondition: 'refrigerated', storageDays: 1};
  const s = report(input(a, b, c)); assert.match(s, /fixture-B \| frozen \| 7 \| 700: 2 trial\(s\)/); assert.match(s, /fixture-B \| refrigerated \| 1 \| 700: 1 trial\(s\)/);
  assert.match(s, /UNRECORDED CONDITIONS fixture-B: fresh control/);
});
test('flavor never overrides cold spots or failed cooling', () => {
  const t = trial(); t.scores.overallEnjoyment = 5; t.temperaturesF.bottom = 164; t.safety.cooling.status = 'fail';
  const r = analyze(input(t))[0]; assert.match(r.safetyStatus, /HOLD/); assert.equal(r.failures.length, 2); assert.match(report(input(t)), /HOLD sensory tasting/);
});
test('all high scores with missing handling evidence remain unverified', () => {
  const t = trial(); t.scores = Object.fromEntries(scoreKeys.map(k => [k, 5])); t.safety = {};
  assert.match(analyze(input(t))[0].safetyStatus, /UNVERIFIED/);
});
test('sensory gaps do not become failed safety checks', () => {
  const t = trial(); t.scores = {};
  const r = analyze(input(t))[0]; assert.match(r.safetyStatus, /Recorded checks complete/); assert.equal(r.failures.length, 0); assert.equal(r.gaps.length, scoreKeys.length);
});
test('texture failures flag poor and unacceptable observed scores only', () => {
  const t = trial(); t.scores.potatoIntegrity = 1; t.scores.crunch = 2; t.scores.sauceStability = null;
  const r = analyze(input(t))[0]; assert.deepEqual(r.textureFailures, ['potatoIntegrity: 1/5', 'crunch: 2/5']);
});
test('fresh control does not require microwave fields, but handling still requires evidence', () => {
  const t = {...trial(), storageCondition: 'fresh', storageDays: 0, stages: [], temperaturesF: null, microwaveWatts: null, standingSeconds: null};
  assert.equal(analyze(input(t))[0].gaps.length, 0);
  assert.throws(() => validate(input({...t, storageDays: 1})));
});
test('invalid quantities, dates, duplicate IDs, unknown keys and unsafe shapes rejected', () => {
  for (const patch of [{portionGrams: -1}, {portionGrams: 0}, {storageDays: -1}, {sauceGrams: '25'}, {preparationDate: '2026-02-30'}, {stages: 'bad'}, {storageCondition: 'ambient'}, {scores: {typo: 4}}, {safety: {cooling: {status: 'approved'}}}, {unexpected: 1}]) assert.throws(() => validate(input({...trial(), ...patch})));
  for (const value of [null, [], {}, {schemaVersion: 2, trials: []}]) assert.throws(() => validate(value));
  assert.throws(() => validate(input(trial(), trial())));
});
test('short standing time fails independently and safety pass without evidence is unverified', () => {
  assert.match(analyze(input({...trial(), standingSeconds: 119}))[0].safetyStatus, /HOLD/);
  assert.match(analyze(input({...trial(), standingCovered: false}))[0].safetyStatus, /HOLD/);
  assert.match(analyze(input({...trial(), standingCovered: null}))[0].safetyStatus, /UNVERIFIED/);
  const t = trial(); t.safety.cooling.evidence = null; assert.match(analyze(input(t))[0].safetyStatus, /UNVERIFIED/);
});
test('CLI compares multiple files, preserves variants and rejects duplicate trial IDs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'recipe-compare-test-'));
  const first = join(dir, 'a.json'), second = join(dir, 'b.json');
  const run = () => spawnSync(process.execPath, ['scripts/food/recipe-lab.mjs', 'compare', first, second], {encoding: 'utf8'});
  try {
    await writeFile(first, JSON.stringify(input(trial())));
    await writeFile(second, JSON.stringify(input({...trial(), trialId: 'synthetic-2', recipeVersion: 'fixture-C', storageCondition: 'refrigerated', storageDays: 1})));
    const result = run(); assert.equal(result.status, 0); assert.match(result.stdout, /fixture-B \| frozen/); assert.match(result.stdout, /fixture-C \| refrigerated/);
    await writeFile(second, JSON.stringify(input(trial())));
    const duplicate = run(); assert.equal(duplicate.status, 1); assert.match(duplicate.stderr, /Duplicate trialId/); assert.equal(duplicate.stdout, '');
  } finally { await rm(first, {force: true}); await rm(second, {force: true}); await (await import('node:fs/promises')).rmdir(dir); }
});
test('report is deterministic and does not mutate input or fabricate missing results', () => {
  const t = trial(); delete t.scores.overallEnjoyment; const i = input(t), before = structuredClone(i);
  assert.equal(report(i), report(i)); assert.match(report(i), /mean UNTESTED/); assert.deepEqual(i, before);
});
test('CLI creates blank trial without overwriting; compares; rejects malformed JSON safely', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'recipe-lab-test-'));
  const file = join(dir, 'trial.json');
  const run = (...args) => spawnSync(process.execPath, ['scripts/food/recipe-lab.mjs', ...args], {encoding: 'utf8'});
  try {
    assert.equal(run('new', file).status, 0); const before = await readFile(file, 'utf8');
    assert.equal(run('new', file).status, 1); assert.equal(await readFile(file, 'utf8'), before);
    const compared = run('compare', file); assert.equal(compared.status, 0); assert.match(compared.stdout, /UNTESTED/);
    await writeFile(file, '{bad'); const bad = run('compare', file); assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.match(bad.stderr, /Recipe lab failed:/);
    assert.equal(run('unknown', file).status, 1);
  } finally { await rm(file, {force: true}); await (await import('node:fs/promises')).rmdir(dir); }
});
