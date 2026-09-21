import type {
  PrincipalId,
} from "../identifiers";

import type {
  AuthenticatedPrincipalSession,
} from "./model";

export interface PrincipalSessionStore {
  createSession(
    principalId:
      PrincipalId,
  ): Promise<
    AuthenticatedPrincipalSession
  >;

  getSession():
  Promise<
    AuthenticatedPrincipalSession |
    null
  >;

  destroySession():
  Promise<void>;
}

export interface AstroSessionLike {
  regenerate():
  Promise<void>;

  get(
    key:
      string,
  ): unknown;

  set(
    key:
      string,
    value:
      unknown,
    options?: {
      readonly ttl?:
        number;
    },
  ): void;

  delete(
    key:
      string,
  ): void;

  destroy():
  Promise<void>;
}
