/** Shared integration fixture over the existing engine, repository and audit. */
import {LocalMiniflareD1} from './local-miniflare-d1';
import {LocalTableOrderRepository} from '../../src/lib/food/table-local-order-repository';
import {createTableCheckoutService} from '../../src/lib/food/table-checkout-service';
import {createOfflineStripeTestAdapter} from '../../src/lib/food/table-test-payment';
import {syntheticAuthority,SYNTHETIC_NOW as NOW} from './order-simulation';
import {syntheticLongHoldAuthority} from './long-hold-fixture';
import {SYNTHETIC_STRIPE_CONFIG,signedFixture,realisticSyntheticWebhook} from './signed-payment-fixtures';
import {createLocalProviderSessionLedger,createLocalProviderEventBoundary} from './provider-session-ledger';
import {createLocalProviderExceptionQueue} from './provider-exception-queue';
import {createLocalDualStatusAudit} from './provider-dual-status-audit';
import {makeOfflineDualStatusPair,createOfflineDualStatusReader} from './provider-dual-status-contract.mjs';
import {observeSyntheticProviderPair} from './stripe-testmode-real-readonly-core.mjs';
export {NOW};
export const at=(minutes:number)=>new Date(Date.parse(NOW)+minutes*60000).toISOString();
export async function commerceFixture(id='synthetic-completion',capacity=2) {
 const db=await LocalMiniflareD1.create();
 try {
 const repo=await LocalTableOrderRepository.open(db,syntheticLongHoldAuthority(syntheticAuthority(),NOW,capacity));
 const adapter=createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG),app=createTableCheckoutService(repo,adapter);
 await app.select({id,key:'select',productId:'food-product:synthetic-bowl',version:1,quantity:1,
   windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
 await app.quote(id,'quote',1,NOW);const intent=await app.reserve(id,'reserve',2,NOW);
 const ledger=await createLocalProviderSessionLedger(db);await ledger.register(intent,NOW,at(30));
 const queue=await createLocalProviderExceptionQueue(db),audit=await createLocalDualStatusAudit(db);
 const boundary=createLocalProviderEventBoundary(ledger,adapter,app);
 const signed=(type='checkout.session.completed',event='evt_completion',patch:Record<string,unknown>={})=>signedFixture(realisticSyntheticWebhook(intent,type,event,patch));
 const receive=async(type:string,event:string,minutes:number,patch:Record<string,unknown>={})=>{
  const f=await signed(type,event,patch);return boundary.receive(f.rawBody,f.signature,at(minutes));};
 const observation=(overrides:Record<string,unknown>={})=>observeSyntheticProviderPair(intent,
  createOfflineDualStatusReader({[intent.sessionId]:makeOfflineDualStatusPair(intent,at(30),overrides)}));
 return {db,repo,adapter,app,intent,ledger,queue,audit,boundary,signed,receive,observation,id};
 }catch(error){await db.close();throw error;}
}
