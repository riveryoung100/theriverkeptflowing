/** LOCAL-ONLY, PRIVATE synthetic webhook exception report; never uses Stripe network. */
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW as NOW} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';
const at=(mins:number)=>new Date(Date.parse(NOW)+mins*60_000).toISOString();
const db=await LocalMiniflareD1.create();
try {
  const id='synthetic-010-report',adapter=createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),NOW));
  const app=createTableCheckoutService(repo,adapter);
  await app.select({id,key:'new',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
  await app.quote(id,'quote',1,NOW);
  const intent=await app.reserve(id,'reserve',2,NOW);
  const ledger=await createLocalProviderSessionLedger(db);
  await ledger.register(intent,NOW,at(30));
  const signed=await signedFixture(realisticSyntheticWebhook(intent,'checkout.session.completed','evt_010_report'));
  const outcome=await createLocalProviderEventBoundary(ledger,adapter,app).receive(signed.rawBody,signed.signature,at(31));
  const review=await createLocalProviderExceptionQueue(db);
  await review.sync();
  await review.acknowledge('evt_010_report','ack_010_report');
  const state=await review.summary();
  console.log('FOOD-COMMERCE-010 — PRIVATE EXCEPTION QUEUE REPORT');
  console.log(JSON.stringify({provenance:'SYNTHETIC_LOCAL_WORKERD_D1',webhookOutcome:outcome,
    review:state,orderStatus:(await repo.get(id)).status,
    privateReviewIsPaymentAuthorization:false, realStripeTestE2E:'UNVERIFIED',
    customerCheckoutEnabled:false, productionD1Used:false},null,2));
  if(outcome!=='manual-review-required'||state.acknowledged!==1||state.paymentAuthorized|| (await repo.get(id)).status!=='awaiting-payment'){
    throw new Error('FOOD-010 review report did not remain fail-closed');
  }
  console.log('FINAL PASS — LOCAL OFFLINE REVIEW ONLY');
}finally{await db.close();}
