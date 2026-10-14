export const FOOD_FULFILLMENT_CHARGE_POLICY_SATISFACTION_KIND =
  "fulfillment-charge-policy-satisfaction" as const;

export type FoodFulfillmentChargePolicySatisfactionKind =
  typeof FOOD_FULFILLMENT_CHARGE_POLICY_SATISFACTION_KIND;

export type FoodFulfillmentChargeGate =
  | "required-with-authorized-inclusion"
  | "not-required-without-charge";

export interface FoodFulfillmentChargePolicySatisfaction {
  readonly kind: FoodFulfillmentChargePolicySatisfactionKind;
  readonly order: Readonly<{
    id: string;
    version: number;
  }>;
  readonly policyDecision: Readonly<{
    id: string;
    version: number;
  }>;
  readonly payableAssessment: Readonly<{
    id: string;
    version: number;
  }>;
  readonly manualApprovalRequirement:
    | "required"
    | "not-required";
  readonly chargeGate: FoodFulfillmentChargeGate;
}

const MAX_TEXT_LENGTH = 512;

function strictRecord(
  value: unknown,
  allowedKeys: readonly string[],
  message: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError(message);
  }

  const record =
    value as Record<string, unknown>;

  const keys =
    Object.keys(record);

  if (
    keys.length !== allowedKeys.length ||
    keys.some(
      (key) =>
        !allowedKeys.includes(key),
    )
  ) {
    throw new TypeError(message);
  }

  return record;
}

function boundedString(
  value: unknown,
  message: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TEXT_LENGTH ||
    value.trim() !== value
  ) {
    throw new TypeError(message);
  }

  return value;
}

function positiveSafeInteger(
  value: unknown,
  message: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new TypeError(message);
  }

  return value;
}

function exactReference(
  input: unknown,
  message: string,
): Readonly<{
  id: string;
  version: number;
}> {
  const record =
    strictRecord(
      input,
      ["id", "version"],
      message,
    );

  return Object.freeze({
    id:
      boundedString(
        record.id,
        message,
      ),
    version:
      positiveSafeInteger(
        record.version,
        message,
      ),
  });
}

function validatePolicyDecision(
  input: unknown,
) {
  const record =
    strictRecord(
      input,
      [
        "id",
        "version",
        "order",
        "fulfillmentIntent",
        "manualApprovalRequirement",
        "decision",
      ],
      "Invalid fulfillment policy decision",
    );

  const id =
    boundedString(
      record.id,
      "Invalid fulfillment policy decision identity",
    );

  const version =
    positiveSafeInteger(
      record.version,
      "Invalid fulfillment policy decision version",
    );

  const order =
    exactReference(
      record.order,
      "Invalid fulfillment policy order reference",
    );

  const fulfillment =
    strictRecord(
      record.fulfillmentIntent,
      [
        "id",
        "version",
        "method",
        "locationReference",
        "windowReference",
      ],
      "Invalid fulfillment policy intent snapshot",
    );

  boundedString(
    fulfillment.id,
    "Invalid fulfillment policy intent identity",
  );

  positiveSafeInteger(
    fulfillment.version,
    "Invalid fulfillment policy intent version",
  );

  boundedString(
    fulfillment.method,
    "Invalid fulfillment policy intent method",
  );

  boundedString(
    fulfillment.locationReference,
    "Invalid fulfillment policy location reference",
  );

  boundedString(
    fulfillment.windowReference,
    "Invalid fulfillment policy window reference",
  );

  const requirement =
    record.manualApprovalRequirement;

  if (
    requirement !== "required" &&
    requirement !== "not-required"
  ) {
    throw new TypeError(
      "Invalid manual approval requirement",
    );
  }

  const decision =
    strictRecord(
      record.decision,
      [
        "attribution",
        "policyReference",
        "decidedOn",
      ],
      "Invalid fulfillment policy provenance",
    );

  boundedString(
    decision.attribution,
    "Invalid fulfillment policy attribution",
  );

  boundedString(
    decision.policyReference,
    "Invalid fulfillment policy reference",
  );

  boundedString(
    decision.decidedOn,
    "Invalid fulfillment policy decision date",
  );

  return Object.freeze({
    id,
    version,
    order,
    manualApprovalRequirement:
      requirement,
  });
}

function validateSelection(
  input: unknown,
) {
  const record =
    strictRecord(
      input,
      [
        "kind",
        "order",
        "payableAssessment",
        "attribution",
        "sourceReference",
        "selectedOn",
      ],
      "Invalid payable assessment selection evidence",
    );

  if (
    record.kind !==
    "payable-assessment-selection"
  ) {
    throw new TypeError(
      "Invalid payable assessment selection kind",
    );
  }

  const order =
    exactReference(
      record.order,
      "Invalid selected assessment order reference",
    );

  const payableAssessment =
    exactReference(
      record.payableAssessment,
      "Invalid selected payable assessment reference",
    );

  boundedString(
    record.attribution,
    "Invalid selection attribution",
  );

  boundedString(
    record.sourceReference,
    "Invalid selection source reference",
  );

  boundedString(
    record.selectedOn,
    "Invalid selection date",
  );

  return Object.freeze({
    order,
    payableAssessment,
  });
}

function validateMoney(
  input: unknown,
) {
  const record =
    strictRecord(
      input,
      ["currency", "minorUnits"],
      "Invalid authorized inclusion money",
    );

  const currency =
    boundedString(
      record.currency,
      "Invalid authorized inclusion currency",
    );

  if (
    typeof record.minorUnits !== "number" ||
    !Number.isSafeInteger(record.minorUnits) ||
    record.minorUnits < 0
  ) {
    throw new TypeError(
      "Invalid authorized inclusion minor units",
    );
  }

  return Object.freeze({
    currency,
    minorUnits: record.minorUnits,
  });
}

function validateInclusion(
  input: unknown,
) {
  const record =
    strictRecord(
      input,
      [
        "kind",
        "order",
        "payableAssessment",
        "adjustment",
      ],
      "Invalid authorized fulfillment charge assessment inclusion",
    );

  if (
    record.kind !==
    "authorized-fulfillment-charge-assessment-inclusion"
  ) {
    throw new TypeError(
      "Invalid authorized fulfillment charge assessment inclusion kind",
    );
  }

  const order =
    exactReference(
      record.order,
      "Invalid authorized inclusion order reference",
    );

  const payableAssessment =
    exactReference(
      record.payableAssessment,
      "Invalid authorized inclusion assessment reference",
    );

  const adjustment =
    strictRecord(
      record.adjustment,
      [
        "direction",
        "reference",
        "money",
        "sourceReference",
      ],
      "Invalid authorized inclusion adjustment",
    );

  if (
    adjustment.direction !== "charge"
  ) {
    throw new TypeError(
      "Authorized fulfillment inclusion must be charge adjustment",
    );
  }

  boundedString(
    adjustment.reference,
    "Invalid authorized inclusion adjustment reference",
  );

  boundedString(
    adjustment.sourceReference,
    "Invalid authorized inclusion source reference",
  );

  validateMoney(
    adjustment.money,
  );

  return Object.freeze({
    order,
    payableAssessment,
  });
}

function sameReference(
  left: Readonly<{
    id: string;
    version: number;
  }>,
  right: Readonly<{
    id: string;
    version: number;
  }>,
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version
  );
}

export function deriveFoodFulfillmentChargePolicySatisfaction(
  policyInput: unknown,
  selectionInput: unknown,
  inclusionInput?: unknown,
): FoodFulfillmentChargePolicySatisfaction {
  const policy =
    validatePolicyDecision(
      policyInput,
    );

  const selection =
    validateSelection(
      selectionInput,
    );

  if (
    !sameReference(
      policy.order,
      selection.order,
    )
  ) {
    throw new TypeError(
      "Fulfillment charge policy and selected assessment order mismatch",
    );
  }

  let chargeGate:
    FoodFulfillmentChargeGate;

  if (
    policy.manualApprovalRequirement ===
    "required"
  ) {
    if (inclusionInput === undefined) {
      throw new TypeError(
        "Required fulfillment charge policy requires authorized assessment inclusion",
      );
    }

    const inclusion =
      validateInclusion(
        inclusionInput,
      );

    if (
      !sameReference(
        inclusion.order,
        selection.order,
      )
    ) {
      throw new TypeError(
        "Authorized fulfillment charge inclusion order mismatch",
      );
    }

    if (
      !sameReference(
        inclusion.payableAssessment,
        selection.payableAssessment,
      )
    ) {
      throw new TypeError(
        "Authorized fulfillment charge inclusion selected assessment mismatch",
      );
    }

    chargeGate =
      "required-with-authorized-inclusion";
  }
  else {
    if (inclusionInput !== undefined) {
      throw new TypeError(
        "Not-required fulfillment charge policy forbids authorized inclusion evidence",
      );
    }

    chargeGate =
      "not-required-without-charge";
  }

  return Object.freeze({
    kind:
      FOOD_FULFILLMENT_CHARGE_POLICY_SATISFACTION_KIND,
    order: Object.freeze({
      id: selection.order.id,
      version:
        selection.order.version,
    }),
    policyDecision: Object.freeze({
      id: policy.id,
      version: policy.version,
    }),
    payableAssessment:
      Object.freeze({
        id:
          selection.payableAssessment.id,
        version:
          selection.payableAssessment.version,
      }),
    manualApprovalRequirement:
      policy.manualApprovalRequirement,
    chargeGate,
  });
}
