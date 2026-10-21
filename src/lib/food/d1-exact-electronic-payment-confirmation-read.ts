/**
 * FOOD-008D
 *
 * Exact read adapter for one durable electronic payment confirmation version.
 * This adapter returns durable payment-occurrence evidence only.
 */

import {
  parseFoodElectronicPaymentConfirmationId,
  validateFoodElectronicPaymentConfirmationVersion,
  type FoodElectronicPaymentConfirmationVersion,
} from "./electronic-payment-confirmation-domain";

export type FoodExactElectronicPaymentConfirmationReadResult =
  | Readonly<{
      outcome: "found";
      value: FoodElectronicPaymentConfirmationVersion;
    }>
  | Readonly<{
      outcome: "not-found";
    }>
  | Readonly<{
      outcome: "invalid";
    }>
  | Readonly<{
      outcome: "storage-failure";
    }>;

interface FoodExactElectronicPaymentConfirmationReadD1Result<T> {
  readonly success: boolean;
  readonly results?: T[];
}

interface FoodExactElectronicPaymentConfirmationReadD1BoundStatement {
  all<T>(): Promise<FoodExactElectronicPaymentConfirmationReadD1Result<T>>;
}

interface FoodExactElectronicPaymentConfirmationReadD1Statement {
  bind(
    ...values: unknown[]
  ): FoodExactElectronicPaymentConfirmationReadD1BoundStatement;
}

export interface FoodExactElectronicPaymentConfirmationReadD1Database {
  prepare(
    sql: string,
  ): FoodExactElectronicPaymentConfirmationReadD1Statement;
}

type DurableRow = Readonly<{
  confirmation_id: unknown;
  confirmation_version: unknown;
  order_id: unknown;
  order_version: unknown;
  merchandise_subtotal_currency: unknown;
  merchandise_subtotal_minor_units: unknown;
  channel: unknown;
  processor: unknown;
  processor_payment_reference: unknown;
  confirmation_source_reference: unknown;
  confirmed_amount_currency: unknown;
  confirmed_amount_minor_units: unknown;
}>;

const DURABLE_COLUMNS =
  Object.freeze([
    "confirmation_id",
    "confirmation_version",
    "order_id",
    "order_version",
    "merchandise_subtotal_currency",
    "merchandise_subtotal_minor_units",
    "channel",
    "processor",
    "processor_payment_reference",
    "confirmation_source_reference",
    "confirmed_amount_currency",
    "confirmed_amount_minor_units",
  ] as const);

const READ_SQL = `
SELECT
  confirmation_id,
  confirmation_version,
  order_id,
  order_version,
  merchandise_subtotal_currency,
  merchandise_subtotal_minor_units,
  channel,
  processor,
  processor_payment_reference,
  confirmation_source_reference,
  confirmed_amount_currency,
  confirmed_amount_minor_units
FROM food_electronic_payment_confirmations
WHERE confirmation_id = ? AND confirmation_version = ?
LIMIT 2
`.trim();

function deepFreeze<T>(
  value: T,
): T {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  for (
    const key of Reflect.ownKeys(value)
  ) {
    const descriptor =
      Object.getOwnPropertyDescriptor(
        value,
        key,
      );

    if (
      descriptor &&
      "value" in descriptor
    ) {
      deepFreeze(
        descriptor.value,
      );
    }
  }

  return Object.freeze(value);
}

function strictDurableRow(
  input: unknown,
): DurableRow {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Invalid durable electronic payment confirmation row",
    );
  }

  const keys =
    Reflect.ownKeys(input);

  if (
    keys.length !==
    DURABLE_COLUMNS.length
  ) {
    throw new TypeError(
      "Unexpected durable electronic payment confirmation row shape",
    );
  }

  const descriptors =
    Object.getOwnPropertyDescriptors(
      input,
    );

  for (const column of DURABLE_COLUMNS) {
    if (!keys.includes(column)) {
      throw new TypeError(
        "Missing durable electronic payment confirmation column",
      );
    }

    const descriptor =
      descriptors[column];

    if (
      !descriptor ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      throw new TypeError(
        "Accessor-backed durable electronic payment confirmation row",
      );
    }
  }

  for (const key of keys) {
    if (
      typeof key !== "string" ||
      !DURABLE_COLUMNS.includes(
        key as typeof DURABLE_COLUMNS[number],
      )
    ) {
      throw new TypeError(
        "Unexpected durable electronic payment confirmation column",
      );
    }
  }

  return input as DurableRow;
}

function durableValue(
  input: unknown,
  requestedId: string,
  requestedVersion: number,
): FoodElectronicPaymentConfirmationVersion {
  const row =
    strictDurableRow(input);

  if (
    row.confirmation_id !==
      requestedId ||
    row.confirmation_version !==
      requestedVersion ||
    row.confirmation_version !== 1
  ) {
    throw new TypeError(
      "Durable electronic payment confirmation identity mismatch",
    );
  }

  const value =
    validateFoodElectronicPaymentConfirmationVersion({
      id: row.confirmation_id,
      version:
        row.confirmation_version,
      order: {
        id: row.order_id,
        version:
          row.order_version,
        merchandiseSubtotal: {
          currency:
            row.merchandise_subtotal_currency,
          minorUnits:
            row.merchandise_subtotal_minor_units,
        },
      },
      evidence: {
        channel:
          row.channel,
        processor:
          row.processor,
        processorPaymentReference:
          row.processor_payment_reference,
        confirmationSourceReference:
          row.confirmation_source_reference,
        confirmedAmount: {
          currency:
            row.confirmed_amount_currency,
          minorUnits:
            row.confirmed_amount_minor_units,
        },
      },
    });

  return deepFreeze(value);
}

function resultRows(
  input: unknown,
): readonly unknown[] {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Invalid electronic payment confirmation read envelope",
    );
  }

  const descriptors =
    Object.getOwnPropertyDescriptors(
      input,
    );

  const successDescriptor =
    descriptors.success;

  const resultsDescriptor =
    descriptors.results;

  if (
    !successDescriptor ||
    !("value" in successDescriptor) ||
    successDescriptor.value !== true ||
    !resultsDescriptor ||
    !("value" in resultsDescriptor) ||
    !Array.isArray(
      resultsDescriptor.value,
    )
  ) {
    throw new TypeError(
      "Electronic payment confirmation read failed",
    );
  }

  return resultsDescriptor.value;
}

export async function readFoodElectronicPaymentConfirmationByExactIdentity(
  database: FoodExactElectronicPaymentConfirmationReadD1Database,
  confirmationId: unknown,
  confirmationVersion: unknown,
): Promise<FoodExactElectronicPaymentConfirmationReadResult> {
  let id: string;
  let version: number;

  try {
    id =
      parseFoodElectronicPaymentConfirmationId(
        confirmationId,
      );

    if (
      typeof confirmationVersion !==
        "number" ||
      !Number.isSafeInteger(
        confirmationVersion,
      ) ||
      confirmationVersion !== 1
    ) {
      throw new TypeError(
        "Unsupported durable electronic payment confirmation version",
      );
    }

    version =
      confirmationVersion;
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  let response: unknown;

  try {
    response =
      await database
        .prepare(READ_SQL)
        .bind(
          id,
          version,
        )
        .all<unknown>();
  }
  catch {
    return Object.freeze({
      outcome:
        "storage-failure",
    });
  }

  let rows:
    readonly unknown[];

  try {
    rows =
      resultRows(response);
  }
  catch {
    return Object.freeze({
      outcome:
        "storage-failure",
    });
  }

  if (rows.length === 0) {
    return Object.freeze({
      outcome:
        "not-found",
    });
  }

  if (rows.length !== 1) {
    return Object.freeze({
      outcome: "invalid",
    });
  }

  try {
    const value =
      durableValue(
        rows[0],
        id,
        version,
      );

    return Object.freeze({
      outcome: "found",
      value,
    });
  }
  catch {
    return Object.freeze({
      outcome: "invalid",
    });
  }
}