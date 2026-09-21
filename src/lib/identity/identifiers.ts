export type PrincipalId =
  string & {
    readonly __brand: "PrincipalId";
  };

export const PRINCIPAL_ID_PREFIX =
  "principal";

function requirePrincipalLocalId(
  value: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    value.includes(":")
  ) {
    throw new TypeError(
      "Principal local identity must be a non-empty canonical value without surrounding whitespace or colons.",
    );
  }

  return value;
}

export function createPrincipalId(
  localId: string,
): PrincipalId {
  const canonicalLocalId =
    requirePrincipalLocalId(
      localId,
    );

  return (
    `${PRINCIPAL_ID_PREFIX}:${canonicalLocalId}`
  ) as PrincipalId;
}

export function parsePrincipalId(
  value: unknown,
): PrincipalId {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    throw new TypeError(
      "PrincipalId must be a non-empty canonical string.",
    );
  }

  const prefix =
    `${PRINCIPAL_ID_PREFIX}:`;

  if (
    !value.startsWith(prefix)
  ) {
    throw new TypeError(
      "PrincipalId must begin with principal:.",
    );
  }

  const localId =
    value.slice(
      prefix.length,
    );

  requirePrincipalLocalId(
    localId,
  );

  return value as PrincipalId;
}
