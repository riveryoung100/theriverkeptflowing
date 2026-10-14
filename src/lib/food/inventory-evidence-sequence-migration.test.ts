import assert from "node:assert/strict";
import test from "node:test";
import {
  readFile,
} from "node:fs/promises";

async function migration(): Promise<string> {
  return readFile(
    new URL(
      "../../../migrations/food/0005_food_inventory_evidence_sequence.sql",
      import.meta.url,
    ),
    "utf8",
  );
}

test("006H defines one shared AUTOINCREMENT inventory evidence sequence", async () => {
  const source =
    await migration();

  assert.match(
    source,
    /CREATE TABLE IF NOT EXISTS food_inventory_evidence_sequence/,
  );

  assert.match(
    source,
    /evidence_sequence INTEGER PRIMARY KEY AUTOINCREMENT/,
  );

  assert.match(
    source,
    /evidence_kind IN\s*\(\s*'production-batch',\s*'physical-inventory-movement'\s*\)/s,
  );

  assert.match(
    source,
    /9007199254740991/,
  );
});

test("006H ledger binds exact SKU batch and movement coordinates", async () => {
  const source =
    await migration();

  for (
    const marker of [
      "sku_id TEXT NOT NULL",
      "sku_version INTEGER NOT NULL",
      "batch_id TEXT NOT NULL",
      "batch_version INTEGER NOT NULL",
      "movement_id TEXT",
      "REFERENCES food_production_batches",
      "REFERENCES food_physical_inventory_movements",
    ]
  ) {
    assert.ok(
      source.includes(
        marker,
      ),
      marker,
    );
  }
});

test("006H defines exact family uniqueness and cutoff-supporting indexes", async () => {
  const source =
    await migration();

  assert.match(
    source,
    /food_inventory_evidence_sequence_batch_unique/,
  );

  assert.match(
    source,
    /WHERE evidence_kind = 'production-batch'/,
  );

  assert.match(
    source,
    /food_inventory_evidence_sequence_movement_unique/,
  );

  assert.match(
    source,
    /WHERE evidence_kind = 'physical-inventory-movement'/,
  );

  assert.match(
    source,
    /food_inventory_evidence_sequence_sku_cutoff/,
  );

  assert.match(
    source,
    /sku_id COLLATE BINARY,\s*sku_version,\s*evidence_sequence/s,
  );

  assert.match(
    source,
    /food_inventory_evidence_sequence_batch_cutoff/,
  );
});

test("006H deterministically backfills both existing evidence families", async () => {
  const source =
    await migration();

  assert.match(
    source,
    /INSERT OR IGNORE INTO food_inventory_evidence_sequence[\s\S]*FROM food_production_batches AS batch/,
  );

  assert.match(
    source,
    /INSERT OR IGNORE INTO food_inventory_evidence_sequence[\s\S]*FROM food_physical_inventory_movements AS movement/,
  );

  assert.match(
    source,
    /does not claim to reconstruct historical insertion order/i,
  );
});

test("006H automatically sequences every future batch and movement insert", async () => {
  const source =
    await migration();

  assert.match(
    source,
    /food_inventory_evidence_sequence_after_batch_insert[\s\S]*AFTER INSERT ON food_production_batches/,
  );

  assert.match(
    source,
    /food_inventory_evidence_sequence_after_movement_insert[\s\S]*AFTER INSERT ON food_physical_inventory_movements/,
  );

  assert.match(
    source,
    /'production-batch'[\s\S]*NEW\.sku_id[\s\S]*NEW\.batch_id[\s\S]*NEW\.version/,
  );

  assert.match(
    source,
    /'physical-inventory-movement'[\s\S]*NEW\.sku_id[\s\S]*NEW\.batch_id[\s\S]*NEW\.batch_version[\s\S]*NEW\.movement_id/,
  );
});

test("006H sequence ledger is append-only", async () => {
  const source =
    await migration();

  assert.match(
    source,
    /food_inventory_evidence_sequence_no_update[\s\S]*BEFORE UPDATE ON food_inventory_evidence_sequence/,
  );

  assert.match(
    source,
    /food_inventory_evidence_sequence_no_delete[\s\S]*BEFORE DELETE ON food_inventory_evidence_sequence/,
  );

  assert.match(
    source,
    /RAISE\(\s*ABORT,\s*'food inventory evidence sequence is immutable'\s*\)/s,
  );
});

test("006H migration text grants no current-QOH or operational authority", async () => {
  const source =
    await migration();

  assert.match(
    source,
    /does NOT itself establish/i,
  );

  assert.match(
    source,
    /evidence completeness/,
  );

  assert.match(
    source,
    /current quantity-on-hand/,
  );

  assert.match(
    source,
    /availability/,
  );

  assert.match(
    source,
    /checkout\/payment readiness/,
  );

  assert.doesNotMatch(
    source,
    /\bUPDATE\s+food_production_batches\b|\bDELETE\s+FROM\s+food_production_batches\b|\bUPDATE\s+food_physical_inventory_movements\b|\bDELETE\s+FROM\s+food_physical_inventory_movements\b/i,
  );
});

test("006H test surface remains definition-only and never executes SQL", async () => {
  const source =
    await readFile(
      new URL(
        "./inventory-evidence-sequence-migration.test.ts",
        import.meta.url,
      ),
      "utf8",
    );

  const forbiddenExecutionTokens = [
    "Mini" + "flare",
    "wrang" + "ler",
    "D1" + "Database",
    ".pre" + "pare(",
    ".ba" + "tch(",
    "ex" + "ec(",
    "exe" + "cute(",
  ];

  for (const token of forbiddenExecutionTokens) {
    assert.equal(
      source.includes(token),
      false,
      token,
    );
  }

  assert.match(
    source,
    /readFile/,
  );
});
