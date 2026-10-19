/**
 * FOOD-007J
 *
 * Read durable held reservation quantities recorded against one exact
 * capacity-source revision.
 *
 * Recorded held quantity is not current active capacity, remaining capacity,
 * reservable quantity, ATP, governing authority, reservation acceptance, or
 * physical inventory movement.
 */

export const FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND =
  "governing-scope-recorded-held-capacity-commitment" as const;

export type FoodGoverningScopeRecordedHeldCapacityCommitmentSelector =
  | Readonly<{
      scope: "sku";
      sku: Readonly<{
        id: string;
        version: number;
      }>;
      governingRevision: number;
    }>
  | Readonly<{
      scope: "slot";
      method:
        | "personal-delivery"
        | "meetup";
      locationReference: string;
      windowReference: string;
      governingRevision: number;
    }>;

export type FoodGoverningScopeRecordedHeldCapacityCommitment =
  | Readonly<{
      kind:
        typeof FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND;
      scope: "sku";
      selector: Readonly<{
        sku: Readonly<{
          id: string;
          version: number;
        }>;
        governingRevision: number;
      }>;
      recordedHeldQuantity: number;
    }>
  | Readonly<{
      kind:
        typeof FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND;
      scope: "slot";
      selector: Readonly<{
        method:
          | "personal-delivery"
          | "meetup";
        locationReference: string;
        windowReference: string;
        governingRevision: number;
      }>;
      recordedHeldQuantity: number;
    }>;

export type FoodGoverningScopeRecordedHeldCapacityCommitmentReadResult =
  | Readonly<{
      outcome: "read";
      value:
        FoodGoverningScopeRecordedHeldCapacityCommitment;
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

export interface FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Result<T> {
  readonly success: boolean;
  readonly results?: T[];
}

export interface FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1BoundStatement {
  all<T>():
    Promise<
      FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Result<T>
    >;
}

export interface FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Statement {
  bind(
    ...values: unknown[]
  ):
    FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1BoundStatement;
}

export interface FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Database {
  prepare(
    sql: string,
  ):
    FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Statement;
}

type AggregateRow =
  Readonly<{
    recorded_held_quantity: unknown;
  }>;

type CapturedSkuSelector =
  Readonly<{
    scope: "sku";
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    governingRevision: number;
  }>;

type CapturedSlotSelector =
  Readonly<{
    scope: "slot";
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    governingRevision: number;
  }>;

type CapturedSelector =
  | CapturedSkuSelector
  | CapturedSlotSelector;

const SKU_SQL = `
SELECT
  COALESCE(SUM(line.quantity), 0) AS recorded_held_quantity
FROM food_capacity_reservation_lines AS line
INNER JOIN food_capacity_reservations AS reservation
  ON reservation.reservation_id = line.reservation_id
WHERE reservation.state = 'held'
  AND line.sku_id = ?
  AND line.sku_version = ?
  AND line.capacity_revision <= ?
`.trim();

const SLOT_SQL = `
SELECT
  COALESCE(SUM(slot.quantity), 0) AS recorded_held_quantity
FROM food_fulfillment_slot_reservations AS slot
INNER JOIN food_capacity_reservations AS reservation
  ON reservation.reservation_id = slot.reservation_id
WHERE reservation.state = 'held'
  AND slot.method = ?
  AND slot.location_reference = ?
  AND slot.window_reference = ?
  AND slot.capacity_revision <= ?
`.trim();

function objectValue(
  input: unknown,
): object {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Expected object",
    );
  }

  const prototype =
    Object.getPrototypeOf(input);

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError(
      "Unexpected prototype",
    );
  }

  return input;
}

function ownDataValue(
  input: unknown,
  key: string,
): unknown {
  const object =
    objectValue(input);

  const descriptor =
    Object.getOwnPropertyDescriptor(
      object,
      key,
    );

  if (
    !descriptor ||
    !descriptor.enumerable ||
    !("value" in descriptor)
  ) {
    throw new TypeError(
      `Expected own data property: ${key}`,
    );
  }

  return descriptor.value;
}

function exactObject(
  input: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  const object =
    objectValue(input);

  const ownKeys =
    Reflect.ownKeys(object);

  if (
    ownKeys.some(
      (key) =>
        typeof key !== "string",
    )
  ) {
    throw new TypeError(
      "Unexpected symbol property",
    );
  }

  const actual =
    [...ownKeys as string[]].sort();

  const expected =
    [...expectedKeys].sort();

  if (
    actual.length !== expected.length ||
    expected.some(
      (key, index) =>
        actual[index] !== key,
    )
  ) {
    throw new TypeError(
      "Unexpected object shape",
    );
  }

  const captured:
    Record<string, unknown> =
    Object.create(null);

  for (const key of expectedKeys) {
    captured[key] =
      ownDataValue(
        object,
        key,
      );
  }

  return Object.freeze(
    captured,
  );
}

function boundedReference(
  input: unknown,
): string {
  if (
    typeof input !== "string" ||
    input.length < 1 ||
    input.length > 512 ||
    input.trim() !== input
  ) {
    throw new TypeError(
      "Invalid reference",
    );
  }

  return input;
}

function positiveSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 1
  ) {
    throw new TypeError(
      "Expected positive safe integer",
    );
  }

  return input;
}

function nonnegativeSafeInteger(
  input: unknown,
): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 0
  ) {
    throw new TypeError(
      "Expected nonnegative safe integer",
    );
  }

  return input;
}

function method(
  input: unknown,
):
  | "personal-delivery"
  | "meetup" {
  if (
    input !== "personal-delivery" &&
    input !== "meetup"
  ) {
    throw new TypeError(
      "Invalid fulfillment method",
    );
  }

  return input;
}

function captureSelector(
  input: unknown,
): CapturedSelector {
  const scope =
    ownDataValue(
      input,
      "scope",
    );

  if (scope === "sku") {
    const root =
      exactObject(
        input,
        [
          "scope",
          "sku",
          "governingRevision",
        ],
      );

    const sku =
      exactObject(
        root.sku,
        [
          "id",
          "version",
        ],
      );

    return Object.freeze({
      scope: "sku",
      sku:
        Object.freeze({
          id:
            boundedReference(
              sku.id,
            ),
          version:
            positiveSafeInteger(
              sku.version,
            ),
        }),
      governingRevision:
        positiveSafeInteger(
          root.governingRevision,
        ),
    });
  }

  if (scope === "slot") {
    const root =
      exactObject(
        input,
        [
          "scope",
          "method",
          "locationReference",
          "windowReference",
          "governingRevision",
        ],
      );

    return Object.freeze({
      scope: "slot",
      method:
        method(
          root.method,
        ),
      locationReference:
        boundedReference(
          root.locationReference,
        ),
      windowReference:
        boundedReference(
          root.windowReference,
        ),
      governingRevision:
        positiveSafeInteger(
          root.governingRevision,
        ),
    });
  }

  throw new TypeError(
    "Invalid commitment scope",
  );
}

function readEnvelopeResults(
  input: unknown,
): unknown[] {
  const success =
    ownDataValue(
      input,
      "success",
    );

  if (success !== true) {
    throw new TypeError(
      "Storage operation unsuccessful",
    );
  }

  const results =
    ownDataValue(
      input,
      "results",
    );

  if (!Array.isArray(results)) {
    throw new TypeError(
      "Storage results missing",
    );
  }

  return results;
}

function readAggregateQuantity(
  results: unknown[],
): number {
  if (results.length !== 1) {
    throw new TypeError(
      "Expected exactly one aggregate row",
    );
  }

  const row =
    exactObject(
      results[0],
      [
        "recorded_held_quantity",
      ],
    );

  return nonnegativeSafeInteger(
    row.recorded_held_quantity,
  );
}

function skuValue(
  selector: CapturedSkuSelector,
  quantity: number,
): FoodGoverningScopeRecordedHeldCapacityCommitment {
  return Object.freeze({
    kind:
      FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND,
    scope: "sku",
    selector:
      Object.freeze({
        sku:
          Object.freeze({
            id:
              selector.sku.id,
            version:
              selector.sku.version,
          }),
        governingRevision:
          selector.governingRevision,
      }),
    recordedHeldQuantity:
      quantity,
  });
}

function slotValue(
  selector: CapturedSlotSelector,
  quantity: number,
): FoodGoverningScopeRecordedHeldCapacityCommitment {
  return Object.freeze({
    kind:
      FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND,
    scope: "slot",
    selector:
      Object.freeze({
        method:
          selector.method,
        locationReference:
          selector.locationReference,
        windowReference:
          selector.windowReference,
        governingRevision:
          selector.governingRevision,
      }),
    recordedHeldQuantity:
      quantity,
  });
}

export async function readFoodGoverningScopeRecordedHeldCapacityCommitment(
  database:
    FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Database,
  input:
    FoodGoverningScopeRecordedHeldCapacityCommitmentSelector,
): Promise<
  FoodGoverningScopeRecordedHeldCapacityCommitmentReadResult
> {
  let selector:
    CapturedSelector;

  try {
    selector =
      captureSelector(
        input,
      );
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  try {
    if (selector.scope === "sku") {
      const response =
        await database
          .prepare(
            SKU_SQL,
          )
          .bind(
            selector.sku.id,
            selector.sku.version,
            selector.governingRevision,
          )
          .all<AggregateRow>();

      const quantity =
        readAggregateQuantity(
          readEnvelopeResults(
            response,
          ),
        );

      return Object.freeze({
        outcome: "read",
        value:
          skuValue(
            selector,
            quantity,
          ),
      });
    }

    const response =
      await database
        .prepare(
          SLOT_SQL,
        )
        .bind(
          selector.method,
          selector.locationReference,
          selector.windowReference,
          selector.governingRevision,
        )
        .all<AggregateRow>();

    const quantity =
      readAggregateQuantity(
        readEnvelopeResults(
          response,
        ),
      );

    return Object.freeze({
      outcome: "read",
      value:
        slotValue(
          selector,
          quantity,
        ),
    });
  }
  catch {
    return Object.freeze({
      outcome:
        "storage-failure",
    });
  }
}
