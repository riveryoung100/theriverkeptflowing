/** Local SQLite implementation of the existing food D1 interface. No bindings/network. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { FoodD1Database, FoodD1Result, FoodD1Statement } from '../../src/lib/food/d1-draft-persistence';

export interface LocalTableDatabase extends FoodD1Database { readonly mode: 'local-synthetic-only' }
export class LocalTestD1 implements LocalTableDatabase {
  readonly mode = 'local-synthetic-only' as const;
  private readonly db: DatabaseSync;
  private readonly statements = new WeakMap<FoodD1Statement, () => FoodD1Result>();
  constructor(filename: string) {
    if (filename !== ':memory:' && !/^synthetic-table-[a-zA-Z0-9_-]+\.sqlite$/.test(basename(filename))) throw new TypeError('Dedicated synthetic-table-*.sqlite file required');
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA busy_timeout = 1000');
    this.db.exec(readFileSync(new URL('./local-order-schema.sql', import.meta.url), 'utf8'));
  }
  prepare(sql: string): FoodD1Statement {
    let values: (string | number | null)[] = [];
    const run = (): FoodD1Result => ({success: true, results: this.db.prepare(sql).all(...values)});
    const statement: FoodD1Statement = {bind: (...next) => { values = next; return statement; }, all: async () => run()};
    this.statements.set(statement, run);
    return statement;
  }
  async batch(statements: FoodD1Statement[]): Promise<readonly FoodD1Result[]> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(s => { const run = this.statements.get(s); if (!run) throw new TypeError('Foreign statement'); return run(); });
      this.db.exec('COMMIT'); return results;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
