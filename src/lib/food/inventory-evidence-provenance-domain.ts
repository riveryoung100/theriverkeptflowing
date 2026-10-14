/**
 * FOOD-006C
 *
 * Exact caller-supplied inventory evidence-set manifest/provenance.
 *
 * This value documents which exact persisted-evidence identities were
 * supplied or observed. It does not establish evidence completeness,
 * a database cutoff, a point-in-time snapshot, current QOH, availability,
 * capacity, reservation state, fulfillment or trusted mutation authority.
 */

import { validateFoodVersion } from "./draft-domain";
import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";
import {
  parseFoodProductionBatchId,
  type FoodProductionBatchId,
} from "./production-batch-domain";
import {
  parseFoodPhysicalInventoryMovementId,
  type FoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";

export const FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND =
  "food-inventory-evidence-manifest" as const;

const MAX_BATCHES = 128;
const MAX_MOVEMENTS_PER_BATCH = 128;
const MAX_PROVENANCE_TEXT = 512;

export interface FoodInventoryEvidenceManifestBatch {
  readonly batch: Readonly<{
    id: FoodProductionBatchId;
    version: number;
  }>;
  readonly movementIds: readonly FoodPhysicalInventoryMovementId[];
}

export interface FoodInventoryEvidenceManifest {
  readonly kind: typeof FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND;
  readonly sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;
  readonly batches: readonly FoodInventoryEvidenceManifestBatch[];
  readonly provenance: Readonly<{
    attribution: string;
    sourceReference: string;
  }>;
}

function record(
  value: unknown,
  allowed: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(`Expected ${label} record`);
  }

  if (
    Reflect.ownKeys(value).some(
      key =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError(`Unsupported ${label} field`);
  }

  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_PROVENANCE_TEXT ||
    value.trim() !== value
  ) {
    throw new TypeError(`Invalid ${label}`);
  }

  return value;
}

function compareBatch(
  left: FoodInventoryEvidenceManifestBatch,
  right: FoodInventoryEvidenceManifestBatch,
): number {
  if (left.batch.id < right.batch.id) {
    return -1;
  }

  if (left.batch.id > right.batch.id) {
    return 1;
  }

  return left.batch.version - right.batch.version;
}

export function validateFoodInventoryEvidenceManifest(
  input: unknown,
): FoodInventoryEvidenceManifest {
  const value =
    record(
      input,
      [
        "kind",
        "sku",
        "batches",
        "provenance",
      ],
      "inventory evidence manifest",
    );

  if (
    value.kind !==
    FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND
  ) {
    throw new TypeError(
      "Wrong inventory evidence manifest kind",
    );
  }

  const sku =
    record(
      value.sku,
      ["id", "version"],
      "SKU reference",
    );

  const canonicalSku =
    Object.freeze({
      id:
        parseFoodSkuId(
          sku.id,
        ),
      version:
        validateFoodVersion(
          sku.version,
        ),
    });

  if (!Array.isArray(value.batches)) {
    throw new TypeError(
      "Inventory evidence batches must be an array",
    );
  }

  if (value.batches.length > MAX_BATCHES) {
    throw new TypeError(
      "Too many inventory evidence batches",
    );
  }

  const exactBatchKeys =
    new Set<string>();

  const movementIdsSeen =
    new Set<FoodPhysicalInventoryMovementId>();

  const batches:
    FoodInventoryEvidenceManifestBatch[] = [];

  for (const candidate of value.batches) {
    const entry =
      record(
        candidate,
        ["batch", "movementIds"],
        "inventory evidence batch",
      );

    const batch =
      record(
        entry.batch,
        ["id", "version"],
        "production batch reference",
      );

    const batchReference =
      Object.freeze({
        id:
          parseFoodProductionBatchId(
            batch.id,
          ),
        version:
          validateFoodVersion(
            batch.version,
          ),
      });

    const batchKey =
      `${batchReference.id}@${batchReference.version}`;

    if (exactBatchKeys.has(batchKey)) {
      throw new TypeError(
        "Duplicate exact production batch identity",
      );
    }

    exactBatchKeys.add(batchKey);

    if (!Array.isArray(entry.movementIds)) {
      throw new TypeError(
        "Inventory evidence movementIds must be an array",
      );
    }

    if (
      entry.movementIds.length >
      MAX_MOVEMENTS_PER_BATCH
    ) {
      throw new TypeError(
        "Too many movement identities for production batch",
      );
    }

    const movementIds:
      FoodPhysicalInventoryMovementId[] = [];

    for (
      const movementIdInput of
      entry.movementIds
    ) {
      const movementId =
        parseFoodPhysicalInventoryMovementId(
          movementIdInput,
        );

      if (movementIdsSeen.has(movementId)) {
        throw new TypeError(
          "Duplicate physical inventory movement identity",
        );
      }

      movementIdsSeen.add(movementId);
      movementIds.push(movementId);
    }

    movementIds.sort();

    batches.push(
      Object.freeze({
        batch: batchReference,
        movementIds:
          Object.freeze(
            [...movementIds],
          ),
      }),
    );
  }

  batches.sort(compareBatch);

  const provenance =
    record(
      value.provenance,
      [
        "attribution",
        "sourceReference",
      ],
      "inventory evidence provenance",
    );

  return Object.freeze({
    kind:
      FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
    sku: canonicalSku,
    batches:
      Object.freeze(
        [...batches],
      ),
    provenance:
      Object.freeze({
        attribution:
          text(
            provenance.attribution,
            "inventory evidence attribution",
          ),
        sourceReference:
          text(
            provenance.sourceReference,
            "inventory evidence source reference",
          ),
      }),
  });
}
