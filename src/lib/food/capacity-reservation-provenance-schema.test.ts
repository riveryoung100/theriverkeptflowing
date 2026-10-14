import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL(
    "../../../migrations/food/0003_food_capacity_reservation_storage.sql",
    import.meta.url,
  ),
  "utf8",
);

const tSpec = JSON.parse(
  readFileSync(
    new URL(
      "../../../.river-dev/specifications/food-005t-capacity-supply-reservation-storage-schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  schema: {
    skuCapacity: { identity: string };
    slotCapacity: { identity: string };
  };
};

const uSpec = JSON.parse(
  readFileSync(
    new URL(
      "../../../.river-dev/specifications/food-005u-capacity-revision-provenance-schema-amendment.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  id: string;
  selectedSlice: string;
};

test(
  "FOOD-005U records schema amendment rather than granting reservation service authority",
  () => {
    assert.equal(uSpec.id, "FOOD-005U");
    assert.match(uSpec.selectedSlice, /^E /);

    assert.match(
      tSpec.schema.skuCapacity.identity,
      /append-only.*revision/i,
    );

    assert.match(
      tSpec.schema.slotCapacity.identity,
      /append-only.*revision/i,
    );
  },
);

test(
  "SKU capacity identity includes exact revision",
  () => {
    assert.match(
      sql,
      /PRIMARY KEY\s*\(\s*sku_id,\s*sku_version,\s*revision\s*\)/,
    );
  },
);

test(
  "slot capacity identity includes exact revision",
  () => {
    assert.match(
      sql,
      /PRIMARY KEY\s*\(\s*method,\s*location_reference,\s*window_reference,\s*revision\s*\)/,
    );
  },
);

test(
  "reservation SKU line binds exact source capacity revision",
  () => {
    assert.match(
      sql,
      /capacity_revision\s+INTEGER\s+NOT NULL/,
    );

    assert.match(
      sql,
      /FOREIGN KEY\s*\(\s*sku_id,\s*sku_version,\s*capacity_revision\s*\)\s*REFERENCES\s+food_sku_capacity_sources\s*\(\s*sku_id,\s*sku_version,\s*revision\s*\)/,
    );
  },
);

test(
  "slot reservation binds exact source capacity revision",
  () => {
    assert.match(
      sql,
      /FOREIGN KEY\s*\(\s*method,\s*location_reference,\s*window_reference,\s*capacity_revision\s*\)\s*REFERENCES\s+food_fulfillment_slot_capacity_sources\s*\(\s*method,\s*location_reference,\s*window_reference,\s*revision\s*\)/,
    );
  },
);

test(
  "capacity source histories are immutable after insert",
  () => {
    for (const marker of [
      "food_sku_capacity_sources_no_update",
      "food_sku_capacity_sources_no_delete",
      "food_fulfillment_slot_capacity_sources_no_update",
      "food_fulfillment_slot_capacity_sources_no_delete",
    ]) {
      assert.match(
        sql,
        new RegExp(marker),
      );
    }
  },
);

test(
  "capacity revision bounds remain positive and JS-safe",
  () => {
    const matches = [
      ...sql.matchAll(
        /capacity_revision\s*>=\s*1[\s\S]*?capacity_revision\s*<=\s*9007199254740991/g,
      ),
    ];

    assert.equal(matches.length, 2);

    assert.match(
      sql,
      /revision\s*>=\s*1[\s\S]*?revision\s*<=\s*9007199254740991/,
    );
  },
);

test(
  "amended migration still seeds nothing and grants no checkout payment or acceptance authority",
  () => {
    assert.doesNotMatch(
      sql,
      /\bINSERT\s+INTO\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bUPDATE\s+food_(?:sku|fulfillment)_/i,
    );

    assert.doesNotMatch(
      sql,
      /food-reservation-acceptance|checkoutReady|paymentReady|Stripe|Square|PayPal/i,
    );
  },
);
