/**
 * FOOD-005L: exact reservation/capacity acceptance evidence.
 *
 * Records one immutable positive acceptance assertion bound to exact
 * FOOD-005D request/intent sources and one exact FOOD-005E order version.
 *
 * This module does not perform atomic inventory/slot reservation, authenticate
 * the accepter, mutate inventory, revive cancelled orders, establish checkout
 * or payment readiness, authorize preparation/dispatch, or complete a sale.
 */

import {
  validateFoodReviewDate,
  validateFoodVersion,
} from "./draft-domain";
import {
  parseFoodSkuId,
} from "./package-sku-domain";
import {
  parseFoodFulfillmentIntentId,
  parseFoodReservationRequestId,
  validateFoodFulfillmentIntentVersion,
  validateFoodFulfillmentMethod,
  validateFoodReservationRequestVersion,
  type FoodCapacityRequirementLine,
  type FoodFulfillmentIntentId,
  type FoodFulfillmentMethod,
  type FoodReservationRequestId,
  type FoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";
import {
  parseFoodPhysicalOrderId,
  validateFoodPhysicalOrderVersion,
  type FoodPhysicalOrderId,
  type FoodPhysicalOrderVersion,
} from "./physical-order-domain";

export type FoodReservationAcceptanceId =
  string & {
    readonly __brand: "FoodReservationAcceptanceId";
  };

export interface FoodReservationAcceptanceVersion {
  readonly id: FoodReservationAcceptanceId;
  readonly version: number;
  readonly order: Readonly<{
    id: FoodPhysicalOrderId;
    version: number;
  }>;
  readonly reservationRequest: Readonly<{
    id: FoodReservationRequestId;
    version: number;
  }>;
  readonly fulfillmentIntent: Readonly<{
    id: FoodFulfillmentIntentId;
    version: number;
    method: FoodFulfillmentMethod;
    locationReference: string;
    windowReference: string;
  }>;
  readonly capacityRequirements:
    readonly FoodCapacityRequirementLine[];
  readonly acceptance: Readonly<{
    attribution: string;
    sourceReference: string;
    acceptedOn: string;
  }>;
}

function record(
  value: unknown,
  allowed: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(`Invalid ${label}`);
  }

  if (
    Reflect.ownKeys(value).some(
      key =>
        typeof key !== "string" ||
        !allowed.includes(key),
    )
  ) {
    throw new TypeError(
      `Unsupported ${label} field`,
    );
  }

  return value as Record<string, unknown>;
}

function boundedText(
  value: unknown,
  maximum: number,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.trim() !== value
  ) {
    throw new TypeError(`Invalid ${label}`);
  }

  return value;
}

function localIdentity(value: unknown): string {
  const text = boundedText(
    value,
    128,
    "reservation acceptance local identity",
  );

  if (text.includes(":")) {
    throw new TypeError(
      "Reservation acceptance local identity cannot contain colon",
    );
  }

  return text;
}

function positiveQuantity(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new TypeError(
      "Invalid accepted capacity quantity",
    );
  }

  return value;
}

function copyCapacityRequirement(
  input: unknown,
): FoodCapacityRequirementLine {
  const line = record(
    input,
    ["sku", "quantity"],
    "accepted capacity requirement",
  );

  const sku = record(
    line.sku,
    ["id", "version"],
    "accepted capacity requirement SKU",
  );

  return Object.freeze({
    sku: Object.freeze({
      id: parseFoodSkuId(sku.id),
      version: validateFoodVersion(
        sku.version,
      ),
    }),
    quantity: positiveQuantity(
      line.quantity,
    ),
  });
}

function capacityKey(
  line: FoodCapacityRequirementLine,
): string {
  return `${line.sku.id}@${line.sku.version}`;
}

function sameCapacityRequirements(
  left: readonly FoodCapacityRequirementLine[],
  right: readonly FoodCapacityRequirementLine[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    const a = left[index];
    const b = right[index];

    if (
      !a ||
      !b ||
      a.sku.id !== b.sku.id ||
      a.sku.version !== b.sku.version ||
      a.quantity !== b.quantity
    ) {
      return false;
    }
  }

  return true;
}

export function createFoodReservationAcceptanceId(
  value: unknown,
): FoodReservationAcceptanceId {
  return `food-reservation-acceptance:${localIdentity(value)}` as FoodReservationAcceptanceId;
}

export function parseFoodReservationAcceptanceId(
  value: unknown,
): FoodReservationAcceptanceId {
  const prefix =
    "food-reservation-acceptance:";

  const text = boundedText(
    value,
    prefix.length + 128,
    "reservation acceptance identity",
  );

  if (!text.startsWith(prefix)) {
    throw new TypeError(
      "Wrong reservation acceptance identity prefix",
    );
  }

  return createFoodReservationAcceptanceId(
    text.slice(prefix.length),
  );
}

export function validateFoodReservationAcceptanceVersion(
  input: unknown,
): FoodReservationAcceptanceVersion {
  const value = record(
    input,
    [
      "id",
      "version",
      "order",
      "reservationRequest",
      "fulfillmentIntent",
      "capacityRequirements",
      "acceptance",
    ],
    "reservation acceptance",
  );

  const order = record(
    value.order,
    ["id", "version"],
    "reservation acceptance order reference",
  );

  const request = record(
    value.reservationRequest,
    ["id", "version"],
    "reservation acceptance request reference",
  );

  const fulfillment = record(
    value.fulfillmentIntent,
    [
      "id",
      "version",
      "method",
      "locationReference",
      "windowReference",
    ],
    "reservation acceptance fulfillment snapshot",
  );

  if (!Array.isArray(value.capacityRequirements)) {
    throw new TypeError(
      "Reservation acceptance capacity requirements must be an array",
    );
  }

  if (
    value.capacityRequirements.length === 0 ||
    value.capacityRequirements.length > 128
  ) {
    throw new TypeError(
      "Invalid reservation acceptance capacity requirement count",
    );
  }

  const seen = new Set<string>();

  const capacityRequirements =
    value.capacityRequirements.map(raw => {
      const line =
        copyCapacityRequirement(raw);

      const key = capacityKey(line);

      if (seen.has(key)) {
        throw new TypeError(
          "Duplicate accepted exact SKU capacity requirement",
        );
      }

      seen.add(key);

      return line;
    });

  const acceptance = record(
    value.acceptance,
    [
      "attribution",
      "sourceReference",
      "acceptedOn",
    ],
    "reservation acceptance metadata",
  );

  return Object.freeze({
    id: parseFoodReservationAcceptanceId(
      value.id,
    ),
    version: validateFoodVersion(
      value.version,
    ),
    order: Object.freeze({
      id: parseFoodPhysicalOrderId(
        order.id,
      ),
      version: validateFoodVersion(
        order.version,
      ),
    }),
    reservationRequest: Object.freeze({
      id: parseFoodReservationRequestId(
        request.id,
      ),
      version: validateFoodVersion(
        request.version,
      ),
    }),
    fulfillmentIntent: Object.freeze({
      id: parseFoodFulfillmentIntentId(
        fulfillment.id,
      ),
      version: validateFoodVersion(
        fulfillment.version,
      ),
      method: validateFoodFulfillmentMethod(
        fulfillment.method,
      ),
      locationReference: boundedText(
        fulfillment.locationReference,
        512,
        "accepted fulfillment location reference",
      ),
      windowReference: boundedText(
        fulfillment.windowReference,
        512,
        "accepted fulfillment window reference",
      ),
    }),
    capacityRequirements:
      Object.freeze(capacityRequirements),
    acceptance: Object.freeze({
      attribution: boundedText(
        acceptance.attribution,
        512,
        "reservation acceptance attribution",
      ),
      sourceReference: boundedText(
        acceptance.sourceReference,
        512,
        "reservation acceptance source reference",
      ),
      acceptedOn: validateFoodReviewDate(
        acceptance.acceptedOn,
      ),
    }),
  });
}

function assertExactSources(
  acceptance:
    FoodReservationAcceptanceVersion,
  order:
    FoodPhysicalOrderVersion,
  request:
    FoodReservationRequestVersion,
  fulfillment:
    ReturnType<
      typeof validateFoodFulfillmentIntentVersion
    >,
): void {
  if (
    acceptance.order.id !== order.id ||
    acceptance.order.version !==
      order.version
  ) {
    throw new TypeError(
      "Reservation acceptance physical order mismatch",
    );
  }

  if (
    acceptance.reservationRequest.id !==
      request.id ||
    acceptance.reservationRequest.version !==
      request.version
  ) {
    throw new TypeError(
      "Reservation acceptance request mismatch",
    );
  }

  if (
    order.reservationRequest.id !==
      request.id ||
    order.reservationRequest.version !==
      request.version
  ) {
    throw new TypeError(
      "Physical order reservation request mismatch",
    );
  }

  if (
    acceptance.fulfillmentIntent.id !==
      fulfillment.id ||
    acceptance.fulfillmentIntent.version !==
      fulfillment.version
  ) {
    throw new TypeError(
      "Reservation acceptance fulfillment intent mismatch",
    );
  }

  if (
    request.fulfillmentIntent.id !==
      fulfillment.id ||
    request.fulfillmentIntent.version !==
      fulfillment.version
  ) {
    throw new TypeError(
      "Reservation request fulfillment intent mismatch",
    );
  }

  if (
    order.fulfillmentIntent.id !==
      fulfillment.id ||
    order.fulfillmentIntent.version !==
      fulfillment.version
  ) {
    throw new TypeError(
      "Physical order fulfillment intent mismatch",
    );
  }

  if (
    acceptance.fulfillmentIntent.method !==
      fulfillment.method ||
    acceptance.fulfillmentIntent.locationReference !==
      fulfillment.locationReference ||
    acceptance.fulfillmentIntent.windowReference !==
      fulfillment.windowReference
  ) {
    throw new TypeError(
      "Reservation acceptance fulfillment snapshot mismatch",
    );
  }

  if (
    !sameCapacityRequirements(
      acceptance.capacityRequirements,
      request.capacityRequirements,
    )
  ) {
    throw new TypeError(
      "Reservation acceptance capacity requirement mismatch",
    );
  }
}

export function validateFoodReservationAcceptanceAgainstSources(
  input: unknown,
  orderInput: unknown,
  requestInput: unknown,
  fulfillmentInput: unknown,
): FoodReservationAcceptanceVersion {
  const acceptance =
    validateFoodReservationAcceptanceVersion(
      input,
    );

  const order =
    validateFoodPhysicalOrderVersion(
      orderInput,
    );

  const request =
    validateFoodReservationRequestVersion(
      requestInput,
    );

  const fulfillment =
    validateFoodFulfillmentIntentVersion(
      fulfillmentInput,
    );

  assertExactSources(
    acceptance,
    order,
    request,
    fulfillment,
  );

  return acceptance;
}

export function createInitialFoodReservationAcceptanceVersion(
  identityInput: unknown,
  orderInput: unknown,
  requestInput: unknown,
  fulfillmentInput: unknown,
  acceptanceInput: unknown,
): FoodReservationAcceptanceVersion {
  const identity = record(
    identityInput,
    ["id", "version"],
    "reservation acceptance identity/version",
  );

  const order =
    validateFoodPhysicalOrderVersion(
      orderInput,
    );

  const request =
    validateFoodReservationRequestVersion(
      requestInput,
    );

  const fulfillment =
    validateFoodFulfillmentIntentVersion(
      fulfillmentInput,
    );

  const metadata = record(
    acceptanceInput,
    [
      "attribution",
      "sourceReference",
      "acceptedOn",
    ],
    "reservation acceptance metadata input",
  );

  const value =
    validateFoodReservationAcceptanceAgainstSources(
      {
        id:
          parseFoodReservationAcceptanceId(
            identity.id,
          ),
        version: validateFoodVersion(
          identity.version,
        ),
        order: {
          id: order.id,
          version: order.version,
        },
        reservationRequest: {
          id: request.id,
          version: request.version,
        },
        fulfillmentIntent: {
          id: fulfillment.id,
          version: fulfillment.version,
          method: fulfillment.method,
          locationReference:
            fulfillment.locationReference,
          windowReference:
            fulfillment.windowReference,
        },
        capacityRequirements:
          request.capacityRequirements.map(
            line => ({
              sku: {
                id: line.sku.id,
                version: line.sku.version,
              },
              quantity: line.quantity,
            }),
          ),
        acceptance: {
          attribution: metadata.attribution,
          sourceReference:
            metadata.sourceReference,
          acceptedOn: metadata.acceptedOn,
        },
      },
      order,
      request,
      fulfillment,
    );

  if (value.version !== 1) {
    throw new TypeError(
      "Initial reservation acceptance version must be one",
    );
  }

  return value;
}
