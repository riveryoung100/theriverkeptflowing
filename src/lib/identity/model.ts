import type {
  PrincipalId,
} from "./identifiers";

export const PRINCIPAL_STATUSES = [
  "active",
  "disabled",
] as const;

export type PrincipalStatus =
  typeof PRINCIPAL_STATUSES[number];

export type PrincipalTimestamp =
  string;

export interface AuthenticatedPrincipal {
  readonly principalId: PrincipalId;
  readonly status: PrincipalStatus;
  readonly displayName?: string;
  readonly createdAt: PrincipalTimestamp;
  readonly updatedAt: PrincipalTimestamp;
}
