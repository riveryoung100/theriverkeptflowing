/** SIMULATION ONLY. In-memory adapter, not a durable/atomic production reservation service. */
import { createHash } from 'node:crypto';
import { validateFoodPurchaseQuantity } from './cart-quote-domain';
import { freezeModel, instant, modelRef, nonnegative } from './table-scheduling';

export function modelFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b, 'en'))) : v)).digest('hex');
}
export interface ModelCapacityResource { readonly id: string; readonly kind: 'batch' | 'window'; readonly capacity: number }
export interface ModelHold { readonly id: string; readonly orderId: string; readonly quoteId: string; readonly lines: readonly {readonly resourceId: string; readonly quantity: number}[]; readonly expiresAt: string; readonly status: 'held' | 'committed' | 'released' | 'expired' }
export function createTableCapacityModel(resources: readonly ModelCapacityResource[], authorizeHold: (orderId: string, quoteId: string, now: string) => boolean) {
  const limits = new Map<string, ModelCapacityResource>();
  for (const r of resources) { modelRef(r.id); nonnegative(r.capacity); if (!['batch', 'window'].includes(r.kind) || limits.has(r.id)) throw new TypeError('Invalid or duplicate resource'); limits.set(r.id, freezeModel(structuredClone(r))); }
  const holds = new Map<string, ModelHold>(), commands = new Map<string, string>();
  let revision = 0;
  function used(id: string) { return [...holds.values()].filter(h => h.status === 'held' || h.status === 'committed').reduce((n, h) => n + BigInt(h.lines.find(l => l.resourceId === id)?.quantity ?? 0), 0n); }
  function snapshot() {
    return freezeModel({mode: 'simulation-only' as const, revision, resources: [...limits.values()].map(r => {
      const reserved = [...holds.values()].filter(h => h.status === 'held').reduce((n,h) => n + BigInt(h.lines.find(l => l.resourceId === r.id)?.quantity ?? 0), 0n);
      const committed = used(r.id) - reserved;
      return {...r, reserved: Number(reserved), committed: Number(committed), available: Number(BigInt(r.capacity) - reserved - committed), soldOut: used(r.id) === BigInt(r.capacity)};
    }), holds: [...holds.values()]});
  }
  function mutate(id: string, expectedRevision: number, payload: unknown, operation: () => void) {
    modelRef(id); nonnegative(expectedRevision);
    const fingerprint = modelFingerprint(payload), prior = commands.get(id);
    if (prior !== undefined) { if (prior !== fingerprint) throw new TypeError('Capacity idempotency conflict'); return snapshot(); }
    if (expectedRevision !== revision) throw new TypeError('Stale capacity revision; re-read and retry');
    if (revision === Number.MAX_SAFE_INTEGER) throw new TypeError('Capacity revision overflow');
    operation(); commands.set(id, fingerprint); revision++; return snapshot();
  }
  return Object.freeze({ snapshot,
    reserve(id: string, expectedRevision: number, hold: Omit<ModelHold, 'status'>, now: string, injectFailure = false) {
      return mutate(id, expectedRevision, {type: 'reserve', hold, now}, () => {
        modelRef(hold.id); modelRef(hold.orderId); modelRef(hold.quoteId);
        if (!authorizeHold(hold.orderId, hold.quoteId, now)) throw new TypeError('Verified unexpired simulation quote required');
        if (instant(hold.expiresAt) <= instant(now)) throw new TypeError('Hold already expired');
        if (holds.has(hold.id) || [...holds.values()].some(h => h.orderId === hold.orderId && (h.status === 'held' || h.status === 'committed'))) throw new TypeError('Duplicate reservation');
        if (!hold.lines.length) throw new TypeError('Empty reservation');
        const seen = new Set<string>();
        for (const line of hold.lines) { validateFoodPurchaseQuantity(line.quantity); const r = limits.get(line.resourceId); if (!r || seen.has(line.resourceId)) throw new TypeError('Unknown/duplicate resource'); seen.add(line.resourceId); if (used(r.id) + BigInt(line.quantity) > BigInt(r.capacity)) throw new TypeError('Capacity exhausted'); }
        if (injectFailure) throw new Error('Injected adapter failure before mutation');
        holds.set(hold.id, freezeModel({...structuredClone(hold), status: 'held'}));
      });
    },
    change(id: string, expectedRevision: number, holdId: string, action: 'commit' | 'release', now: string) {
      return mutate(id, expectedRevision, {type: action, holdId, now}, () => {
        if (action !== 'commit' && action !== 'release') throw new TypeError('Invalid hold action');
        const h = holds.get(holdId); if (!h) throw new TypeError('Missing reservation');
        instant(now);
        if (action === 'commit') {
          if (h.status === 'committed') return;
          if (h.status !== 'held' || instant(now) >= instant(h.expiresAt)) throw new TypeError('No active reservation to commit');
        } else if (h.status === 'released' || h.status === 'expired') return;
        holds.set(holdId, freezeModel({...h, status: action === 'commit' ? 'committed' : 'released'}));
      });
    },
    expire(id: string, expectedRevision: number, now: string) {
      return mutate(id, expectedRevision, {type: 'expire', now}, () => {
        const at = instant(now);
        for (const [key, h] of holds) if (h.status === 'held' && instant(h.expiresAt) <= at) holds.set(key, freezeModel({...h, status: 'expired'}));
      });
    },
    resize(id: string, expectedRevision: number, resourceId: string, capacity: number) {
      return mutate(id, expectedRevision, {type: 'resize', resourceId, capacity}, () => {
        nonnegative(capacity); const r = limits.get(resourceId); if (!r || used(resourceId) > BigInt(capacity)) throw new TypeError('Cannot reduce capacity below commitments');
        limits.set(resourceId, freezeModel({...r, capacity}));
      });
    }
  });
}
