/** Private synthetic-only executable. No Stripe or production database operations. */
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {SYNTHETIC_STRIPE_CONFIG} from './signed-payment-fixtures';
import {syntheticAuthority,SYNTHETIC_NOW} from './order-simulation';
import {syntheticLongHoldAuthority,evaluateActualSyntheticHold} from './long-hold-fixture';

const db=await LocalMiniflareD1.create();
try {
  const now=SYNTHETIC_NOW;
  const authority=syntheticLongHoldAuthority(syntheticAuthority(),now);
  const repo=await LocalTableOrderRepository.open(db,authority);
  const app=createTableCheckoutService(repo,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  const id='synthetic-008-report';
  await app.select({id,key:'create-008-report',productId:'food-product:synthetic-bowl',version:1,quantity:1,windowId:'synthetic-window',locationReference:'synthetic-handoff',now,delivery:null});
  const quoted=await app.quote(id,'quote-008-report',1,now);
  if(!quoted.quote)throw new Error('Synthetic quote unavailable');
  const intent=await app.reserve(id,'hold-008-report',2,now);
  const result=evaluateActualSyntheticHold(intent,quoted.quote.expiresAt,now,authority.windows[0].startsAt,6,1);
  const report={
    provenance:'SYNTHETIC_LOCAL_WORKERD_D1',
    policyStatus:result.status,
    blockers:result.blockers,
    providerSessionProposedExpiresAt:result.providerExpiresAt,
    heldCapacityExpiresAt:result.existingLocalIntentExpiresAt,
    providerSessionExpiryPersisted:false,
    remainingIntegrationGate:result.remainingIntegrationGate,
    actualStripeNetworkRequests:0,realCheckoutEnabled:false,productionD1Used:false,
    actualStripeTestE2E:'UNVERIFIED'
  };
  console.log('FOOD-COMMERCE-008 — SYNTHETIC DURABLE HOLD REPORT');
  console.log(JSON.stringify(report,null,2));
  if(result.status!=='OFFLINE_POLICY_COMPATIBLE')throw new Error('Synthetic 40m hold does not support proposed 30m provider expiry');
  console.log('FINAL PASS — OFFLINE POLICY + LOCAL DURABLE HOLD ONLY');
}finally{await db.close();}
