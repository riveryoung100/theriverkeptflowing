/** Disposable workerd/D1 binding, never Wrangler config or a remote connection. */
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { mkdtemp, readFile, rm, realpath, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import type { FoodD1Result, FoodD1Statement } from '../../src/lib/food/d1-draft-persistence';
import type { LocalTableDatabase } from './local-test-d1';

type Query = {sql: string; values: (string | number | null)[]};
export class LocalMiniflareD1 implements LocalTableDatabase {
  readonly mode = 'local-synthetic-only' as const;
  readonly runtime = 'local-miniflare-workerd-d1' as const;
  private mf!: Miniflare;
  private binding!: Awaited<ReturnType<Miniflare['getD1Database']>>;
  private readonly statements = new WeakMap<FoodD1Statement, Query>();
  private constructor(private readonly directory: string,private readonly retain=false) {}
  /** Dedicated private audit namespace only; never a Wrangler/live database. */
  static async openPrivateAudit() {
    return this.openRetained('food-provider-audit-016');
  }
  static async openPrivateOperations() {
    return this.openRetained('food-operations-019');
  }
  private static async openRetained(namespace:'food-provider-audit-016'|'food-operations-019') {
    const state=join(process.cwd(),'.river-dev','state');await mkdir(state,{recursive:true});
    const directory=join(state,namespace);await mkdir(directory,{recursive:true});
    if((await realpath(directory)).toLowerCase()!==join(await realpath(state),namespace).toLowerCase())throw new TypeError('Unexpected private storage path');
    const harness=new LocalMiniflareD1(directory,true);
    try {await harness.start();return harness;}catch(error){await harness.close();throw error;}
  }
  static async create() {
    const harness = new LocalMiniflareD1(await mkdtemp(join(tmpdir(), 'table-commerce-005-')));
    try {await harness.start(); return harness;} catch (error) {await harness.close(); throw error;}
  }
  private async start() {
    this.mf = new Miniflare(convertV4MiniflareOptions({
      modules: true, compatibilityDate: '2026-07-24', cf: false, host: '127.0.0.1', port: 0,
      resourcePersistencePath: this.directory, d1Databases: {TABLE_SYNTHETIC: 'food-commerce-005-isolated-only'},
      outboundService: () => new Response('Outbound network disabled', {status: 403}),
      script: 'export default { fetch() { return new Response("No application endpoint", {status:404}); } }'
    }));
    this.binding = await this.mf.getD1Database('TABLE_SYNTHETIC');
    const schema = await readFile(new URL('./local-order-schema.sql', import.meta.url), 'utf8');
    await this.binding.prepare(schema).all();
  }
  prepare(sql: string): FoodD1Statement {
    const query: Query = {sql, values: []};
    const statement: FoodD1Statement = {bind: (...values) => {query.values = values; return statement;},
      all: async () => await this.binding.prepare(query.sql).bind(...query.values).all() as FoodD1Result};
    this.statements.set(statement, query); return statement;
  }
  async batch(statements: FoodD1Statement[]): Promise<readonly FoodD1Result[]> {
    const native = statements.map(s => {const q = this.statements.get(s); if (!q) throw new TypeError('Foreign D1 statement'); return this.binding.prepare(q.sql).bind(...q.values);});
    return await this.binding.batch(native) as FoodD1Result[];
  }
  /** Shut down workerd, then reopen the same disposable D1 storage. */
  async restart() {await this.mf.dispose(); await this.start();}
  async close() {
    if (this.mf) await this.mf.dispose();
    if(this.retain)return;
    const resolved = await realpath(this.directory), temporary = await realpath(tmpdir());
    if (dirname(resolved).toLowerCase() !== temporary.toLowerCase() || !basename(resolved).startsWith('table-commerce-005-')) throw new Error('Refusing cleanup outside dedicated temporary fixture');
    await rm(resolved, {recursive: true});
  }
}
