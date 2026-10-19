/**
 * FOOD-007F: complete exact historical source resolution only.
 * Resolution is not eligibility or acceptance. No latest/currentness, trust,
 * capacity sufficiency, or simultaneous database snapshot is established.
 */
import {
  deriveFoodReservationCapacitySourceSelectionRequest,
  type FoodReservationCapacitySourceSelectionRequest,
} from "./reservation-capacity-source-selection-request";
import {
  readFoodExactSkuStockedCapacitySourceRevision,
  type FoodExactSkuStockedCapacitySourceReadD1Database,
} from "./d1-exact-sku-stocked-capacity-source-read";
import { readFoodExactFulfillmentSlotCapacitySourceRevision } from "./d1-exact-fulfillment-slot-capacity-source-read";
import type { FoodExactSkuStockedCapacitySourceRevision } from "./exact-sku-stocked-capacity-source-domain";
import type { FoodFulfillmentSlotCapacitySourceRevision } from "./fulfillment-slot-capacity-source-domain";

export type FoodReservationCapacitySourceSelectionResolution = Readonly<{
  kind: "reservation-capacity-source-selection-resolution";
  selection: FoodReservationCapacitySourceSelectionRequest;
  skuSources: readonly FoodExactSkuStockedCapacitySourceRevision[];
  slotSource: FoodFulfillmentSlotCapacitySourceRevision;
}>;

export type FoodReservationCapacitySourceSelectionResolutionResult =
  | Readonly<{ outcome: "resolved"; resolution: FoodReservationCapacitySourceSelectionResolution }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "not-found" }>
  | Readonly<{ outcome: "storage-failure" }>;

export async function resolveFoodReservationCapacitySourceSelection(
  database: FoodExactSkuStockedCapacitySourceReadD1Database,
  input: unknown,
): Promise<FoodReservationCapacitySourceSelectionResolutionResult> {
  // FOOD-007E captures, validates and deeply freezes before the first await.
  const proposal = deriveFoodReservationCapacitySourceSelectionRequest(input);
  if (proposal.outcome === "invalid") return Object.freeze({ outcome: "invalid" });

  const skuSources: FoodExactSkuStockedCapacitySourceRevision[] = [];
  for (const selector of proposal.value.skuSelections) {
    const result = await readFoodExactSkuStockedCapacitySourceRevision(database, selector);
    switch (result.outcome) {
      case "found":
        skuSources.push(result.value);
        break;
      case "not-found":
        return Object.freeze({ outcome: "not-found" });
      // Invalid is unreachable for canonical selectors: an internal inconsistency,
      // never evidence that a source is absent. Reader storage errors stay errors.
      case "invalid":
      case "storage-failure":
        return Object.freeze({ outcome: "storage-failure" });
    }
  }

  const slot = await readFoodExactFulfillmentSlotCapacitySourceRevision(database, proposal.value.slotSelection);
  switch (slot.outcome) {
    case "not-found":
      return Object.freeze({ outcome: "not-found" });
    case "invalid":
    case "storage-failure":
      return Object.freeze({ outcome: "storage-failure" });
    case "found":
      // Canonical readers return detached, frozen durable objects, not raw rows.
      return Object.freeze({
        outcome: "resolved",
        resolution: Object.freeze({
          kind: "reservation-capacity-source-selection-resolution",
          selection: proposal.value,
          skuSources: Object.freeze(skuSources),
          slotSource: slot.value,
        }),
      });
  }
}
