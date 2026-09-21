import type {
  PrincipalId,
} from "../identifiers";

import type {
  PasswordCredential,
} from "./model";

export type PasswordCredentialRepositoryErrorKind =
  | "not-found"
  | "validation"
  | "conflict"
  | "storage";

export interface PasswordCredentialRepositoryError {
  readonly kind:
    PasswordCredentialRepositoryErrorKind;

  readonly message:
    string;
}

export type PasswordCredentialRepositoryResult<T> =
  | {
      readonly ok:
        true;

      readonly value:
        T;
    }
  | {
      readonly ok:
        false;

      readonly error:
        PasswordCredentialRepositoryError;
    };

export interface PasswordCredentialRepository {
  saveCredential(
    credential:
      PasswordCredential,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  >;

  getCredentialByPrincipalId(
    principalId:
      PrincipalId,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  >;

  getCredentialByNormalizedEmail(
    emailNormalized:
      string,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  >;

  credentialExistsForPrincipal(
    principalId:
      PrincipalId,
  ): Promise<
    PasswordCredentialRepositoryResult<boolean>
  >;
}
