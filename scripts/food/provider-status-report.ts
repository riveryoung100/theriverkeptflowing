/** PRIVATE local workerd D1, offline provider-status report. Never contacts Stripe. */
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW as NOW} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';
import {createLocalProviderStatusAudit} from './provider-status-audit';
import {createOfflineProviderStatusReader,makeSyntheticProviderSession} from './provider-status-contract.mjs';
const at=(mins:number)=>new Date(Date.parse(NOW)+mins*60_000).toISOString();
const db=await LocalMiniflareD1.create();
try {
  const id='synthetic-011-report',eventId='evt_011_report';
  const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),NOW));
  const adapter=createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  const app=createTableCheckoutService(repo,adapter);
  await app.select({id,key:'new',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
  await app.quote(id,'quote',1,NOW);
  const intent=await app.reserve(id,'reserve',2,NOW);
  const ledger=await createLocalProviderSessionLedger(db);
  await ledger.register(intent,NOW,at(30));
  const signed=await signedFixture(realisticSyntheticWebhook(intent,'checkout.session.completed',eventId));
  const webhookOutcome=await createLocalProviderEventBoundary(ledger,adapter,app).receive(signed.rawBody,signed.signature,at(31));
  const queue=await createLocalProviderExceptionQueue(db);await queue.sync();
  const audit=await createLocalProviderStatusAudit(db);
  const reader=createOfflineProviderStatusReader({[intent.sessionId]:makeSyntheticProviderSession(intent,at(30))});
  const assessment=await audit.evaluate(eventId,'check_011_report',intent,reader,at(32));
  const summary=await audit.summary();
  const orderStatus=(await repo.get(id)).status;
  if(webhookOutcome!=='manual-review-required'||assessment.verdict!=='SYNTHETIC_PAID_MATCH_REVIEW'||
     orderStatus!=='awaiting-payment'||(await queue.summary()).open!==1||summary.paymentAuthorized)
    throw new Error('Provider status assessment failed to remain review-only');
  console.log('FOOD-COMMERCE-011 — PRIVATE OFFLINE STATUS AUDIT');
  console.log(JSON.stringify({provenance:'SYNTHETIC_LOCAL_WORKERD_D1',webhookOutcome,
    statusCheck:assessment,summary,orderStatus,realProviderStatusRetrieved:false,
    customerCheckoutEnabled:false,productionD1Used:false},null,2));
  console.log('FINAL PASS — OFFLINE STATUS ASSESSMENT ONLY');
} finally {await db.close();}
