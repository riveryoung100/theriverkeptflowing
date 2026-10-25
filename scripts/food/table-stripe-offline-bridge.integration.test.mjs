/** Uses the existing repo's actual private checkout service. Never contacts Stripe. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalTestD1} from './local-test-d1.ts';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository.ts';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service.ts';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment.ts';
import {SYNTHETIC_STRIPE_CONFIG, realisticSyntheticWebhook, signedFixture} from './signed-payment-fixtures.ts';
import {syntheticAuthority, SYNTHETIC_NOW as NOW} from './order-simulation.ts';
import {assessOfflineStripeExpiry, prepareOfflineStripeCheckout, mockOfflineStripeSession} from './table-stripe-offline-bridge.mjs';

async function setup(id) {
  const db = new LocalTestD1(':memory:');
  const repo = await LocalTableOrderRepository.open(db,syntheticAuthority());
  const service = createTableCheckoutService(repo,createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG));
  await service.select({id,key:'create',productId:'food-product:synthetic-bowl',version:1,quantity:1,
    windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
  await service.quote(id,'quote',1,NOW);
  const intent = await service.reserve(id,'reserve',2,NOW);
  return {db,repo,service,intent};
}

test('existing local held checkout is assessed without extending capacity expiration',async t=>{
  const s=await setup('synthetic-bridge-local-1'); t.after(()=>s.db.close());
  const computed=assessOfflineStripeExpiry(s.intent,NOW);
  assert.equal(computed.actualStripeTestModeE2E,false);
  assert.equal(computed.durationSeconds,Math.floor((Date.parse(s.intent.expiresAt)-Date.parse(NOW))/1000));
  const prepared=prepareOfflineStripeCheckout(s.intent,{mode:'offline-synthetic-only',createdAt:NOW,
    successUrl:'http://127.0.0.1:4335/the-table/', cancelUrl:'http://127.0.0.1:4335/the-table/'});
  assert.equal(prepared.status,computed.status);
  if(prepared.status==='BLOCKED') {
    assert.equal(prepared.params,null);
    assert.throws(()=>mockOfflineStripeSession(prepared));
  }else {
    assert.equal(mockOfflineStripeSession(prepared).payment_status,'unpaid');
  }
  assert.equal((await s.repo.get(s.intent.orderId)).status,'awaiting-payment');
});

test('actual existing signed fixture reconciliation is offline and retry safe',async t=>{
  const s=await setup('synthetic-bridge-local-2');t.after(()=>s.db.close());
  const signed=await signedFixture(realisticSyntheticWebhook(s.intent,'checkout.session.completed','evt_bridge_local_2'));
  assert.equal(await s.service.receiveWebhook(signed.rawBody,signed.signature,NOW),'accepted');
  assert.equal(await s.service.receiveWebhook(signed.rawBody,signed.signature,NOW),'accepted');
  const confirmation=await s.service.confirmation(s.intent.orderId);
  assert.equal(confirmation.realOrder,false); assert.equal(confirmation.realPaymentVerified,false);
  assert.equal((await s.repo.snapshot()).orders.length,1);
});

test('existing production commerce API routes do not import private bridge',async()=>{
  for(const path of ['../../src/pages/api/commerce/create-checkout.ts','../../src/pages/api/commerce/stripe-webhook.ts']) {
    const content=await readFile(new URL(path,import.meta.url),'utf8');
    assert.doesNotMatch(content,/table-stripe-offline-bridge|offline-checkout-readiness/);
  }
});
