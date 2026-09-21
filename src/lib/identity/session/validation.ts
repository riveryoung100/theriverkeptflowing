import {
  parsePrincipalId,
} from "../identifiers";

import {
  AUTHENTICATED_PRINCIPAL_SESSION_VERSION,
} from "./model";

import type {
  AuthenticatedPrincipalSession,
} from "./model";

function requireTimestamp(
  value:
    unknown,
  label:
    string,
): string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `${label} must be a non-empty timestamp string.`,
    );
  }

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    throw new Error(
      `${label} must be a valid timestamp.`,
    );
  }

  return value;
}

export function validateAuthenticatedPrincipalSession(
  value:
    unknown,
): AuthenticatedPrincipalSession {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    throw new Error(
      "AuthenticatedPrincipalSession must be an object.",
    );
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  if (
    candidate.version !==
      AUTHENTICATED_PRINCIPAL_SESSION_VERSION
  ) {
    throw new Error(
      "AuthenticatedPrincipalSession version is unsupported.",
    );
  }

  const principalId =
    parsePrincipalId(
      candidate.principalId,
    );

  const authenticatedAt =
    requireTimestamp(
      candidate.authenticatedAt,
      "AuthenticatedPrincipalSession.authenticatedAt",
    );

  const expiresAt =
    requireTimestamp(
      candidate.expiresAt,
      "AuthenticatedPrincipalSession.expiresAt",
    );

  if (
    Date.parse(
      expiresAt,
    ) <=
    Date.parse(
      authenticatedAt,
    )
  ) {
    throw new Error(
      "AuthenticatedPrincipalSession.expiresAt must follow authenticatedAt.",
    );
  }

  return {
    version:
      AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

    principalId,
    authenticatedAt,
    expiresAt,
  };
}

export function isAuthenticatedPrincipalSessionExpired(
  session:
    AuthenticatedPrincipalSession,
  now:
    Date =
      new Date(),
): boolean {
  return (
    Date.parse(
      session.expiresAt,
    ) <=
    now.getTime()
  );
}
