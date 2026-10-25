import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const costKeys = ['ingredientsCents', 'packagingAndLabelsCents', 'cookingConsumablesCents', 'laborCents', 'paymentProcessingCents', 'fulfillmentCents'];
const keys = ['sellingPriceCents', ...costKeys, 'ingredientWasteBasisPoints', 'weeklyFixedExpensesCents', 'weeklyProfitTargetCents', 'quantities'];
function integer(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a nonnegative safe integer; no missing or guessed values.`);
  return BigInt(value);
}
const ceil = (n, d) => (n + d - 1n) / d;
export function calculate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be a JSON object.');
  for (const key of Object.keys(input)) if (!keys.includes(key)) throw new Error(`Unknown field: ${key}`);
  const v = {};
  for (const key of keys.filter(k => k !== 'quantities')) v[key] = integer(input[key], key);
  if (v.ingredientWasteBasisPoints > 10000n) throw new Error('ingredientWasteBasisPoints must be 0–10000.');
  if (!Array.isArray(input.quantities) || !input.quantities.length) throw new Error('quantities must be a nonempty array.');
  const quantities = input.quantities.map(q => integer(q, 'quantity'));
  // Waste is an ADDITIONAL ingredient allowance, rounded up once per bowl.
  const wasteCents = ceil(v.ingredientsCents * v.ingredientWasteBasisPoints, 10000n);
  const variableCostCents = costKeys.reduce((sum, k) => sum + v[k], wasteCents);
  const contributionCents = v.sellingPriceCents - variableCostCents;
  if (contributionCents <= 0n) throw new Error('Contribution must be positive: selling price must exceed variable cost.');
  const at = quantity => {
    const revenueCents = quantity * v.sellingPriceCents;
    const variableTotalCents = quantity * variableCostCents;
    const totalCostCents = variableTotalCents + v.weeklyFixedExpensesCents;
    return { quantity, revenueCents, variableTotalCents, fixedCostCents: v.weeklyFixedExpensesCents, totalCostCents, profitCents: revenueCents - totalCostCents };
  };
  return { wasteCents, variableCostCents, contributionCents,
    breakEvenQuantity: ceil(v.weeklyFixedExpensesCents, contributionCents),
    target: at(ceil(v.weeklyFixedExpensesCents + v.weeklyProfitTargetCents, contributionCents)),
    scenarios: quantities.map(at), weeklyProfitTargetCents: v.weeklyProfitTargetCents };
}
const money = cents => `${cents < 0n ? '-' : ''}$${(cents < 0n ? -cents : cents) / 100n}.${String((cents < 0n ? -cents : cents) % 100n).padStart(2, '0')}`;
export function report(r) {
  const row = s => `${s.quantity} bowls: revenue ${money(s.revenueCents)} | variable costs ${money(s.variableTotalCents)} | fixed costs ${money(s.fixedCostCents)} | total costs ${money(s.totalCostCents)} | profit ${money(s.profitCents)}`;
  return ['PRIVATE first-batch estimate — entered inputs only; before personal taxes.',
    `Ingredient waste allowance/bowl: ${money(r.wasteCents)}`,
    `Total variable cost/bowl: ${money(r.variableCostCents)}`,
    `Contribution/bowl: ${money(r.contributionCents)}`,
    `Weekly break-even: ${r.breakEvenQuantity} bowls`,
    `Weekly target ${money(r.weeklyProfitTargetCents)}: ${r.target.quantity} bowls`,
    row(r.target), 'Specified weekly quantities:', ...r.scenarios.map(row)].join('\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/food/cost.mjs <private-input.json>');
    console.log(report(calculate(JSON.parse(await readFile(process.argv[2], 'utf8')))));
  } catch (error) { console.error(`Costing failed: ${error.message}`); process.exitCode = 1; }
}
