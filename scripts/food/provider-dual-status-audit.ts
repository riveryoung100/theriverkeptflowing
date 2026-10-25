/** FOOD-012: second-stage, LOCAL-ONLY synthetic Session+PaymentIntent review audit.
 * Requires existing quarantined event and an earlier FOOD-011 read-only audit.
 * Never closes a case, changes an order, or provides payment authorization.
 */
import {createHash} from 'node:crypto';
import type {LocalTableDatabase} from './local-test-d1';
import type {TestCheckout} from '../../src/lib/food/table-test-payment';
import {assessOfflineDualStatusPair,DUAL_STATUS_FIXTURE_MODE} from './provider-dual-status-contract.mjs';
import {canonicalUtc} from './provider-status-contract.mjs';
import {requireProviderObservation} from './stripe-testmode-real-readonly-core.mjs';
import {createLocalProviderSessionLedger} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';
import {modelFingerprint} from '../../src/lib/food/table-capacity-model';

const eventPattern=/^evt_[A-Za-z0-9_-]{1,128}$/;
const keyPattern=/^[A-Za-z][A-Za-z0-9_-]{2,71}$/;
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
type Source={event_id:string;session_id:string;order_id:string;intent_sha256:string;provider_expires_at:string;hold_expires_at:string;review_state:string;event_state:string;event_outcome:string;previous_checks:number};
type Row={check_key:string;event_id:string;session_id:string;checked_at:string;pair_hash:string;verdict:string;revision:number};
async function get<T>(db:LocalTableDatabase,sql:string,args:(string|number|null)[]=[]):Promise<T[]> {
  const r=await db.prepare(sql).bind(...args).all();
  if(!r.success) throw new TypeError('Synthetic local D1 failure');
  return r.results as T[];
}
const safe=(row:Row)=>Object.freeze({checkHash:sha(row.check_key),eventHash:sha(row.event_id),sessionHash:sha(row.session_id),
  checkedAt:row.checked_at,verdict:row.verdict,revision:Number(row.revision),reviewRequired:true as const,
  paymentAuthorized:false as const,orderAuthorized:false as const,realStripeRetrieved:false as const,
  environment:'LOCAL_OFFLINE_DUAL_STATUS' as const});
/** Local-only v2 migration of the existing audit, preserving legacy rowids/history. */
async function ensureAuditSchema(db:LocalTableDatabase) {
  const schema=(name:string)=>`CREATE TABLE IF NOT EXISTS ${name} (
    check_key TEXT PRIMARY KEY,event_id TEXT,session_id TEXT NOT NULL,checked_at TEXT NOT NULL,
    pair_hash TEXT NOT NULL,verdict TEXT NOT NULL CHECK(verdict IN
    ('SYNTHETIC_DUAL_PAID_MATCH_REVIEW','UNPAID_OR_UNSETTLED_REVIEW','PAIR_NOT_FOUND','DUAL_STATUS_CONFLICT','OBSERVATION_REVIEW_REQUIRED')),
    observation_json TEXT,correlation_json TEXT,created_at TEXT)`;
  await get(db,schema('table_synthetic_dual_status_audit_012'));
  const columns=await get<{name:string}>(db,'PRAGMA table_info(table_synthetic_dual_status_audit_012)');
  if(!columns.some(c=>c.name==='observation_json')) {
    const result=await db.batch([
      db.prepare(schema('table_provider_audit_local_v2')),
      db.prepare(`INSERT INTO table_provider_audit_local_v2(rowid,check_key,event_id,session_id,checked_at,pair_hash,verdict)
        SELECT rowid,check_key,event_id,session_id,checked_at,pair_hash,verdict FROM table_synthetic_dual_status_audit_012`),
      db.prepare('DROP TABLE table_synthetic_dual_status_audit_012'),
      db.prepare('ALTER TABLE table_provider_audit_local_v2 RENAME TO table_synthetic_dual_status_audit_012')]);
    if(result.some(r=>!r.success))throw new TypeError('Local audit migration failed');
  }
  await get(db,'CREATE UNIQUE INDEX IF NOT EXISTS table_provider_observation_identity ON table_synthetic_dual_status_audit_012(observation_json) WHERE observation_json IS NOT NULL');
}
export async function createLocalDualStatusAudit(db:LocalTableDatabase) {
  if(db?.mode!=='local-synthetic-only')throw new TypeError('Isolated local synthetic D1 only');
  await createLocalProviderSessionLedger(db);
  await createLocalProviderExceptionQueue(db);
  await ensureAuditSchema(db);
  const load=(key:string)=>get<Row>(db,'SELECT rowid AS revision,* FROM table_synthetic_dual_status_audit_012 WHERE check_key=?',[key]);
  const revision=async()=>Number((await get<{revision:number}>(db,'SELECT COALESCE(MAX(rowid),0) AS revision FROM table_synthetic_dual_status_audit_012'))[0]?.revision??0);
  return Object.freeze({
    mode:'LOCAL_OFFLINE_DUAL_STATUS' as const,
    async evaluate(eventId:string,checkKey:string,intent:TestCheckout,
      reader:{mode:string;networkEnabled:boolean;retrievePair(id:string):Promise<unknown>},checkedAt:string,expectedRevision?:number) {
      if(!eventPattern.test(eventId)||!keyPattern.test(checkKey))throw new TypeError('Safe synthetic event/check IDs required');
      canonicalUtc(checkedAt);
      if(expectedRevision!==undefined&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0))throw new TypeError('Valid audit revision required');
      const observedRevision=expectedRevision??await revision();
      if(reader?.mode!==DUAL_STATUS_FIXTURE_MODE||reader.networkEnabled!==false||typeof reader.retrievePair!=='function')
        throw new TypeError('Offline dual-status reader required; network prohibited');
      if(intent?.provenance!=='synthetic-stripe-test')throw new TypeError('Synthetic intent required');
      const sources=await get<Source>(db,`SELECT e.event_id,e.session_id,e.state AS event_state,
        e.outcome AS event_outcome,s.order_id,s.intent_sha256,s.provider_expires_at,s.hold_expires_at,
        r.state AS review_state,
        (SELECT COUNT(*) FROM table_synthetic_provider_status_audit_011 a
           WHERE a.event_id=e.event_id AND a.session_id=e.session_id) AS previous_checks
        FROM table_synthetic_provider_events_009 e
        JOIN table_synthetic_provider_sessions_009 s ON s.session_id=e.session_id
        JOIN table_synthetic_payment_review_010 r ON r.event_id=e.event_id
        WHERE e.event_id=?`,[eventId]);
      const source=sources[0];
      if(sources.length!==1||!source||source.event_state!=='REVIEW_REQUIRED'||
         source.event_outcome!=='PROVIDER_TIMING_UNVERIFIED'||
         !['OPEN','ACKNOWLEDGED','ESCALATED'].includes(source.review_state)||Number(source.previous_checks)<1)
        throw new TypeError('Existing quarantined event and prior provider audit required');
      if(source.session_id!==intent.sessionId||source.order_id!==intent.orderId||
         source.intent_sha256!==sha(JSON.stringify(intent))||source.hold_expires_at!==intent.expiresAt)
        throw new TypeError('Source session and synthetic intent do not match');
      const pair=await reader.retrievePair(source.session_id);
      const verdict=assessOfflineDualStatusPair(pair,intent,source.provider_expires_at);
      const hash=sha(JSON.stringify(pair));
      await get(db,`INSERT INTO table_synthetic_dual_status_audit_012
        (check_key,event_id,session_id,checked_at,pair_hash,verdict)
        SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(MAX(rowid),0) FROM table_synthetic_dual_status_audit_012)=?
        ON CONFLICT(check_key) DO NOTHING`,
      [checkKey,eventId,source.session_id,checkedAt,hash,verdict.kind,observedRevision]);
      const saved=(await load(checkKey))[0];
      if(!saved||saved.event_id!==eventId||saved.session_id!==source.session_id||
         saved.checked_at!==checkedAt||saved.pair_hash!==hash||saved.verdict!==verdict.kind)
        throw new TypeError('Dual status check identity conflict');
      return safe(saved);
    },
    revision,
    /** Append a sanitized capability-backed observation; never performs an order command. */
    async observe(checkKey:string,receipt:object,observedAt:string,expectedRevision:number,caseId:string|null=null) {
      if(!keyPattern.test(checkKey)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new TypeError('Audit identity/revision required');
      canonicalUtc(observedAt);
      const observation=requireProviderObservation(receipt);
      if(!/^cs_test_[A-Za-z0-9_-]{1,180}$/.test(observation.sessionId))throw new TypeError('Test observation identity required');
      const observationJson=JSON.stringify({...observation,observedAt});
      const prior=(await get<{pair_hash:string;observation_json:string;revision:number}>(db,
        'SELECT rowid AS revision,* FROM table_synthetic_dual_status_audit_012 WHERE check_key=?',[checkKey]))[0];
      // Exact retries return the historical association, even if the review later changes.
      const requestHash=sha(JSON.stringify({observationJson,caseId}));
      if(prior) {
        if(prior.pair_hash!==requestHash)throw new TypeError('Observation identity conflict');
        return this.observation(checkKey);
      }
      const correlation=await correlateObservation(db,observation,caseId);
      const correlationJson=JSON.stringify(correlation);
      // A requested review association is checked again inside the atomic INSERT.
      await get(db,`INSERT INTO table_synthetic_dual_status_audit_012
        (check_key,event_id,session_id,checked_at,pair_hash,verdict,observation_json,correlation_json,created_at)
        SELECT ?,?,?,?,?, 'OBSERVATION_REVIEW_REQUIRED',?,?,?
        WHERE (SELECT COALESCE(MAX(rowid),0) FROM table_synthetic_dual_status_audit_012)=?
          AND (? IS NULL OR EXISTS(SELECT 1 FROM table_synthetic_payment_review_010 WHERE event_id=? AND revision=?))
        ON CONFLICT(check_key) DO NOTHING`,
        [checkKey,correlation.caseId,observation.sessionId,observedAt,requestHash,observationJson,correlationJson,observedAt,
          expectedRevision,caseId,caseId,correlation.reviewRevision]);
      const saved=await get<{pair_hash:string}>(db,'SELECT pair_hash FROM table_synthetic_dual_status_audit_012 WHERE check_key=?',[checkKey]);
      if(saved[0]?.pair_hash!==requestHash)throw new TypeError('Observation revision or review conflict');
      return this.observation(checkKey);
    },
    async observation(checkKey:string) {
      if(!keyPattern.test(checkKey))throw new TypeError('Safe audit identity required');
      const row=(await get<{observation_json:string|null;correlation_json:string;revision:number;created_at:string}>(db,
        'SELECT rowid AS revision,* FROM table_synthetic_dual_status_audit_012 WHERE check_key=?',[checkKey]))[0];
      return row?.observation_json?Object.freeze({auditId:checkKey,revision:Number(row.revision),
        observation:JSON.parse(row.observation_json),correlation:JSON.parse(row.correlation_json),createdAt:row.created_at,
        storage:'LOCAL_TEST_DURABILITY',originProof:'HISTORICAL_ADAPTER_ASSERTION_NOT_CRYPTOGRAPHIC_PROOF',
        reviewRequired:true,paymentAuthorized:false,orderAuthorized:false}):null;
    },
    async observations(limit=50) {
      if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new TypeError('Audit limit 1..100');
      const rows=await get<{check_key:string}>(db,'SELECT check_key FROM table_synthetic_dual_status_audit_012 WHERE observation_json IS NOT NULL ORDER BY rowid DESC LIMIT ?',[limit]);
      return Promise.all(rows.map(r=>this.observation(r.check_key)));
    },
    async inspect(checkKey:string) {
      if(!keyPattern.test(checkKey))throw new TypeError('Safe synthetic check key required');
      const row=(await load(checkKey))[0];
      if(row?.verdict==='OBSERVATION_REVIEW_REQUIRED')throw new TypeError('Use observation() for canonical observation records');
      return row?safe(row):null;
    },
    async summary() {
      const rows=await get<{verdict:string;total:number}>(db,
        'SELECT verdict,COUNT(*) AS total FROM table_synthetic_dual_status_audit_012 GROUP BY verdict');
      const count=(verdict:string)=>Number(rows.find(r=>r.verdict===verdict)?.total??0);
      return Object.freeze({provenance:'LOCAL_OFFLINE_DUAL_STATUS',checks:rows.reduce((sum,r)=>sum+Number(r.total),0),
        matchedPaidReview:count('SYNTHETIC_DUAL_PAID_MATCH_REVIEW'),unpaidReview:count('UNPAID_OR_UNSETTLED_REVIEW'),
        missing:count('PAIR_NOT_FOUND'),conflicts:count('DUAL_STATUS_CONFLICT'),
        paymentAuthorized:false as const,orderAuthorized:false as const,realStripeRetrieved:false as const});
    }
  });
}

async function correlateObservation(db:LocalTableDatabase,o:ReturnType<typeof requireProviderObservation>,caseId:string|null) {
  const uncorrelated={kind:'UNCORRELATED_TEST_OBSERVATION',basis:'NO_AUTHORITATIVE_LOCAL_SESSION_BINDING',caseId:null as string|null,
    quoteId:null as string|null,reservationId:null as string|null,reviewRevision:null as number|null};
  if(caseId!==null&&!eventPattern.test(caseId))throw new TypeError('Review case identity required');
  const sources=await get<{event_id:string|null;session_id:string;order_id:string;intent_sha256:string;provider_expires_at:string;hold_expires_at:string;revision:number|null}>(db,
    `SELECT r.event_id,r.revision,s.* FROM table_synthetic_provider_sessions_009 s
     LEFT JOIN table_synthetic_payment_review_010 r ON s.session_id=r.session_id
     WHERE s.session_id=? AND (? IS NULL OR r.event_id=?)`,[o.sessionId,caseId,caseId]);
  if(!sources.length) {
    if(caseId!==null)throw new TypeError('Missing or mismatched review case');
    return uncorrelated;
  }
  if(sources.length!==1)return {...uncorrelated,basis:'AMBIGUOUS_REVIEW_CASE'};
  const source=sources[0];
  // The current authoritative ledger only registers synthetic Sessions. Real reads
  // must never borrow these bindings; a future real registry must supply its own authority.
  if(o.source!=='SYNTHETIC_FIXTURE'||!source.session_id.startsWith('cs_test_synthetic_'))return uncorrelated;
  const stores=await get<{payload_json:string}>(db,'SELECT payload_json FROM table_synthetic_order_store WHERE id=1');
  const store=stores[0]?JSON.parse(stores[0].payload_json):null;
  const checkout=store?.checkouts?.find((c:{intent:TestCheckout})=>c.intent.sessionId===o.sessionId)?.intent as TestCheckout|undefined;
  const order=store?.orders?.find((v:{id:string})=>v.id===source.order_id);
  const hold=store?.capacity?.holds?.find((v:{orderId:string})=>v.orderId===source.order_id);
  const reviewRevision=source.revision===null?null:Number(source.revision);
  const base={...uncorrelated,reviewRevision};
  if(!checkout||!order?.quote||!hold||hold.id!==order.holdId||hold.quoteId!==checkout.quoteId||
      order.quote.id!==checkout.quoteId||modelFingerprint(order.quote)!==checkout.quoteFingerprint||
      modelFingerprint(order.cart)!==checkout.productFingerprint||sha(JSON.stringify(checkout))!==source.intent_sha256)return {...base,basis:'MISSING_OR_STALE_ORIGINAL_RESERVATION'};
  const match=checkout.orderId===source.order_id&&hold.expiresAt===checkout.expiresAt&&o.clientReference===checkout.orderId&&
    o.paymentIntentId===checkout.paymentId&&o.returnedPaymentIntentId===checkout.paymentId&&
    o.amount===checkout.amount&&o.currency===checkout.currency&&o.intentCurrency===checkout.currency&&o.intentAmount===checkout.amount&&
    o.accountContext===checkout.account&&o.providerExpiresAt===source.provider_expires_at&&checkout.expiresAt===source.hold_expires_at&&
    ['orderId','quoteId','quoteFingerprint','productFingerprint'].every(k=>o.sessionMetadata[k]===checkout[k as keyof TestCheckout]&&o.intentMetadata[k]===checkout[k as keyof TestCheckout]);
  if(!match)return {...base,kind:'PROVIDER_STATE_CONFLICT',basis:'AUTHORITATIVE_IDENTITY_OR_QUOTE_MISMATCH'};
  const events=await get<{chronology_json:string|null}>(db,'SELECT chronology_json FROM table_synthetic_provider_events_009 WHERE event_id=?',[source.event_id]);
  return {kind:'CORRELATED_SYNTHETIC_REVIEW_ONLY',basis:'DURABLE_SESSION_QUOTE_RESERVATION_AND_ACCOUNT',
    caseId:source.event_id,quoteId:checkout.quoteId,reservationId:hold.id,reviewRevision,
    chronology:events[0]?.chronology_json?JSON.parse(events[0].chronology_json):null,
    timing:o.sessionStatus==='expired'&&o.paymentStatus==='unpaid'?'SESSION_EXPIRED_UNPAID':
      (o.paymentStatus==='paid')!==(o.intentStatus==='succeeded')||(o.paymentStatus==='paid'&&o.amountReceived!==o.amount)?'PROVIDER_STATE_CONFLICT':
      ['refund-pending','refunded'].includes(order.status)?'REFUND_REVIEW_REQUIRED':'TIMING_UNDETERMINED',
    fulfillmentCutoffs:order.quote.offers.map((v:{cutoffAt:string})=>v.cutoffAt),reservationState:hold.status};
}
