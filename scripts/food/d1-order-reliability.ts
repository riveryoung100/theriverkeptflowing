/** Disposable LOCAL D1 journey. No owner database, provider request or application endpoint. */
import { LocalMiniflareD1 } from './local-miniflare-d1';
import type { LocalTableDatabase } from './local-test-d1';
import { LocalTableOrderRepository } from '../../src/lib/food/table-local-order-repository';
import { createTableCheckoutService } from '../../src/lib/food/table-checkout-service';
import { createTableLocalDiagnostics } from '../../src/lib/food/table-local-diagnostics';
import { createOfflineStripeTestAdapter } from '../../src/lib/food/table-test-payment';
import { syntheticAuthority, syntheticCosting, SYNTHETIC_NOW as NOW, SYNTHETIC_HANDOFF as HANDOFF } from './order-simulation';
import { SYNTHETIC_STRIPE_CONFIG, signedFixture, realisticSyntheticWebhook } from './signed-payment-fixtures';

async function main() {
  const [scenario,flag,...rest]=process.argv.slice(2);
  if (!['journey','recovery','diagnostics'].includes(scenario)||flag!=='--synthetic'||rest.length) throw new Error('Usage: node --import tsx scripts/food/d1-order-reliability.ts journey|recovery|diagnostics --synthetic');
  const db=await LocalMiniflareD1.create(),diagnostics=createTableLocalDiagnostics(),authority=syntheticAuthority(),id='synthetic-d1-order';
  const payment=()=>createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  try {
    let repo=await LocalTableOrderRepository.open(db,authority,diagnostics),app=createTableCheckoutService(repo,payment());
    await app.select({id,key:'create',productId:'food-product:synthetic-bowl',version:1,quantity:2,windowId:'synthetic-window',locationReference:'synthetic-handoff',now:NOW,delivery:null});
    await app.quote(id,'quote',1,NOW);const intent=await app.reserve(id,'reserve',2,NOW);
    const fixture=await signedFixture(realisticSyntheticWebhook(intent));
    if (scenario==='diagnostics') {try {await app.receiveWebhook('{}','invalid-synthetic-signature',NOW);} catch { /* Deliberate rejected evidence. */ }}
    if (scenario==='recovery') {
      await db.prepare("CREATE TRIGGER interrupted BEFORE UPDATE ON table_synthetic_order_store BEGIN SELECT RAISE(ABORT,'synthetic interruption'); END").all();
      try {await app.receiveWebhook(fixture.rawBody,fixture.signature,NOW);throw new Error('Expected injected SQL failure');} catch(error) {if(!(error as Error).message.includes('synthetic interruption'))throw error;}
      await db.prepare('DROP TRIGGER interrupted').all();let lose=true;
      const wrapper:LocalTableDatabase={mode:'local-synthetic-only',batch:s=>db.batch(s),prepare(sql) {
        const statement=db.prepare(sql),wrapped={bind:(...values:(string|number|null)[])=>{statement.bind(...values);return wrapped;},all:async()=>{
          const result=await statement.all();if(sql.startsWith('UPDATE')&&lose){lose=false;throw new Error('SIMULATED_LOST_ACK');}return result;
        }};return wrapped;
      }};
      const interrupted=createTableCheckoutService(await LocalTableOrderRepository.open(wrapper,authority,diagnostics),payment());
      try {await interrupted.receiveWebhook(fixture.rawBody,fixture.signature,NOW);throw new Error('Expected lost acknowledgment');} catch(error) {if((error as Error).message!=='SIMULATED_LOST_ACK')throw error;}
      await db.restart();repo=await LocalTableOrderRepository.open(db,authority,diagnostics);app=createTableCheckoutService(repo,payment());
    }
    await app.receiveWebhook(fixture.rawBody,fixture.signature,NOW);
    await app.receiveWebhook(fixture.rawBody,fixture.signature,NOW);
    for(const stage of ['prepare','ready','fulfill'] as const) await app.progress(id,stage,(await repo.get(id)).version,stage,stage==='fulfill'?HANDOFF:NOW,stage==='prepare'?undefined:'synthetic-handling');
    console.log(JSON.stringify({provenance:'SYNTHETIC',environment:'LOCAL_TEST',runtime:db.runtime,scenario,
      offlineSignature:'PASS',offlineReconciliation:'PASS',actualStripeTestModeE2E:'UNVERIFIED',productionD1:'NOT ACCESSED',
      confirmation:await app.confirmation(id),operations:await app.operations(syntheticCosting()),diagnostics:await repo.diagnostics()},(_key,value)=>typeof value==='bigint'?value.toString():value,2));
  } finally {await db.close();}
}
main().catch(()=>{console.error('Local synthetic D1 validation failed; run the focused tests for the failing contract.');process.exitCode=1;});
