/**
 * FOOD-007Z — Exact Durable Reservation Acceptance Evidence Read.
 *
 * Read-only exact durable reconstruction/authentication seam.
 *
 * Found evidence does not create checkout/payment readiness, payment status,
 * order-state mutation, preparation/dispatch/fulfillment authority,
 * completed-sale authority, physical-inventory truth or reservation
 * lifecycle authority.
 */

import {
  validateFoodVersion,
} from "./draft-domain";

import {
  parseFoodSkuId,
} from "./package-sku-domain";

import {
  validateFoodPurchaseQuantity,
} from "./cart-quote-domain";

import {
  parseFoodFulfillmentIntentId,
  parseFoodReservationRequestId,
  validateFoodFulfillmentMethod,
} from "./fulfillment-capacity-reservation-domain";

import {
  parseFoodPhysicalOrderId,
} from "./physical-order-domain";

import {
  parseFoodReservationAcceptanceId,
  validateFoodReservationAcceptanceVersion,
  type FoodReservationAcceptanceId,
  type FoodReservationAcceptanceVersion,
} from "./reservation-acceptance-domain";

import {
  FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND,
  type FoodDurableReservationAcceptanceEvidence,
} from "./d1-durable-reservation-acceptance-evidence-persistence";

export type FoodExactDurableReservationAcceptanceEvidenceReadResult =
  | Readonly<{
      outcome: "found";
      value: FoodDurableReservationAcceptanceEvidence;
    }>
  | Readonly<{
      outcome: "not-found";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>
  | Readonly<{
      outcome: "invalid";
    }>;

export interface FoodExactDurableReservationAcceptanceEvidenceReadD1Result<T> {
  readonly success: boolean;
  readonly results?: T[];
}

export interface FoodExactDurableReservationAcceptanceEvidenceReadD1BoundStatement {
  all<T>():
    Promise<
      FoodExactDurableReservationAcceptanceEvidenceReadD1Result<T>
    >;
}

export interface FoodExactDurableReservationAcceptanceEvidenceReadD1Statement {
  bind(
    ...values: unknown[]
  ):
    FoodExactDurableReservationAcceptanceEvidenceReadD1BoundStatement;
}

export interface FoodExactDurableReservationAcceptanceEvidenceReadD1Database {
  prepare(
    sql: string,
  ):
    FoodExactDurableReservationAcceptanceEvidenceReadD1Statement;
}

type AcceptanceRow =
  Readonly<{
    reservation_id: unknown;
    acceptance_id: unknown;
    acceptance_version: unknown;
    attribution: unknown;
    source_reference: unknown;
    accepted_on: unknown;
  }>;

type ParentRow =
  Readonly<{
    reservation_id: unknown;
    order_id: unknown;
    order_version: unknown;
    reservation_request_id: unknown;
    reservation_request_version: unknown;
    canonical_demand_json: unknown;
    state: unknown;
  }>;

type LineRow =
  Readonly<{
    reservation_id: unknown;
    line_index: unknown;
    sku_id: unknown;
    sku_version: unknown;
    capacity_revision: unknown;
    quantity: unknown;
  }>;

type SlotRow =
  Readonly<{
    reservation_id: unknown;
    method: unknown;
    location_reference: unknown;
    window_reference: unknown;
    capacity_revision: unknown;
    quantity: unknown;
  }>;

type BindingRow =
  Readonly<{
    reservation_id: unknown;
    fulfillment_intent_id: unknown;
    fulfillment_intent_version: unknown;
  }>;

type CapturedAcceptanceRow =
  Readonly<{
    reservationId: string;
    acceptanceId: FoodReservationAcceptanceId;
    acceptanceVersion: number;
    attribution: string;
    sourceReference: string;
    acceptedOn: string;
  }>;

type CapturedParent =
  Readonly<{
    reservationId: string;
    orderId: ReturnType<typeof parseFoodPhysicalOrderId>;
    orderVersion: number;
    reservationRequestId: ReturnType<
      typeof parseFoodReservationRequestId
    >;
    reservationRequestVersion: number;
    canonicalDemandJson: string;
  }>;

type CapturedLine =
  Readonly<{
    reservationId: string;
    lineIndex: number;
    sku: Readonly<{
      id: ReturnType<typeof parseFoodSkuId>;
      version: number;
    }>;
    capacityRevision: number;
    quantity: number;
  }>;

type CapturedSlot =
  Readonly<{
    reservationId: string;
    method: ReturnType<typeof validateFoodFulfillmentMethod>;
    locationReference: string;
    windowReference: string;
    capacityRevision: number;
    quantity: 1;
  }>;

type CapturedBinding =
  Readonly<{
    reservationId: string;
    fulfillmentIntentId: ReturnType<
      typeof parseFoodFulfillmentIntentId
    >;
    fulfillmentIntentVersion: number;
  }>;

const ACCEPTANCE_READ_SQL = `
SELECT
  reservation_id,
  acceptance_id,
  acceptance_version,
  attribution,
  source_reference,
  accepted_on
FROM food_reservation_acceptance_evidence
WHERE acceptance_id = ?
  AND acceptance_version = ?
LIMIT 2
`.trim();

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

const BINDING_READ_SQL = `
SELECT
  reservation_id,
  fulfillment_intent_id,
  fulfillment_intent_version
FROM food_capacity_reservation_fulfillment_intents
WHERE reservation_id = ?
LIMIT 2
`.trim();

function boundedText(
  value: unknown,
  maximum: number,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximum
  ) {
    throw new TypeError(label);
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
    throw new TypeError(label);
  }

  return value;
}

function nonnegativeSafeInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError(label);
  }

  return value;
}

function strictRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError(label);
  }

  const prototype =
    Object.getPrototypeOf(value);

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError(label);
  }

  if (
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(label);
  }

  const descriptors =
    Object.getOwnPropertyDescriptors(value);

  const names =
    Object.keys(descriptors);

  if (
    names.length !== keys.length ||
    keys.some(
      (key) =>
        !Object.prototype.hasOwnProperty.call(
          descriptors,
          key,
        ),
    )
  ) {
    throw new TypeError(label);
  }

  const result:
    Record<string, unknown> =
      Object.create(null) as Record<string, unknown>;

  for (
    const key of keys
  ) {
    const descriptor =
      descriptors[key];

    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(
        descriptor,
        "value",
      )
    ) {
      throw new TypeError(label);
    }

    result[key] =
      descriptor.value;
  }

  return result;
}

function captureRow(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  return strictRecord(
    value,
    keys,
    label,
  );
}

async function readRows<T>(
  database:
    FoodExactDurableReservationAcceptanceEvidenceReadD1Database,
  sql: string,
  values: readonly unknown[],
): Promise<readonly T[]> {
  const response =
    await database
      .prepare(
        sql,
      )
      .bind(
        ...values,
      )
      .all<T>();

  if (
    typeof response !== "object" ||
    response === null ||
    response.success !== true ||
    !Array.isArray(response.results)
  ) {
    throw new TypeError(
      "Invalid FOOD-007Z D1 result envelope",
    );
  }

  return response.results;
}

function parseAcceptanceRow(
  input: unknown,
  expectedAcceptanceId: FoodReservationAcceptanceId,
  expectedAcceptanceVersion: number,
): CapturedAcceptanceRow {
  const row =
    captureRow(
      input,
      [
        "reservation_id",
        "acceptance_id",
        "acceptance_version",
        "attribution",
        "source_reference",
        "accepted_on",
      ],
      "Invalid durable reservation acceptance evidence row",
    );

  const reservationId =
    boundedText(
      row.reservation_id,
      512,
      "Invalid durable reservation identity",
    );

  const acceptanceId =
    parseFoodReservationAcceptanceId(
      row.acceptance_id,
    );

  const acceptanceVersion =
    validateFoodVersion(
      row.acceptance_version,
    );

  if (
    acceptanceVersion !== 1 ||
    acceptanceId !== expectedAcceptanceId ||
    acceptanceVersion !== expectedAcceptanceVersion
  ) {
    throw new TypeError(
      "Durable acceptance identity mismatch",
    );
  }

  return Object.freeze({
    reservationId,
    acceptanceId,
    acceptanceVersion,
    attribution:
      boundedText(
        row.attribution,
        512,
        "Invalid durable acceptance attribution",
      ),
    sourceReference:
      boundedText(
        row.source_reference,
        512,
        "Invalid durable acceptance source reference",
      ),
    acceptedOn:
      boundedText(
        row.accepted_on,
        32,
        "Invalid durable acceptance date",
      ),
  });
}

function parseParentRow(
  input: unknown,
  expectedReservationId: string,
): CapturedParent {
  const row =
    captureRow(
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
      "Invalid authoritative reservation parent row",
    );

  const reservationId =
    boundedText(
      row.reservation_id,
      512,
      "Invalid authoritative reservation identity",
    );

  if (
    reservationId !== expectedReservationId ||
    row.state !== "held"
  ) {
    throw new TypeError(
      "Authoritative reservation parent mismatch",
    );
  }

  return Object.freeze({
    reservationId,
    orderId:
      parseFoodPhysicalOrderId(
        row.order_id,
      ),
    orderVersion:
      validateFoodVersion(
        row.order_version,
      ),
    reservationRequestId:
      parseFoodReservationRequestId(
        row.reservation_request_id,
      ),
    reservationRequestVersion:
      validateFoodVersion(
        row.reservation_request_version,
      ),
    canonicalDemandJson:
      boundedText(
        row.canonical_demand_json,
        1_000_000,
        "Invalid authoritative canonical demand JSON",
      ),
  });
}

function parseLineRow(
  input: unknown,
  expectedReservationId: string,
  expectedLineIndex: number,
): CapturedLine {
  const row =
    captureRow(
      input,
      [
        "reservation_id",
        "line_index",
        "sku_id",
        "sku_version",
        "capacity_revision",
        "quantity",
      ],
      "Invalid authoritative reservation line row",
    );

  const reservationId =
    boundedText(
      row.reservation_id,
      512,
      "Invalid reservation-line reservation identity",
    );

  const lineIndex =
    nonnegativeSafeInteger(
      row.line_index,
      "Invalid reservation line index",
    );

  if (
    reservationId !== expectedReservationId ||
    lineIndex !== expectedLineIndex
  ) {
    throw new TypeError(
      "Reservation line sequence mismatch",
    );
  }

  return Object.freeze({
    reservationId,
    lineIndex,
    sku: Object.freeze({
      id:
        parseFoodSkuId(
          row.sku_id,
        ),
      version:
        validateFoodVersion(
          row.sku_version,
        ),
    }),
    capacityRevision:
      positiveSafeInteger(
        row.capacity_revision,
        "Invalid reservation line capacity revision",
      ),
    quantity:
      validateFoodPurchaseQuantity(
        row.quantity,
      ),
  });
}

function parseSlotRow(
  input: unknown,
  expectedReservationId: string,
): CapturedSlot {
  const row =
    captureRow(
      input,
      [
        "reservation_id",
        "method",
        "location_reference",
        "window_reference",
        "capacity_revision",
        "quantity",
      ],
      "Invalid authoritative fulfillment slot row",
    );

  const reservationId =
    boundedText(
      row.reservation_id,
      512,
      "Invalid slot reservation identity",
    );

  const quantity =
    positiveSafeInteger(
      row.quantity,
      "Invalid slot reservation quantity",
    );

  if (
    reservationId !== expectedReservationId ||
    quantity !== 1
  ) {
    throw new TypeError(
      "Authoritative fulfillment slot mismatch",
    );
  }

  return Object.freeze({
    reservationId,
    method:
      validateFoodFulfillmentMethod(
        row.method,
      ),
    locationReference:
      boundedText(
        row.location_reference,
        512,
        "Invalid slot location reference",
      ),
    windowReference:
      boundedText(
        row.window_reference,
        512,
        "Invalid slot window reference",
      ),
    capacityRevision:
      positiveSafeInteger(
        row.capacity_revision,
        "Invalid slot capacity revision",
      ),
    quantity: 1,
  });
}

function parseBindingRow(
  input: unknown,
  expectedReservationId: string,
): CapturedBinding {
  const row =
    captureRow(
      input,
      [
        "reservation_id",
        "fulfillment_intent_id",
        "fulfillment_intent_version",
      ],
      "Invalid authoritative fulfillment-intent binding row",
    );

  const reservationId =
    boundedText(
      row.reservation_id,
      512,
      "Invalid fulfillment binding reservation identity",
    );

  if (
    reservationId !== expectedReservationId
  ) {
    throw new TypeError(
      "Fulfillment-intent binding reservation mismatch",
    );
  }

  return Object.freeze({
    reservationId,
    fulfillmentIntentId:
      parseFoodFulfillmentIntentId(
        row.fulfillment_intent_id,
      ),
    fulfillmentIntentVersion:
      validateFoodVersion(
        row.fulfillment_intent_version,
      ),
  });
}

function parseCanonicalDemand(
  text: string,
): readonly Readonly<{
  sku: Readonly<{
    id: ReturnType<typeof parseFoodSkuId>;
    version: number;
  }>;
  quantity: number;
}>[] {
  const parsed =
    JSON.parse(
      text,
    ) as unknown;

  if (
    !Array.isArray(parsed) ||
    parsed.length < 1 ||
    parsed.length > 128
  ) {
    throw new TypeError(
      "Invalid canonical reservation demand",
    );
  }

  const seen =
    new Set<string>();

  const lines =
    parsed.map(
      (
        input,
      ) => {
        const line =
          strictRecord(
            input,
            [
              "sku",
              "quantity",
            ],
            "Invalid canonical reservation demand line",
          );

        const sku =
          strictRecord(
            line.sku,
            [
              "id",
              "version",
            ],
            "Invalid canonical reservation demand SKU",
          );

        const id =
          parseFoodSkuId(
            sku.id,
          );

        const version =
          validateFoodVersion(
            sku.version,
          );

        const key =
          `${id}\u0000${version}`;

        if (
          seen.has(
            key,
          )
        ) {
          throw new TypeError(
            "Duplicate canonical reservation demand SKU",
          );
        }

        seen.add(
          key,
        );

        return Object.freeze({
          sku: Object.freeze({
            id,
            version,
          }),
          quantity:
            validateFoodPurchaseQuantity(
              line.quantity,
            ),
        });
      },
    );

  return Object.freeze(
    lines,
  );
}

function sameDemand(
  canonical:
    readonly Readonly<{
      sku: Readonly<{
        id: ReturnType<typeof parseFoodSkuId>;
        version: number;
      }>;
      quantity: number;
    }>[],
  lines:
    readonly CapturedLine[],
): boolean {
  if (
    canonical.length !== lines.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index < canonical.length;
    index += 1
  ) {
    const expected =
      canonical[index]!;

    const actual =
      lines[index]!;

    if (
      expected.sku.id !== actual.sku.id ||
      expected.sku.version !== actual.sku.version ||
      expected.quantity !== actual.quantity
    ) {
      return false;
    }
  }

  return true;
}

function reconstructAcceptance(
  acceptanceRow: CapturedAcceptanceRow,
  parent: CapturedParent,
  lines: readonly CapturedLine[],
  slot: CapturedSlot,
  binding: CapturedBinding,
): FoodReservationAcceptanceVersion {
  const canonicalDemand =
    parseCanonicalDemand(
      parent.canonicalDemandJson,
    );

  if (
    !sameDemand(
      canonicalDemand,
      lines,
    )
  ) {
    throw new TypeError(
      "Canonical reservation demand does not match persisted lines",
    );
  }

  return validateFoodReservationAcceptanceVersion({
    id:
      acceptanceRow.acceptanceId,
    version:
      acceptanceRow.acceptanceVersion,
    order: {
      id:
        parent.orderId,
      version:
        parent.orderVersion,
    },
    reservationRequest: {
      id:
        parent.reservationRequestId,
      version:
        parent.reservationRequestVersion,
    },
    fulfillmentIntent: {
      id:
        binding.fulfillmentIntentId,
      version:
        binding.fulfillmentIntentVersion,
      method:
        slot.method,
      locationReference:
        slot.locationReference,
      windowReference:
        slot.windowReference,
    },
    capacityRequirements:
      lines.map(
        (
          line,
        ) =>
          Object.freeze({
            sku: Object.freeze({
              id:
                line.sku.id,
              version:
                line.sku.version,
            }),
            quantity:
              line.quantity,
          }),
      ),
    acceptance: {
      attribution:
        acceptanceRow.attribution,
      sourceReference:
        acceptanceRow.sourceReference,
      acceptedOn:
        acceptanceRow.acceptedOn,
    },
  });
}

function evidence(
  reservationId: string,
  acceptance: FoodReservationAcceptanceVersion,
): FoodDurableReservationAcceptanceEvidence {
  return Object.freeze({
    kind:
      FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND,
    reservationId:
      reservationId as FoodDurableReservationAcceptanceEvidence["reservationId"],
    acceptance,
  });
}

export async function readFoodDurableReservationAcceptanceEvidenceByExactAcceptance(
  database:
    FoodExactDurableReservationAcceptanceEvidenceReadD1Database,
  acceptanceIdInput: unknown,
  acceptanceVersionInput: unknown,
): Promise<FoodExactDurableReservationAcceptanceEvidenceReadResult> {
  let acceptanceId:
    FoodReservationAcceptanceId;

  let acceptanceVersion:
    number;

  try {
    acceptanceId =
      parseFoodReservationAcceptanceId(
        acceptanceIdInput,
      );

    acceptanceVersion =
      validateFoodVersion(
        acceptanceVersionInput,
      );
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  try {
    const acceptanceRows =
      await readRows<AcceptanceRow>(
        database,
        ACCEPTANCE_READ_SQL,
        [
          acceptanceId,
          acceptanceVersion,
        ],
      );

    if (
      acceptanceRows.length === 0
    ) {
      return Object.freeze({
        outcome: "not-found",
      });
    }

    if (
      acceptanceRows.length !== 1
    ) {
      throw new TypeError(
        "Duplicate durable acceptance evidence rows",
      );
    }

    const acceptanceRow =
      parseAcceptanceRow(
        acceptanceRows[0],
        acceptanceId,
        acceptanceVersion,
      );

    const parentRows =
      await readRows<ParentRow>(
        database,
        PARENT_READ_SQL,
        [
          acceptanceRow.reservationId,
        ],
      );

    if (
      parentRows.length !== 1
    ) {
      throw new TypeError(
        "Missing or duplicate authoritative reservation parent",
      );
    }

    const parent =
      parseParentRow(
        parentRows[0],
        acceptanceRow.reservationId,
      );

    const rawLines =
      await readRows<LineRow>(
        database,
        LINES_READ_SQL,
        [
          acceptanceRow.reservationId,
        ],
      );

    if (
      rawLines.length < 1 ||
      rawLines.length > 128
    ) {
      throw new TypeError(
        "Invalid authoritative reservation line count",
      );
    }

    const lines =
      Object.freeze(
        rawLines.map(
          (
            line,
            index,
          ) =>
            parseLineRow(
              line,
              acceptanceRow.reservationId,
              index,
            ),
        ),
      );

    const slotRows =
      await readRows<SlotRow>(
        database,
        SLOT_READ_SQL,
        [
          acceptanceRow.reservationId,
        ],
      );

    if (
      slotRows.length !== 1
    ) {
      throw new TypeError(
        "Missing or duplicate authoritative fulfillment slot",
      );
    }

    const slot =
      parseSlotRow(
        slotRows[0],
        acceptanceRow.reservationId,
      );

    const bindingRows =
      await readRows<BindingRow>(
        database,
        BINDING_READ_SQL,
        [
          acceptanceRow.reservationId,
        ],
      );

    if (
      bindingRows.length !== 1
    ) {
      throw new TypeError(
        "Missing or duplicate authoritative fulfillment-intent binding",
      );
    }

    const binding =
      parseBindingRow(
        bindingRows[0],
        acceptanceRow.reservationId,
      );

    const acceptance =
      reconstructAcceptance(
        acceptanceRow,
        parent,
        lines,
        slot,
        binding,
      );

    const value =
      evidence(
        acceptanceRow.reservationId,
        acceptance,
      );

    return Object.freeze({
      outcome: "found",
      value,
    });
  }
  catch {
    return Object.freeze({
      outcome: "storage-failure",
    });
  }
}
