/**
 * FOOD-006P: validate canonical FOOD-006O recorded balance at a later canonical
 * FOOD-006N authoritative exact-SKU read point. Validated means H2 === H1 only.
 * It does not establish continued currentness, fixed snapshot, current QOH,
 * physical reconciliation, availability, capacity, reservation, checkout,
 * payment, fulfillment, accounting, or rewards authority.
 */
import { composeFoodAuthoritativeRecordedInventoryBalance, type FoodAuthoritativeRecordedInventoryBalanceResult } from "./authoritative-recorded-inventory-balance-orchestration";
import { validateFoodInventoryAtAuthoritativeReadPoint, type FoodAuthoritativeInventoryReadPoint, type FoodAuthoritativeInventoryReadPointD1Database } from "./authoritative-inventory-read-point-validation";

type Composition = Extract<FoodAuthoritativeRecordedInventoryBalanceResult, Readonly<{ outcome: "composed" }>>["value"];

export type FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult =
  | Readonly<{ outcome: "validated"; value: Readonly<{ composition: Composition; readPoint: FoodAuthoritativeInventoryReadPoint }> }>
  | Readonly<{ outcome: "stale"; exactSkuEvidenceHead: number }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "not-found" }>
  | Readonly<{ outcome: "storage-failure" }>;

function fail(outcome: "invalid" | "not-found" | "storage-failure"): FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult {
  return Object.freeze({ outcome });
}

function sameSku(a: Readonly<{ id: string; version: number }>, b: Readonly<{ id: string; version: number }>): boolean {
  return a.id === b.id && a.version === b.version;
}

function matches(composition: Composition, readPoint: FoodAuthoritativeInventoryReadPoint): boolean {
  const acquisition = composition.acquisition;
  const token = readPoint.consistencyToken;
  const h1 = acquisition.exactSkuEvidenceHead;
  return sameSku(acquisition.sku, composition.recordedBalance.sku)
    && sameSku(acquisition.sku, readPoint.sku)
    && sameSku(acquisition.sku, token.sku)
    && readPoint.composedCutoff === h1
    && readPoint.exactSkuEvidenceHead === h1
    && token.composedCutoff === h1
    && token.exactSkuEvidenceHead === h1;
}

export async function validateFoodAuthoritativeRecordedInventoryBalanceAtReadPoint(
  database: FoodAuthoritativeInventoryReadPointD1Database,
  input: unknown,
): Promise<FoodAuthoritativeRecordedInventoryBalanceReadPointValidationResult> {
  try {
    const composed = await composeFoodAuthoritativeRecordedInventoryBalance(database, input);
    if (composed.outcome === "invalid") return fail("invalid");
    if (composed.outcome === "not-found") return fail("not-found");
    if (composed.outcome === "storage-failure") return fail("storage-failure");

    const composition = composed.value;
    const acquisition = composition.acquisition;
    const checked = await validateFoodInventoryAtAuthoritativeReadPoint(database, {
      sku: acquisition.sku,
      composedCutoff: acquisition.exactSkuEvidenceHead,
    });

    if (checked.outcome === "stale") {
      return Object.freeze({ outcome: "stale" as const, exactSkuEvidenceHead: checked.exactSkuEvidenceHead });
    }

    if (checked.outcome !== "success") return fail("storage-failure");
    if (!matches(composition, checked.value)) return fail("storage-failure");

    return Object.freeze({
      outcome: "validated" as const,
      value: Object.freeze({ composition, readPoint: checked.value }),
    });
  } catch {
    return fail("storage-failure");
  }
}
