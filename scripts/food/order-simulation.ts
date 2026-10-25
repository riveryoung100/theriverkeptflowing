/** PRIVATE SYNTHETIC FIXTURES ONLY. No actual product, price, customer, schedule or approval. */
import { pathToFileURL } from 'node:url';
import { validateTableEntry } from '../../src/lib/food/table-catalog';
import { createTableOrderSimulation, type SimulationAuthority } from '../../src/lib/food/table-order-engine';
import { summarizeTableSimulation, simulationOperationsReport } from '../../src/lib/food/table-order-operations';
import { requirements } from './launch-readiness.mjs';

export const SYNTHETIC_NOW = '2026-10-21T14:00:00.000Z';
export const SYNTHETIC_HANDOFF = '2026-10-21T18:30:00.000Z';
export const syntheticCosting = () => ({sellingPriceCents: 1200, ingredientsCents: 150, packagingAndLabelsCents: 75, cookingConsumablesCents: 25, laborCents: 100, paymentProcessingCents: 25, fulfillmentCents: 25, ingredientWasteBasisPoints: 0, weeklyFixedExpensesCents: 500, weeklyProfitTargetCents: 20000, quantities: [2]});
export function syntheticAuthority(capacity = 6): SimulationAuthority {
  const recipeId = 'food-recipe:synthetic-bowl', productId = 'food-product:synthetic-bowl';
  const p = validateTableEntry({
    recipe: {id: recipeId, version: 1, ingredients: [{kind: 'simple', name: 'SYNTHETIC ingredient'}], allergenReview: {state: 'reviewed', declarations: []}, evidence: ['ingredient-composition-disclosure-status', 'allergen-review'].map(requirement => ({requirement, subject: {type: 'recipe', id: recipeId, version: 1}, sourceReference: 'synthetic-recipe-evidence', reviewDate: '2026-10-21', reviewer: 'SYNTHETIC'}))},
    product: {id: productId, version: 1, recipe: {id: recipeId, version: 1}, evidence: []},
    presentation: {dishId: 'food-dish:synthetic-bowl', version: 1, product: {id: productId, version: 1}, recipe: {id: recipeId, version: 1}, name: 'SYNTHETIC Test Bowl', shortDescription: 'SYNTHETIC software fixture only'},
    offer: {offerId: 'food-serving-offer:synthetic-bowl', version: 1, presentation: {dishId: 'food-dish:synthetic-bowl', version: 1}, format: {kind: 'individual'}, servingEstimate: {state: 'specified', minimum: 1, maximum: 1}, storageSummary: {state: 'specified', text: 'SYNTHETIC storage assertion'}, reheatingSummary: {state: 'specified', text: 'SYNTHETIC handling assertion'}},
    slug: 'synthetic-bowl', category: 'SYNTHETIC', state: 'AVAILABLE', display: 'approved', ordering: 'eligible-for-review', availability: 'available', ingredientsStatus: 'verified', image: {kind: 'concept-placeholder', caption: 'SYNTHETIC'}, finishingComponents: [], nutrition: null,
    sku: {id: 'food-sku:synthetic-bowl', version: 1, servingOffer: {offerId: 'food-serving-offer:synthetic-bowl', version: 1}, package: {id: 'food-package-definition:synthetic-bowl', version: 1}},
    packageDefinition: {id: 'food-package-definition:synthetic-bowl', version: 1, netQuantity: {basis: 'grams', grams: 500}},
    approvedPrice: {id: 'food-approved-commercial-price:synthetic-bowl', version: 1, sku: {id: 'food-sku:synthetic-bowl', version: 1}, money: {currency: 'USD', minorUnits: 1200}, approval: {attribution: 'SYNTHETIC', sourceReference: 'synthetic-price-evidence', approvedOn: '2026-10-21'}},
    maxPerOrder: 4, remainingCapacity: capacity, fulfillment: {pickup: true, localDelivery: true}
  });
  const launch = {schemaVersion: 1, productId, productVersion: 1,
    ...Object.fromEntries(Object.entries(requirements).map(([group, keys]) => [group, Object.fromEntries(keys.map(key => [key, {status: 'PASS', evidenceReference: 'synthetic-evidence-only'}]))])),
    launchAuthorization: {status: 'PASS', productId, productVersion: 1, authorizedBy: 'SYNTHETIC', authorizedOn: '2026-10-21', evidenceReference: 'synthetic-launch-only'}};
  return {
    mode: 'simulation-only', fixtureLabel: 'SYNTHETIC', catalog: [p], launchReviews: [launch], maxOrderQuantity: 6, maxCustomerQuantity: 6, quoteLifetimeSeconds: 600, holdLifetimeSeconds: 300,
    offers: [{productId, productVersion: 1, salesOpenAt: '2026-10-20T14:00:00.000Z', salesCloseAt: '2026-10-21T16:00:00.000Z', priceExpiresAt: '2026-10-21T16:00:00.000Z', batchId: 'synthetic-batch', productionDate: '2026-10-21', cutoffAt: '2026-10-21T16:00:00.000Z'}],
    windows: [{id: 'synthetic-window', locationReference: 'synthetic-handoff', method: 'meetup', timezone: 'America/Chicago', localDate: '2026-10-21', localStart: '13:00', localEnd: '14:00', startsAt: '2026-10-21T18:00:00.000Z', endsAt: '2026-10-21T19:00:00.000Z', cutoffAt: '2026-10-21T16:00:00.000Z', minLeadMinutes: 120, capacity, closed: false, unavailableDates: [], verified: true, evidenceReference: 'synthetic-window-evidence'}],
    resources: [{id: 'synthetic-batch', kind: 'batch', capacity}, {id: 'synthetic-window', kind: 'window', capacity}],
    pickupFee: {state: 'verified', money: {currency: 'USD', minorUnits: 100}, evidenceReference: 'synthetic-pickup-fee'},
    deliveryPolicy: {version: 1, verified: true, zoneReference: 'synthetic-zone', maximumDistanceMeters: 1000, fee: {state: 'verified', money: {currency: 'USD', minorUnits: 100}, evidenceReference: 'synthetic-delivery-fee'}},
    tax: {state: 'verified', classification: 'taxable', money: {currency: 'USD', minorUnits: 80}, evidenceReference: 'synthetic-tax-decision'}
  };
}
export function simulatedCustomerOrder() {
  const engine = createTableOrderSimulation(syntheticAuthority());
  engine.create('synthetic-order', [{productId: 'food-product:synthetic-bowl', version: 1, quantity: 2}], 'synthetic-window', 'synthetic-handoff', SYNTHETIC_NOW);
  const run = (id: string, command: unknown, at = SYNTHETIC_NOW) => engine.execute('synthetic-order', id, engine.get('synthetic-order').version, command, at);
  run('quote', {type: 'quote'}); run('checkout', {type: 'begin-checkout'});
  run('payment', {type: 'simulate-payment', proof: engine.fakePayment('synthetic-order', 'synthetic-payment', SYNTHETIC_NOW)});
  run('accept', {type: 'accept'});
  return {engine, run};
}
export function simulatedProductionFulfillment() {
  const flow = simulatedCustomerOrder();
  flow.run('prepare', {type: 'prepare'});
  flow.run('ready', {type: 'ready', evidenceReference: 'synthetic-packaging-cold-chain-log'});
  flow.run('fulfill', {type: 'fulfill', evidenceReference: 'synthetic-handoff-log'}, SYNTHETIC_HANDOFF);
  return flow;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, flag, ...rest] = process.argv.slice(2);
    if (!['order', 'fulfill', 'operations'].includes(command) || flag !== '--synthetic' || rest.length) throw new Error('Usage: node --import tsx scripts/food/order-simulation.ts order|fulfill|operations --synthetic');
    const flow = command === 'order' ? simulatedCustomerOrder() : simulatedProductionFulfillment();
    console.log('SIMULATED — UNVERIFIED — REAL DATA UNAVAILABLE. No real order, payment or confirmation exists.');
    if (command === 'operations') console.log(simulationOperationsReport(summarizeTableSimulation(flow.engine, syntheticCosting())));
    else {
      const o = flow.engine.get('synthetic-order');
      console.log(`SIMULATED ${o.id}: ${o.status}; live payment verified=${o.realPaymentVerified}`);
      console.log(o.events.map(e => `SIMULATED ${e.at} ${e.status}`).join('\n'));
    }
  } catch (error) { console.error(`Simulation failed: ${(error as Error).message}`); process.exitCode = 1; }
}
