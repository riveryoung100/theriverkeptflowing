import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { calculate, report } from './cost.mjs';
// ILLUSTRATIVE TEST FIXTURE ONLY. These are not verified business costs or prices.
const sample = () => ({ sellingPriceCents: 1200, ingredientsCents: 300, packagingAndLabelsCents: 75, cookingConsumablesCents: 25, laborCents: 100, paymentProcessingCents: 50, fulfillmentCents: 50, ingredientWasteBasisPoints: 1000, weeklyFixedExpensesCents: 1000, weeklyProfitTargetCents: 20000, quantities: [0, 10, 37] });
test('valid illustrative sample: every variable category and waste included once', () => {
  const r = calculate(sample());
  assert.equal(r.wasteCents, 30n); assert.equal(r.variableCostCents, 630n); assert.equal(r.contributionCents, 570n);
});
test('negative costs rejected', () => { for (const key of Object.keys(sample()).filter(k => k !== 'quantities')) assert.throws(() => calculate({...sample(), [key]: -1})); });
test('every missing required value rejected; no fabricated defaults', () => { for (const key of Object.keys(sample())) { const s = sample(); delete s[key]; assert.throws(() => calculate(s)); } });
test('zero contribution rejected', () => assert.throws(() => calculate({...sample(), sellingPriceCents: 630}), /positive/));
test('negative contribution rejected', () => assert.throws(() => calculate({...sample(), sellingPriceCents: 629}), /positive/));
test('weekly overhead applied once, including zero sales', () => { const r = calculate(sample()); assert.equal(r.scenarios[0].profitCents, -1000n); assert.equal(r.scenarios[1].profitCents, 4700n); assert.equal(r.breakEvenQuantity, 2n); });
test('target rounds up and previous quantity cannot meet target', () => { const r = calculate(sample()); assert.equal(r.target.quantity, 37n); assert.ok(r.target.profitCents >= 20000n); assert.ok(r.target.profitCents - r.contributionCents < 20000n); });
test('scenario and target accounting agree', () => { const r = calculate(sample()); assert.deepEqual(r.target, r.scenarios[2]); for (const s of r.scenarios) { assert.equal(s.revenueCents - s.totalCostCents, s.profitCents); assert.equal(s.totalCostCents, s.variableTotalCents + s.fixedCostCents); } assert.match(report(r), /Weekly target \$200.00: 37 bowls/); });
test('invalid types, empty inputs, unsafe integers and unknown fields rejected', () => { for (const value of [null, [], {}, 'bad']) assert.throws(() => calculate(value)); for (const value of [null, '0', 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => calculate({...sample(), ingredientsCents: value})); for (const quantities of [[], null, [-1], ['1']]) assert.throws(() => calculate({...sample(), quantities})); assert.throws(() => calculate({...sample(), ingredientWasteBasisPoints: 10001})); assert.throws(() => calculate({...sample(), guessed: 1})); });
test('waste rounds up; explicit zero costs and zero target supported', () => { const s = Object.fromEntries(Object.keys(sample()).filter(k => k !== 'quantities').map(k => [k, 0])); Object.assign(s, {sellingPriceCents: 100, ingredientsCents: 1, ingredientWasteBasisPoints: 1, quantities: [1]}); const r = calculate(s); assert.equal(r.wasteCents, 1n); assert.equal(r.target.quantity, 0n); });
test('CLI rejects incomplete template, missing file and malformed JSON safely', () => { for (const file of ['scripts/food/input.template.json', 'does-not-exist.json', 'package.json']) { const p = spawnSync(process.execPath, ['scripts/food/cost.mjs', file], {encoding: 'utf8'}); assert.equal(p.status, 1); assert.match(p.stderr, /Costing failed:/); assert.equal(p.stdout, ''); } });

test('malformed JSON fails without a partial report', async () => {
  const { mkdtemp, writeFile, unlink, rmdir } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'food-cost-test-'));
  const file = join(dir, 'invalid.json');
  try {
    await writeFile(file, '{invalid JSON');
    const p = spawnSync(process.execPath, ['scripts/food/cost.mjs', file], {encoding: 'utf8'});
    assert.equal(p.status, 1); assert.match(p.stderr, /Costing failed:/); assert.equal(p.stdout, '');
  } finally { await unlink(file); await rmdir(dir); }
});
