/**
 * FOOD-007Y
 *
 * Durable persistence of the missing FOOD-005L reservation-acceptance
 * identity and metadata after FOOD-007V/007X have already established
 * the authoritative reservation.
 *
 * This module does not grant reservation, capacity, payment, fulfillment,
 * release, physical-inventory, accounting, or deployment authority.
 */

import {
  validateFoodPurchaseQuantity,
} from "./cart-quote-domain";
import {
  validateFoodVersion,
} from "./draft-domain";
import {
  parseFoodFulfillmentIntentId,
  parseFoodReservationRequestId,
  validateFoodFulfillmentMethod,
} from "./fulfillment-capacity-reservation-domain";
import {
  parseFoodPhysicalOrderId,
} from "./physical-order-domain";
import {
  parseFoodSkuId,
} from "./package-sku-domain";
import {
  parseFoodReservationAcceptanceId,
  validateFoodReservationAcceptanceVersion,
  type FoodReservationAcceptanceVersion,
} from "./reservation-acceptance-domain";
import {
  FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND,
  type FoodPostMutationReservationAcceptance,
} from "./post-mutation-reservation-acceptance";
import type {
  FoodAuthoritativeCapacityReservationMutationReceipt,
} from "./d1-authoritative-capacity-reservation-mutation";
import type {
  FoodCapacityReservationId,
} from "./reservation-hold-command";

export const FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND =
  "durable-reservation-acceptance-evidence" as const;

export type FoodDurableReservationAcceptanceEvidence =
  Readonly<{
    kind:
      typeof FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND;
    reservationId:
      FoodCapacityReservationId;
    acceptance:
      FoodReservationAcceptanceVersion;
  }>;

export type FoodDurableReservationAcceptanceEvidencePersistenceResult =
  | Readonly<{
      outcome: "created";
      value: FoodDurableReservationAcceptanceEvidence;
    }>
  | Readonly<{
      outcome: "already-present";
      value: FoodDurableReservationAcceptanceEvidence;
    }>
  | Readonly<{
      outcome: "reservation-not-established";
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

export type FoodDurableReservationAcceptanceEvidenceD1Primitive =
  string |
  number |
  null;

export interface FoodDurableReservationAcceptanceEvidenceD1Result {
  readonly success: boolean;
  readonly results?: readonly unknown[];
}

export interface FoodDurableReservationAcceptanceEvidenceD1Statement {
  bind(
    ...values:
      FoodDurableReservationAcceptanceEvidenceD1Primitive[]
  ):
    FoodDurableReservationAcceptanceEvidenceD1Statement;

  all():
    Promise<
      FoodDurableReservationAcceptanceEvidenceD1Result
    >;
}

export interface FoodDurableReservationAcceptanceEvidenceD1Database {
  prepare(
    sql: string,
  ):
    FoodDurableReservationAcceptanceEvidenceD1Statement;
}

type StoredAcceptanceEvidence =
  Readonly<{
    reservationId: string;
    acceptanceId: string;
    acceptanceVersion: number;
    attribution: string;
    sourceReference: string;
    acceptedOn: string;
  }>;

type DurableLine =
  Readonly<{
    skuId: string;
    skuVersion: number;
    capacityRevision: number;
    quantity: number;
  }>;

const PARENT_COLUMNS =
  "reservation_id, order_id, order_version, reservation_request_id, reservation_request_version, canonical_demand_json, state";

const LINE_COLUMNS =
  "reservation_id, line_index, sku_id, sku_version, capacity_revision, quantity";

const SLOT_COLUMNS =
  "reservation_id, method, location_reference, window_reference, capacity_revision, quantity";

const BINDING_COLUMNS =
  "reservation_id, fulfillment_intent_id, fulfillment_intent_version";

const ACCEPTANCE_COLUMNS =
  "reservation_id, acceptance_id, acceptance_version, attribution, source_reference, accepted_on";

const PARENT_READ_SQL = `
SELECT ${PARENT_COLUMNS}
FROM food_capacity_reservations
WHERE reservation_id = ?
LIMIT 2
`.trim();

const LINES_READ_SQL = `
SELECT ${LINE_COLUMNS}
FROM food_capacity_reservation_lines
WHERE reservation_id = ?
ORDER BY line_index ASC
LIMIT 129
`.trim();

const SLOT_READ_SQL = `
SELECT ${SLOT_COLUMNS}
FROM food_fulfillment_slot_reservations
WHERE reservation_id = ?
LIMIT 2
`.trim();

const BINDING_READ_SQL = `
SELECT ${BINDING_COLUMNS}
FROM food_capacity_reservation_fulfillment_intents
WHERE reservation_id = ?
LIMIT 2
`.trim();

const ACCEPTANCE_BY_RESERVATION_SQL = `
SELECT ${ACCEPTANCE_COLUMNS}
FROM food_reservation_acceptance_evidence
WHERE reservation_id = ?
LIMIT 2
`.trim();

const ACCEPTANCE_BY_IDENTITY_SQL = `
SELECT ${ACCEPTANCE_COLUMNS}
FROM food_reservation_acceptance_evidence
WHERE acceptance_id = ?
  AND acceptance_version = ?
LIMIT 2
`.trim();

const ACCEPTANCE_INSERT_SQL = `
INSERT INTO food_reservation_acceptance_evidence (
  reservation_id,
  acceptance_id,
  acceptance_version,
  attribution,
  source_reference,
  accepted_on
)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING ${ACCEPTANCE_COLUMNS}
`.trim();

function fail(
  message = "Invalid FOOD-007Y data",
): never {
  throw new TypeError(message);
}

function capture(
  input: unknown,
  ancestors = new Set<object>(),
): unknown {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean" ||
    (
      typeof input === "number" &&
      Number.isFinite(input)
    )
  ) {
    return input;
  }

  if (
    typeof input !== "object" ||
    ancestors.has(input)
  ) {
    fail("Invalid plain data");
  }

  const array =
    Array.isArray(input);

  const prototype =
    Object.getPrototypeOf(input);

  if (
    prototype !== null &&
    prototype !== (
      array
        ? Array.prototype
        : Object.prototype
    )
  ) {
    fail("Unexpected prototype");
  }

  ancestors.add(input);

  try {
    const descriptors =
      Object.getOwnPropertyDescriptors(
        input,
      );

    const keys =
      Reflect.ownKeys(
        descriptors,
      );

    if (
      keys.some(
        (key) =>
          typeof key !== "string",
      )
    ) {
      fail("Symbol field");
    }

    if (array) {
      const length =
        descriptors.length?.value;

      if (
        typeof length !== "number" ||
        !Number.isSafeInteger(length) ||
        length < 0 ||
        keys.length !== length + 1
      ) {
        fail("Invalid array");
      }

      const result:
        unknown[] =
        [];

      for (
        let index = 0;
        index < length;
        index++
      ) {
        const descriptor =
          descriptors[String(index)];

        if (
          !descriptor ||
          !(
            "value" in descriptor
          )
        ) {
          fail(
            "Invalid array element",
          );
        }

        result.push(
          capture(
            descriptor.value,
            ancestors,
          ),
        );
      }

      return result;
    }

    const result:
      Record<string, unknown> =
      Object.create(null);

    for (
      const key of
        keys as string[]
    ) {
      const descriptor =
        descriptors[key];

      if (
        !descriptor ||
        !(
          "value" in descriptor
        )
      ) {
        fail(
          "Accessor field",
        );
      }

      result[key] =
        capture(
          descriptor.value,
          ancestors,
        );
    }

    return result;
  }
  finally {
    ancestors.delete(input);
  }
}

function record(
  input: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    fail(
      "Expected record",
    );
  }

  const keys =
    Reflect.ownKeys(input);

  if (
    keys.length !==
      allowed.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !allowed.includes(key),
    ) ||
    allowed.some(
      (key) =>
        !Object.hasOwn(
          input,
          key,
        ),
    )
  ) {
    fail(
      "Unexpected record fields",
    );
  }

  return input as
    Record<string, unknown>;
}

function boundedText(
  input: unknown,
  max = 512,
): string {
  if (
    typeof input !== "string" ||
    input.includes("\0")
  ) {
    fail(
      "Expected bounded text",
    );
  }

  const length =
    Array.from(input).length;

  if (
    length < 1 ||
    length > max
  ) {
    fail(
      "Invalid bounded text length",
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
    fail(
      "Expected nonnegative safe integer",
    );
  }

  return input;
}

function same(
  left: unknown,
  right: unknown,
): boolean {
  return (
    JSON.stringify(left) ===
    JSON.stringify(right)
  );
}

function canonicalReceipt(
  input: unknown,
):
  FoodAuthoritativeCapacityReservationMutationReceipt {
  const root =
    record(
      input,
      [
        "kind",
        "reservationId",
        "order",
        "reservationRequest",
        "fulfillmentIntent",
        "skuClaims",
        "slotClaim",
      ],
    );

  if (
    root.kind !==
      "authoritative-capacity-reservation-mutation-receipt"
  ) {
    fail(
      "Wrong reservation receipt kind",
    );
  }

  const reservationId =
    boundedText(
      root.reservationId,
    ) as FoodCapacityReservationId;

  const order =
    record(
      root.order,
      [
        "id",
        "version",
      ],
    );

  const reservationRequest =
    record(
      root.reservationRequest,
      [
        "id",
        "version",
      ],
    );

  const fulfillmentIntent =
    record(
      root.fulfillmentIntent,
      [
        "id",
        "version",
      ],
    );

  if (
    !Array.isArray(
      root.skuClaims,
    ) ||
    root.skuClaims.length < 1 ||
    root.skuClaims.length > 128
  ) {
    fail(
      "Invalid SKU claim count",
    );
  }

  const skuClaims =
    root.skuClaims.map(
      (claimInput) => {
        const claim =
          record(
            claimInput,
            [
              "sku",
              "capacityRevision",
              "quantity",
            ],
          );

        const sku =
          record(
            claim.sku,
            [
              "id",
              "version",
            ],
          );

        return Object.freeze({
          sku:
            Object.freeze({
              id:
                parseFoodSkuId(
                  sku.id,
                ),
              version:
                validateFoodVersion(
                  sku.version,
                ),
            }),
          capacityRevision:
            validateFoodVersion(
              claim.capacityRevision,
            ),
          quantity:
            validateFoodPurchaseQuantity(
              claim.quantity,
            ),
        });
      },
    );

  const slotClaim =
    record(
      root.slotClaim,
      [
        "method",
        "locationReference",
        "windowReference",
        "capacityRevision",
        "quantity",
      ],
    );

  const quantity =
    validateFoodPurchaseQuantity(
      slotClaim.quantity,
    );

  if (
    quantity !== 1
  ) {
    fail(
      "Slot claim quantity must equal one",
    );
  }

  return Object.freeze({
    kind:
      "authoritative-capacity-reservation-mutation-receipt",
    reservationId,
    order:
      Object.freeze({
        id:
          parseFoodPhysicalOrderId(
            order.id,
          ),
        version:
          validateFoodVersion(
            order.version,
          ),
      }),
    reservationRequest:
      Object.freeze({
        id:
          parseFoodReservationRequestId(
            reservationRequest.id,
          ),
        version:
          validateFoodVersion(
            reservationRequest.version,
          ),
      }),
    fulfillmentIntent:
      Object.freeze({
        id:
          parseFoodFulfillmentIntentId(
            fulfillmentIntent.id,
          ),
        version:
          validateFoodVersion(
            fulfillmentIntent.version,
          ),
      }),
    skuClaims:
      Object.freeze(
        skuClaims,
      ),
    slotClaim:
      Object.freeze({
        method:
          validateFoodFulfillmentMethod(
            slotClaim.method,
          ),
        locationReference:
          boundedText(
            slotClaim.locationReference,
          ),
        windowReference:
          boundedText(
            slotClaim.windowReference,
          ),
        capacityRevision:
          validateFoodVersion(
            slotClaim.capacityRevision,
          ),
        quantity,
      }),
  });
}

function canonicalComposition(
  input:
    FoodPostMutationReservationAcceptance,
):
  FoodPostMutationReservationAcceptance {
  const captured =
    capture(input);

  const root =
    record(
      captured,
      [
        "kind",
        "reservationOutcome",
        "reservation",
        "acceptance",
      ],
    );

  if (
    root.kind !==
      FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND
  ) {
    fail(
      "Wrong post-mutation acceptance kind",
    );
  }

  if (
    root.reservationOutcome !==
      "created" &&
    root.reservationOutcome !==
      "already-present"
  ) {
    fail(
      "Invalid reservation outcome",
    );
  }

  const reservation =
    canonicalReceipt(
      root.reservation,
    );

  const acceptance =
    validateFoodReservationAcceptanceVersion(
      root.acceptance,
    );

  if (
    acceptance.version !== 1
  ) {
    fail(
      "FOOD-007Y accepts only initial acceptance version one",
    );
  }

  return Object.freeze({
    kind:
      FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND,
    reservationOutcome:
      root.reservationOutcome,
    reservation,
    acceptance,
  });
}

function acceptanceCorrelates(
  receipt:
    FoodAuthoritativeCapacityReservationMutationReceipt,
  acceptance:
    FoodReservationAcceptanceVersion,
): boolean {
  if (
    acceptance.order.id !==
      receipt.order.id ||
    acceptance.order.version !==
      receipt.order.version ||
    acceptance.reservationRequest.id !==
      receipt.reservationRequest.id ||
    acceptance.reservationRequest.version !==
      receipt.reservationRequest.version ||
    acceptance.fulfillmentIntent.id !==
      receipt.fulfillmentIntent.id ||
    acceptance.fulfillmentIntent.version !==
      receipt.fulfillmentIntent.version ||
    acceptance.fulfillmentIntent.method !==
      receipt.slotClaim.method ||
    acceptance.fulfillmentIntent.locationReference !==
      receipt.slotClaim.locationReference ||
    acceptance.fulfillmentIntent.windowReference !==
      receipt.slotClaim.windowReference ||
    acceptance.capacityRequirements.length !==
      receipt.skuClaims.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index <
      receipt.skuClaims.length;
    index++
  ) {
    const claim =
      receipt.skuClaims[index];

    const requirement =
      acceptance.capacityRequirements[
        index
      ];

    if (
      !claim ||
      !requirement ||
      claim.sku.id !==
        requirement.sku.id ||
      claim.sku.version !==
        requirement.sku.version ||
      claim.quantity !==
        requirement.quantity
    ) {
      return false;
    }
  }

  return true;
}

function row(
  input: unknown,
  columns: string,
): Record<string, unknown> {
  const captured =
    capture(input);

  return record(
    captured,
    columns
      .split(",")
      .map(
        (column) =>
          column.trim(),
      ),
  );
}

async function execute(
  statement:
    FoodDurableReservationAcceptanceEvidenceD1Statement,
):
  Promise<
    readonly unknown[]
  > {
  const result =
    await statement.all();

  if (
    result === null ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    fail(
      "Malformed D1 result",
    );
  }

  const success =
    Object.getOwnPropertyDescriptor(
      result,
      "success",
    );

  const results =
    Object.getOwnPropertyDescriptor(
      result,
      "results",
    );

  if (
    !success ||
    !(
      "value" in success
    ) ||
    success.value !== true ||
    !results ||
    !(
      "value" in results
    ) ||
    !Array.isArray(
      results.value,
    )
  ) {
    fail(
      "Unsuccessful or malformed D1 result",
    );
  }

  return results.value;
}

function validateCanonicalDemand(
  input: string,
  lines:
    readonly DurableLine[],
): void {
  let decoded:
    unknown;

  try {
    decoded =
      capture(
        JSON.parse(input),
      );
  }
  catch {
    fail(
      "Malformed canonical demand JSON",
    );
  }

  if (
    !Array.isArray(decoded) ||
    decoded.length !==
      lines.length
  ) {
    fail(
      "Canonical demand count mismatch",
    );
  }

  for (
    let index = 0;
    index < lines.length;
    index++
  ) {
    const raw =
      record(
        decoded[index],
        [
          "sku",
          "quantity",
        ],
      );

    const sku =
      record(
        raw.sku,
        [
          "id",
          "version",
        ],
      );

    const line =
      lines[index];

    if (
      !line ||
      parseFoodSkuId(
        sku.id,
      ) !== line.skuId ||
      validateFoodVersion(
        sku.version,
      ) !== line.skuVersion ||
      validateFoodPurchaseQuantity(
        raw.quantity,
      ) !== line.quantity
    ) {
      fail(
        "Canonical demand content mismatch",
      );
    }
  }
}

async function readDurableReservation(
  database:
    FoodDurableReservationAcceptanceEvidenceD1Database,
  reservationId:
    FoodCapacityReservationId,
):
  Promise<
    FoodAuthoritativeCapacityReservationMutationReceipt |
    null
  > {
  const parentRows =
    await execute(
      database
        .prepare(
          PARENT_READ_SQL,
        )
        .bind(
          reservationId,
        ),
    );

  if (
    parentRows.length > 1
  ) {
    fail(
      "Unexpected reservation parent count",
    );
  }

  if (
    parentRows.length === 0
  ) {
    return null;
  }

  const parent =
    row(
      parentRows[0],
      PARENT_COLUMNS,
    );

  if (
    boundedText(
      parent.reservation_id,
    ) !== reservationId
  ) {
    fail(
      "Wrong reservation parent identity",
    );
  }

  if (
    parent.state !==
      "held"
  ) {
    fail(
      "Malformed reservation state",
    );
  }

  const orderId =
    parseFoodPhysicalOrderId(
      parent.order_id,
    );

  const orderVersion =
    validateFoodVersion(
      parent.order_version,
    );

  const reservationRequestId =
    parseFoodReservationRequestId(
      parent.reservation_request_id,
    );

  const reservationRequestVersion =
    validateFoodVersion(
      parent.reservation_request_version,
    );

  const canonicalDemandJson =
    boundedText(
      parent.canonical_demand_json,
      131072,
    );

  const lineRows =
    await execute(
      database
        .prepare(
          LINES_READ_SQL,
        )
        .bind(
          reservationId,
        ),
    );

  if (
    lineRows.length < 1 ||
    lineRows.length > 128
  ) {
    fail(
      "Incomplete or excessive reservation lines",
    );
  }

  const lines:
    DurableLine[] =
    [];

  for (
    let index = 0;
    index < lineRows.length;
    index++
  ) {
    const stored =
      row(
        lineRows[index],
        LINE_COLUMNS,
      );

    if (
      boundedText(
        stored.reservation_id,
      ) !== reservationId ||
      nonnegativeSafeInteger(
        stored.line_index,
      ) !== index
    ) {
      fail(
        "Malformed reservation line ordering",
      );
    }

    lines.push(
      Object.freeze({
        skuId:
          parseFoodSkuId(
            stored.sku_id,
          ),
        skuVersion:
          validateFoodVersion(
            stored.sku_version,
          ),
        capacityRevision:
          validateFoodVersion(
            stored.capacity_revision,
          ),
        quantity:
          validateFoodPurchaseQuantity(
            stored.quantity,
          ),
      }),
    );
  }

  validateCanonicalDemand(
    canonicalDemandJson,
    lines,
  );

  const slotRows =
    await execute(
      database
        .prepare(
          SLOT_READ_SQL,
        )
        .bind(
          reservationId,
        ),
    );

  if (
    slotRows.length !== 1
  ) {
    fail(
      "Missing or duplicate slot claim",
    );
  }

  const slot =
    row(
      slotRows[0],
      SLOT_COLUMNS,
    );

  if (
    boundedText(
      slot.reservation_id,
    ) !== reservationId
  ) {
    fail(
      "Wrong slot reservation identity",
    );
  }

  const slotQuantity =
    validateFoodPurchaseQuantity(
      slot.quantity,
    );

  if (
    slotQuantity !== 1
  ) {
    fail(
      "Stored slot quantity must equal one",
    );
  }

  const bindingRows =
    await execute(
      database
        .prepare(
          BINDING_READ_SQL,
        )
        .bind(
          reservationId,
        ),
    );

  if (
    bindingRows.length !== 1
  ) {
    fail(
      "Missing or duplicate fulfillment-intent binding",
    );
  }

  const binding =
    row(
      bindingRows[0],
      BINDING_COLUMNS,
    );

  if (
    boundedText(
      binding.reservation_id,
    ) !== reservationId
  ) {
    fail(
      "Wrong fulfillment binding reservation identity",
    );
  }

  return Object.freeze({
    kind:
      "authoritative-capacity-reservation-mutation-receipt",
    reservationId,
    order:
      Object.freeze({
        id:
          orderId,
        version:
          orderVersion,
      }),
    reservationRequest:
      Object.freeze({
        id:
          reservationRequestId,
        version:
          reservationRequestVersion,
      }),
    fulfillmentIntent:
      Object.freeze({
        id:
          parseFoodFulfillmentIntentId(
            binding.fulfillment_intent_id,
          ),
        version:
          validateFoodVersion(
            binding.fulfillment_intent_version,
          ),
      }),
    skuClaims:
      Object.freeze(
        lines.map(
          (line) =>
            Object.freeze({
              sku:
                Object.freeze({
                  id:
                    parseFoodSkuId(
                      line.skuId,
                    ),
                  version:
                    line.skuVersion,
                }),
              capacityRevision:
                line.capacityRevision,
              quantity:
                line.quantity,
            }),
        ),
      ),
    slotClaim:
      Object.freeze({
        method:
          validateFoodFulfillmentMethod(
            slot.method,
          ),
        locationReference:
          boundedText(
            slot.location_reference,
          ),
        windowReference:
          boundedText(
            slot.window_reference,
          ),
        capacityRevision:
          validateFoodVersion(
            slot.capacity_revision,
          ),
        quantity:
          slotQuantity,
      }),
  });
}

function parseStoredAcceptance(
  input: unknown,
):
  StoredAcceptanceEvidence {
  const stored =
    row(
      input,
      ACCEPTANCE_COLUMNS,
    );

  const version =
    validateFoodVersion(
      stored.acceptance_version,
    );

  if (
    version !== 1
  ) {
    fail(
      "Stored acceptance version must equal one",
    );
  }

  return Object.freeze({
    reservationId:
      boundedText(
        stored.reservation_id,
      ),
    acceptanceId:
      parseFoodReservationAcceptanceId(
        stored.acceptance_id,
      ),
    acceptanceVersion:
      version,
    attribution:
      boundedText(
        stored.attribution,
      ),
    sourceReference:
      boundedText(
        stored.source_reference,
      ),
    acceptedOn:
      boundedText(
        stored.accepted_on,
        32,
      ),
  });
}

async function readAcceptanceByReservation(
  database:
    FoodDurableReservationAcceptanceEvidenceD1Database,
  reservationId:
    FoodCapacityReservationId,
):
  Promise<
    StoredAcceptanceEvidence |
    null
  > {
  const rows =
    await execute(
      database
        .prepare(
          ACCEPTANCE_BY_RESERVATION_SQL,
        )
        .bind(
          reservationId,
        ),
    );

  if (
    rows.length > 1
  ) {
    fail(
      "Unexpected acceptance-by-reservation count",
    );
  }

  if (
    rows.length === 0
  ) {
    return null;
  }

  const stored =
    parseStoredAcceptance(
      rows[0],
    );

  if (
    stored.reservationId !==
      reservationId
  ) {
    fail(
      "Wrong acceptance reservation identity",
    );
  }

  return stored;
}

async function readAcceptanceByIdentity(
  database:
    FoodDurableReservationAcceptanceEvidenceD1Database,
  acceptance:
    FoodReservationAcceptanceVersion,
):
  Promise<
    StoredAcceptanceEvidence |
    null
  > {
  const rows =
    await execute(
      database
        .prepare(
          ACCEPTANCE_BY_IDENTITY_SQL,
        )
        .bind(
          acceptance.id,
          acceptance.version,
        ),
    );

  if (
    rows.length > 1
  ) {
    fail(
      "Unexpected acceptance identity count",
    );
  }

  if (
    rows.length === 0
  ) {
    return null;
  }

  const stored =
    parseStoredAcceptance(
      rows[0],
    );

  if (
    stored.acceptanceId !==
      acceptance.id ||
    stored.acceptanceVersion !==
      acceptance.version
  ) {
    fail(
      "Wrong stored acceptance identity",
    );
  }

  return stored;
}

function reconstructAcceptance(
  receipt:
    FoodAuthoritativeCapacityReservationMutationReceipt,
  stored:
    StoredAcceptanceEvidence,
):
  FoodReservationAcceptanceVersion {
  return (
    validateFoodReservationAcceptanceVersion({
      id:
        stored.acceptanceId,
      version:
        stored.acceptanceVersion,
      order: {
        id:
          receipt.order.id,
        version:
          receipt.order.version,
      },
      reservationRequest: {
        id:
          receipt.reservationRequest.id,
        version:
          receipt.reservationRequest.version,
      },
      fulfillmentIntent: {
        id:
          receipt.fulfillmentIntent.id,
        version:
          receipt.fulfillmentIntent.version,
        method:
          receipt.slotClaim.method,
        locationReference:
          receipt.slotClaim.locationReference,
        windowReference:
          receipt.slotClaim.windowReference,
      },
      capacityRequirements:
        receipt.skuClaims.map(
          (claim) => ({
            sku: {
              id:
                claim.sku.id,
              version:
                claim.sku.version,
            },
            quantity:
              claim.quantity,
          }),
        ),
      acceptance: {
        attribution:
          stored.attribution,
        sourceReference:
          stored.sourceReference,
        acceptedOn:
          stored.acceptedOn,
      },
    })
  );
}

function evidence(
  receipt:
    FoodAuthoritativeCapacityReservationMutationReceipt,
  acceptance:
    FoodReservationAcceptanceVersion,
):
  FoodDurableReservationAcceptanceEvidence {
  return Object.freeze({
    kind:
      FOOD_DURABLE_RESERVATION_ACCEPTANCE_EVIDENCE_KIND,
    reservationId:
      receipt.reservationId,
    acceptance,
  });
}

function classifyStored(
  stored:
    StoredAcceptanceEvidence,
  receipt:
    FoodAuthoritativeCapacityReservationMutationReceipt,
  requested:
    FoodReservationAcceptanceVersion,
):
  | Readonly<{
      outcome: "already-present";
      value:
        FoodDurableReservationAcceptanceEvidence;
    }>
  | Readonly<{
      outcome: "conflict";
    }> {
  if (
    stored.reservationId !==
      receipt.reservationId
  ) {
    return Object.freeze({
      outcome:
        "conflict" as const,
    });
  }

  const reconstructed =
    reconstructAcceptance(
      receipt,
      stored,
    );

  if (
    !same(
      reconstructed,
      requested,
    )
  ) {
    return Object.freeze({
      outcome:
        "conflict" as const,
    });
  }

  return Object.freeze({
    outcome:
      "already-present" as const,
    value:
      evidence(
        receipt,
        reconstructed,
      ),
  });
}

async function classifyExisting(
  database:
    FoodDurableReservationAcceptanceEvidenceD1Database,
  receipt:
    FoodAuthoritativeCapacityReservationMutationReceipt,
  requested:
    FoodReservationAcceptanceVersion,
):
  Promise<
    | Readonly<{
        outcome: "already-present";
        value:
          FoodDurableReservationAcceptanceEvidence;
      }>
    | Readonly<{
        outcome: "conflict";
      }>
    | null
  > {
  const byReservation =
    await readAcceptanceByReservation(
      database,
      receipt.reservationId,
    );

  if (
    byReservation !== null
  ) {
    const result =
      classifyStored(
        byReservation,
        receipt,
        requested,
      );

    if (
      result.outcome ===
        "conflict"
    ) {
      return result;
    }

    return result;
  }

  const byIdentity =
    await readAcceptanceByIdentity(
      database,
      requested,
    );

  if (
    byIdentity !== null
  ) {
    return classifyStored(
      byIdentity,
      receipt,
      requested,
    );
  }

  return null;
}

async function recoverAfterUncertainInsert(
  database:
    FoodDurableReservationAcceptanceEvidenceD1Database,
  receipt:
    FoodAuthoritativeCapacityReservationMutationReceipt,
  requested:
    FoodReservationAcceptanceVersion,
):
  Promise<
    FoodDurableReservationAcceptanceEvidencePersistenceResult
  > {
  const classified =
    await classifyExisting(
      database,
      receipt,
      requested,
    );

  if (
    classified !== null
  ) {
    return classified;
  }

  return Object.freeze({
    outcome:
      "storage-failure" as const,
  });
}

export async function persistFoodDurableReservationAcceptanceEvidence(
  database:
    FoodDurableReservationAcceptanceEvidenceD1Database,
  composition:
    FoodPostMutationReservationAcceptance,
):
  Promise<
    FoodDurableReservationAcceptanceEvidencePersistenceResult
  > {
  let canonical:
    FoodPostMutationReservationAcceptance;

  try {
    canonical =
      canonicalComposition(
        composition,
      );
  }
  catch {
    return Object.freeze({
      outcome:
        "invalid" as const,
    });
  }

  try {
    const durableReceipt =
      await readDurableReservation(
        database,
        canonical.reservation
          .reservationId,
      );

    if (
      durableReceipt === null
    ) {
      return Object.freeze({
        outcome:
          "reservation-not-established" as const,
      });
    }

    if (
      !same(
        durableReceipt,
        canonical.reservation,
      )
    ) {
      return Object.freeze({
        outcome:
          "conflict" as const,
      });
    }

    if (
      !acceptanceCorrelates(
        durableReceipt,
        canonical.acceptance,
      )
    ) {
      return Object.freeze({
        outcome:
          "conflict" as const,
      });
    }

    const existing =
      await classifyExisting(
        database,
        durableReceipt,
        canonical.acceptance,
      );

    if (
      existing !== null
    ) {
      return existing;
    }

    let insertedRows:
      readonly unknown[];

    try {
      insertedRows =
        await execute(
          database
            .prepare(
              ACCEPTANCE_INSERT_SQL,
            )
            .bind(
              durableReceipt.reservationId,
              canonical.acceptance.id,
              canonical.acceptance.version,
              canonical.acceptance
                .acceptance.attribution,
              canonical.acceptance
                .acceptance.sourceReference,
              canonical.acceptance
                .acceptance.acceptedOn,
            ),
        );
    }
    catch {
      return (
        await recoverAfterUncertainInsert(
          database,
          durableReceipt,
          canonical.acceptance,
        )
      );
    }

    if (
      insertedRows.length === 1
    ) {
      try {
        const inserted =
          parseStoredAcceptance(
            insertedRows[0],
          );

        const classified =
          classifyStored(
            inserted,
            durableReceipt,
            canonical.acceptance,
          );

        if (
          classified.outcome ===
            "already-present"
        ) {
          return Object.freeze({
            outcome:
              "created" as const,
            value:
              classified.value,
          });
        }
      }
      catch {
        // Fall through to durable reread classification.
      }
    }

    return (
      await recoverAfterUncertainInsert(
        database,
        durableReceipt,
        canonical.acceptance,
      )
    );
  }
  catch {
    return Object.freeze({
      outcome:
        "storage-failure" as const,
    });
  }
}
