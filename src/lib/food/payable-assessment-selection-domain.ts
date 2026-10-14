import {
  validateFoodPayableAssessmentVersion,
  type FoodPayableAssessmentVersion,
} from "./payable-assessment-domain";

export const FOOD_PAYABLE_ASSESSMENT_SELECTION_KIND =
  "payable-assessment-selection" as const;

export type FoodPayableAssessmentSelectionKind =
  typeof FOOD_PAYABLE_ASSESSMENT_SELECTION_KIND;

export interface FoodPayableAssessmentSelectionEvidence {
  readonly kind: FoodPayableAssessmentSelectionKind;
  readonly order: Readonly<{
    id: FoodPayableAssessmentVersion["order"]["id"];
    version: number;
  }>;
  readonly payableAssessment: Readonly<{
    id: FoodPayableAssessmentVersion["id"];
    version: number;
  }>;
  readonly attribution: string;
  readonly sourceReference: string;
  readonly selectedOn: string;
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

function selectionDate(
  value: unknown,
): string {
  const selectedOn =
    boundedString(
      value,
      "Invalid payable assessment selection date",
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(selectedOn)
  ) {
    throw new TypeError(
      "Invalid payable assessment selection date",
    );
  }

  return selectedOn;
}

export function validateFoodPayableAssessmentSelectionEvidence(
  selectionInput: unknown,
  assessmentInput: unknown,
): FoodPayableAssessmentSelectionEvidence {
  const assessment =
    validateFoodPayableAssessmentVersion(
      assessmentInput,
    );

  const selection =
    strictRecord(
      selectionInput,
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
    selection.kind !==
    FOOD_PAYABLE_ASSESSMENT_SELECTION_KIND
  ) {
    throw new TypeError(
      "Invalid payable assessment selection kind",
    );
  }

  const order =
    strictRecord(
      selection.order,
      ["id", "version"],
      "Invalid payable assessment selection order",
    );

  const payableAssessment =
    strictRecord(
      selection.payableAssessment,
      ["id", "version"],
      "Invalid selected payable assessment reference",
    );

  const orderVersion =
    positiveSafeInteger(
      order.version,
      "Invalid payable assessment selection order version",
    );

  const assessmentVersion =
    positiveSafeInteger(
      payableAssessment.version,
      "Invalid selected payable assessment version",
    );

  if (
    order.id !== assessment.order.id ||
    orderVersion !== assessment.order.version
  ) {
    throw new TypeError(
      "Payable assessment selection must bind exact assessment order",
    );
  }

  if (
    payableAssessment.id !== assessment.id ||
    assessmentVersion !== assessment.version
  ) {
    throw new TypeError(
      "Payable assessment selection must bind exact assessment version",
    );
  }

  const attribution =
    boundedString(
      selection.attribution,
      "Invalid payable assessment selection attribution",
    );

  const sourceReference =
    boundedString(
      selection.sourceReference,
      "Invalid payable assessment selection source reference",
    );

  const selectedOn =
    selectionDate(
      selection.selectedOn,
    );

  return Object.freeze({
    kind:
      FOOD_PAYABLE_ASSESSMENT_SELECTION_KIND,
    order: Object.freeze({
      id: assessment.order.id,
      version: assessment.order.version,
    }),
    payableAssessment: Object.freeze({
      id: assessment.id,
      version: assessment.version,
    }),
    attribution,
    sourceReference,
    selectedOn,
  });
}