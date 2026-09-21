import type {
  PrincipalId,
} from "../identifiers";

import type {
  SeshCreatorId,
} from "../../sesh/identifiers";

export interface PrincipalSeshCreatorMapping {
  readonly principalId:
    PrincipalId;

  readonly seshCreatorId:
    SeshCreatorId;

  readonly createdAt:
    string;
}

function requireCanonicalTimestamp(
  value:
    unknown,
): string {
  if (
    typeof value !==
      "string" ||
    value.length ===
      0 ||
    value.trim() !==
      value ||
    Number.isNaN(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new Error(
      "PrincipalSeshCreatorMapping.createdAt must be a canonical timestamp string.",
    );
  }

  return value;
}

export function validatePrincipalSeshCreatorMapping(
  value:
    PrincipalSeshCreatorMapping,
): PrincipalSeshCreatorMapping {
  if (
    typeof value.principalId !==
      "string" ||
    !value.principalId.startsWith(
      "principal:",
    )
  ) {
    throw new Error(
      "PrincipalSeshCreatorMapping.principalId must be a canonical PrincipalId.",
    );
  }

  if (
    typeof value.seshCreatorId !==
      "string" ||
    !value.seshCreatorId.startsWith(
      "sesh-creator:",
    )
  ) {
    throw new Error(
      "PrincipalSeshCreatorMapping.seshCreatorId must be a canonical SeshCreatorId.",
    );
  }

  return {
    principalId:
      value.principalId,

    seshCreatorId:
      value.seshCreatorId,

    createdAt:
      requireCanonicalTimestamp(
        value.createdAt,
      ),
  };
}
