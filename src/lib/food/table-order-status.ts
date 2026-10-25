/** Presentation vocabulary only; no order lookup, payment or activation authority. */
export const TABLE_ORDER_STATUSES = {
  unavailable: {label: 'Not yet available', detail: 'Ordering opens after the product and fulfillment details are confirmed.'},
  'awaiting-confirmation': {label: 'Awaiting confirmation', detail: 'An order is accepted only after payment and capacity are confirmed.'},
  accepted: {label: 'Paid and accepted', detail: 'Payment and production capacity have been confirmed for this order.'},
  preparing: {label: 'Preparing', detail: 'Your meal is being prepared for the confirmed handoff.'},
  'ready-for-pickup': {label: 'Ready for pickup', detail: 'Follow the confirmed pickup instructions.'},
  'out-for-delivery': {label: 'Out for delivery', detail: 'Your meal has been dispatched for the confirmed delivery.'},
  fulfilled: {label: 'Fulfilled', detail: 'The handoff has been recorded.'},
  canceled: {label: 'Canceled', detail: 'This order will not be fulfilled.'},
  'refund-pending': {label: 'Refund pending', detail: 'A refund still needs to be reconciled.'},
  refunded: {label: 'Refunded', detail: 'The refund has been reconciled.'}
} as const;
export type TableOrderStage = keyof typeof TABLE_ORDER_STATUSES;
