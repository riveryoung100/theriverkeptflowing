/**
 * FOOD-005W: immutable production-batch evidence for packaged physical food.
 *
 * Records what was physically produced for one exact SKU/version.
 * Does not establish quantity-on-hand, reservable capacity, availability,
 * reservation success, checkout/payment readiness, or a completed sale.
 */

import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";

export const FOOD_PRODUCTION_BATCH_KIND =
  "food-production-batch" as const;

export type FoodProductionBatchKind =
  typeof FOOD_PRODUCTION_BATCH_KIND;

export type FoodProductionBatchId =
  string & {
    readonly __brand: "FoodProductionBatchId";
  };

export type FoodProductionStorageMode =
  | "refrigerated"
  | "frozen"
  | "room-temperature";

export interface FoodProductionBatchVersion {
  readonly kind: FoodProductionBatchKind;
  readonly id: FoodProductionBatchId;
  readonly version: number;

  readonly sku: Readonly<{
    id: FoodSkuId;
    version: number;
  }>;

  readonly batchCode: string;
  readonly storageMode: FoodProductionStorageMode;

  /**
   * Historical packaged units produced.
   * Deliberately not current quantity-on-hand.
   */
  readonly producedPackageCount: number;

  readonly preparedOn: string;
  readonly frozenOn?: string;

  readonly attribution: string;
  readonly sourceReference: string;
}

const MAX_LOCAL_IDENTITY_LENGTH = 128;
const MAX_TEXT_LENGTH = 512;

function record(
  value: unknown,
  label: string,
): Record<PropertyKey, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError(`${label} must be an object`);
  }

  return value as Record<PropertyKey, unknown>;
}

function exactOwnKeys(
  value: Record<PropertyKey, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const keys = Reflect.ownKeys(value);

  if (
    keys.length !== expected.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !expected.includes(key),
    )
  ) {
    throw new TypeError(`${label} has invalid fields`);
  }
}

function boundedText(
  value: unknown,
  max: number,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > max ||
    value.trim() !== value
  ) {
    throw new TypeError(`${label} must be bounded unpadded text`);
  }

  return value;
}

function positiveSafeInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }

  return value;
}

function isoCalendarDate(
  value: unknown,
  label: string,
): string {
  const text =
    boundedText(
      value,
      10,
      label,
    );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new TypeError(`${label} must be YYYY-MM-DD`);
  }

  const [
    yearText,
    monthText,
    dayText,
  ] = text.split("-");

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError(`${label} is not a valid calendar date`);
  }

  return text;
}

function storageMode(
  value: unknown,
): FoodProductionStorageMode {
  if (
    value !== "refrigerated" &&
    value !== "frozen" &&
    value !== "room-temperature"
  ) {
    throw new TypeError("storageMode is invalid");
  }

  return value;
}

function localIdentity(
  value: unknown,
): string {
  const text =
    boundedText(
      value,
      MAX_LOCAL_IDENTITY_LENGTH,
      "production batch local identity",
    );

  if (text.includes(":")) {
    throw new TypeError(
      "production batch local identity cannot contain colon",
    );
  }

  return text;
}

export function createFoodProductionBatchId(
  value: unknown,
): FoodProductionBatchId {
  return `food-production-batch:${localIdentity(value)}` as FoodProductionBatchId;
}

export function parseFoodProductionBatchId(
  value: unknown,
): FoodProductionBatchId {
  const prefix =
    "food-production-batch:";

  const text =
    boundedText(
      value,
      prefix.length + MAX_LOCAL_IDENTITY_LENGTH,
      "production batch identity",
    );

  if (!text.startsWith(prefix)) {
    throw new TypeError(
      "wrong production batch identity prefix",
    );
  }

  return createFoodProductionBatchId(
    text.slice(prefix.length),
  );
}

export function validateFoodProductionBatchVersion(
  input: unknown,
): FoodProductionBatchVersion {
  const value =
    record(
      input,
      "production batch",
    );

  exactOwnKeys(
    value,
    [
      "kind",
      "id",
      "version",
      "sku",
      "batchCode",
      "storageMode",
      "producedPackageCount",
      "preparedOn",
      "frozenOn",
      "attribution",
      "sourceReference",
    ],
    "production batch",
  );

  if (
    value.kind !==
    FOOD_PRODUCTION_BATCH_KIND
  ) {
    throw new TypeError("production batch kind is invalid");
  }

  const sku =
    record(
      value.sku,
      "production batch SKU",
    );

  exactOwnKeys(
    sku,
    [
      "id",
      "version",
    ],
    "production batch SKU",
  );

  const mode =
    storageMode(
      value.storageMode,
    );

  const preparedOn =
    isoCalendarDate(
      value.preparedOn,
      "preparedOn",
    );

  let frozenOn: string | undefined;

  if (mode === "frozen") {
    frozenOn =
      isoCalendarDate(
        value.frozenOn,
        "frozenOn",
      );

    if (frozenOn < preparedOn) {
      throw new TypeError(
        "frozenOn cannot precede preparedOn",
      );
    }
  }
  else if (value.frozenOn !== undefined) {
    throw new TypeError(
      "non-frozen production batch must not supply frozenOn",
    );
  }

  const result: FoodProductionBatchVersion = {
    kind: FOOD_PRODUCTION_BATCH_KIND,

    id: parseFoodProductionBatchId(
      value.id,
    ),

    version: positiveSafeInteger(
      value.version,
      "production batch version",
    ),

    sku: Object.freeze({
      id: parseFoodSkuId(
        sku.id,
      ),

      version: positiveSafeInteger(
        sku.version,
        "SKU version",
      ),
    }),

    batchCode: boundedText(
      value.batchCode,
      MAX_TEXT_LENGTH,
      "batchCode",
    ),

    storageMode: mode,

    producedPackageCount: positiveSafeInteger(
      value.producedPackageCount,
      "producedPackageCount",
    ),

    preparedOn,

    ...(frozenOn === undefined
      ? {}
      : {
          frozenOn,
        }),

    attribution: boundedText(
      value.attribution,
      MAX_TEXT_LENGTH,
      "attribution",
    ),

    sourceReference: boundedText(
      value.sourceReference,
      MAX_TEXT_LENGTH,
      "sourceReference",
    ),
  };

  return Object.freeze(result);
}

export function createInitialFoodProductionBatchVersion(
  identityInput: unknown,
  skuInput: unknown,
  detailsInput: unknown,
): FoodProductionBatchVersion {
  const identity =
    record(
      identityInput,
      "production batch identity/version",
    );

  exactOwnKeys(
    identity,
    [
      "id",
      "version",
    ],
    "production batch identity/version",
  );

  const sku =
    record(
      skuInput,
      "production batch SKU input",
    );

  exactOwnKeys(
    sku,
    [
      "id",
      "version",
    ],
    "production batch SKU input",
  );

  const details =
    record(
      detailsInput,
      "production batch details",
    );

  exactOwnKeys(
    details,
    [
      "batchCode",
      "storageMode",
      "producedPackageCount",
      "preparedOn",
      "frozenOn",
      "attribution",
      "sourceReference",
    ],
    "production batch details",
  );

  const value =
    validateFoodProductionBatchVersion({
      kind: FOOD_PRODUCTION_BATCH_KIND,
      id: identity.id,
      version: identity.version,
      sku: {
        id: sku.id,
        version: sku.version,
      },
      batchCode: details.batchCode,
      storageMode: details.storageMode,
      producedPackageCount:
        details.producedPackageCount,
      preparedOn:
        details.preparedOn,
      frozenOn:
        details.frozenOn,
      attribution:
        details.attribution,
      sourceReference:
        details.sourceReference,
    });

  if (value.version !== 1) {
    throw new TypeError(
      "initial production batch version must be one",
    );
  }

  return value;
}
