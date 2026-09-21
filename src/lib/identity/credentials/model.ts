import type {
  PrincipalId,
} from "../identifiers";

export interface PasswordCredential {
  readonly principalId:
    PrincipalId;

  readonly emailNormalized:
    string;

  readonly passwordHash:
    string;

  readonly createdAt:
    string;

  readonly updatedAt:
    string;
}
