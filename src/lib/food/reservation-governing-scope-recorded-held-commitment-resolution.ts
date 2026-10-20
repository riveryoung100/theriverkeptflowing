/**
 * FOOD-007R
 *
 * Composes cumulative durable recorded-held commitment evidence for an
 * already-derived FOOD-007P governing commitment scope.
 *
 * FOOD-007R does not choose governing revisions, calculate capacity,
 * decide sufficiency, authorize reservations or mutate durable state.
 */

import {
  FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND,
  type FoodReservationCapacityCommitmentScope,
} from "./reservation-capacity-commitment-scope";

import {
  FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND,
  readFoodGoverningScopeRecordedHeldCapacityCommitment,
  type FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Database,
} from "./d1-governing-scope-recorded-held-capacity-commitment-read";

import { FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND } from "./reservation-capacity-governing-source-policy";
import { FOOD_RESERVATION_HOLD_COMMAND_KIND } from "./reservation-hold-command";
import { FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND } from "./reservation-capacity-source-selection-request";
import { validateFoodFulfillmentIntentVersion, validateFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { parseFoodPhysicalOrderId } from "./physical-order-domain";

export const FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND =
  "reservation-governing-scope-recorded-held-commitment-resolution" as const;

export type FoodReservationGoverningScopeRecordedHeldCommitmentResolutionD1Database =
  FoodGoverningScopeRecordedHeldCapacityCommitmentReadD1Database;

export type FoodReservationGoverningScopeRecordedHeldSkuCommitment =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    governingRevision: number;
    recordedHeldQuantity: number;
  }>;

export type FoodReservationGoverningScopeRecordedHeldSlotCommitment =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    governingRevision: number;
    recordedHeldQuantity: number;
  }>;

export type FoodReservationGoverningScopeRecordedHeldCommitmentResolution =
  Readonly<{
    kind:
      typeof FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND;
    skuCommitments:
      readonly FoodReservationGoverningScopeRecordedHeldSkuCommitment[];
    slotCommitment:
      FoodReservationGoverningScopeRecordedHeldSlotCommitment;
  }>;

export type FoodReservationGoverningScopeRecordedHeldCommitmentResolutionResult =
  | Readonly<{
      outcome: "resolved";
      resolution:
        FoodReservationGoverningScopeRecordedHeldCommitmentResolution;
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

type CapturedSkuScope =
  Readonly<{
    sku: Readonly<{
      id: string;
      version: number;
    }>;
    governingRevision: number;
  }>;

type CapturedSlotScope =
  Readonly<{
    method:
      | "personal-delivery"
      | "meetup";
    locationReference: string;
    windowReference: string;
    governingRevision: number;
  }>;

type CapturedScope =
  Readonly<{
    skuScopes:
      readonly CapturedSkuScope[];
    slotScope:
      CapturedSlotScope;
  }>;

type GoverningReadResult =
  Awaited<
    ReturnType<
      typeof readFoodGoverningScopeRecordedHeldCapacityCommitment
    >
  >;

function invalid():
  Readonly<{
    outcome: "invalid";
  }> {
  return Object.freeze({
    outcome:
      "invalid",
  });
}

function storageFailure():
  Readonly<{
    outcome: "storage-failure";
  }> {
  return Object.freeze({
    outcome:
      "storage-failure",
  });
}

function exactDataRecord(
  input: unknown,
  expectedKeys: readonly string[],
):
  Record<string, unknown>
  | undefined {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return undefined;
  }

  if (
    Object.getPrototypeOf(input) !==
    Object.prototype
  ) {
    return undefined;
  }

  if (
    Object.getOwnPropertySymbols(
      input,
    ).length !== 0
  ) {
    return undefined;
  }

  const names =
    Object.getOwnPropertyNames(
      input,
    ).sort();

  const expected =
    [...expectedKeys].sort();

  if (
    names.length !==
    expected.length
  ) {
    return undefined;
  }

  for (
    let index = 0;
    index < expected.length;
    index += 1
  ) {
    if (
      names[index] !==
      expected[index]
    ) {
      return undefined;
    }
  }

  for (
    const key of
    expectedKeys
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        key,
      );

    if (
      descriptor ===
        undefined ||
      !(
        "value" in
        descriptor
      )
    ) {
      return undefined;
    }
  }

  return input as
    Record<string, unknown>;
}

function denseDataArray(
  input: unknown,
):
  readonly unknown[]
  | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  if (Object.getPrototypeOf(input) !== Array.prototype) {
    return undefined;
  }

  if (
    Object.getOwnPropertySymbols(
      input,
    ).length !== 0
  ) {
    return undefined;
  }

  const names =
    Object.getOwnPropertyNames(
      input,
    );

  if (
    names.length !==
    input.length + 1 ||
    !names.includes(
      "length",
    )
  ) {
    return undefined;
  }

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        input,
        String(index),
      );

    if (
      descriptor ===
        undefined ||
      !(
        "value" in
        descriptor
      )
    ) {
      return undefined;
    }
  }

  return input;
}

function nonemptyString(
  input: unknown,
):
  string
  | undefined {
  if (
    typeof input !== "string" ||
    input.length === 0
  ) {
    return undefined;
  }

  return input;
}

function positiveSafeInteger(
  input: unknown,
):
  number
  | undefined {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(
      input,
    ) ||
    input <= 0
  ) {
    return undefined;
  }

  return input;
}

function captureSkuScope(
  input: unknown,
):
  CapturedSkuScope
  | undefined {
  const scope =
    exactDataRecord(
      input,
      [
        "sku",
        "governingRevision",
      ],
    );

  if (scope === undefined) {
    return undefined;
  }

  const sku =
    exactDataRecord(
      scope.sku,
      [
        "id",
        "version",
      ],
    );

  if (sku === undefined) {
    return undefined;
  }

  const id =
    nonemptyString(
      sku.id,
    );

  const version =
    positiveSafeInteger(
      sku.version,
    );

  const governingRevision =
    positiveSafeInteger(
      scope.governingRevision,
    );

  if (
    id === undefined ||
    version === undefined ||
    governingRevision ===
      undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    sku:
      Object.freeze({
        id,
        version,
      }),
    governingRevision,
  });
}

function captureSlotScope(
  input: unknown,
):
  CapturedSlotScope
  | undefined {
  const scope =
    exactDataRecord(
      input,
      [
        "method",
        "locationReference",
        "windowReference",
        "governingRevision",
      ],
    );

  if (scope === undefined) {
    return undefined;
  }

  if (
    scope.method !==
      "personal-delivery" &&
    scope.method !==
      "meetup"
  ) {
    return undefined;
  }

  const locationReference =
    nonemptyString(
      scope.locationReference,
    );

  const windowReference =
    nonemptyString(
      scope.windowReference,
    );

  const governingRevision =
    positiveSafeInteger(
      scope.governingRevision,
    );

  if (
    locationReference ===
      undefined ||
    windowReference ===
      undefined ||
    governingRevision ===
      undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    method:
      scope.method,
    locationReference,
    windowReference,
    governingRevision,
  });
}

// Inspect every nested descriptor before canonical domain validators read it.
function capturePlainData(input: unknown, ancestors: readonly object[] = []): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean" ||
    (typeof input === "number" && Number.isFinite(input))) return input;
  if (typeof input !== "object" || ancestors.includes(input)) throw new TypeError("Invalid plain data");
  const path = [...ancestors, input];
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) throw new TypeError("Unsupported array");
    const array = denseDataArray(input);
    if (!array) throw new TypeError("Invalid dense array");
    return array.map(value => capturePlainData(value, path));
  }
  const record = exactDataRecord(input, Object.getOwnPropertyNames(input));
  if (!record) throw new TypeError("Invalid data record");
  return Object.fromEntries(Object.getOwnPropertyNames(record).map(key => [key, capturePlainData(record[key], path)]));
}

function requiredRecord(input: unknown, keys: readonly string[]): Record<string, unknown> {
  const record = exactDataRecord(input, keys);
  if (!record) throw new TypeError("Invalid canonical record");
  return record;
}

function validateGoverning(input: unknown, scope: CapturedScope): void {
  const governing = requiredRecord(capturePlainData(input), ["kind", "policyVersion", "command", "observations"]);
  if (governing.kind !== FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND || governing.policyVersion !== 1) {
    throw new TypeError("Invalid governing identity");
  }
  const command = requiredRecord(governing.command, ["kind", "reservationId", "order", "selection"]);
  if (command.kind !== FOOD_RESERVATION_HOLD_COMMAND_KIND || typeof command.reservationId !== "string") {
    throw new TypeError("Invalid command identity");
  }
  const identityLength = Array.from(command.reservationId.split("\0", 1)[0]!).length;
  if (identityLength < 1 || identityLength > 512) throw new TypeError("Invalid reservation identity");
  const order = requiredRecord(command.order, ["id", "version"]);
  parseFoodPhysicalOrderId(order.id);
  if (positiveSafeInteger(order.version) === undefined) throw new TypeError("Invalid order version");
  const selection = requiredRecord(command.selection, ["kind", "request", "fulfillmentIntent", "skuSelections", "slotSelection"]);
  if (selection.kind !== FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND) throw new TypeError("Invalid selection kind");
  const request = validateFoodReservationRequestVersion(selection.request);
  const intent = validateFoodFulfillmentIntentVersion(selection.fulfillmentIntent);
  if (request.fulfillmentIntent.id !== intent.id || request.fulfillmentIntent.version !== intent.version ||
    request.quote.id !== intent.quote.id || request.quote.version !== intent.quote.version) throw new TypeError("Invalid source references");
  const observations = requiredRecord(governing.observations, ["skuObservations", "slotObservation"]);
  const selectedSkus = denseDataArray(selection.skuSelections);
  const observedSkus = denseDataArray(observations.skuObservations);
  if (!selectedSkus || !observedSkus || selectedSkus.length !== scope.skuScopes.length ||
    observedSkus.length !== scope.skuScopes.length || request.capacityRequirements.length !== scope.skuScopes.length) {
    throw new TypeError("Incomplete governing streams");
  }
  for (const [index, skuScope] of scope.skuScopes.entries()) {
    const selected = requiredRecord(selectedSkus[index], ["sku", "revision"]);
    const observed = requiredRecord(observedSkus[index], ["sku", "observedHighestRecordedRevision"]);
    const selectedSku = requiredRecord(selected.sku, ["id", "version"]);
    const observedSku = requiredRecord(observed.sku, ["id", "version"]);
    const demand = request.capacityRequirements[index]!;
    if ([selectedSku, observedSku, demand.sku].some(sku => sku.id !== skuScope.sku.id || sku.version !== skuScope.sku.version) ||
      selected.revision !== skuScope.governingRevision || observed.observedHighestRecordedRevision !== skuScope.governingRevision) {
      throw new TypeError("Inconsistent governing SKU scope");
    }
  }
  const selectedSlot = requiredRecord(selection.slotSelection, ["method", "locationReference", "windowReference", "revision"]);
  const observedSlot = requiredRecord(observations.slotObservation, ["method", "locationReference", "windowReference", "observedHighestRecordedRevision"]);
  for (const slot of [selectedSlot, observedSlot, intent]) {
    if (slot.method !== scope.slotScope.method || slot.locationReference !== scope.slotScope.locationReference ||
      slot.windowReference !== scope.slotScope.windowReference) throw new TypeError("Inconsistent governing slot scope");
  }
  if (selectedSlot.revision !== scope.slotScope.governingRevision ||
    observedSlot.observedHighestRecordedRevision !== scope.slotScope.governingRevision) throw new TypeError("Inconsistent governing slot revision");
}

function captureScope(
  input: unknown,
):
  CapturedScope
  | undefined {
  const root =
    exactDataRecord(
      input,
      [
        "kind",
        "policyVersion",
        "governing",
        "skuScopes",
        "slotScope",
      ],
    );

  if (
    root === undefined ||
    root.policyVersion !== 1 ||
    root.kind !==
      FOOD_RESERVATION_CAPACITY_COMMITMENT_SCOPE_KIND
  ) {
    return undefined;
  }

  const skuScopeInputs =
    denseDataArray(
      root.skuScopes,
    );

  if (
    skuScopeInputs ===
    undefined
  ) {
    return undefined;
  }

  const skuScopes:
    CapturedSkuScope[] =
    [];

  for (
    const skuScopeInput of
    skuScopeInputs
  ) {
    const skuScope =
      captureSkuScope(
        skuScopeInput,
      );

    if (
      skuScope ===
      undefined
    ) {
      return undefined;
    }

    skuScopes.push(
      skuScope,
    );
  }

  const slotScope =
    captureSlotScope(
      root.slotScope,
    );

  if (
    slotScope ===
    undefined
  ) {
    return undefined;
  }

  const captured = Object.freeze({
    skuScopes: Object.freeze(skuScopes),
    slotScope,
  });
  validateGoverning(root.governing, captured);
  return captured;
}

function readFailure(
  read: Exclude<
    GoverningReadResult,
    Readonly<{
      outcome: "read";
    }>
  >,
):
  Readonly<{
    outcome: "invalid";
  }>
  | Readonly<{
      outcome: "storage-failure";
    }> {
  if (
    read.outcome ===
    "invalid"
  ) {
    return invalid();
  }

  return storageFailure();
}

export async function resolveFoodReservationGoverningScopeRecordedHeldCommitments(
  database:
    FoodReservationGoverningScopeRecordedHeldCommitmentResolutionD1Database,
  input:
    FoodReservationCapacityCommitmentScope,
): Promise<
  FoodReservationGoverningScopeRecordedHeldCommitmentResolutionResult
> {
  let scope:
    CapturedScope
    | undefined;

  try {
    scope =
      captureScope(
        input,
      );
  }
  catch {
    return invalid();
  }

  if (
    scope ===
    undefined
  ) {
    return invalid();
  }

  const skuCommitments:
    FoodReservationGoverningScopeRecordedHeldSkuCommitment[] =
    [];

  for (
    const skuScope of
    scope.skuScopes
  ) {
    let read:
      GoverningReadResult;

    try {
      read =
        await readFoodGoverningScopeRecordedHeldCapacityCommitment(
          database,
          {
            scope:
              "sku",
            sku: {
              id:
                skuScope.sku.id,
              version:
                skuScope.sku.version,
            },
            governingRevision:
              skuScope.governingRevision,
          },
        );
    }
    catch {
      return storageFailure();
    }

    if (
      read.outcome !==
      "read"
    ) {
      return readFailure(
        read,
      );
    }

    if (
      read.value.kind !==
        FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND ||
      read.value.scope !==
        "sku" ||
      read.value.selector.sku.id !==
        skuScope.sku.id ||
      read.value.selector.sku.version !==
        skuScope.sku.version ||
      read.value.selector.governingRevision !==
        skuScope.governingRevision
    ) {
      return storageFailure();
    }

    skuCommitments.push(
      Object.freeze({
        sku:
          Object.freeze({
            id:
              skuScope.sku.id,
            version:
              skuScope.sku.version,
          }),
        governingRevision:
          skuScope.governingRevision,
        recordedHeldQuantity:
          read.value.recordedHeldQuantity,
      }),
    );
  }

  const slotScope =
    scope.slotScope;

  let slotRead:
    GoverningReadResult;

  try {
    slotRead =
      await readFoodGoverningScopeRecordedHeldCapacityCommitment(
        database,
        {
          scope:
            "slot",
          method:
            slotScope.method,
          locationReference:
            slotScope.locationReference,
          windowReference:
            slotScope.windowReference,
          governingRevision:
            slotScope.governingRevision,
        },
      );
  }
  catch {
    return storageFailure();
  }

  if (
    slotRead.outcome !==
    "read"
  ) {
    return readFailure(
      slotRead,
    );
  }

  if (
    slotRead.value.kind !==
      FOOD_GOVERNING_SCOPE_RECORDED_HELD_CAPACITY_COMMITMENT_KIND ||
    slotRead.value.scope !==
      "slot" ||
    slotRead.value.selector.method !==
      slotScope.method ||
    slotRead.value.selector.locationReference !==
      slotScope.locationReference ||
    slotRead.value.selector.windowReference !==
      slotScope.windowReference ||
    slotRead.value.selector.governingRevision !==
      slotScope.governingRevision
  ) {
    return storageFailure();
  }

  const resolution:
    FoodReservationGoverningScopeRecordedHeldCommitmentResolution =
    Object.freeze({
      kind:
        FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
      skuCommitments:
        Object.freeze(
          skuCommitments,
        ),
      slotCommitment:
        Object.freeze({
          method:
            slotScope.method,
          locationReference:
            slotScope.locationReference,
          windowReference:
            slotScope.windowReference,
          governingRevision:
            slotScope.governingRevision,
          recordedHeldQuantity:
            slotRead.value.recordedHeldQuantity,
        }),
    });

  return Object.freeze({
    outcome:
      "resolved",
    resolution,
  });
}
