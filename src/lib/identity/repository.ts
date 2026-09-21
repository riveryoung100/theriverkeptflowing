import type {
  PrincipalId,
} from "./identifiers";
import type {
  AuthenticatedPrincipal,
} from "./model";

export type PrincipalRepositoryErrorCode =
  | "not-found"
  | "validation"
  | "conflict"
  | "storage";

export interface PrincipalRepositoryError {
  readonly code:
    PrincipalRepositoryErrorCode;
  readonly message:
    string;
}

export type PrincipalRepositoryResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: PrincipalRepositoryError;
    };

export interface PrincipalRepository {
  savePrincipal(
    principal: unknown,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  >;

  getPrincipal(
    principalId: PrincipalId,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  >;

  principalExists(
    principalId: PrincipalId,
  ): Promise<
    PrincipalRepositoryResult<boolean>
  >;
}
