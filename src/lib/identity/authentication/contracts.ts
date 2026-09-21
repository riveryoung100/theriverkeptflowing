import type {
  PrincipalId,
} from "../identifiers";

export interface PasswordAuthenticationRequest {
  readonly email:
    string;

  readonly password:
    string;
}

export interface PasswordAuthenticationSuccess {
  readonly principalId:
    PrincipalId;

  readonly needsPasswordRehash:
    boolean;
}

export type PasswordAuthenticationFailureCode =
  | "invalid-credentials"
  | "unavailable";

export type PasswordAuthenticationResult =
  | {
      readonly ok:
        true;

      readonly value:
        PasswordAuthenticationSuccess;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          PasswordAuthenticationFailureCode;

        readonly message:
          string;
      };
    };

export interface PasswordAuthenticationService {
  authenticate(
    request:
      PasswordAuthenticationRequest,
  ): Promise<
    PasswordAuthenticationResult
  >;
}
