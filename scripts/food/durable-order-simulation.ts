/** Private local SQLite CLI. Only signed SYNTHETIC fixtures; never calls Stripe. */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LocalTestD1, type LocalTableDatabase } from './local-test-d1';
import { LocalTableOrderRepository } from '../../src/lib/food/table-local-order-repository';
import { authenticatedFixture, signedFixture, syntheticWebhook, SYNTHETIC_STRIPE_CONFIG } from './signed-payment-fixtures';
import { createTableCheckoutService } from '../../src/lib/food/table-checkout-service';
import { createOfflineStripeTestAdapter } from '../../src/lib/food/table-test-payment';
import { createTableLocalDiagnostics } from '../../src/lib/food/table-local-diagnostics';
import { syntheticAuthority, syntheticCosting, SYNTHETIC_NOW, SYNTHETIC_HANDOFF } from './order-simulation';

async function main() {
  const [command, flag, ...rest] = process.argv.slice(2);
  const integratedCommands = ['journey','new','quote','reserve','payment','accept','prepare','ready','fulfill-step','cancel','expire','crash-recovery','confirmation','diagnostics'];
  const explicitOrder = rest.length === 2 && rest[0] === '--order' ? rest[1] : undefined;
  if (![...integratedCommands,'order','fulfill','refund','operations','recover'].includes(command) || flag !== '--synthetic' || (rest.length && !explicitOrder)) throw new Error('Usage: node --import tsx scripts/food/durable-order-simulation.ts <command> --synthetic [--order synthetic-reference]');
  if (explicitOrder && !/^synthetic-[a-z0-9-]{1,45}$/.test(explicitOrder)) throw new Error('Bounded synthetic order reference required');
  const directory = resolve('.river-dev/state/food-commerce-003'); await mkdir(directory, {recursive: true});
  const db = new LocalTestD1(resolve(directory, 'synthetic-table-orders.sqlite'));
  try {
    if (integratedCommands.includes(command) || explicitOrder) {
      await integrated(command, explicitOrder ?? 'synthetic-integrated', db, resolve(directory, 'synthetic-table-orders.sqlite'));
      return;
    }
    const repo = await LocalTableOrderRepository.open(db, syntheticAuthority()), id = 'synthetic-order';
    const run = async (type: string, at = SYNTHETIC_NOW) => {
      const order = await repo.get(id);
      return repo.execute(id, `cli-${type}`, order.version, {type, ...(['ready','fulfill','request-refund'].includes(type) ? {evidenceReference: 'synthetic-cli-evidence'} : {})}, at);
    };
    if (['order','fulfill','refund'].includes(command)) {
      await repo.create('cli-create', id, [{productId: 'food-product:synthetic-bowl', version: 1, quantity: 2}], 'synthetic-window', 'synthetic-handoff', SYNTHETIC_NOW);
      await run('quote');
      const intent = await repo.checkout(id, 'cli-checkout', (await repo.get(id)).version, SYNTHETIC_NOW);
      await repo.reconcile(await authenticatedFixture(intent), SYNTHETIC_NOW);
      if (command === 'fulfill') {
        await run('prepare'); await run('ready'); await run('fulfill', SYNTHETIC_HANDOFF);
      }
      if (command === 'refund') {
        const status = (await repo.get(id)).status;
        if (status === 'fulfilled') await run('request-refund', SYNTHETIC_HANDOFF);
        else if (status !== 'refund-pending' && status !== 'refunded') await run('cancel', SYNTHETIC_HANDOFF);
        await repo.reconcile(await authenticatedFixture(intent, 'refund.updated', 'evt_synthetic_cli_refund'), SYNTHETIC_HANDOFF);
      }
    }
    if (command === 'recover') {
      await repo.cleanup('cli-cleanup', SYNTHETIC_HANDOFF);
      await repo.retryPending('cli-recovery', SYNTHETIC_HANDOFF);
    }
    console.log('LOCAL SYNTHETIC ONLY — no real order, payment, revenue or notification.');
    console.log(JSON.stringify({storage: '.river-dev/state/food-commerce-003/synthetic-table-orders.sqlite', snapshot: await repo.snapshot(), operations: await repo.operations(syntheticCosting())}, (_k, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  } finally {db.close();}
}
async function integrated(command: string, id: string, db: LocalTestD1, filename: string) {
  const repo = await LocalTableOrderRepository.open(db, syntheticAuthority(), createTableLocalDiagnostics());
  const paymentAdapter = () => createOfflineStripeTestAdapter(SYNTHETIC_STRIPE_CONFIG);
  const app = createTableCheckoutService(repo, paymentAdapter());
  const create = () => app.select({id, key: 'integrated-create', productId: 'food-product:synthetic-bowl', version: 1, quantity: 2, windowId: 'synthetic-window', locationReference: 'synthetic-handoff', now: SYNTHETIC_NOW, delivery: null});
  const quote = async () => app.quote(id, 'integrated-quote', (await repo.get(id)).version, SYNTHETIC_NOW);
  const reserve = async () => app.reserve(id, 'integrated-reserve', (await repo.get(id)).version, SYNTHETIC_NOW);
  const intent = async () => {const value = (await repo.snapshot()).checkouts.find(c => c.intent.orderId === id)?.intent; if (!value) throw new Error('Run reserve first'); return value;};
  const signed = async (type = 'checkout.session.completed') => signedFixture(syntheticWebhook(await intent(), type, `evt_integrated_${type}_${id}`));
  const pay = async (type?: string) => {const fixture = await signed(type); return app.receiveWebhook(fixture.rawBody, fixture.signature, type === 'refund.updated' ? SYNTHETIC_HANDOFF : SYNTHETIC_NOW);};
  const stage = async (type: 'prepare' | 'ready' | 'fulfill' | 'cancel' | 'request-refund') => app.progress(id, `integrated-${type}`, (await repo.get(id)).version, type, ['fulfill','request-refund'].includes(type) ? SYNTHETIC_HANDOFF : SYNTHETIC_NOW, ['ready','fulfill','request-refund'].includes(type) ? 'synthetic-cli-handling' : undefined);
  let recovery: unknown = null;
  switch (command) {
    case 'new': await create(); break;
    case 'quote': await quote(); break;
    case 'reserve': await reserve(); break;
    case 'payment': await pay(); break;
    case 'accept': if ((await repo.get(id)).status !== 'accepted') throw new Error('Acceptance requires the signed payment command; it commits atomically with capacity'); break;
    case 'prepare': await stage('prepare'); break;
    case 'ready': await stage('ready'); break;
    case 'fulfill-step': await stage('fulfill'); break;
    case 'cancel': await stage('cancel'); break;
    case 'expire': await pay('checkout.session.expired'); break;
    case 'order': await create(); await quote(); await reserve(); await pay(); break;
    case 'journey': case 'fulfill': await create(); await quote(); await reserve(); await pay(); await stage('prepare'); await stage('ready'); await stage('fulfill'); break;
    case 'refund': {
      const status = (await repo.get(id)).status;
      if (status === 'fulfilled') await stage('request-refund');
      else if (!['refund-pending','refunded','canceled'].includes(status)) await stage('cancel');
      await pay('refund.updated'); break;
    }
    case 'recover': recovery = await app.recover(`integrated-recovery-${id}`, SYNTHETIC_HANDOFF); break;
    case 'crash-recovery': {
      await create(); await quote(); await reserve();
      const fixture = await signed(); let interrupted = true;
      const separate = new LocalTestD1(filename);
      const bridge: LocalTableDatabase = {mode: 'local-synthetic-only', batch: s => separate.batch(s), prepare(sql) {
        const statement = separate.prepare(sql), wrapped = {bind: (...v: (string|number|null)[]) => {statement.bind(...v); return wrapped;}, all: async () => {
          const result = await statement.all(); if (sql.startsWith('UPDATE') && interrupted) {interrupted = false; throw new Error('SIMULATED_LOST_ACK');} return result;
        }}; return wrapped;
      }};
      try {
        const interruptedApp = createTableCheckoutService(await LocalTableOrderRepository.open(bridge, syntheticAuthority()), paymentAdapter());
        try {await interruptedApp.receiveWebhook(fixture.rawBody, fixture.signature, SYNTHETIC_NOW);} catch (error) {if ((error as Error).message !== 'SIMULATED_LOST_ACK') throw error;}
      } finally {separate.close();}
      const restarted = new LocalTestD1(filename);
      try {
        const recovered = createTableCheckoutService(await LocalTableOrderRepository.open(restarted, syntheticAuthority()), paymentAdapter());
        recovery = {label: interrupted ? 'Idempotent replay; prior durable receipt found, no new interruption injected' : 'SIMULATED acknowledgment loss; connection reopened, no process killed', outcome: await recovered.receiveWebhook(fixture.rawBody, fixture.signature, SYNTHETIC_NOW)};
      } finally {restarted.close();}
      break;
    }
    case 'operations': case 'confirmation': case 'diagnostics': break;
    default: throw new Error('Unknown integrated command');
  }
  const exists = (await repo.snapshot()).orders.some(o => o.id === id);
  console.log('PRIVATE INTEGRATED SYNTHETIC ONLY — no real purchase, payment, confirmation delivery or revenue.');
  console.log(JSON.stringify({confirmation: exists ? await app.confirmation(id) : null, recovery, diagnostics: await repo.diagnostics(),
    operations: await app.operations(syntheticCosting())}, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}
main().catch(error => {console.error((error as Error).message); process.exitCode = 1;});
