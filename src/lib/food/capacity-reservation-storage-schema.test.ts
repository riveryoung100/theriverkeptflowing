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

test(
  "FOOD-005T creates separate SKU capacity slot capacity and reservation storage tables",
  () => {
    for (const table of [
      "food_sku_capacity_sources",
      "food_fulfillment_slot_capacity_sources",
      "food_capacity_reservations",
      "food_capacity_reservation_lines",
      "food_fulfillment_slot_reservations",
    ]) {
      assert.match(
        sql,
        new RegExp(
          `CREATE TABLE IF NOT EXISTS ${table}\\b`,
        ),
      );
    }
  },
);

test(
  "SKU capacity storage binds exact SKU version and bounded nonnegative capacity",
  () => {
    assert.match(
      sql,
      /PRIMARY KEY\s*\(\s*sku_id,\s*sku_version\s*\)/,
    );

    assert.match(
      sql,
      /capacity_units\s+INTEGER\s+NOT NULL/,
    );

    assert.match(
      sql,
      /capacity_units\s*>=\s*0/,
    );

    assert.match(
      sql,
      /sku_version\s*<=\s*9007199254740991/,
    );
  },
);

test(
  "fulfillment slot capacity is separate and keyed by exact method location and window",
  () => {
    assert.match(
      sql,
      /PRIMARY KEY\s*\(\s*method,\s*location_reference,\s*window_reference\s*\)/,
    );

    assert.match(
      sql,
      /'personal-delivery'/,
    );

    assert.match(
      sql,
      /'meetup'/,
    );
  },
);

test(
  "reservation identity is unique for exact order and reservation-request versions",
  () => {
    assert.match(
      sql,
      /UNIQUE\s*\(\s*order_id,\s*order_version,\s*reservation_request_id,\s*reservation_request_version\s*\)/,
    );

    assert.match(
      sql,
      /state\s*=\s*'held'/,
    );
  },
);

test(
  "reservation lines preserve exact SKU version and positive quantity",
  () => {
    assert.match(
      sql,
      /food_capacity_reservation_lines/,
    );

    assert.match(
      sql,
      /UNIQUE\s*\(\s*reservation_id,\s*sku_id,\s*sku_version\s*\)/,
    );

    assert.match(
      sql,
      /quantity\s*>=\s*1/,
    );
  },
);

test(
  "slot claim is separate from SKU demand and has one-unit reservation semantics",
  () => {
    assert.match(
      sql,
      /food_fulfillment_slot_reservations/,
    );

    assert.match(
      sql,
      /quantity\s*=\s*1/,
    );
  },
);

test(
  "reservation storage rows are immutable and have no cascade semantics",
  () => {
    for (const marker of [
      "food_capacity_reservations_no_update",
      "food_capacity_reservations_no_delete",
      "food_capacity_reservation_lines_no_update",
      "food_capacity_reservation_lines_no_delete",
      "food_fulfillment_slot_reservations_no_update",
      "food_fulfillment_slot_reservations_no_delete",
    ]) {
      assert.match(
        sql,
        new RegExp(marker),
      );
    }

    assert.doesNotMatch(
      sql,
      /ON\s+(?:UPDATE|DELETE)\s+CASCADE/i,
    );
  },
);

test(
  "schema does not seed supply perform reservation mutation create acceptance or grant checkout authority",
  () => {
    assert.doesNotMatch(
      sql,
      /\bINSERT\s+INTO\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bUPDATE\s+food_sku_capacity_sources\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bUPDATE\s+food_fulfillment_slot_capacity_sources\b/i,
    );

    assert.doesNotMatch(
      sql,
      /food-reservation-acceptance|checkoutReady|paymentReady|Stripe|Square|PayPal/i,
    );
  },
);
