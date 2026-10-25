/** LOCAL SYNTHETIC ONLY. Durable replay of FOOD-COMMERCE-002, not a live order adapter. */
import type { LocalTableDatabase } from '../../../scripts/food/local-test-d1';
import { createTableOrderSimulation, type SimulationAuthority, type SimulationOrder } from './table-order-engine';
import { freezeModel, instant, modelRef } from './table-scheduling';
import { modelFingerprint } from './table-capacity-model';
import { requireTestPaymentEvidence, mockTestCheckout, type TestCheckout, type TestPaymentEvidence } from './table-test-payment';
import { summarizeTableSimulation } from './table-order-operations';
import type { TableLocalDiagnostics, TableDiagnosticCode } from './table-local-diagnostics';

type Engine = ReturnType<typeof createTableOrderSimulation>;
type Step =
  | {kind: 'create'; args: Parameters<Engine['create']>}
  | {kind: 'command'; orderId: string; key: string; version: number; command: unknown; at: string}
  | {kind: 'payment' | 'refund'; orderId: string; key: string; eventId: string; at: string}
  | {kind: 'cleanup'; key: string; at: string}
  | {kind: 'authority'; value: SimulationAuthority};
type CheckoutRecord = {intent: TestCheckout; paid: boolean; refunded: boolean; late: boolean};
type InboxRecord = {evidence: TestPaymentEvidence; receivedAt: string; outcome: string};
interface Store {
  authority: SimulationAuthority; steps: Step[]; receipts: {key: string; hash: string}[];
  checkouts: CheckoutRecord[]; inbox: InboxRecord[];
  orders: readonly SimulationOrder[]; capacity: ReturnType<Engine['capacity']>;
}
export class TableLocalConflict extends Error {}
function apply(engine: Engine, step: Step): void {
  switch (step.kind) {
    case 'create': engine.create(...step.args); break;
    case 'command': engine.execute(step.orderId, step.key, step.version, step.command, step.at); break;
    case 'cleanup': engine.cleanup(step.key, step.at); break;
    case 'authority': engine.updateAuthorities(step.value); break;
    case 'payment': {
      const proof = engine.fakePayment(step.orderId, step.eventId, step.at);
      engine.execute(step.orderId, `${step.key}/payment`, engine.get(step.orderId).version, {type: 'simulate-payment', proof}, step.at);
      engine.execute(step.orderId, `${step.key}/accept`, engine.get(step.orderId).version, {type: 'accept'}, step.at); break;
    }
    case 'refund': {
      const proof = engine.fakeRefund(step.orderId, step.eventId);
      engine.execute(step.orderId, step.key, engine.get(step.orderId).version, {type: 'refund', proof}, step.at); break;
    }
  }
}
function rebuild(store: Store): Engine {
  const engine = createTableOrderSimulation(store.authority);
  for (const step of store.steps) apply(engine, step);
  if (modelFingerprint(engine.list()) !== modelFingerprint(store.orders) || modelFingerprint(engine.capacity()) !== modelFingerprint(store.capacity)) throw new Error('Stored projection/history mismatch');
  return engine;
}
function settleRefund(record: CheckoutRecord, item: InboxRecord, engine: Engine, run: (step: Step) => void, at: string) {
  if (!record.paid) {item.outcome = 'pending-payment'; return;}
  if (record.refunded) {item.outcome = 'duplicate-refund'; return;}
  const id = record.intent.orderId, order = engine.get(id);
  if (!record.late) {
    if (order.status === 'out-for-delivery') {item.outcome = 'pending-fulfillment'; return;}
    const command = order.status === 'fulfilled' ? {type: 'request-refund', evidenceReference: item.evidence.eventId} : {type: 'cancel'};
    if (order.status !== 'refund-pending') run({kind: 'command', orderId: id, key: `refund-request/${item.evidence.eventId}`, version: order.version, command, at});
    run({kind: 'refund', orderId: id, key: `provider-refund/${item.evidence.eventId}`, eventId: item.evidence.eventId, at});
  }
  record.refunded = true; item.outcome = 'refunded';
}
function requestRefund(record: CheckoutRecord, item: InboxRecord, engine: Engine, run: (step: Step) => void, at: string) {
  if (!record.paid) {item.outcome = 'pending-payment'; return;}
  if (record.refunded) {item.outcome = 'ignored-after-refund'; return;}
  const order = engine.get(record.intent.orderId);
  if (!record.late && order.status !== 'refund-pending' && order.status !== 'out-for-delivery') {
    const command = order.status === 'fulfilled' ? {type: 'request-refund', evidenceReference: item.evidence.eventId} : {type: 'cancel'};
    run({kind: 'command', orderId: order.id, key: `refund-initiate/${item.evidence.eventId}`, version: order.version, command, at});
  }
  item.outcome = 'refund-requested';
}

export interface TableLocalOrderRepository {
  create(key: string, ...args: Parameters<Engine['create']>): Promise<SimulationOrder>;
  get(id: string): Promise<SimulationOrder>;
  execute(id: string, key: string, version: number, command: unknown, at: string, guard?: {authorityFingerprint: string}): Promise<SimulationOrder>;
  checkout(id: string, key: string, version: number, at: string): Promise<TestCheckout>;
  reconcile(evidence: TestPaymentEvidence, receivedAt: string): Promise<string>;
  cleanup(key: string, at: string): Promise<void>;
}

export class LocalTableOrderRepository implements TableLocalOrderRepository {
  private constructor(private readonly db: LocalTableDatabase, private readonly diagnosticRecorder?: TableLocalDiagnostics) {}
  static async open(db: LocalTableDatabase, authority: SimulationAuthority, diagnostics?: TableLocalDiagnostics): Promise<LocalTableOrderRepository> {
    if (db.mode !== 'local-synthetic-only') throw new TypeError('Local isolated test database required');
    const engine = createTableOrderSimulation(authority);
    const store: Store = {authority, steps: [], receipts: [], checkouts: [], inbox: [], orders: engine.list(), capacity: engine.capacity()};
    const result = await db.prepare(`INSERT INTO table_synthetic_order_store (id,mode,format_version,revision,payload_json)
      VALUES (1,'local-synthetic-only',1,0,?) ON CONFLICT(id) DO NOTHING RETURNING revision`).bind(JSON.stringify(store)).all();
    if (!result.success) throw new Error('Local initialization failed');
    const repository = new LocalTableOrderRepository(db, diagnostics), saved = await repository.load();
    if (modelFingerprint(saved.store.authority) !== modelFingerprint(authority)) throw new TypeError('Stored initial authority mismatch');
    rebuild(saved.store); return repository;
  }
  private async load(): Promise<{revision: number; store: Store}> {
    const result = await this.db.prepare("SELECT revision,payload_json FROM table_synthetic_order_store WHERE id=1 AND mode='local-synthetic-only' AND format_version=1").all();
    if (!result.success || result.results.length !== 1) throw new Error('Missing/corrupt local store');
    const row = result.results[0] as {revision: number; payload_json: string};
    if (!Number.isSafeInteger(row.revision) || row.revision < 0 || row.revision === Number.MAX_SAFE_INTEGER) throw new Error('Invalid repository revision');
    return {revision: row.revision, store: JSON.parse(row.payload_json) as Store};
  }
  private async change<T>(key: string, payload: unknown, work: (store: Store, engine: Engine, run: (step: Step) => void) => T, retry: (store: Store, engine: Engine) => T): Promise<T> {
    try {return await this.commitChange(key, payload, work, retry);} catch (error) {
      const message = error instanceof Error ? error.message : '';
      const code: TableDiagnosticCode = /Capacity exhausted/.test(message) ? 'capacity-exhausted' : /Idempotency/.test(message) ? 'idempotency-conflict' : /Concurrent|Stale|Authority changed/.test(message) ? 'version-conflict' : /Invalid transition|Quote expired|Unknown|mismatch|required/i.test(message) ? 'transition-rejected' : 'storage-failure';
      this.recordDiagnostic(code, key); throw error;
    }
  }
  recordDiagnostic(code: TableDiagnosticCode, operation: string) {
    try {this.diagnosticRecorder?.record(code, operation);} catch { /* Diagnostics never decide transaction outcomes. */ }
  }
  private async commitChange<T>(key: string, payload: unknown, work: (store: Store, engine: Engine, run: (step: Step) => void) => T, retry: (store: Store, engine: Engine) => T): Promise<T> {
    modelRef(key);
    const {revision, store} = await this.load(), engine = rebuild(store), hash = modelFingerprint(payload);
    const prior = store.receipts.find(r => r.key === key);
    if (prior) { if (prior.hash !== hash) throw new TableLocalConflict('Idempotency key conflict'); this.recordDiagnostic('duplicate-request', key); return retry(store, engine); }
    const run = (step: Step) => { apply(engine, step); store.steps.push(step); };
    const value = work(store, engine, run);
    store.receipts.push({key, hash}); store.orders = engine.list(); store.capacity = engine.capacity();
    // One guarded statement commits ALL order/hold/inbox/idempotency changes or none.
    const result = await this.db.prepare(`UPDATE table_synthetic_order_store SET revision=revision+1,payload_json=?
      WHERE id=1 AND revision=? AND mode='local-synthetic-only' AND format_version=1 RETURNING revision`)
      .bind(JSON.stringify(store), revision).all();
    if (!result.success) throw new Error('Storage failure: retry identical key after re-reading');
    if (result.results.length !== 1) throw new TableLocalConflict('Concurrent repository write; re-read and retry');
    this.recordDiagnostic('committed', key);
    return freezeModel(value);
  }
  async get(id: string) { return rebuild((await this.load()).store).get(id); }
  async authoritySnapshot() {
    const {store} = await this.load(); rebuild(store);
    const latest = store.steps.filter((s): s is Extract<Step, {kind: 'authority'}> => s.kind === 'authority').at(-1);
    return freezeModel(latest?.value ?? store.authority);
  }
  /** Resolve schedule from the authority AT QUOTE CREATION, never today's edited window. */
  async confirmationContext(id: string) {
    const {store} = await this.load(), order = rebuild(store).get(id);
    let authority = store.authority, window: SimulationAuthority['windows'][number] | null = null;
    const replay = createTableOrderSimulation(authority);
    for (const step of store.steps) {
      if (step.kind === 'authority') authority = step.value;
      apply(replay, step);
      const candidate = replay.list().find(o => o.id === id);
      if (!window && order.quote && candidate?.quote?.id === order.quote.id) window = authority.windows.find(w => w.id === order.windowId) ?? null;
    }
    const payment = store.checkouts.find(c => c.intent.orderId === id);
    const refundConfirmed = !!payment && (payment.refunded || store.inbox.some(i => i.evidence.checkout.sessionId === payment.intent.sessionId && i.outcome === 'pending-fulfillment'));
    return freezeModel({order, window, syntheticPaymentRecorded: !!payment?.paid && !payment.late, refundConfirmed, paymentRequiresRefund: !!payment?.paid && payment.late && !payment.refunded});
  }
  async snapshot() {
    const {revision, store} = await this.load(); rebuild(store);
    return freezeModel({revision, orders: store.orders, capacity: store.capacity, checkouts: store.checkouts, inbox: store.inbox});
  }
  async diagnostics() {
    const {store} = await this.load(); rebuild(store);
    return freezeModel({provenance: 'SYNTHETIC', environment: 'LOCAL_TEST', productionBehavior: 'UNVERIFIED',
      attempts: this.diagnosticRecorder?.snapshot() ?? [], durableReceipts: store.receipts.length,
      expiredHolds: store.capacity.holds.filter(h => h.status === 'expired').length,
      pendingOrders: store.orders.filter(o => o.status === 'awaiting-payment').length,
      duplicatePaymentEvents: store.inbox.filter(i => i.outcome === 'duplicate-payment').length,
      duplicateRefundEvents: store.inbox.filter(i => i.outcome === 'duplicate-refund').length,
      refundRequests: store.inbox.filter(i => i.outcome === 'refund-requested').length,
      failedRefundEvents: store.inbox.filter(i => i.outcome === 'refund-failed').length,
      unresolved: store.inbox.filter(i => (i.outcome === 'pending-fulfillment' || (i.evidence.kind.startsWith('refund') && ['pending-payment','refund-requested','refund-failed'].includes(i.outcome)) || i.outcome === 'refund-required') && !store.checkouts.find(c => c.intent.sessionId === i.evidence.checkout.sessionId)?.refunded)
        .map(i => ({eventHash: modelFingerprint(i.evidence.eventId), orderHash: modelFingerprint(i.evidence.checkout.orderId), reason: i.outcome}))});
  }
  async create(key: string, ...args: Parameters<Engine['create']>) {
    return this.change(`create/${args[0]}/${key}`, {args}, (_s, engine, run) => {run({kind: 'create', args}); return engine.get(args[0]);}, (_s, engine) => engine.get(args[0]));
  }
  async execute(id: string, key: string, version: number, command: unknown, at: string, guard?: {authorityFingerprint: string}) {
    const type = (command as {type?: unknown} | null)?.type;
    if (['simulate-payment', 'refund', 'accept', 'begin-checkout'].includes(String(type))) throw new TypeError('Use authenticated reconciliation/checkout boundary');
    return this.change(`order/${id}/${key}`, {id, command}, (store, engine, run) => {
      if (guard) {
        const current = store.steps.filter((s): s is Extract<Step, {kind: 'authority'}> => s.kind === 'authority').at(-1)?.value ?? store.authority;
        if (guard.authorityFingerprint !== modelFingerprint(current)) throw new TableLocalConflict('Authority changed before transition; re-read and reconcile');
      }
      run({kind: 'command', orderId: id, key, version, command, at}); return engine.get(id);
    }, (_s, engine) => engine.get(id));
  }
  async checkout(id: string, key: string, version: number, at: string) {
    return this.change(`checkout/${id}/${key}`, {id}, (store, engine, run) => {
      run({kind: 'command', orderId: id, key: `checkout/${key}`, version, command: {type: 'begin-checkout'}, at});
      const order = engine.get(id), hold = engine.capacity().holds.find(h => h.id === order.holdId)!;
      const intent = mockTestCheckout(order, hold.expiresAt);
      if (store.checkouts.some(c => c.intent.sessionId === intent.sessionId || c.intent.paymentId === intent.paymentId)) throw new Error('Duplicate session identity');
      store.checkouts.push({intent, paid: false, refunded: false, late: false}); return intent;
    }, (store) => { const checkout = store.checkouts.find(c => c.intent.orderId === id); if (!checkout) throw new Error('Missing checkout receipt'); return checkout.intent; });
  }
  async cleanup(key: string, at: string) {
    instant(at);
    await this.change(`cleanup/${key}`, {at}, (_s, _e, run) => run({kind: 'cleanup', key, at}), () => undefined);
  }
  async updateAuthorities(key: string, value: SimulationAuthority) {
    await this.change(`authority/${key}`, value, (_s, _e, run) => run({kind: 'authority', value}), () => undefined);
  }
  async reconcile(evidence: TestPaymentEvidence, receivedAt: string): Promise<string> {
    requireTestPaymentEvidence(evidence); instant(receivedAt);
    return this.change(`provider/${evidence.eventId}`, evidence, (store, engine, run) => {
      const record = store.checkouts.find(c => c.intent.sessionId === evidence.checkout.sessionId);
      if (!record || modelFingerprint(record.intent) !== modelFingerprint(evidence.checkout)) throw new TypeError('Unknown/mismatched authoritative checkout, quote, product, amount or currency');
      if (store.checkouts.some(c => c !== record && c.intent.paymentId === evidence.checkout.paymentId)) throw new TypeError('Payment already bound elsewhere');
      if (evidence.refundId && store.inbox.some(i => i.evidence.refundId === evidence.refundId && i.evidence.checkout.paymentId !== record.intent.paymentId)) throw new TypeError('Refund identity already bound elsewhere');
      const id = record.intent.orderId;
      const current = engine.get(id);
      if (instant(receivedAt) < instant(current.events.at(-1)?.at ?? current.createdAt)) throw new TypeError('Receipt time cannot precede order history');
      const inbox: InboxRecord = {evidence, receivedAt, outcome: 'received'}; store.inbox.push(inbox);
      const command = (key: string, value: unknown) => run({kind: 'command', orderId: id, key, version: engine.get(id).version, command: value, at: receivedAt});
      const refund = (item: InboxRecord) => settleRefund(record, item, engine, run, receivedAt);
      switch (evidence.kind) {
        case 'pending': inbox.outcome = record.paid ? 'ignored-after-payment' : 'pending-payment'; break;
        case 'failure': case 'expired':
          if (record.paid) inbox.outcome = 'ignored-after-payment';
          else {
            const order = engine.get(id);
            if (order.status !== 'canceled') command(`provider-close/${evidence.eventId}`, {type: 'cancel'});
            inbox.outcome = evidence.kind;
          }
          break;
        case 'success': {
          if (record.paid) {inbox.outcome = 'duplicate-payment'; break;}
          const order = engine.get(id), hold = engine.capacity().holds.find(h => h.id === order.holdId);
          let eligible = true;
          try {engine.fakePayment(id, evidence.eventId, receivedAt);} catch {eligible = false;}
          const late = !eligible || order.status !== 'awaiting-payment' || instant(receivedAt) >= instant(record.intent.expiresAt) || !hold || hold.status !== 'held';
          if (late) {
            if (order.status === 'awaiting-payment') command(`late-close/${evidence.eventId}`, {type: 'cancel'});
            record.late = true; inbox.outcome = 'refund-required';
          } else {
            // Engine revalidates current launch/quote authority. Any failure rolls back inbox too.
            run({kind: 'payment', orderId: id, key: `provider/${evidence.eventId}`, eventId: evidence.eventId, at: receivedAt});
            inbox.outcome = 'accepted';
          }
          record.paid = true;
          for (const pending of store.inbox.filter(i => ['refund','refund-pending'].includes(i.evidence.kind) && i.evidence.checkout.sessionId === record.intent.sessionId && i.outcome === 'pending-payment')) {
            if (pending.evidence.kind === 'refund') refund(pending); else requestRefund(record, pending, engine, run, receivedAt);
          }
          break;
        }
        case 'refund': refund(inbox); break;
        case 'refund-pending': requestRefund(record, inbox, engine, run, receivedAt); break;
        case 'refund-failed': inbox.outcome = record.refunded ? 'ignored-after-refund' : 'refund-failed'; break;
      }
      return inbox.outcome;
    }, store => store.inbox.find(i => i.evidence.eventId === evidence.eventId)!.outcome);
  }
  async retryPending(key: string, at: string) {
    instant(at);
    await this.change(`recovery/${key}`, {at}, (store, engine, run) => {
      for (const item of store.inbox.filter(i => ['refund','refund-pending'].includes(i.evidence.kind) && ['pending-payment','pending-fulfillment'].includes(i.outcome))) {
        const record = store.checkouts.find(c => c.intent.sessionId === item.evidence.checkout.sessionId)!;
        if (item.evidence.kind === 'refund') settleRefund(record, item, engine, run, at); else requestRefund(record, item, engine, run, at);
      }
    }, () => undefined);
  }
  async operations(costing?: unknown) {
    const {store} = await this.load(), summary = summarizeTableSimulation(rebuild(store), costing);
    // Confirmed refunds affect finance immediately, even while delivery remains an exception.
    const awaitingHandoff = store.checkouts.filter(c => c.paid && !c.refunded && store.inbox.some(i => i.evidence.checkout.sessionId === c.intent.sessionId && i.outcome === 'pending-fulfillment'));
    const requestedDuringDelivery = store.checkouts.filter(c => c.paid && !c.refunded && !awaitingHandoff.includes(c) && store.orders.find(o => o.id === c.intent.orderId)?.status === 'out-for-delivery' && store.inbox.some(i => i.evidence.checkout.sessionId === c.intent.sessionId && i.outcome === 'refund-requested'));
    const financialExceptions = [...awaitingHandoff, ...requestedDuringDelivery];
    const refundAdjustment = awaitingHandoff.reduce((n,c) => n + BigInt(c.intent.amount), 0n);
    const pendingDeliveryAdjustment = requestedDuringDelivery.reduce((n,c) => n + BigInt(c.intent.amount), 0n);
    const taxAdjustment = financialExceptions.reduce((n,c) => n + BigInt(store.orders.find(o => o.id === c.intent.orderId)!.quote!.calculation.tax!.minorUnits), 0n);
    const operatingAdjustment = refundAdjustment + pendingDeliveryAdjustment - taxAdjustment;
    const refundedUnits = financialExceptions.reduce((n,c) => n + store.orders.find(o => o.id === c.intent.orderId)!.cart.reduce((m,l) => m + BigInt(l.quantity), 0n), 0n);
    const lateGross = store.checkouts.filter(c => c.late && c.paid).reduce((n,c) => n + BigInt(c.intent.amount), 0n);
    const lateRefunded = store.checkouts.filter(c => c.late && c.refunded).reduce((n,c) => n + BigInt(c.intent.amount), 0n);
    return freezeModel({...summary, provenance: 'local-synthetic-only',
      paidOrders: summary.paidOrders - financialExceptions.length,
      refundedCents: summary.refundedCents + refundAdjustment,
      pendingRefundCents: summary.pendingRefundCents + pendingDeliveryAdjustment,
      netOperatingRevenueCents: summary.netOperatingRevenueCents - operatingAdjustment,
      taxLiabilityCents: summary.taxLiabilityCents - taxAdjustment,
      operatingProfitCents: summary.operatingProfitCents === null ? null : summary.operatingProfitCents - operatingAdjustment,
      unitsSold: summary.unitsSold - refundedUnits,
      pendingPaymentOrders: store.orders.filter(o => o.status === 'awaiting-payment').length,
      authenticatedTestPaidOrders: store.checkouts.filter(c => c.paid && !c.refunded && !financialExceptions.includes(c)).length,
      deferredRefunds: store.inbox.filter(i => ['refund','refund-pending'].includes(i.evidence.kind) && i.outcome === 'pending-payment').length,
      refundsAwaitingFulfillment: store.inbox.filter(i => i.outcome === 'pending-fulfillment').length,
      latePaymentRefundsRequired: store.checkouts.filter(c => c.late && c.paid && !c.refunded).length,
      latePaymentReceiptsCents: lateGross,
      latePaymentRefundedCents: lateRefunded,
      latePaymentRefundProvisionCents: lateGross - lateRefunded,
      totalSyntheticReceiptsCents: summary.grossReceiptsCents + lateGross,
      totalSyntheticRefundedCents: summary.refundedCents + refundAdjustment + lateRefunded,
      notice: `${summary.notice} Signed fixtures are authenticated synthetic test evidence, never real payment verification. Late receipts are tracked separately for refund recovery.`});
  }
}
