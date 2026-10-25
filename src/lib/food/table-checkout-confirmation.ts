/** Private synthetic projection. Never an endpoint, tracking token or real receipt. */
import type { LocalTableOrderRepository } from './table-local-order-repository';
import type { SimulationOrderStatus } from './table-order-engine';
import { publicTableProduct } from './table-catalog';
import { freezeModel } from './table-scheduling';
import { TABLE_ORDER_STATUSES, type TableOrderStage } from './table-order-status';

export function confirmationStage(status: SimulationOrderStatus): TableOrderStage {
  if (status === 'quote-awaiting-pricing' || status === 'fulfillment-unavailable') return 'unavailable';
  if (['draft-cart','quote-ready','awaiting-payment','simulation-payment-recorded'].includes(status)) return 'awaiting-confirmation';
  return status as TableOrderStage;
}
export function syntheticOrderConfirmation(context: Awaited<ReturnType<LocalTableOrderRepository['confirmationContext']>>) {
  const {order, window, syntheticPaymentRecorded, refundConfirmed, paymentRequiresRefund} = context;
  if (order.mode !== 'simulation-only' || order.realPaymentVerified !== false) throw new TypeError('Synthetic confirmation only');
  const stage = confirmationStage(order.status), accepted = syntheticPaymentRecorded && order.events.some(e => e.status === 'accepted');
  const quote = order.quote;
  const active = accepted && !['refund-pending','refunded','canceled','fulfilled'].includes(order.status);
  return freezeModel({provenance: 'SYNTHETIC — NO REAL PURCHASE', realOrder: false, realPaymentVerified: false,
    reference: `SIMULATION/${order.id}`, stage, status: stage === 'ready-for-pickup' && quote?.fulfillment.method === 'personal-delivery' ? 'Ready for delivery' : TABLE_ORDER_STATUSES[stage].label,
    paymentStatus: refundConfirmed ? 'synthetic-refund-confirmed' : paymentRequiresRefund ? 'synthetic-payment-requires-refund' : syntheticPaymentRecorded ? 'synthetic-payment-recorded' : 'not-confirmed',
    lines: quote ? quote.products.map((p, i) => {
      const product = publicTableProduct(p);
      if (!product) throw new TypeError('Hidden product cannot appear in confirmation');
      const line = quote.calculation.lines[i];
      return {name: product.name, quantity: line.quantity, unitPrice: line.unitPrice, subtotal: line.subtotal,
        ingredients: product.ingredients, allergens: product.allergens, portionGrams: product.netGrams};
    }) : [],
    subtotal: quote?.calculation.subtotal ?? null, fulfillmentFee: quote?.calculation.fulfillmentFee ?? null,
    tax: quote?.calculation.tax ?? null, total: quote?.calculation.total ?? null,
    fulfillment: {kind: quote?.fulfillment.method ?? null, active,
      confirmedWindow: accepted && window ? {timezone: window.timezone, localDate: window.localDate, localStart: window.localStart, localEnd: window.localEnd, startsAt: window.startsAt, endsAt: window.endsAt} : null,
      instructions: accepted ? active ? 'Synthetic handoff only. No actual pickup or delivery has been arranged.' : 'Historical synthetic window only. This order has no active handoff to arrange.' : 'No fulfillment window has been confirmed.'},
    cancellationGuidance: 'Simulation only. A real cancellation and refund policy must be approved before ordering opens.'});
}
