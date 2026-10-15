/**
 * FOOD-006O: recorded physical balance reconstructed through authoritative
 * exact-SKU head H, using reads anchored at the bookmark obtained after H.
 * Later writes may exist. This grants neither a fixed snapshot nor continued
 * currentness, verified physical stock, or operational authority.
 */
import {
  acquireFoodAuthoritativeInventoryEvidenceHead,
  type FoodAuthoritativeInventoryEvidenceHeadAcquisition,
} from "./authoritative-inventory-evidence-head-acquisition";
import type {
  FoodAuthoritativeInventoryReadPointD1Database,
} from "./authoritative-inventory-read-point-validation";
import {
  listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff,
  type FoodInventoryEvidenceLedgerEntry,
} from "./d1-inventory-evidence-cutoff-bounded-read-persistence";
import { groupFoodInventoryEvidenceCompleteThroughCutoff } from "./lossless-inventory-evidence-grouping";
import { resolveFoodGroupedInventoryEvidenceDurably } from "./grouped-inventory-evidence-durable-resolution";
import {
  projectFoodLosslessGroupedInventoryRecordedBalance,
  type FoodLosslessGroupedInventoryRecordedBalanceComposition,
} from "./lossless-inventory-recorded-balance-composition";

export type FoodAuthoritativeRecordedInventoryBalanceResult =
  | Readonly<{
      outcome: "composed";
      value: Readonly<{
        acquisition: FoodAuthoritativeInventoryEvidenceHeadAcquisition;
        recordedBalance: FoodLosslessGroupedInventoryRecordedBalanceComposition;
      }>;
    }>
  | Readonly<{ outcome: "invalid" }>
  | Readonly<{ outcome: "not-found" }>
  | Readonly<{ outcome: "storage-failure" }>;

const failure = (outcome: "invalid" | "not-found" | "storage-failure") =>
  Object.freeze({ outcome });

// FOOD-006I's canonical maximum; its public options validator owns the bound.
const PAGE_LIMIT = 100;

export async function composeFoodAuthoritativeRecordedInventoryBalance(
  database: FoodAuthoritativeInventoryReadPointD1Database,
  input: unknown,
): Promise<FoodAuthoritativeRecordedInventoryBalanceResult> {
  const acquired = await acquireFoodAuthoritativeInventoryEvidenceHead(database, input);
  if (acquired.outcome !== "acquired") return failure(acquired.outcome);
  const acquisition = acquired.value;
  const { sku, exactSkuEvidenceHead: cutoff, bookmark } = acquisition;

  try {
    // The raw dependency is used only to create this one reconstruction reader.
    const session = database.withSession(bookmark);
    const entries: FoodInventoryEvidenceLedgerEntry[] = [];
    let after = 0;
    let terminalSequence = 0;

    while (true) {
      const pageResult = await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
        session, sku, { cutoff, after, limit: PAGE_LIMIT },
      );
      // An invalid selector after canonical acquisition signals internal drift.
      if (pageResult.outcome !== "page") return failure("storage-failure");
      const { items, nextCursor } = pageResult.value;
      for (const item of items) entries.push(item);
      const last = items[items.length - 1];
      if (last !== undefined) terminalSequence = last.evidenceSequence;

      if (nextCursor === undefined) break;
      if (!Number.isSafeInteger(nextCursor) || nextCursor <= after ||
        nextCursor > cutoff || last === undefined || nextCursor !== last.evidenceSequence) {
        return failure("storage-failure");
      }
      after = nextCursor;
    }

    // Unlike a global cutoff, this known exact-SKU maximum must be reached.
    if (cutoff > 0 && terminalSequence !== cutoff) return failure("storage-failure");

    const grouped = groupFoodInventoryEvidenceCompleteThroughCutoff({
      sku, cutoff, entries: Object.freeze(entries),
    });
    const resolved = await resolveFoodGroupedInventoryEvidenceDurably(session, grouped);
    if (resolved.outcome === "not-found") return failure("not-found");
    if (resolved.outcome !== "success") return failure("storage-failure");

    const recordedBalance = projectFoodLosslessGroupedInventoryRecordedBalance(resolved);
    return Object.freeze({
      outcome: "composed" as const,
      value: Object.freeze({ acquisition, recordedBalance }),
    });
  }
  catch {
    // Session, grouping and composition disagreement never yields partial state.
    return failure("storage-failure");
  }
}
