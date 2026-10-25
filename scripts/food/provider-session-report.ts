/** PRIVATE synthetic report: register independent 30m provider deadline with 40m held capacity. */
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
const db=await LocalMiniflareD1.create();
try {
  const now=SYNTHETIC_NOW,later=(n:number)=>new Date(Date.parse(now)+n*60000).toISOString();
  const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),now));
  const adapter=createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  const app=createTableCheckoutService(repo,adapter),id='synthetic-009-report';
  await app.select({id,key:'create',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now,delivery:null});
  await app.quote(id,'quote',1,now);
  const intent=await app.reserve(id,'reserve',2,now);
  const ledger=await createLocalProviderSessionLedger(db);
  const saved=await ledger.register(intent,now,later(30));
  const message=await signedFixture(realisticSyntheticWebhook(intent,'checkout.session.completed','evt_009_report'));
  const outcome=await createLocalProviderEventBoundary(ledger,adapter,app).receive(message.rawBody,message.signature,later(31));
  const report={provenance:'SYNTHETIC_LOCAL_WORKERD_D1',providerExpiresAt:saved.providerExpiresAt,
    localCapacityHoldExpiresAt:saved.holdExpiresAt,afterProviderExpiry:outcome,
    orderStatus:(await repo.get(id)).status,events:await ledger.summary(),
    publicCheckoutEnabled:false,actualStripeTestModeE2E:'UNVERIFIED',productionD1Used:false};
  console.log('FOOD-COMMERCE-009 — PRIVATE PROVIDER EXPIRY REPORT');
  console.log(JSON.stringify(report,null,2));
  if(outcome!=='manual-review-required'||report.orderStatus==='accepted')throw Error('Unsafe provider expiration handling');
  console.log('FINAL PASS — LOCAL SYNTHETIC PROVIDER EXPIRATION LEDGER ONLY');
}finally{await db.close();}
