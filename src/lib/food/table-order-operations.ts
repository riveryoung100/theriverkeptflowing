/** Private SIMULATED operations projection. Never import from a public page. */
import { calculate } from '../../../scripts/food/cost.mjs';
import type { createTableOrderSimulation } from './table-order-engine';

export function summarizeTableSimulation(engine: ReturnType<typeof createTableOrderSimulation>, costingInput?: unknown) {
  if (engine.mode !== 'simulation-only' || engine.liveAdapter.configured) throw new TypeError('Offline simulation required');
  const cost = costingInput === undefined ? null : calculate(costingInput), orders = engine.list(), ids = new Set<string>();
  if (new Set(orders.flatMap(o => o.cart.map(l => `${l.productId}@${l.version}`))).size > 1) throw new TypeError('This costing report requires a single product/version; supply a future per-product cost adapter for mixed menus');
  let grossReceipts = 0n, refunded = 0n, pendingRefund = 0n, operatingReceipts = 0n, taxLiability = 0n, preparedUnits = 0n, unitsSold = 0n, fulfilledUnits = 0n;
  for (const o of orders) {
    if (o.mode !== 'simulation-only' || o.realPaymentVerified !== false || ids.has(o.id) || o.version !== o.events.length + 1) throw new TypeError('Invalid simulation event projection');
    ids.add(o.id);
    const units = o.cart.reduce((n, l) => n + BigInt(l.quantity), 0n);
    if (o.events.some(e => e.status === 'preparing')) preparedUnits += units;
    if (o.events.some(e => e.status === 'fulfilled')) fulfilledUnits += units;
    if (!o.paymentEventId) continue;
    if (!o.quote) throw new TypeError('Payment projection without frozen quote');
    const q = o.quote.calculation, total = BigInt(o.quote.assessment.amountDue.minorUnits), tax = BigInt(q.tax!.minorUnits), operating = total - tax;
    grossReceipts += total;
    if (o.refundEventId) refunded += total;
    if (o.status === 'refund-pending') pendingRefund += total;
    if (!o.refundEventId && o.status !== 'refund-pending') { operatingReceipts += operating; taxLiability += tax; unitsSold += units; }
  }
  const entered = costingInput as {weeklyFixedExpensesCents: number; ingredientsCents: number; packagingAndLabelsCents: number; fulfillmentCents: number} | undefined;
  const fixedExpenses = cost && entered ? BigInt(entered.weeklyFixedExpensesCents) : null;
  const variableCosts = cost ? preparedUnits * cost.variableCostCents : null;
  const qty = (statuses: readonly string[]) => orders.filter(o => statuses.includes(o.status)).reduce((n, o) => n + o.cart.reduce((k,l) => k + BigInt(l.quantity), 0n), 0n);
  const capacity = engine.capacity();
  return {
    label: 'SIMULATED — REAL DATA UNAVAILABLE', realDataAvailable: false, realRevenueCents: null,
    costStatus: cost ? 'synthetic-entered' as const : 'unverified' as const,
    grossOrders: orders.length,
    foodCostsCents: cost && entered ? preparedUnits * (BigInt(entered.ingredientsCents) + cost.wasteCents) : null,
    packagingCostsCents: cost && entered ? preparedUnits * BigInt(entered.packagingAndLabelsCents) : null,
    fulfillmentCostsCents: cost && entered ? preparedUnits * BigInt(entered.fulfillmentCents) : null,
    privateWeeklyProfitTargetCents: cost?.weeklyProfitTargetCents ?? null,
    awaitingApproval: orders.filter(o => ['fulfillment-unavailable', 'quote-awaiting-pricing'].includes(o.status)).length,
    paidOrders: orders.filter(o => o.paymentEventId && !o.refundEventId).length,
    mealsToPrepare: qty(['accepted']), readyForPickup: orders.filter(o => o.status === 'ready-for-pickup' && o.quote?.fulfillment.method === 'meetup').length,
    deliveriesScheduled: orders.filter(o => ['accepted', 'preparing', 'ready-for-pickup', 'out-for-delivery'].includes(o.status) && o.quote?.fulfillment.method === 'personal-delivery').length,
    fulfilledOrders: orders.filter(o => o.events.some(e => e.status === 'fulfilled')).length,
    cancellations: orders.filter(o => ['canceled', 'refund-pending', 'refunded'].includes(o.status) && !o.events.some(e => e.status === 'fulfilled')).length,
    outstandingRefunds: orders.filter(o => o.status === 'refund-pending').length,
    unitsSold, preparedUnits, fulfilledUnits, grossReceiptsCents: grossReceipts, refundedCents: refunded, pendingRefundCents: pendingRefund,
    netOperatingRevenueCents: operatingReceipts, taxLiabilityCents: taxLiability, variableCostsCents: variableCosts, fixedExpensesCents: fixedExpenses,
    operatingProfitCents: variableCosts === null || fixedExpenses === null ? null : operatingReceipts - variableCosts - fixedExpenses,
    productionBatches: capacity.resources.filter(r => r.kind === 'batch'), holds: capacity.holds,
    notice: 'Synthetic receipts only. Tax is excluded from revenue; pending refunds are provisioned. Variable costs accrue when preparation starts, including canceled/wasted meals. No real sales, food-safety approval, dispatch, settlement or profit is established.'
  };
}
export function simulationOperationsReport(summary: ReturnType<typeof summarizeTableSimulation>): string {
  const cents = (v: bigint | null) => v === null ? 'UNVERIFIED' : `${v < 0n ? '-' : ''}$${(v < 0n ? -v : v) / 100n}.${String((v < 0n ? -v : v) % 100n).padStart(2, '0')}`;
  return [summary.label, `Awaiting approval: ${summary.awaitingApproval} | paid simulation orders: ${summary.paidOrders}`,
    `Meals to prepare: ${summary.mealsToPrepare} | ready pickup orders: ${summary.readyForPickup} | scheduled delivery orders: ${summary.deliveriesScheduled}`,
    `Fulfilled orders: ${summary.fulfilledOrders} | cancellations: ${summary.cancellations} | outstanding refunds: ${summary.outstandingRefunds}`,
    `SIMULATED units sold: ${summary.unitsSold} | prepared: ${summary.preparedUnits} | fulfilled: ${summary.fulfilledUnits}`,
    `SIMULATED gross receipts: ${cents(summary.grossReceiptsCents)} | refunded: ${cents(summary.refundedCents)} | pending refund provision: ${cents(summary.pendingRefundCents)}`,
    `SIMULATED net operating revenue: ${cents(summary.netOperatingRevenueCents)} | tax liability: ${cents(summary.taxLiabilityCents)}`,
    `SIMULATED variable costs: ${cents(summary.variableCostsCents)} | weekly fixed costs: ${cents(summary.fixedExpensesCents)} | operating profit: ${cents(summary.operatingProfitCents)}`,
    ...summary.productionBatches.map(b => `SIMULATED batch ${b.id}: capacity ${b.capacity}, held ${b.reserved}, committed ${b.committed}, available ${b.available}`), summary.notice].join('\n');
}
