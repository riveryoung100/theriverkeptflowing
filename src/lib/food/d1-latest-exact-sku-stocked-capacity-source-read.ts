/**
 * FOOD-007G: highest recorded exact-SKU source assertion from the injected read only.
 * Structural validation does not authenticate provenance or sourceReference,
 * establish physical truth/current QOH, or grant operational authority.
 */
import { validateFoodVersion } from "./draft-domain";
import { parseFoodSkuId } from "./package-sku-domain";
import {
  FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,
  validateFoodExactSkuStockedCapacitySourceRevision,
} from "./exact-sku-stocked-capacity-source-domain";

import type { FoodExactSkuStockedCapacitySourceReadD1Database, FoodExactSkuStockedCapacitySourceReadResult } from "./d1-exact-sku-stocked-capacity-source-read";

const LATEST_SQL = `
SELECT sku_id, sku_version, revision, capacity_units, attribution, source_reference
FROM food_sku_capacity_sources
WHERE sku_id = ? AND sku_version = ?
ORDER BY revision DESC
LIMIT 1
`.trim();

// Read own data descriptors so invalid selectors cannot invoke accessors.
function ownData(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected data object");
  }
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== keys.length || ownKeys.some(key => typeof key !== "string" || !keys.includes(key))) {
    throw new TypeError("Unexpected fields");
  }
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) throw new TypeError("Expected own data field");
    result[key] = descriptor.value;
  }
  return result;
}

function selector(input: unknown) {
  const request = ownData(input, ["sku"]);
  const sku = ownData(request.sku, ["id", "version"]);
  return Object.freeze({
    sku: Object.freeze({ id: parseFoodSkuId(sku.id), version: validateFoodVersion(sku.version) }),
  });
}

export async function readFoodLatestExactSkuStockedCapacitySourceRevision(
  database: FoodExactSkuStockedCapacitySourceReadD1Database,
  input: unknown,
): Promise<FoodExactSkuStockedCapacitySourceReadResult> {
  let requested: ReturnType<typeof selector>;
  try {
    requested = selector(input);
  } catch {
    return Object.freeze({ outcome: "invalid" });
  }

  try {
    const result = await database.prepare(LATEST_SQL)
      .bind(requested.sku.id, requested.sku.version).all<unknown>();
    if (!result || typeof result !== "object" || result.success !== true ||
      !Array.isArray(result.results) || result.results.length > 1) {
      return Object.freeze({ outcome: "storage-failure" });
    }
    if (result.results.length === 0) return Object.freeze({ outcome: "not-found" });

    const row = ownData(result.results[0], [
      "sku_id", "sku_version", "revision", "capacity_units", "attribution", "source_reference",
    ]);
    const value = validateFoodExactSkuStockedCapacitySourceRevision({
      kind: FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,
      sku: { id: row.sku_id, version: row.sku_version },
      revision: row.revision,
      capacityUnits: row.capacity_units,
      attribution: row.attribution,
      sourceReference: row.source_reference,
    });
    if (value.sku.id !== requested.sku.id || value.sku.version !== requested.sku.version) {
      return Object.freeze({ outcome: "storage-failure" });
    }
    return Object.freeze({ outcome: "found", value });
  } catch {
    return Object.freeze({ outcome: "storage-failure" });
  }
}
