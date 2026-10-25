/** FOOD-009: LOCAL-OFFLINE synthetic provider Session registry; NEVER a live payment adapter. */
import {createHash} from 'node:crypto';
import type {LocalTableDatabase} from './local-test-d1';
import type {TestCheckout, TestPaymentEvidence} from '../../src/lib/food/table-test-payment';
import {requireTestPaymentEvidence} from '../../src/lib/food/table-test-payment';

type SessionRow = {session_id:string; order_id:string; intent_sha256:string; created_at:string; provider_expires_at:string; hold_expires_at:string};
type EventRow = {event_id:string; session_id:string; body_sha256:string; state:'PENDING'|'DELIVERED'|'REVIEW_REQUIRED'; outcome:string|null};
const minute = 60_000;
function utc(value:string):number {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) throw new TypeError('Canonical UTC timestamp required');
  const result=Date.parse(value);
  if (!Number.isFinite(result) || new Date(result).toISOString()!==value)throw new TypeError('Valid canonical UTC required');
  return result;
}
function sha256(value:string){return createHash('sha256').update(value).digest('hex');}
function isIntent(intent:TestCheckout){
  if (!intent || intent.provenance!=='synthetic-stripe-test' ||
      !/^synthetic-[a-zA-Z0-9_-]+$/.test(intent.orderId) ||
      !/^cs_test_synthetic_[a-zA-Z0-9_-]+$/.test(intent.sessionId) ||
      !/^pi_synthetic_[a-zA-Z0-9_-]+$/.test(intent.paymentId) ||
      intent.currency!=='usd' || !Number.isSafeInteger(intent.amount) || intent.amount<=0 ||
      intent.account!=='acct_synthetic_table')throw new TypeError('Explicit synthetic checkout required');
  utc(intent.expiresAt);
}
function intentDigest(intent:TestCheckout){return sha256(JSON.stringify(intent));}
async function select<T>(db:LocalTableDatabase,sql:string,values:(string|number|null)[]=[]):Promise<T[]> {
  const result=await db.prepare(sql).bind(...values).all();
  if (!result.success)throw new Error('LOCAL D1 statement failed');
  return result.results as T[];
}
export async function createLocalProviderSessionLedger(db:LocalTableDatabase) {
  if (db.mode!=='local-synthetic-only')throw new TypeError('LOCAL synthetic D1 only');
  await select(db,`CREATE TABLE IF NOT EXISTS table_synthetic_provider_sessions_009 (
     session_id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE,intent_sha256 TEXT NOT NULL,
     created_at TEXT NOT NULL, provider_expires_at TEXT NOT NULL,hold_expires_at TEXT NOT NULL)`);
  await select(db,`CREATE TABLE IF NOT EXISTS table_synthetic_provider_events_009 (
     event_id TEXT PRIMARY KEY,session_id TEXT NOT NULL,body_sha256 TEXT NOT NULL,
     state TEXT NOT NULL CHECK(state IN ('PENDING','DELIVERED','REVIEW_REQUIRED')),
     outcome TEXT)`);
  const columns=await select<{name:string}>(db,'PRAGMA table_info(table_synthetic_provider_events_009)');
  if(!columns.some(c=>c.name==='chronology_json'))await select(db,'ALTER TABLE table_synthetic_provider_events_009 ADD COLUMN chronology_json TEXT');
  async function session(id:string){return (await select<SessionRow>(db,'SELECT * FROM table_synthetic_provider_sessions_009 WHERE session_id=?',[id]))[0]??null;}
  async function receipt(id:string){return (await select<EventRow>(db,'SELECT * FROM table_synthetic_provider_events_009 WHERE event_id=?',[id]))[0]??null;}
  return Object.freeze({
    mode:'LOCAL_SYNTHETIC_ONLY' as const,
    async register(intent:TestCheckout,createdAt:string,providerExpiresAt:string,safetyMarginMinutes=5){
      isIntent(intent);
      const created=utc(createdAt),provider=utc(providerExpiresAt),held=utc(intent.expiresAt);
      if(!Number.isSafeInteger(safetyMarginMinutes)||safetyMarginMinutes<5)throw new TypeError('At least five minutes margin required');
      if(provider-created<30*minute||provider-created>24*60*minute)throw new TypeError('Stripe Checkout session expiry must be between 30 minutes and 24 hours');
      if(provider+safetyMarginMinutes*minute>held)throw new TypeError('Provider session violates required safety margin before local capacity hold expiration');
      const digest=intentDigest(intent);
      await select(db,`INSERT INTO table_synthetic_provider_sessions_009
        (session_id,order_id,intent_sha256,created_at,provider_expires_at,hold_expires_at)
        VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING`,[intent.sessionId,intent.orderId,digest,createdAt,providerExpiresAt,intent.expiresAt]);
      const found=await session(intent.sessionId);
      if(!found||found.order_id!==intent.orderId||found.intent_sha256!==digest||found.created_at!==createdAt||
         found.provider_expires_at!==providerExpiresAt||found.hold_expires_at!==intent.expiresAt)
        throw new TypeError('Session identity, price, product or expiry conflict');
      return Object.freeze({provenance:'SYNTHETIC',sessionId:found.session_id,providerExpiresAt:found.provider_expires_at,holdExpiresAt:found.hold_expires_at});
    },
    async inspectEvent(evidence:TestPaymentEvidence,rawBody:string,receivedAt:string){
      requireTestPaymentEvidence(evidence,rawBody);
      if(evidence.provenance!=='synthetic-stripe-test'||typeof rawBody!=='string'||rawBody.length===0)
        throw new TypeError('Signed synthetic evidence required');
      isIntent(evidence.checkout);
      if(!/^evt_[a-zA-Z0-9_-]+$/.test(evidence.eventId))throw new TypeError('Synthetic event ID required');
      const arrival=utc(receivedAt),found=await session(evidence.checkout.sessionId);
      if(!found||found.order_id!==evidence.checkout.orderId||found.intent_sha256!==intentDigest(evidence.checkout))
        throw new TypeError('Unknown or mismatched durable synthetic provider Session');
      const digest=sha256(rawBody);let prior=await receipt(evidence.eventId);
      if(prior&&(prior.session_id!==found.session_id||prior.body_sha256!==digest))throw new TypeError('Webhook event replay conflict');
      if(!prior){
        const event=JSON.parse(rawBody);
        const eventCreatedAt=Number.isSafeInteger(event.created)&&event.created>=0&&event.created<253402300800?new Date(event.created*1000).toISOString():null;
        const chronology=JSON.stringify({source:'SIGNED_SYNTHETIC_EVENT',providerSessionCreatedAt:found.created_at,
          providerSessionExpiresAt:found.provider_expires_at,paymentIntentCreatedAt:null,paymentTransitionAt:null,
          webhookEventCreatedAt:eventCreatedAt,webhookArrivedAt:receivedAt,reservationExpiresAt:found.hold_expires_at,
          timing:evidence.kind==='expired'?'SESSION_EXPIRED_UNPAID':evidence.kind.startsWith('refund')?'REFUND_REVIEW_REQUIRED':'TIMING_UNDETERMINED',
          reason:'Event creation, delivery and object creation are not payment transition evidence'});
        const review=evidence.kind==='success'&&arrival>=utc(found.provider_expires_at);
        const state=review?'REVIEW_REQUIRED':'PENDING';
        const outcome=review?'PROVIDER_TIMING_UNVERIFIED':null;
        await select(db,`INSERT INTO table_synthetic_provider_events_009
          (event_id,session_id,body_sha256,state,outcome,chronology_json) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING`,
          [evidence.eventId,found.session_id,digest,state,outcome,chronology]);
        prior=await receipt(evidence.eventId);
        if(!prior||prior.session_id!==found.session_id||prior.body_sha256!==digest)throw new TypeError('Webhook concurrent identity conflict');
      }
      return Object.freeze({state:prior.state,outcome:prior.outcome,eventId:evidence.eventId});
    },
    async chronology(eventId:string) {
      if(!/^evt_[A-Za-z0-9_-]{1,128}$/.test(eventId))throw new TypeError('Event identity required');
      const row=(await select<{chronology_json:string|null}>(db,'SELECT chronology_json FROM table_synthetic_provider_events_009 WHERE event_id=?',[eventId]))[0];
      return row?.chronology_json?JSON.parse(row.chronology_json):null;
    },
    async markDelivered(eventId:string,outcome:string){
      if(!/^evt_[a-zA-Z0-9_-]+$/.test(eventId)||typeof outcome!=='string'||!/^[a-z][a-z-]{0,62}$/.test(outcome))throw new TypeError('Invalid synthetic event/outcome');
      await select(db,`UPDATE table_synthetic_provider_events_009 SET state='DELIVERED',outcome=? WHERE event_id=? AND state='PENDING'`,[outcome,eventId]);
      const current=await receipt(eventId);
      if(!current||current.state!=='DELIVERED'||current.outcome!==outcome)throw new TypeError('Event state collision or review required');
      return outcome;
    },
    async summary(){
      const rows=await select<{state:string;total:number}>(db,'SELECT state,COUNT(*) AS total FROM table_synthetic_provider_events_009 GROUP BY state');
      const count=(kind:string)=>rows.find(r=>r.state===kind)?.total??0;
      return Object.freeze({provenance:'SYNTHETIC_LOCAL_D1',pending:count('PENDING'),delivered:count('DELIVERED'),manualReview:count('REVIEW_REQUIRED'),livePaymentVerified:false});
    }
  });
}

/** A private-only fail-closed bridge. No public route imports it; no Stripe network calls. */
export function createLocalProviderEventBoundary(
  ledger:Awaited<ReturnType<typeof createLocalProviderSessionLedger>>,
  verifier:{verify:(raw:string,signature:string)=>Promise<TestPaymentEvidence>},
  app:{receiveWebhook:(raw:string,signature:string,receivedAt:string)=>Promise<string>},
  options?:{afterForward?:()=>void}
){
  return Object.freeze({
    async receive(rawBody:string,signature:string,receivedAt:string){
      // Verify before writing any inbox record.
      const evidence=await verifier.verify(rawBody,signature);
      const registered=await ledger.inspectEvent(evidence,rawBody,receivedAt);
      if(registered.state==='REVIEW_REQUIRED')return 'manual-review-required';
      if(registered.state==='DELIVERED')return registered.outcome;
      const outcome=await app.receiveWebhook(rawBody,signature,receivedAt);
      options?.afterForward?.(); // deterministic lost-acknowledgment fixture only
      await ledger.markDelivered(evidence.eventId,outcome);
      return outcome;
    }
  });
}
