import {
  parsePrincipalId,
} from "./identifiers";
import {
  PRINCIPAL_STATUSES,
  type AuthenticatedPrincipal,
  type PrincipalStatus,
} from "./model";

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} must be an object.`,
    );
  }

  return value as Record<string, unknown>;
}

function requireString(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `${label} must be a non-empty string.`,
    );
  }

  return value;
}

function requireOptionalString(
  value: unknown,
  label: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(
    value,
    label,
  );
}

function requireTimestamp(
  value: unknown,
  label: string,
): string {
  const timestamp =
    requireString(
      value,
      label,
    );

  const parsed =
    Date.parse(
      timestamp,
    );

  if (!Number.isFinite(parsed)) {
    throw new TypeError(
      `${label} must be a valid timestamp.`,
    );
  }

  return timestamp;
}

function requirePrincipalStatus(
  value: unknown,
): PrincipalStatus {
  if (
    typeof value !== "string" ||
    !(
      PRINCIPAL_STATUSES as readonly string[]
    ).includes(value)
  ) {
    throw new TypeError(
      "AuthenticatedPrincipal.status must be active or disabled.",
    );
  }

  return value as PrincipalStatus;
}

export function validateAuthenticatedPrincipal(
  value: unknown,
): AuthenticatedPrincipal {
  const record =
    requireRecord(
      value,
      "AuthenticatedPrincipal",
    );

  const principalId =
    parsePrincipalId(
      record.principalId,
    );

  const status =
    requirePrincipalStatus(
      record.status,
    );

  const displayName =
    requireOptionalString(
      record.displayName,
      "AuthenticatedPrincipal.displayName",
    );

  const createdAt =
    requireTimestamp(
      record.createdAt,
      "AuthenticatedPrincipal.createdAt",
    );

  const updatedAt =
    requireTimestamp(
      record.updatedAt,
      "AuthenticatedPrincipal.updatedAt",
    );

  if (
    Date.parse(updatedAt) <
    Date.parse(createdAt)
  ) {
    throw new TypeError(
      "AuthenticatedPrincipal.updatedAt cannot precede createdAt.",
    );
  }

  return {
    principalId,
    status,
    ...(displayName === undefined
      ? {}
      : {
          displayName,
        }),
    createdAt,
    updatedAt,
  };
}
