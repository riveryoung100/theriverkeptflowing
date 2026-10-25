/** FOOD-010: PRIVATE, LOCAL, SYNTHETIC exception-review queue. Never authorizes a payment. */
import {createHash} from 'node:crypto';
import type {LocalTableDatabase} from './local-test-d1';

type ReviewState = 'OPEN' | 'ACKNOWLEDGED' | 'ESCALATED';
type ReviewRow = {event_id: string; session_id: string; source_sha256: string; state: ReviewState; reason: string; ack_key: string | null; escalation_key: string | null; revision: number};
type DatabaseResult<T> = {success: boolean; results: T[]};
const eventPattern = /^evt_[a-zA-Z0-9_-]{1,128}$/;
const actionPattern = /^[a-zA-Z][a-zA-Z0-9_-]{2,71}$/;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

async function query<T>(db: LocalTableDatabase, sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  const response = await db.prepare(sql).bind(...args).all() as DatabaseResult<T>;
  if (!response.success) throw new Error('LOCAL D1 query failed');
  return response.results;
}

export async function createLocalProviderExceptionQueue(db: LocalTableDatabase) {
  if (db.mode !== 'local-synthetic-only') throw new TypeError('Local synthetic D1 required');
  await query(db, `CREATE TABLE IF NOT EXISTS table_synthetic_payment_review_010 (
    event_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, source_sha256 TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('OPEN','ACKNOWLEDGED','ESCALATED')),
    reason TEXT NOT NULL CHECK(reason='PROVIDER_TIMING_UNVERIFIED'),
    ack_key TEXT UNIQUE, escalation_key TEXT UNIQUE,
    revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0)
  )`);
  async function load(eventId: string): Promise<ReviewRow | null> {
    return (await query<ReviewRow>(db, 'SELECT * FROM table_synthetic_payment_review_010 WHERE event_id=?', [eventId]))[0] ?? null;
  }
  function valid(eventId: string, key?: string) {
    if (!eventPattern.test(eventId)) throw new TypeError('Synthetic event reference required');
    if (key !== undefined && !actionPattern.test(key)) throw new TypeError('Safe synthetic action reference required');
  }
  function publicRow(row: ReviewRow) {
    return Object.freeze({eventHash: digest(row.event_id), sessionHash: digest(row.session_id), status: row.state,
      reason: row.reason, revision: row.revision, requiresManualReview: true as const, paymentAuthorized: false as const});
  }
  return Object.freeze({
    mode: 'LOCAL_SYNTHETIC_REVIEW_ONLY' as const,
    /** Materialize only already verified/quarantined evidence from the FOOD-009 ledger. */
    async sync() {
      await query(db, `INSERT INTO table_synthetic_payment_review_010
        (event_id,session_id,source_sha256,state,reason)
        SELECT e.event_id,e.session_id,e.body_sha256,'OPEN','PROVIDER_TIMING_UNVERIFIED'
        FROM table_synthetic_provider_events_009 e
        WHERE e.state='REVIEW_REQUIRED' AND e.outcome='PROVIDER_TIMING_UNVERIFIED'
        ON CONFLICT(event_id) DO NOTHING`);
      return this.summary();
    },
    async inspect(eventId: string) {
      valid(eventId);
      const row = await load(eventId);
      return row ? publicRow(row) : null;
    },
    async acknowledge(eventId: string, actionKey: string) {
      valid(eventId, actionKey);
      const row = await load(eventId);
      if (!row) throw new TypeError('Unknown quarantined synthetic event');
      if (row.state !== 'OPEN') {
        if (row.ack_key === actionKey) return publicRow(row);
        throw new TypeError('Acknowledgment state or idempotency collision');
      }
      await query(db, `UPDATE table_synthetic_payment_review_010
        SET state='ACKNOWLEDGED',ack_key=?,revision=revision+1
        WHERE event_id=? AND state='OPEN' AND ack_key IS NULL RETURNING revision`, [actionKey, eventId]);
      const saved = await load(eventId);
      if (!saved || saved.ack_key !== actionKey || !['ACKNOWLEDGED', 'ESCALATED'].includes(saved.state))
        throw new TypeError('Concurrent acknowledgment conflict; inspect and retry exact key');
      return publicRow(saved);
    },
    async escalate(eventId: string, actionKey: string) {
      valid(eventId, actionKey);
      const row = await load(eventId);
      if (!row) throw new TypeError('Unknown quarantined synthetic event');
      if (row.state === 'ESCALATED') {
        if (row.escalation_key === actionKey) return publicRow(row);
        throw new TypeError('Escalation idempotency collision');
      }
      if (row.state !== 'ACKNOWLEDGED') throw new TypeError('Acknowledge before escalation');
      await query(db, `UPDATE table_synthetic_payment_review_010
        SET state='ESCALATED',escalation_key=?,revision=revision+1
        WHERE event_id=? AND state='ACKNOWLEDGED' AND escalation_key IS NULL RETURNING revision`, [actionKey, eventId]);
      const saved = await load(eventId);
      if (!saved || saved.state !== 'ESCALATED' || saved.escalation_key !== actionKey)
        throw new TypeError('Concurrent escalation conflict; inspect and retry exact key');
      return publicRow(saved);
    },
    async summary() {
      const source = await query<{total: number}>(db,
        `SELECT COUNT(*) AS total FROM table_synthetic_provider_events_009
         WHERE state='REVIEW_REQUIRED' AND outcome='PROVIDER_TIMING_UNVERIFIED'`);
      const rows = await query<{state: ReviewState; total: number}>(db,
        `SELECT state,COUNT(*) AS total FROM table_synthetic_payment_review_010 GROUP BY state`);
      const count = (state: ReviewState) => rows.find(r => r.state === state)?.total ?? 0;
      const total = count('OPEN') + count('ACKNOWLEDGED') + count('ESCALATED');
      return Object.freeze({provenance: 'SYNTHETIC_LOCAL_D1', providerReviewEvents: source[0]?.total ?? 0,
        materializedCases: total, unsyncedCases: Math.max(0, (source[0]?.total ?? 0) - total),
        open: count('OPEN'), acknowledged: count('ACKNOWLEDGED'), escalated: count('ESCALATED'),
        paymentAuthorized: false as const, commercialAuthorized: false as const});
    },
    async cases(limit = 50) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new TypeError('Case-list limit 1 to 100');
      const rows = await query<ReviewRow>(db,
        'SELECT * FROM table_synthetic_payment_review_010 ORDER BY event_id LIMIT ?', [limit]);
      return Object.freeze(rows.map(publicRow));
    }
  });
}
