/**
 * FOOD-007V
 *
 * Authoritative durable capacity-reservation mutation boundary.
 *
 * Exact durable replay is resolved before fresh admission.
 *
 * Fresh authority is re-established against durable state immediately
 * before a single atomic D1 batch. The parent insert repeats every
 * governing-source and capacity guard inside the transaction by writing
 * an intentionally invalid reservation state when a guard fails.
 *
 * Migration 0003 only permits state = 'held'; therefore a failed guard
 * must abort the batch rather than silently create a partial reservation.
 *
 * Real D1 concurrency/rollback behavior remains integration-deferred.
 */

import {
  type FoodD1Database,
  type FoodD1Result,
  type FoodD1Statement,
} from "./d1-draft-persistence";
import {
  FOOD_RESERVATION_HOLD_COMMAND_KIND,
  type FoodCapacityReservationId,
  type FoodReservationHoldCommand,
} from "./reservation-hold-command";
import {
  FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
  type FoodReservationCapacitySourceSelectionRequest,
} from "./reservation-capacity-source-selection-request";
import {
  validateFoodFulfillmentIntentVersion,
  validateFoodReservationRequestVersion,
  type FoodFulfillmentIntentId,
  type FoodFulfillmentMethod,
  type FoodReservationRequestId,
} from "./fulfillment-capacity-reservation-domain";
import {
  parseFoodPhysicalOrderId,
  type FoodPhysicalOrderId,
} from "./physical-order-domain";
import {
  parseFoodSkuId,
  type FoodSkuId,
} from "./package-sku-domain";
import {
  validateFoodVersion,
} from "./draft-domain";

export const FOOD_AUTHORITATIVE_CAPACITY_RESERVATION_MUTATION_RECEIPT_KIND =
  "authoritative-capacity-reservation-mutation-receipt" as const;

export type FoodAuthoritativeCapacityReservationD1Database =
  FoodD1Database;

export type FoodAuthoritativeCapacityReservationSkuClaim =
  Readonly<{
    sku: Readonly<{
      id: FoodSkuId;
      version: number;
    }>;
    capacityRevision: number;
    quantity: number;
  }>;

export type FoodAuthoritativeCapacityReservationSlotClaim =
  Readonly<{
    method: FoodFulfillmentMethod;
    locationReference: string;
    windowReference: string;
    capacityRevision: number;
    quantity: 1;
  }>;

export type FoodAuthoritativeCapacityReservationMutationReceipt =
  Readonly<{
    kind:
      typeof FOOD_AUTHORITATIVE_CAPACITY_RESERVATION_MUTATION_RECEIPT_KIND;
    reservationId:
      FoodCapacityReservationId;
    order: Readonly<{
      id: FoodPhysicalOrderId;
      version: number;
    }>;
    reservationRequest: Readonly<{
      id: FoodReservationRequestId;
      version: number;
    }>;
    fulfillmentIntent: Readonly<{
      id: FoodFulfillmentIntentId;
      version: number;
    }>;
    skuClaims:
      readonly FoodAuthoritativeCapacityReservationSkuClaim[];
    slotClaim:
      FoodAuthoritativeCapacityReservationSlotClaim;
  }>;

export type FoodAuthoritativeCapacityReservationMutationResult =
  | Readonly<{
      outcome: "created";
      value:
        FoodAuthoritativeCapacityReservationMutationReceipt;
    }>
  | Readonly<{
      outcome: "already-present";
      value:
        FoodAuthoritativeCapacityReservationMutationReceipt;
    }>
  | Readonly<{
      outcome: "governing-source-mismatch";
    }>
  | Readonly<{
      outcome: "insufficient-capacity";
    }>
  | Readonly<{
      outcome: "conflict";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>
  | Readonly<{
      outcome: "invalid";
    }>;

type BindValue =
  string |
  number |
  null;

type CapturedRecord =
  Record<string, unknown>;

type ExpectedReservation =
  Readonly<{
    command:
      FoodReservationHoldCommand;
    canonicalDemandJson:
      string;
    receipt:
      FoodAuthoritativeCapacityReservationMutationReceipt;
  }>;

type ReplayResolution =
  | Readonly<{
      status: "absent";
    }>
  | Readonly<{
      status: "exact";
      receipt:
        FoodAuthoritativeCapacityReservationMutationReceipt;
    }>
  | Readonly<{
      status: "conflict";
    }>
  | Readonly<{
      status: "storage-failure";
    }>;

type FreshState =
  | Readonly<{
      status: "admissible";
    }>
  | Readonly<{
      status: "governing-source-mismatch";
    }>
  | Readonly<{
      status: "insufficient-capacity";
    }>
  | Readonly<{
      status: "storage-failure";
    }>;

type ParentRow =
  Readonly<{
    reservationId: string;
    orderId: string;
    orderVersion: number;
    reservationRequestId: string;
    reservationRequestVersion: number;
    canonicalDemandJson: string;
    state: "held";
  }>;

type LineRow =
  Readonly<{
    reservationId: string;
    lineIndex: number;
    skuId: FoodSkuId;
    skuVersion: number;
    capacityRevision: number;
    quantity: number;
  }>;

type SlotRow =
  Readonly<{
    reservationId: string;
    method: FoodFulfillmentMethod;
    locationReference: string;
    windowReference: string;
    capacityRevision: number;
    quantity: 1;
  }>;

const PARENT_READ_SQL = `
SELECT
  reservation_id,
  order_id,
  order_version,
  reservation_request_id,
  reservation_request_version,
  canonical_demand_json,
  state
FROM food_capacity_reservations
WHERE reservation_id = ?
LIMIT 2
`.trim();

const LINES_READ_SQL = `
SELECT
  reservation_id,
  line_index,
  sku_id,
  sku_version,
  capacity_revision,
  quantity
FROM food_capacity_reservation_lines
WHERE reservation_id = ?
ORDER BY line_index ASC
`.trim();

const SLOT_READ_SQL = `
SELECT
  reservation_id,
  method,
  location_reference,
  window_reference,
  capacity_revision,
  quantity
FROM food_fulfillment_slot_reservations
WHERE reservation_id = ?
LIMIT 2
`.trim();

const LATEST_SKU_SOURCE_SQL = `
SELECT
  revision,
  capacity_units
FROM food_sku_capacity_sources
WHERE sku_id = ?
  AND sku_version = ?
ORDER BY revision DESC
LIMIT 1
`.trim();

const SKU_HELD_SQL = `
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

const LATEST_SLOT_SOURCE_SQL = `
SELECT
  revision,
  capacity_units
FROM food_fulfillment_slot_capacity_sources
WHERE method = ?
  AND location_reference = ?
  AND window_reference = ?
ORDER BY revision DESC
LIMIT 1
`.trim();

const SLOT_HELD_SQL = `
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

function invalid():
  FoodAuthoritativeCapacityReservationMutationResult {
  return Object.freeze({
    outcome: "invalid",
  });
}

function storageFailure():
  FoodAuthoritativeCapacityReservationMutationResult {
  return Object.freeze({
    outcome: "storage-failure",
  });
}

function governingSourceMismatch():
  FoodAuthoritativeCapacityReservationMutationResult {
  return Object.freeze({
    outcome: "governing-source-mismatch",
  });
}

function insufficientCapacity():
  FoodAuthoritativeCapacityReservationMutationResult {
  return Object.freeze({
    outcome: "insufficient-capacity",
  });
}

function conflict():
  FoodAuthoritativeCapacityReservationMutationResult {
  return Object.freeze({
    outcome: "conflict",
  });
}

function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new TypeError(message);
  }
}

function capture(
  input: unknown,
  ancestors: readonly object[] = [],
): unknown {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  if (
    typeof input === "number" &&
    Number.isFinite(input)
  ) {
    return input;
  }

  requireCondition(
    typeof input === "object",
    "Expected plain data",
  );

  requireCondition(
    !ancestors.includes(input),
    "Cycles are unsupported",
  );

  const isArray =
    Array.isArray(input);

  requireCondition(
    Object.getPrototypeOf(input) ===
      (
        isArray
          ? Array.prototype
          : Object.prototype
      ),
    "Unexpected prototype",
  );

  const descriptors =
    Object.getOwnPropertyDescriptors(
      input,
    );

  const keys =
    Reflect.ownKeys(
      descriptors,
    );

  requireCondition(
    keys.every(
      (key) =>
        typeof key === "string",
    ),
    "Symbol property",
  );

  const nextAncestors =
    [...ancestors, input];

  if (isArray) {
    const lengthDescriptor =
      descriptors.length;

    requireCondition(
      Boolean(lengthDescriptor) &&
        "value" in lengthDescriptor,
      "Missing array length",
    );

    const length =
      lengthDescriptor.value;

    requireCondition(
      typeof length === "number" &&
        Number.isSafeInteger(length) &&
        length >= 0,
      "Invalid array length",
    );

    requireCondition(
      keys.length === length + 1,
      "Sparse or extended array",
    );

    const result: unknown[] = [];

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const descriptor =
        descriptors[
          String(index)
        ];

      requireCondition(
        Boolean(descriptor) &&
          "value" in descriptor,
        "Invalid array element",
      );

      result.push(
        capture(
          descriptor.value,
          nextAncestors,
        ),
      );
    }

    return result;
  }

  const result:
    Record<string, unknown> =
      {};

  for (const key of keys) {
    requireCondition(
      typeof key === "string",
      "Unexpected key",
    );

    const descriptor =
      descriptors[key];

    requireCondition(
      Boolean(descriptor) &&
        "value" in descriptor,
      "Accessor property",
    );

    result[key] =
      capture(
        descriptor.value,
        nextAncestors,
      );
  }

  return result;
}

function record(
  input: unknown,
  expectedKeys: readonly string[],
  message: string,
): CapturedRecord {
  requireCondition(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input),
    message,
  );

  const value =
    input as CapturedRecord;

  const keys =
    Object.keys(
      value,
    );

  requireCondition(
    keys.length ===
      expectedKeys.length &&
      expectedKeys.every(
        (key) =>
          Object.hasOwn(
            value,
            key,
          ),
      ),
    message,
  );

  return value;
}

function array(
  input: unknown,
  message: string,
): readonly unknown[] {
  requireCondition(
    Array.isArray(input),
    message,
  );

  return input;
}

function positiveSafeInteger(
  input: unknown,
  message: string,
): number {
  requireCondition(
    typeof input === "number" &&
      Number.isSafeInteger(input) &&
      input > 0,
    message,
  );

  return input;
}

function nonnegativeSafeInteger(
  input: unknown,
  message: string,
): number {
  requireCondition(
    typeof input === "number" &&
      Number.isSafeInteger(input) &&
      input >= 0,
    message,
  );

  return input;
}

function boundedText(
  input: unknown,
  maximum: number,
  message: string,
): string {
  requireCondition(
    typeof input === "string",
    message,
  );

  const length =
    Array.from(
      input.split(
        "\0",
        1,
      )[0]!,
    ).length;

  requireCondition(
    length >= 1 &&
      length <= maximum,
    message,
  );

  return input;
}

function reservationId(
  input: unknown,
): FoodCapacityReservationId {
  return boundedText(
    input,
    512,
    "Invalid reservation identity",
  ) as FoodCapacityReservationId;
}

function canonicalDemandJson(
  request:
    FoodReservationCapacitySourceSelectionRequest["request"],
): string {
  return JSON.stringify(
    request.capacityRequirements.map(
      (line) => ({
        sku: {
          id:
            line.sku.id,
          version:
            line.sku.version,
        },
        quantity:
          line.quantity,
      }),
    ),
  );
}

function validateSelection(
  input: unknown,
): FoodReservationCapacitySourceSelectionRequest {
  const root =
    record(
      input,
      [
        "kind",
        "request",
        "fulfillmentIntent",
        "skuSelections",
        "slotSelection",
      ],
      "Invalid selection",
    );

  requireCondition(
    root.kind ===
      FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
    "Invalid selection kind",
  );

  const request =
    validateFoodReservationRequestVersion(
      root.request,
    );

  const fulfillmentIntent =
    validateFoodFulfillmentIntentVersion(
      root.fulfillmentIntent,
    );

  requireCondition(
    request.fulfillmentIntent.id ===
      fulfillmentIntent.id &&
      request.fulfillmentIntent.version ===
        fulfillmentIntent.version,
    "Request/intent mismatch",
  );

  requireCondition(
    request.quote.id ===
      fulfillmentIntent.quote.id &&
      request.quote.version ===
        fulfillmentIntent.quote.version,
    "Request/intent quote mismatch",
  );

  const rawSelections =
    array(
      root.skuSelections,
      "Invalid SKU selections",
    );

  requireCondition(
    rawSelections.length ===
      request.capacityRequirements.length,
    "SKU selection count mismatch",
  );

  const skuSelections =
    rawSelections.map(
      (
        rawSelection,
        index,
      ) => {
        const selection =
          record(
            rawSelection,
            [
              "sku",
              "revision",
            ],
            "Invalid SKU selection",
          );

        const sku =
          record(
            selection.sku,
            [
              "id",
              "version",
            ],
            "Invalid selected SKU",
          );

        const demand =
          request.capacityRequirements[
            index
          ];

        requireCondition(
          Boolean(demand),
          "Missing demand",
        );

        const id =
          parseFoodSkuId(
            sku.id,
          );

        const version =
          validateFoodVersion(
            sku.version,
          );

        requireCondition(
          id === demand!.sku.id &&
            version ===
              demand!.sku.version,
          "Selection demand-order mismatch",
        );

        return Object.freeze({
          sku:
            Object.freeze({
              id,
              version,
            }),
          revision:
            positiveSafeInteger(
              selection.revision,
              "Invalid selected revision",
            ),
        });
      },
    );

  const rawSlot =
    record(
      root.slotSelection,
      [
        "method",
        "locationReference",
        "windowReference",
        "revision",
      ],
      "Invalid slot selection",
    );

  requireCondition(
    rawSlot.method ===
      fulfillmentIntent.method &&
      rawSlot.locationReference ===
        fulfillmentIntent.locationReference &&
      rawSlot.windowReference ===
        fulfillmentIntent.windowReference,
    "Slot selection mismatch",
  );

  return Object.freeze({
    kind:
      FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND,
    request,
    fulfillmentIntent,
    skuSelections:
      Object.freeze(
        skuSelections,
      ),
    slotSelection:
      Object.freeze({
        method:
          fulfillmentIntent.method,
        locationReference:
          fulfillmentIntent.locationReference,
        windowReference:
          fulfillmentIntent.windowReference,
        revision:
          positiveSafeInteger(
            rawSlot.revision,
            "Invalid slot revision",
          ),
      }),
  });
}

function validateCommand(
  input: unknown,
): FoodReservationHoldCommand {
  const captured =
    capture(
      input,
    );

  const root =
    record(
      captured,
      [
        "kind",
        "reservationId",
        "order",
        "selection",
      ],
      "Invalid hold command",
    );

  requireCondition(
    root.kind ===
      FOOD_RESERVATION_HOLD_COMMAND_KIND,
    "Invalid hold command kind",
  );

  const rawOrder =
    record(
      root.order,
      [
        "id",
        "version",
      ],
      "Invalid order identity",
    );

  const order =
    Object.freeze({
      id:
        parseFoodPhysicalOrderId(
          rawOrder.id,
        ),
      version:
        validateFoodVersion(
          rawOrder.version,
        ),
    });

  const selection =
    validateSelection(
      root.selection,
    );

  return Object.freeze({
    kind:
      FOOD_RESERVATION_HOLD_COMMAND_KIND,
    reservationId:
      reservationId(
        root.reservationId,
      ),
    order,
    selection,
  });
}

function receiptFromCommand(
  command:
    FoodReservationHoldCommand,
): FoodAuthoritativeCapacityReservationMutationReceipt {
  const claims =
    command.selection.request
      .capacityRequirements
      .map(
        (
          line,
          index,
        ) => {
          const selected =
            command.selection
              .skuSelections[
                index
              ];

          requireCondition(
            Boolean(selected),
            "Missing selected claim",
          );

          return Object.freeze({
            sku:
              Object.freeze({
                id:
                  line.sku.id,
                version:
                  line.sku.version,
              }),
            capacityRevision:
              selected!.revision,
            quantity:
              line.quantity,
          });
        },
      );

  return Object.freeze({
    kind:
      FOOD_AUTHORITATIVE_CAPACITY_RESERVATION_MUTATION_RECEIPT_KIND,
    reservationId:
      command.reservationId,
    order:
      Object.freeze({
        id:
          command.order.id,
        version:
          command.order.version,
      }),
    reservationRequest:
      Object.freeze({
        id:
          command.selection.request.id,
        version:
          command.selection.request.version,
      }),
    fulfillmentIntent:
      Object.freeze({
        id:
          command.selection
            .fulfillmentIntent.id,
        version:
          command.selection
            .fulfillmentIntent.version,
      }),
    skuClaims:
      Object.freeze(
        claims,
      ),
    slotClaim:
      Object.freeze({
        method:
          command.selection
            .slotSelection.method,
        locationReference:
          command.selection
            .slotSelection
            .locationReference,
        windowReference:
          command.selection
            .slotSelection
            .windowReference,
        capacityRevision:
          command.selection
            .slotSelection.revision,
        quantity: 1,
      }),
  });
}

function expectedReservation(
  command:
    FoodReservationHoldCommand,
): ExpectedReservation {
  return Object.freeze({
    command,
    canonicalDemandJson:
      canonicalDemandJson(
        command.selection.request,
      ),
    receipt:
      receiptFromCommand(
        command,
      ),
  });
}

function validDatabase(
  database: unknown,
): database is FoodD1Database {
  if (
    database === null ||
    typeof database !== "object"
  ) {
    return false;
  }

  const value =
    database as Record<
      string,
      unknown
    >;

  return (
    typeof value.prepare ===
      "function" &&
    typeof value.batch ===
      "function"
  );
}

function resultRows(
  result: FoodD1Result,
): readonly unknown[] {
  requireCondition(
    result !== null &&
      typeof result === "object",
    "Invalid D1 result",
  );

  requireCondition(
    result.success === true,
    "Unsuccessful D1 result",
  );

  requireCondition(
    Array.isArray(
      result.results,
    ),
    "Invalid D1 results",
  );

  return result.results;
}

async function readRows(
  database:
    FoodD1Database,
  sql:
    string,
  values:
    readonly BindValue[],
): Promise<readonly unknown[]> {
  const result =
    await database
      .prepare(
        sql,
      )
      .bind(
        ...values,
      )
      .all();

  return resultRows(
    result,
  );
}

function storedReservationRequestId(
  input: unknown,
): FoodReservationRequestId {
  requireCondition(
    typeof input === "string",
    "Invalid stored reservation request identity",
  );

  const prefix =
    "food-reservation-request:";

  requireCondition(
    input.startsWith(
      prefix,
    ),
    "Wrong stored request identity prefix",
  );

  const local =
    input.slice(
      prefix.length,
    );

  requireCondition(
    local.length >= 1 &&
      local.length <= 128 &&
      !local.includes(":"),
    "Invalid stored request identity",
  );

  return input as FoodReservationRequestId;
}

function parseParentRowCanonical(
  input: unknown,
): ParentRow {
  const row =
    record(
      input,
      [
        "reservation_id",
        "order_id",
        "order_version",
        "reservation_request_id",
        "reservation_request_version",
        "canonical_demand_json",
        "state",
      ],
      "Malformed reservation parent",
    );

  requireCondition(
    row.state === "held",
    "Invalid reservation state",
  );

  requireCondition(
    typeof row.canonical_demand_json ===
      "string" &&
      row.canonical_demand_json.length >=
        2,
    "Invalid canonical demand JSON",
  );

  return Object.freeze({
    reservationId:
      boundedText(
        row.reservation_id,
        512,
        "Invalid stored reservation id",
      ),
    orderId:
      parseFoodPhysicalOrderId(
        row.order_id,
      ),
    orderVersion:
      validateFoodVersion(
        row.order_version,
      ),
    reservationRequestId:
      storedReservationRequestId(
        row.reservation_request_id,
      ),
    reservationRequestVersion:
      validateFoodVersion(
        row.reservation_request_version,
      ),
    canonicalDemandJson:
      row.canonical_demand_json,
    state: "held",
  });
}

function parseLineRow(
  input: unknown,
): LineRow {
  const row =
    record(
      input,
      [
        "reservation_id",
        "line_index",
        "sku_id",
        "sku_version",
        "capacity_revision",
        "quantity",
      ],
      "Malformed reservation line",
    );

  return Object.freeze({
    reservationId:
      boundedText(
        row.reservation_id,
        512,
        "Invalid stored reservation id",
      ),
    lineIndex:
      nonnegativeSafeInteger(
        row.line_index,
        "Invalid line index",
      ),
    skuId:
      parseFoodSkuId(
        row.sku_id,
      ),
    skuVersion:
      validateFoodVersion(
        row.sku_version,
      ),
    capacityRevision:
      positiveSafeInteger(
        row.capacity_revision,
        "Invalid line capacity revision",
      ),
    quantity:
      positiveSafeInteger(
        row.quantity,
        "Invalid reserved quantity",
      ),
  });
}

function parseSlotRow(
  input: unknown,
): SlotRow {
  const row =
    record(
      input,
      [
        "reservation_id",
        "method",
        "location_reference",
        "window_reference",
        "capacity_revision",
        "quantity",
      ],
      "Malformed slot reservation",
    );

  requireCondition(
    row.method ===
      "personal-delivery" ||
      row.method ===
        "meetup",
    "Invalid stored fulfillment method",
  );

  requireCondition(
    row.quantity === 1,
    "Invalid stored slot quantity",
  );

  return Object.freeze({
    reservationId:
      boundedText(
        row.reservation_id,
        512,
        "Invalid stored reservation id",
      ),
    method:
      row.method,
    locationReference:
      boundedText(
        row.location_reference,
        512,
        "Invalid stored location",
      ),
    windowReference:
      boundedText(
        row.window_reference,
        512,
        "Invalid stored window",
      ),
    capacityRevision:
      positiveSafeInteger(
        row.capacity_revision,
        "Invalid stored slot revision",
      ),
    quantity: 1,
  });
}

function parentMatches(
  parent: ParentRow,
  expected:
    ExpectedReservation,
): boolean {
  return (
    parent.reservationId ===
      expected.command.reservationId &&
    parent.orderId ===
      expected.command.order.id &&
    parent.orderVersion ===
      expected.command.order.version &&
    parent.reservationRequestId ===
      expected.command.selection
        .request.id &&
    parent.reservationRequestVersion ===
      expected.command.selection
        .request.version &&
    parent.canonicalDemandJson ===
      expected.canonicalDemandJson
  );
}

function linesMatch(
  lines:
    readonly LineRow[],
  expected:
    ExpectedReservation,
): "exact" | "conflict" | "storage-failure" {
  const claims =
    expected.receipt
      .skuClaims;

  if (
    lines.length <
    claims.length
  ) {
    return "storage-failure";
  }

  if (
    lines.length >
    claims.length
  ) {
    return "conflict";
  }

  for (
    let index = 0;
    index < claims.length;
    index += 1
  ) {
    const row =
      lines[index];

    const claim =
      claims[index];

    if (
      !row ||
      !claim
    ) {
      return "storage-failure";
    }

    if (
      row.lineIndex !== index
    ) {
      return "conflict";
    }

    if (
      row.reservationId !==
        expected.command
          .reservationId ||
      row.skuId !==
        claim.sku.id ||
      row.skuVersion !==
        claim.sku.version ||
      row.capacityRevision !==
        claim.capacityRevision ||
      row.quantity !==
        claim.quantity
    ) {
      return "conflict";
    }
  }

  return "exact";
}

function slotMatches(
  slot: SlotRow,
  expected:
    ExpectedReservation,
): boolean {
  const claim =
    expected.receipt
      .slotClaim;

  return (
    slot.reservationId ===
      expected.command
        .reservationId &&
    slot.method ===
      claim.method &&
    slot.locationReference ===
      claim.locationReference &&
    slot.windowReference ===
      claim.windowReference &&
    slot.capacityRevision ===
      claim.capacityRevision &&
    slot.quantity ===
      claim.quantity
  );
}

async function resolveReplay(
  database:
    FoodD1Database,
  expected:
    ExpectedReservation,
): Promise<ReplayResolution> {
  try {
    const parentRows =
      await readRows(
        database,
        PARENT_READ_SQL,
        [
          expected.command
            .reservationId,
        ],
      );

    if (
      parentRows.length === 0
    ) {
      return Object.freeze({
        status: "absent",
      });
    }

    if (
      parentRows.length !== 1
    ) {
      return Object.freeze({
        status:
          "storage-failure",
      });
    }

    const parent =
      parseParentRowCanonical(
        parentRows[0],
      );

    if (
      !parentMatches(
        parent,
        expected,
      )
    ) {
      return Object.freeze({
        status: "conflict",
      });
    }

    const lineRows =
      await readRows(
        database,
        LINES_READ_SQL,
        [
          expected.command
            .reservationId,
        ],
      );

    const parsedLines =
      lineRows.map(
        parseLineRow,
      );

    const lineState =
      linesMatch(
        parsedLines,
        expected,
      );

    if (
      lineState !== "exact"
    ) {
      return Object.freeze({
        status:
          lineState,
      });
    }

    const slotRows =
      await readRows(
        database,
        SLOT_READ_SQL,
        [
          expected.command
            .reservationId,
        ],
      );

    if (
      slotRows.length === 0
    ) {
      return Object.freeze({
        status:
          "storage-failure",
      });
    }

    if (
      slotRows.length !== 1
    ) {
      return Object.freeze({
        status:
          "storage-failure",
      });
    }

    const slot =
      parseSlotRow(
        slotRows[0],
      );

    if (
      !slotMatches(
        slot,
        expected,
      )
    ) {
      return Object.freeze({
        status: "conflict",
      });
    }

    return Object.freeze({
      status: "exact",
      receipt:
        expected.receipt,
    });
  }
  catch {
    return Object.freeze({
      status:
        "storage-failure",
    });
  }
}

function sourceRow(
  rows:
    readonly unknown[],
): Readonly<{
  revision: number;
  capacityUnits: number;
}> {
  requireCondition(
    rows.length === 1,
    "Missing capacity source",
  );

  const row =
    record(
      rows[0],
      [
        "revision",
        "capacity_units",
      ],
      "Malformed capacity source",
    );

  return Object.freeze({
    revision:
      positiveSafeInteger(
        row.revision,
        "Invalid source revision",
      ),
    capacityUnits:
      nonnegativeSafeInteger(
        row.capacity_units,
        "Invalid source capacity",
      ),
  });
}

function heldRow(
  rows:
    readonly unknown[],
): number {
  requireCondition(
    rows.length === 1,
    "Malformed held aggregate",
  );

  const row =
    record(
      rows[0],
      [
        "recorded_held_quantity",
      ],
      "Malformed held aggregate",
    );

  return nonnegativeSafeInteger(
    row.recorded_held_quantity,
    "Invalid held aggregate",
  );
}

function adjustedDelta(
  capacityUnits: number,
  held: number,
  demand: number,
): number {
  const value =
    BigInt(
      capacityUnits,
    ) -
    BigInt(
      held,
    ) -
    BigInt(
      demand,
    );

  requireCondition(
    value >=
      BigInt(
        Number.MIN_SAFE_INTEGER,
      ) &&
      value <=
        BigInt(
          Number.MAX_SAFE_INTEGER,
        ),
    "Unsafe capacity arithmetic",
  );

  return Number(
    value,
  );
}

async function readFreshState(
  database:
    FoodD1Database,
  expected:
    ExpectedReservation,
): Promise<FreshState> {
  try {
    const requirements =
      expected.command
        .selection.request
        .capacityRequirements;

    const selections =
      expected.command
        .selection
        .skuSelections;

    for (
      let index = 0;
      index <
      requirements.length;
      index += 1
    ) {
      const demand =
        requirements[
          index
        ];

      const selected =
        selections[
          index
        ];

      requireCondition(
        Boolean(demand) &&
          Boolean(selected),
        "Missing canonical demand",
      );

      const source =
        sourceRow(
          await readRows(
            database,
            LATEST_SKU_SOURCE_SQL,
            [
              demand!.sku.id,
              demand!.sku.version,
            ],
          ),
        );

      if (
        source.revision !==
        selected!.revision
      ) {
        return Object.freeze({
          status:
            "governing-source-mismatch",
        });
      }

      const held =
        heldRow(
          await readRows(
            database,
            SKU_HELD_SQL,
            [
              demand!.sku.id,
              demand!.sku.version,
              selected!.revision,
            ],
          ),
        );

      if (
        adjustedDelta(
          source.capacityUnits,
          held,
          demand!.quantity,
        ) < 0
      ) {
        return Object.freeze({
          status:
            "insufficient-capacity",
        });
      }
    }

    const slot =
      expected.command
        .selection
        .slotSelection;

    const slotSource =
      sourceRow(
        await readRows(
          database,
          LATEST_SLOT_SOURCE_SQL,
          [
            slot.method,
            slot.locationReference,
            slot.windowReference,
          ],
        ),
      );

    if (
      slotSource.revision !==
      slot.revision
    ) {
      return Object.freeze({
        status:
          "governing-source-mismatch",
      });
    }

    const slotHeld =
      heldRow(
        await readRows(
          database,
          SLOT_HELD_SQL,
          [
            slot.method,
            slot.locationReference,
            slot.windowReference,
            slot.revision,
          ],
        ),
      );

    if (
      adjustedDelta(
        slotSource.capacityUnits,
        slotHeld,
        1,
      ) < 0
    ) {
      return Object.freeze({
        status:
          "insufficient-capacity",
      });
    }

    return Object.freeze({
      status: "admissible",
    });
  }
  catch {
    return Object.freeze({
      status:
        "storage-failure",
    });
  }
}

function skuGuard(
  claim:
    FoodAuthoritativeCapacityReservationSkuClaim,
): Readonly<{
  sql: string;
  values:
    readonly BindValue[];
}> {
  return Object.freeze({
    sql: `
EXISTS (
  SELECT 1
  FROM food_sku_capacity_sources AS source
  WHERE source.sku_id = ?
    AND source.sku_version = ?
    AND source.revision = ?
    AND source.revision = (
      SELECT MAX(latest.revision)
      FROM food_sku_capacity_sources AS latest
      WHERE latest.sku_id = ?
        AND latest.sku_version = ?
    )
    AND (
      source.capacity_units
      -
      COALESCE(
        (
          SELECT SUM(line.quantity)
          FROM food_capacity_reservation_lines AS line
          INNER JOIN food_capacity_reservations AS reservation
            ON reservation.reservation_id = line.reservation_id
          WHERE reservation.state = 'held'
            AND line.sku_id = ?
            AND line.sku_version = ?
            AND line.capacity_revision <= source.revision
        ),
        0
      )
      -
      ?
    ) >= 0
)
`.trim(),
    values:
      Object.freeze([
        claim.sku.id,
        claim.sku.version,
        claim.capacityRevision,
        claim.sku.id,
        claim.sku.version,
        claim.sku.id,
        claim.sku.version,
        claim.quantity,
      ]),
  });
}

function slotGuard(
  claim:
    FoodAuthoritativeCapacityReservationSlotClaim,
): Readonly<{
  sql: string;
  values:
    readonly BindValue[];
}> {
  return Object.freeze({
    sql: `
EXISTS (
  SELECT 1
  FROM food_fulfillment_slot_capacity_sources AS source
  WHERE source.method = ?
    AND source.location_reference = ?
    AND source.window_reference = ?
    AND source.revision = ?
    AND source.revision = (
      SELECT MAX(latest.revision)
      FROM food_fulfillment_slot_capacity_sources AS latest
      WHERE latest.method = ?
        AND latest.location_reference = ?
        AND latest.window_reference = ?
    )
    AND (
      source.capacity_units
      -
      COALESCE(
        (
          SELECT SUM(slot.quantity)
          FROM food_fulfillment_slot_reservations AS slot
          INNER JOIN food_capacity_reservations AS reservation
            ON reservation.reservation_id = slot.reservation_id
          WHERE reservation.state = 'held'
            AND slot.method = ?
            AND slot.location_reference = ?
            AND slot.window_reference = ?
            AND slot.capacity_revision <= source.revision
        ),
        0
      )
      -
      1
    ) >= 0
)
`.trim(),
    values:
      Object.freeze([
        claim.method,
        claim.locationReference,
        claim.windowReference,
        claim.capacityRevision,
        claim.method,
        claim.locationReference,
        claim.windowReference,
        claim.method,
        claim.locationReference,
        claim.windowReference,
      ]),
  });
}

function parentInsert(
  expected:
    ExpectedReservation,
): Readonly<{
  sql: string;
  values:
    readonly BindValue[];
}> {
  const guards =
    expected.receipt
      .skuClaims
      .map(
        skuGuard,
      );

  const slot =
    slotGuard(
      expected.receipt
        .slotClaim,
    );

  const allGuards =
    [
      ...guards,
      slot,
    ];

  const predicate =
    allGuards
      .map(
        (guard) =>
          `(${guard.sql})`,
      )
      .join(
        "\nAND\n",
      );

  const guardValues =
    allGuards
      .flatMap(
        (guard) =>
          guard.values,
      );

  return Object.freeze({
    sql: `
INSERT INTO food_capacity_reservations (
  reservation_id,
  order_id,
  order_version,
  reservation_request_id,
  reservation_request_version,
  canonical_demand_json,
  state
)
SELECT
  ?,
  ?,
  ?,
  ?,
  ?,
  ?,
  CASE
    WHEN
      ${predicate}
    THEN 'held'
    ELSE 'food-007v-guard-failed'
  END
RETURNING
  reservation_id,
  order_id,
  order_version,
  reservation_request_id,
  reservation_request_version,
  canonical_demand_json,
  state
`.trim(),
    values:
      Object.freeze([
        expected.command
          .reservationId,
        expected.command
          .order.id,
        expected.command
          .order.version,
        expected.command
          .selection
          .request.id,
        expected.command
          .selection
          .request.version,
        expected
          .canonicalDemandJson,
        ...guardValues,
      ]),
  });
}

function lineInsert(
  reservationId:
    FoodCapacityReservationId,
  claim:
    FoodAuthoritativeCapacityReservationSkuClaim,
  lineIndex: number,
): Readonly<{
  sql: string;
  values:
    readonly BindValue[];
}> {
  return Object.freeze({
    sql: `
INSERT INTO food_capacity_reservation_lines (
  reservation_id,
  line_index,
  sku_id,
  sku_version,
  capacity_revision,
  quantity
)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING
  reservation_id,
  line_index,
  sku_id,
  sku_version,
  capacity_revision,
  quantity
`.trim(),
    values:
      Object.freeze([
        reservationId,
        lineIndex,
        claim.sku.id,
        claim.sku.version,
        claim.capacityRevision,
        claim.quantity,
      ]),
  });
}

function slotInsert(
  reservationId:
    FoodCapacityReservationId,
  claim:
    FoodAuthoritativeCapacityReservationSlotClaim,
): Readonly<{
  sql: string;
  values:
    readonly BindValue[];
}> {
  return Object.freeze({
    sql: `
INSERT INTO food_fulfillment_slot_reservations (
  reservation_id,
  method,
  location_reference,
  window_reference,
  capacity_revision,
  quantity
)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING
  reservation_id,
  method,
  location_reference,
  window_reference,
  capacity_revision,
  quantity
`.trim(),
    values:
      Object.freeze([
        reservationId,
        claim.method,
        claim.locationReference,
        claim.windowReference,
        claim.capacityRevision,
        1,
      ]),
  });
}

function statement(
  database:
    FoodD1Database,
  operation:
    Readonly<{
      sql: string;
      values:
        readonly BindValue[];
    }>,
): FoodD1Statement {
  return database
    .prepare(
      operation.sql,
    )
    .bind(
      ...operation.values,
    );
}

function mutationStatements(
  database:
    FoodD1Database,
  expected:
    ExpectedReservation,
): FoodD1Statement[] {
  const operations:
    Readonly<{
      sql: string;
      values:
        readonly BindValue[];
    }>[] =
      [
        parentInsert(
          expected,
        ),
        ...expected.receipt
          .skuClaims
          .map(
            (
              claim,
              index,
            ) =>
              lineInsert(
                expected.command
                  .reservationId,
                claim,
                index,
              ),
          ),
        slotInsert(
          expected.command
            .reservationId,
          expected.receipt
            .slotClaim,
        ),
      ];

  return operations.map(
    (operation) =>
      statement(
        database,
        operation,
      ),
  );
}

function exactChangedResult(
  input: FoodD1Result,
): readonly unknown[] {
  const rows =
    resultRows(
      input,
    );

  requireCondition(
    input.meta?.changes === 1,
    "Unexpected mutation change count",
  );

  requireCondition(
    rows.length === 1,
    "Missing mutation witness",
  );

  return rows;
}

function validateMutationResults(
  results:
    readonly FoodD1Result[],
  expected:
    ExpectedReservation,
): void {
  const expectedCount =
    expected.receipt
      .skuClaims.length +
    2;

  requireCondition(
    results.length ===
      expectedCount,
    "Unexpected batch result count",
  );

  const parentRows =
    exactChangedResult(
      results[0]!,
    );

  const parent =
    parseParentRowCanonical(
      parentRows[0],
    );

  requireCondition(
    parentMatches(
      parent,
      expected,
    ),
    "Parent witness mismatch",
  );

  for (
    let index = 0;
    index <
    expected.receipt
      .skuClaims.length;
    index += 1
  ) {
    const result =
      results[
        index + 1
      ];

    requireCondition(
      Boolean(result),
      "Missing line result",
    );

    const rows =
      exactChangedResult(
        result!,
      );

    const row =
      parseLineRow(
        rows[0],
      );

    const claim =
      expected.receipt
        .skuClaims[
          index
        ];

    requireCondition(
      Boolean(claim) &&
        row.reservationId ===
          expected.command
            .reservationId &&
        row.lineIndex ===
          index &&
        row.skuId ===
          claim!.sku.id &&
        row.skuVersion ===
          claim!.sku.version &&
        row.capacityRevision ===
          claim!.capacityRevision &&
        row.quantity ===
          claim!.quantity,
      "Line witness mismatch",
    );
  }

  const slotResult =
    results[
      results.length - 1
    ];

  requireCondition(
    Boolean(slotResult),
    "Missing slot result",
  );

  const slotRows =
    exactChangedResult(
      slotResult!,
    );

  const slot =
    parseSlotRow(
      slotRows[0],
    );

  requireCondition(
    slotMatches(
      slot,
      expected,
    ),
    "Slot witness mismatch",
  );
}

async function recoverAfterMutationFailure(
  database:
    FoodD1Database,
  expected:
    ExpectedReservation,
): Promise<
  FoodAuthoritativeCapacityReservationMutationResult
> {
  const replay =
    await resolveReplay(
      database,
      expected,
    );

  if (
    replay.status ===
    "exact"
  ) {
    return Object.freeze({
      outcome:
        "already-present",
      value:
        replay.receipt,
    });
  }

  if (
    replay.status ===
    "conflict"
  ) {
    return conflict();
  }

  if (
    replay.status ===
    "storage-failure"
  ) {
    return storageFailure();
  }

  const fresh =
    await readFreshState(
      database,
      expected,
    );

  if (
    fresh.status ===
    "governing-source-mismatch"
  ) {
    return governingSourceMismatch();
  }

  if (
    fresh.status ===
    "insufficient-capacity"
  ) {
    return insufficientCapacity();
  }

  return storageFailure();
}

async function executeFoodAuthoritativeCapacityReservationMutationCore(
  database:
    FoodAuthoritativeCapacityReservationD1Database,
  command:
    FoodReservationHoldCommand,
): Promise<
  FoodAuthoritativeCapacityReservationMutationResult
> {
  let canonical:
    FoodReservationHoldCommand;

  try {
    canonical =
      validateCommand(
        command,
      );
  }
  catch {
    return invalid();
  }

  if (
    !validDatabase(
      database,
    )
  ) {
    return storageFailure();
  }

  const expected =
    expectedReservation(
      canonical,
    );

  const replay =
    await resolveReplay(
      database,
      expected,
    );

  if (
    replay.status ===
    "exact"
  ) {
    return Object.freeze({
      outcome:
        "already-present",
      value:
        replay.receipt,
    });
  }

  if (
    replay.status ===
    "conflict"
  ) {
    return conflict();
  }

  if (
    replay.status ===
    "storage-failure"
  ) {
    return storageFailure();
  }

  const fresh =
    await readFreshState(
      database,
      expected,
    );

  if (
    fresh.status ===
    "governing-source-mismatch"
  ) {
    return governingSourceMismatch();
  }

  if (
    fresh.status ===
    "insufficient-capacity"
  ) {
    return insufficientCapacity();
  }

  if (
    fresh.status ===
    "storage-failure"
  ) {
    return storageFailure();
  }

  try {
    const results =
      await database.batch(
        mutationStatements(
          database,
          expected,
        ),
      );

    validateMutationResults(
      results,
      expected,
    );

    return Object.freeze({
      outcome: "created",
      value:
        expected.receipt,
    });
  }
  catch {
    return recoverAfterMutationFailure(
      database,
      expected,
    );
  }
}

/* FOOD-007X: durable fulfillment-intent binding integrity extension. */

const FOOD_007X_BINDING_READ_SQL = `
SELECT
  reservation_id,
  fulfillment_intent_id,
  fulfillment_intent_version
FROM food_capacity_reservation_fulfillment_intents
WHERE reservation_id = ?
LIMIT 2
`.trim();

const FOOD_007X_BINDING_INSERT_SQL = `
INSERT INTO food_capacity_reservation_fulfillment_intents (
  reservation_id,
  fulfillment_intent_id,
  fulfillment_intent_version
)
VALUES (?, ?, ?)
RETURNING
  reservation_id,
  fulfillment_intent_id,
  fulfillment_intent_version
`.trim();

const FOOD_007X_MISSING =
  Symbol(
    "food-007x-missing-data-property",
  );

type Food007xFulfillmentIntentBinding =
  Readonly<{
    reservationId: string;
    fulfillmentIntentId: string;
    fulfillmentIntentVersion: number;
  }>;

type Food007xBindingRead =
  | Readonly<{
      status: "found";
      value:
        Food007xFulfillmentIntentBinding;
    }>
  | Readonly<{
      status: "not-found";
    }>
  | Readonly<{
      status: "storage-failure";
    }>;

function food007xDirectRecord(
  input: unknown,
): object | undefined {
  if (
    input === null ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !==
      Object.prototype ||
    Object.getOwnPropertySymbols(input)
      .length !==
      0
  ) {
    return undefined;
  }

  return input;
}

function food007xOwnData(
  input: object,
  key: string,
): unknown | typeof FOOD_007X_MISSING {
  const descriptor =
    Object.getOwnPropertyDescriptor(
      input,
      key,
    );

  if (
    descriptor === undefined ||
    !Object.hasOwn(
      descriptor,
      "value",
    )
  ) {
    return FOOD_007X_MISSING;
  }

  return descriptor.value;
}

function food007xDirectArray(
  input: unknown,
): readonly unknown[] | undefined {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !==
      Array.prototype ||
    Object.getOwnPropertySymbols(input)
      .length !==
      0
  ) {
    return undefined;
  }

  const lengthDescriptor =
    Object.getOwnPropertyDescriptor(
      input,
      "length",
    );

  if (
    lengthDescriptor === undefined ||
    !Object.hasOwn(
      lengthDescriptor,
      "value",
    )
  ) {
    return undefined;
  }

  const length:
    unknown =
      lengthDescriptor.value;

  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0
  ) {
    return undefined;
  }

  const names =
    Object.getOwnPropertyNames(
      input,
    );

  if (
    names.length !==
      length + 1
  ) {
    return undefined;
  }

  const values:
    unknown[] =
      [];

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        String(index),
      );

    if (
      descriptor === undefined ||
      !Object.hasOwn(
        descriptor,
        "value",
      )
    ) {
      return undefined;
    }

    values.push(
      descriptor.value,
    );
  }

  return Object.freeze(
    values,
  );
}

function food007xResult(
  input: unknown,
):
  | Readonly<{
      rows: readonly unknown[];
      changes: number;
    }>
  | undefined {
  const record =
    food007xDirectRecord(
      input,
    );

  if (record === undefined) {
    return undefined;
  }

  const success =
    food007xOwnData(
      record,
      "success",
    );

  const results =
    food007xOwnData(
      record,
      "results",
    );

  const metaInput =
    food007xOwnData(
      record,
      "meta",
    );

  if (
    success !== true ||
    results ===
      FOOD_007X_MISSING ||
    metaInput ===
      FOOD_007X_MISSING
  ) {
    return undefined;
  }

  const rows =
    food007xDirectArray(
      results,
    );

  const meta =
    food007xDirectRecord(
      metaInput,
    );

  if (
    rows === undefined ||
    meta === undefined
  ) {
    return undefined;
  }

  const changes =
    food007xOwnData(
      meta,
      "changes",
    );

  if (
    typeof changes !== "number" ||
    !Number.isSafeInteger(
      changes,
    ) ||
    changes < 0
  ) {
    return undefined;
  }

  return Object.freeze({
    rows,
    changes,
  });
}

function food007xBindingRow(
  input: unknown,
):
  | Food007xFulfillmentIntentBinding
  | undefined {
  const record =
    food007xDirectRecord(
      input,
    );

  if (record === undefined) {
    return undefined;
  }

  const names =
    Object.getOwnPropertyNames(
      record,
    );

  if (
    names.length !== 3 ||
    !names.includes(
      "reservation_id",
    ) ||
    !names.includes(
      "fulfillment_intent_id",
    ) ||
    !names.includes(
      "fulfillment_intent_version",
    )
  ) {
    return undefined;
  }

  const reservationId =
    food007xOwnData(
      record,
      "reservation_id",
    );

  const fulfillmentIntentId =
    food007xOwnData(
      record,
      "fulfillment_intent_id",
    );

  const fulfillmentIntentVersion =
    food007xOwnData(
      record,
      "fulfillment_intent_version",
    );

  if (
    typeof reservationId !==
      "string" ||
    reservationId.length < 1 ||
    reservationId.length > 512 ||
    typeof fulfillmentIntentId !==
      "string" ||
    fulfillmentIntentId.length < 1 ||
    fulfillmentIntentId.length > 512 ||
    typeof fulfillmentIntentVersion !==
      "number" ||
    !Number.isSafeInteger(
      fulfillmentIntentVersion,
    ) ||
    fulfillmentIntentVersion < 1
  ) {
    return undefined;
  }

  return Object.freeze({
    reservationId,
    fulfillmentIntentId,
    fulfillmentIntentVersion,
  });
}

function food007xCaptureBindingInput(
  input: unknown,
):
  | Food007xFulfillmentIntentBinding
  | undefined {
  const command =
    food007xDirectRecord(
      input,
    );

  if (command === undefined) {
    return undefined;
  }

  const reservationId =
    food007xOwnData(
      command,
      "reservationId",
    );

  const selectionInput =
    food007xOwnData(
      command,
      "selection",
    );

  if (
    typeof reservationId !==
      "string" ||
    reservationId.length < 1 ||
    reservationId.length > 512 ||
    selectionInput ===
      FOOD_007X_MISSING
  ) {
    return undefined;
  }

  const selection =
    food007xDirectRecord(
      selectionInput,
    );

  if (selection === undefined) {
    return undefined;
  }

  const intentInput =
    food007xOwnData(
      selection,
      "fulfillmentIntent",
    );

  if (
    intentInput ===
      FOOD_007X_MISSING
  ) {
    return undefined;
  }

  const intent =
    food007xDirectRecord(
      intentInput,
    );

  if (intent === undefined) {
    return undefined;
  }

  const id =
    food007xOwnData(
      intent,
      "id",
    );

  const version =
    food007xOwnData(
      intent,
      "version",
    );

  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 512 ||
    typeof version !== "number" ||
    !Number.isSafeInteger(
      version,
    ) ||
    version < 1
  ) {
    return undefined;
  }

  return Object.freeze({
    reservationId,
    fulfillmentIntentId:
      id,
    fulfillmentIntentVersion:
      version,
  });
}

function food007xSameBinding(
  left:
    Food007xFulfillmentIntentBinding,
  right:
    Food007xFulfillmentIntentBinding,
): boolean {
  return (
    left.reservationId ===
      right.reservationId &&
    left.fulfillmentIntentId ===
      right.fulfillmentIntentId &&
    left.fulfillmentIntentVersion ===
      right.fulfillmentIntentVersion
  );
}

async function food007xReadBinding(
  database:
    FoodAuthoritativeCapacityReservationD1Database,
  reservationId: string,
): Promise<Food007xBindingRead> {
  try {
    const raw =
      await database
        .prepare(
          FOOD_007X_BINDING_READ_SQL,
        )
        .bind(
          reservationId,
        )
        .all();

    const result =
      food007xResult(
        raw,
      );

    if (result === undefined) {
      return Object.freeze({
        status:
          "storage-failure",
      });
    }

    if (
      result.rows.length === 0
    ) {
      return Object.freeze({
        status:
          "not-found",
      });
    }

    if (
      result.rows.length !== 1
    ) {
      return Object.freeze({
        status:
          "storage-failure",
      });
    }

    const value =
      food007xBindingRow(
        result.rows[0],
      );

    if (
      value === undefined ||
      value.reservationId !==
        reservationId
    ) {
      return Object.freeze({
        status:
          "storage-failure",
      });
    }

    return Object.freeze({
      status: "found",
      value,
    });
  }
  catch {
    return Object.freeze({
      status:
        "storage-failure",
    });
  }
}

function food007xRequireCreatedBindingWitness(
  input: unknown,
  expected:
    Food007xFulfillmentIntentBinding,
): void {
  const result =
    food007xResult(
      input,
    );

  if (
    result === undefined ||
    result.changes !== 1 ||
    result.rows.length !== 1
  ) {
    throw new TypeError(
      "Invalid FOOD-007X binding mutation witness",
    );
  }

  const row =
    food007xBindingRow(
      result.rows[0],
    );

  if (
    row === undefined ||
    !food007xSameBinding(
      row,
      expected,
    )
  ) {
    throw new TypeError(
      "FOOD-007X binding mutation witness mismatch",
    );
  }
}

function food007xDatabaseWithBinding(
  database:
    FoodAuthoritativeCapacityReservationD1Database,
  binding:
    Food007xFulfillmentIntentBinding,
):
  FoodAuthoritativeCapacityReservationD1Database {
  return Object.freeze({
    prepare(
      sql:
        Parameters<
          FoodAuthoritativeCapacityReservationD1Database["prepare"]
        >[0],
    ) {
      return database.prepare(
        sql,
      );
    },

    async batch(
      statements:
        Parameters<
          FoodAuthoritativeCapacityReservationD1Database["batch"]
        >[0],
    ) {
      const bindingStatement =
        database
          .prepare(
            FOOD_007X_BINDING_INSERT_SQL,
          )
          .bind(
            binding.reservationId,
            binding.fulfillmentIntentId,
            binding.fulfillmentIntentVersion,
          );

      const results =
        await database.batch([
          ...statements,
          bindingStatement,
        ]);

      const captured =
        food007xDirectArray(
          results,
        );

      if (
        captured === undefined ||
        captured.length !==
          statements.length + 1
      ) {
        throw new TypeError(
          "Invalid FOOD-007X atomic batch result",
        );
      }

      food007xRequireCreatedBindingWitness(
        captured[
          captured.length - 1
        ],
        binding,
      );

      const visibleResults =
        [];

      for (
        let index = 0;
        index <
        statements.length;
        index += 1
      ) {
        visibleResults.push(
          results[index]!,
        );
      }

      return visibleResults;
    },
  });
}

export async function executeFoodAuthoritativeCapacityReservationMutation(
  database:
    FoodAuthoritativeCapacityReservationD1Database,
  command:
    FoodReservationHoldCommand,
): Promise<
  FoodAuthoritativeCapacityReservationMutationResult
> {
  const binding =
    food007xCaptureBindingInput(
      command,
    );

  if (binding === undefined) {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  const result =
    await executeFoodAuthoritativeCapacityReservationMutationCore(
      food007xDatabaseWithBinding(
        database,
        binding,
      ),
      command,
    );

  if (
    result.outcome !==
      "already-present"
  ) {
    return result;
  }

  const durableBinding =
    await food007xReadBinding(
      database,
      binding.reservationId,
    );

  if (
    durableBinding.status ===
      "not-found" ||
    durableBinding.status ===
      "storage-failure"
  ) {
    return Object.freeze({
      outcome:
        "storage-failure",
    });
  }

  if (
    !food007xSameBinding(
      durableBinding.value,
      binding,
    )
  ) {
    return Object.freeze({
      outcome:
        "conflict",
    });
  }

  return result;
}
