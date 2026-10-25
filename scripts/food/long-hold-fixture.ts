/** FOOD-COMMERCE-008 — synthetic 40-minute reservation fixtures, NEVER commercial authority. */
import type {SimulationAuthority} from '../../src/lib/food/table-order-engine';
import type {TestCheckout} from '../../src/lib/food/table-test-payment';
import {assessSyntheticCheckoutHoldPolicy} from './table-stripe-hold-policy.mjs';

const SESSION_SECONDS = 1800;
const GRACE_SECONDS = 300;
const HOLD_SECONDS = 2400;
const CUTOFF_SECONDS = 3300;
function at(now: string, seconds: number) {
  const base = Date.parse(now);
  if (!Number.isFinite(base) || !/\.\d{3}Z$/.test(now) || !Number.isSafeInteger(seconds)) throw new TypeError('Exact synthetic UTC time and integer seconds required');
  return new Date(base + seconds * 1000).toISOString();
}

/** Reconfigure SYNTHETIC fixtures only. No production price/stock/policy is changed. */
export function syntheticLongHoldAuthority(source: SimulationAuthority, now: string, servings?: number): SimulationAuthority {
  if (source.mode !== 'simulation-only' || source.fixtureLabel !== 'SYNTHETIC') throw new TypeError('Only explicitly synthetic authority may be adjusted');
  if (servings !== undefined && (!Number.isSafeInteger(servings) || servings < 1)) throw new TypeError('Invalid synthetic capacity');
  const deadline = at(now, CUTOFF_SECONDS);
  for (const window of source.windows) if (Date.parse(window.startsAt) <= Date.parse(deadline)) throw new TypeError('Synthetic fulfillment starts before cutoff and buffer');
  // Preserve existing resource capacities unless a synthetic fixture explicitly supplies its own.
  return {
    ...source,
    quoteLifetimeSeconds: HOLD_SECONDS,
    holdLifetimeSeconds: HOLD_SECONDS,
    offers: source.offers.map(offer => ({...offer, salesCloseAt: deadline, priceExpiresAt: deadline, cutoffAt: deadline})),
    windows: source.windows.map(window => ({...window, cutoffAt: deadline})),
    ...(servings === undefined ? {} : {
      resources: source.resources.map(r => ({...r, capacity: servings})),
      windows: source.windows.map(w => ({...w, capacity: servings, cutoffAt: deadline})),
      catalog: source.catalog.map(p => ({...p, remainingCapacity: servings}))
    })
  } as SimulationAuthority;
}

/** Verify existing order-engine quote & capacity holds against a SEPARATE proposed provider Session expiry. */
export function evaluateActualSyntheticHold(intent: TestCheckout, quoteExpiresAt: string, now: string, fulfillmentStartsAt: string, remainingUnits: number, requestedUnits: number) {
  if (intent.provenance !== 'synthetic-stripe-test' || !intent.orderId.startsWith('synthetic-')) throw new TypeError('Only synthetic checkout evidence permitted');
  const providerExpiresAt = at(now, SESSION_SECONDS);
  const contract = {...intent, expiresAt: providerExpiresAt};
  const policy = {
    provenance: 'SYNTHETIC', createdAt: now, quoteExpiresAt,
    holdExpiresAt: intent.expiresAt, offerCutoffAt: at(now, CUTOFF_SECONDS),
    fulfillmentStartsAt, sessionExpiresAt: providerExpiresAt,
    safetyGraceSeconds: GRACE_SECONDS, requestedUnits, availableUnits: remainingUnits
  };
  const config = {
    mode: 'offline-synthetic-only', createdAt: now,
    successUrl: 'http://127.0.0.1:4335/the-table/',
    cancelUrl: 'http://127.0.0.1:4335/the-table/'
  };
  const verdict = assessSyntheticCheckoutHoldPolicy(contract, config, policy);
  return Object.freeze({
    ...verdict, providerExpiresAt,
    existingLocalIntentExpiresAt: intent.expiresAt,
    providerExpirationPersistedInCurrentRepository: false,
    realProviderSessionCreated: false,
    commercialAuthorized: false,
    // This is a non-negotiable blocker for actual Stripe E2E until separate provider deadline is stored and checked.
    remainingIntegrationGate: 'PERSIST_PROVIDER_SESSION_EXPIRY_AND_RECONCILE_OUT_OF_ORDER_EVENTS'
  });
}
