import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deriveFoodExactSkuStockedCapacitySourceCandidate as derive,
} from "./exact-sku-stocked-capacity-source-candidate";

test("007A rejects malformed input", () => {
  for (const input of [
    null,
    undefined,
    true,
    0,
    "",
    [],
    {},
    { outcome: "wat" },
  ]) {
    assert.deepEqual(
      derive(input),
      { outcome: "invalid" },
    );
  }
});

test("007A treats canonical 006Z invalid as ineligible", () => {
  assert.deepEqual(
    derive({ outcome: "invalid" }),
    {
      outcome: "ineligible",
      upstreamOutcome: "invalid",
    },
  );
});

test("007A treats canonical 006Z ineligible as ineligible", () => {
  for (const upstreamOutcome of [
    "invalid",
    "ineligible",
    "stale",
    "storage-failure",
  ] as const) {
    assert.deepEqual(
      derive({
        outcome: "ineligible",
        upstreamOutcome,
      }),
      {
        outcome: "ineligible",
        upstreamOutcome,
      },
    );
  }
});

test("007A cannot be made eligible by hidden fields", () => {
  assert.deepEqual(
    derive({
      outcome: "invalid",
      capacityUnits: 5,
    }),
    { outcome: "invalid" },
  );
});

test("007A rejects unknown ineligible vocabulary", () => {
  assert.deepEqual(
    derive({
      outcome: "ineligible",
      upstreamOutcome: "fresh",
    }),
    { outcome: "invalid" },
  );
});

test("007A source is pure and has no persistence or operational authority", async () => {
  const source = await readFile(
    new URL(
      "./exact-sku-stocked-capacity-source-candidate.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /validateFoodExactSkuPhysicalCountObservationFreshness/,
  );

  assert.match(
    source,
    /recordedPackageBalance/,
  );

  assert.match(
    source,
    /countedPackageCount/,
  );

  assert.match(
    source,
    /variancePackageCount/,
  );

  assert.match(
    source,
    /capacityUnits/,
  );

  assert.doesNotMatch(
    source,
    /D1Database|database\.prepare|repository|fetch\s*\(|process\.env|Date\.now|new Date|Math\.random|crypto\.randomUUID/,
  );

  assert.doesNotMatch(
    source,
    /food_sku_capacity_sources|food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations/,
  );

  assert.doesNotMatch(
    source,
    /currentQoh\s*:|quantityOnHand\s*:|availableToPromise\s*:|reservedQuantity\s*:|reservableQuantity\s*:|availableStock\s*:|sellableStock\s*:|orderable\s*:|checkoutReady\s*:|paymentReady\s*:/,
  );
});

test("007A retains timing policy only through canonical 006Z provenance", async () => {
  const source = await readFile(
    new URL(
      "./exact-sku-stocked-capacity-source-candidate.ts",
      import.meta.url,
    ),
    "utf8",
  );

  const typeMatch = source.match(
    /export type FoodExactSkuStockedCapacitySourceCandidate = Readonly<\{([\s\S]*?)\}>;/,
  );

  assert.ok(typeMatch);

  const candidateSurface = typeMatch[0];

  assert.match(
    candidateSurface,
    /kind: "exact-sku-stocked-capacity-source-candidate"/,
  );

  assert.match(
    candidateSurface,
    /sku: Fresh006Z\["sku"\]/,
  );

  assert.match(
    candidateSurface,
    /capacityUnits: number/,
  );

  assert.match(
    candidateSurface,
    /physicalCountObservationFreshnessValidation: Fresh006Z/,
  );

  assert.doesNotMatch(
    candidateSurface,
    /\breferenceTime\b|\bmaxObservationAgeSeconds\b|\bobservationAgeSeconds\b|\bobservedAt\b/,
  );

  // These fields MUST remain usable internally to replay FOOD-006Z.
  assert.match(
    source,
    /freshnessValidationInput:\s*value\.upstreamEvidenceFreshnessValidation/,
  );

  assert.match(
    source,
    /referenceTime:\s*value\.referenceTime/,
  );

  assert.match(
    source,
    /maxObservationAgeSeconds:\s*value\.maxObservationAgeSeconds/,
  );
});
test("007A specification locks the candidate-only authority boundary", async () => {
  const spec = JSON.parse(
    await readFile(
      new URL(
        "../../../.river-dev/specifications/food-007a-exact-sku-stocked-capacity-source-candidate.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;

  assert.equal(spec.id, "FOOD-007A");
  assert.match(
    String(spec.selectedDiscoveryOption),
    /^A1\b/,
  );

  assert.equal(
    spec.databaseReads,
    "None.",
  );

  assert.equal(
    spec.databaseWrites,
    "None.",
  );

  assert.equal(
    spec.persistence,
    "None. FOOD-007B is expected to define explicit capacity-source revision metadata and D1 persistence against food_sku_capacity_sources.",
  );
});
