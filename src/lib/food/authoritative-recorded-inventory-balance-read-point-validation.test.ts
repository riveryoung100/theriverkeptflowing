import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFoodSkuId } from "./package-sku-domain";
import { validateFoodAuthoritativeRecordedInventoryBalanceAtReadPoint as validate } from "./authoritative-recorded-inventory-balance-read-point-validation";
import type { FoodAuthoritativeInventoryReadPointD1Database, FoodAuthoritativeInventoryReadPointD1Result, FoodAuthoritativeInventoryReadPointD1Session, FoodAuthoritativeInventoryReadPointD1Statement } from "./authoritative-inventory-read-point-validation";

function make(head2 = 0, bookmark2: string | null = "bookmark:006p") {
  const calls: string[] = [];
  let primary = 0;
  const primarySession = (head: number, bookmark: string, label: string): FoodAuthoritativeInventoryReadPointD1Session => {
    const statement: FoodAuthoritativeInventoryReadPointD1Statement = {
      bind(...values: readonly unknown[]) { calls.push(`${label}:bind:${values.join("|")}`); return statement; },
      async all<T = Record<string, unknown>>(): Promise<FoodAuthoritativeInventoryReadPointD1Result<T>> {
        calls.push(`${label}:all`);
        return { success: true, results: [{ evidence_head: head === 0 ? null : head } as unknown as T] };
      },
    };
    return {
      prepare(sql: string) { calls.push(`${label}:prepare:${sql}`); return statement; },
      getBookmark() { calls.push(`${label}:bookmark`); return bookmark; },
    };
  };
  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession(selector?: string) {
      calls.push(`session:${selector ?? ""}`);
      if (selector === "first-primary") {
        primary += 1;
        if (primary === 1) return primarySession(0, "bookmark:006o", "006o");
        if (primary === 2) return primarySession(head2, bookmark2 ?? "", "006p");
        throw new Error("unexpected primary session");
      }
      if (selector === "bookmark:006o") {
        return {
          prepare() { throw new Error("H=0 reconstruction must not query storage"); },
          getBookmark() { return "bookmark:006o"; },
        };
      }
      throw new Error(`unexpected session:${selector ?? ""}`);
    },
  };
  return { database, calls };
}

const request = () => ({ sku: { id: createFoodSkuId("006p-fixture"), version: 1 } });

test("006P validates only unchanged authoritative exact-SKU generation", async () => {
  const f = make();
  const result = await validate(f.database, request());
  assert.equal(result.outcome, "validated");
  if (result.outcome !== "validated") assert.fail("expected validated");
  assert.equal(result.value.composition.acquisition.exactSkuEvidenceHead, 0);
  assert.equal(result.value.readPoint.exactSkuEvidenceHead, 0);
  assert.equal(result.value.readPoint.consistencyToken.bookmark, "bookmark:006p");
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.value));
  assert.equal(f.calls.filter((x) => x === "session:first-primary").length, 2);
});

test("006P returns stale without validated balance when later head advances", async () => {
  const f = make(1);
  const result = await validate(f.database, request());
  assert.deepEqual(result, { outcome: "stale", exactSkuEvidenceHead: 1 });
  assert.equal("value" in result, false);
  assert.equal(f.calls.includes("006p:bookmark"), false);
});

test("006P propagates caller invalid from 006O without database access", async () => {
  const f = make();
  const result = await validate(f.database, { sku: { id: "wrong:sku", version: 1 } });
  assert.deepEqual(result, { outcome: "invalid" });
  assert.deepEqual(f.calls, []);
});

test("006P fails closed when later validation cannot produce a bookmark", async () => {
  const f = make(0, null);
  const result = await validate(f.database, request());
  assert.deepEqual(result, { outcome: "storage-failure" });
});

test("006P source composes only 006O then 006N and grants no operational authority", async () => {
  const source = await readFile(new URL("./authoritative-recorded-inventory-balance-read-point-validation.ts", import.meta.url), "utf8");
  assert.match(source, /composeFoodAuthoritativeRecordedInventoryBalance/);
  assert.match(source, /validateFoodInventoryAtAuthoritativeReadPoint/);
  assert.match(source, /readPoint\.exactSkuEvidenceHead === h1/);
  assert.doesNotMatch(source, /authoritative-inventory-evidence-head-acquisition|d1-inventory-evidence-cutoff-bounded-read-persistence|lossless-inventory-evidence-grouping|grouped-inventory-evidence-durable-resolution|lossless-inventory-recorded-balance-composition/);
  assert.doesNotMatch(source, /\bcurrentQoh\b|\bavailableToPromise\b|\bcheckoutReady\b|\bpaymentReady\b/);
});
