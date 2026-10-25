/** FOOD-011 private synthetic D1 audit for OFFLINE Checkout Session status snapshots.
 * Does not retrieve provider data, authorize payments, modify orders, or resolve reviews.
 */
import type {LocalTableDatabase} from './local-test-d1';
import type {TestCheckout} from '../../src/lib/food/table-test-payment';
import {assessOfflineProviderStatus,canonicalUtc,sha256} from './provider-status-contract.mjs';

type SourceRow={event_id:string; session_id:string; review_state:string; event_state:string; outcome:string;
  order_id:string; intent_sha256:string; provider_expires_at:string; hold_expires_at:string};
type AuditRow={check_key:string; event_id:string; session_id:string; checked_at:string; snapshot_sha256:string; verdict:string};
const eventPattern=/^evt_[a-zA-Z0-9_-]{1,128}$/;
const actionPattern=/^[a-zA-Z][a-zA-Z0-9_-]{2,71}$/;
async function rows<T>(db:LocalTableDatabase,sql:string,params:(string|number|null)[]=[]):Promise<T[]> {
  const result=await db.prepare(sql).bind(...params).all();
  if(!result.success)throw new TypeError('LOCAL synthetic D1 query failed');
  return result.results as T[];
}
function publicRecord(row:AuditRow) {
  return Object.freeze({eventHash:sha256(row.event_id),sessionHash:sha256(row.session_id),
    checkHash:sha256(row.check_key),checkedAt:row.checked_at,verdict:row.verdict,
    reviewRequired:true as const,paymentAuthorized:false as const,realStripeStatusRetrieved:false as const,
    environment:'LOCAL_OFFLINE_SYNTHETIC' as const});
}
export async function createLocalProviderStatusAudit(db:LocalTableDatabase) {
  if(db.mode!=='local-synthetic-only')throw new TypeError('Isolated LOCAL synthetic database required');
  await rows(db,`CREATE TABLE IF NOT EXISTS table_synthetic_provider_status_audit_011 (
    check_key TEXT PRIMARY KEY, event_id TEXT NOT NULL, session_id TEXT NOT NULL,
    checked_at TEXT NOT NULL, snapshot_sha256 TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK(verdict IN
      ('SYNTHETIC_PAID_MATCH_REVIEW','NO_OFFLINE_SNAPSHOT','NOT_PAID_OR_UNSETTLED','SNAPSHOT_CONFLICT'))
  )`);
  const read=(key:string)=>rows<AuditRow>(db,`SELECT * FROM table_synthetic_provider_status_audit_011 WHERE check_key=?`,[key]);
  return Object.freeze({
    mode:'LOCAL_OFFLINE_SYNTHETIC' as const,
    async evaluate(eventId:string,checkKey:string,intent:TestCheckout,reader:{mode:string;networkEnabled:boolean;read(id:string):Promise<unknown>},checkedAt:string) {
      if(!eventPattern.test(eventId)||!actionPattern.test(checkKey))throw new TypeError('Valid synthetic event and check identifiers required');
      canonicalUtc(checkedAt);
      if(reader?.mode!=='OFFLINE_FIXTURE'||reader.networkEnabled!==false||typeof reader.read!=='function')throw new TypeError('OFFLINE_FIXTURE reader only; network prohibited');
      if(intent?.provenance!=='synthetic-stripe-test')throw new TypeError('Synthetic checkout required');
      const source=await rows<SourceRow>(db,`SELECT r.event_id,r.state AS review_state,
        e.session_id,e.state AS event_state,e.outcome,s.order_id,s.intent_sha256,
        s.provider_expires_at,s.hold_expires_at
        FROM table_synthetic_payment_review_010 r
        JOIN table_synthetic_provider_events_009 e ON e.event_id=r.event_id
        JOIN table_synthetic_provider_sessions_009 s ON s.session_id=e.session_id
        WHERE r.event_id=?`,[eventId]);
      const item=source[0];
      if(source.length!==1||!item||!['OPEN','ACKNOWLEDGED','ESCALATED'].includes(item.review_state)||
         item.event_state!=='REVIEW_REQUIRED'||item.outcome!=='PROVIDER_TIMING_UNVERIFIED')
        throw new TypeError('Only existing quarantined synthetic provider events may be assessed');
      if(item.session_id!==intent.sessionId||item.order_id!==intent.orderId||
         item.intent_sha256!==sha256(JSON.stringify(intent))||item.hold_expires_at!==intent.expiresAt)
        throw new TypeError('Existing durable Session and synthetic checkout do not match');
      const snapshot=await reader.read(item.session_id);
      const assessment=assessOfflineProviderStatus(snapshot,intent,item.provider_expires_at);
      const fingerprint=sha256(JSON.stringify(snapshot));
      await rows(db,`INSERT INTO table_synthetic_provider_status_audit_011
        (check_key,event_id,session_id,checked_at,snapshot_sha256,verdict)
        VALUES (?,?,?,?,?,?) ON CONFLICT(check_key) DO NOTHING`,
        [checkKey,eventId,item.session_id,checkedAt,fingerprint,assessment.kind]);
      const saved=(await read(checkKey))[0];
      if(!saved||saved.event_id!==eventId||saved.session_id!==item.session_id||saved.checked_at!==checkedAt||
         saved.snapshot_sha256!==fingerprint||saved.verdict!==assessment.kind)
        throw new TypeError('Synthetic check key conflict; never overwrite an existing audit');
      return publicRecord(saved);
    },
    async inspect(checkKey:string) {
      if(!actionPattern.test(checkKey))throw new TypeError('Synthetic check key required');
      const saved=(await read(checkKey))[0];return saved?publicRecord(saved):null;
    },
    async summary() {
      const results=await rows<{verdict:string;total:number}>(db,`SELECT verdict, COUNT(*) AS total FROM table_synthetic_provider_status_audit_011 GROUP BY verdict`);
      const count=(s:string)=>results.find(x=>x.verdict===s)?.total??0;
      return Object.freeze({provenance:'LOCAL_OFFLINE_SYNTHETIC',checks:results.reduce((sum,v)=>sum+v.total,0),
        syntheticPaidMatches:count('SYNTHETIC_PAID_MATCH_REVIEW'),
        noSnapshot:count('NO_OFFLINE_SNAPSHOT'),notPaid:count('NOT_PAID_OR_UNSETTLED'),
        conflicts:count('SNAPSHOT_CONFLICT'),reviewRequired:true as const,
        paymentAuthorized:false as const,realStripeStatusRetrieved:false as const});
    }
  });
}
