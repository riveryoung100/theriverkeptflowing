import type {
  PrincipalId,
} from "../identifiers";

export const AUTHENTICATED_PRINCIPAL_SESSION_KEY =
  "river-authenticated-principal";

export const AUTHENTICATED_PRINCIPAL_SESSION_VERSION =
  1 as const;

export const AUTHENTICATED_PRINCIPAL_SESSION_TTL_SECONDS =
  60 * 60 * 12;

export interface AuthenticatedPrincipalSession {
  readonly version:
    typeof AUTHENTICATED_PRINCIPAL_SESSION_VERSION;

  readonly principalId:
    PrincipalId;

  readonly authenticatedAt:
    string;

  readonly expiresAt:
    string;
}
