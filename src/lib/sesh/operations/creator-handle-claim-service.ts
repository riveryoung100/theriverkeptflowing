import type {
  AuthenticatedSeshCreatorResolutionFailureCode,
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import {
  normalizeSeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshCreatorHandle,
  SeshCreatorHandleReservation,
} from "../creator-handle";

import type {
  SeshCreatorHandleReservationRepository,
} from "../persistence/repositories";

export type SeshCreatorHandleClaimFailureCode =
  | AuthenticatedSeshCreatorResolutionFailureCode
  | "invalid-input"
  | "conflict";

export type SeshCreatorHandleClaimResult =
  | {
      readonly ok:
        true;

      readonly value:
        SeshCreatorHandleReservation;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SeshCreatorHandleClaimFailureCode;

        readonly message:
          string;
      };
    };

export interface AuthenticatedSeshCreatorHandleClaimService {
  claimHandle(
    requestedHandle:
      unknown,
  ): Promise<
    SeshCreatorHandleClaimResult
  >;
}

export interface DefaultAuthenticatedSeshCreatorHandleClaimServiceDependencies {
  readonly creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly reservations:
    SeshCreatorHandleReservationRepository;

  readonly now?:
    () => string;
}

function success(
  value:
    SeshCreatorHandleReservation,
): SeshCreatorHandleClaimResult {
  return {
    ok:
      true,

    value,
  };
}

function failure(
  code:
    SeshCreatorHandleClaimFailureCode,

  message:
    string,
): SeshCreatorHandleClaimResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function resolverFailure(
  code:
    AuthenticatedSeshCreatorResolutionFailureCode,
): SeshCreatorHandleClaimResult {
  switch (code) {
    case "unauthenticated":
      return failure(
        "unauthenticated",
        "Authentication is required.",
      );

    case "unmapped":
      return failure(
        "unmapped",
        "No Sesh creator identity is provisioned for the authenticated principal.",
      );

    case "unavailable":
      return failure(
        "unavailable",
        "Sesh creator identity is temporarily unavailable.",
      );
  }
}

function canonicalTimestamp(
  value:
    unknown,
): string {
  if (
    typeof value !==
      "string" ||
    Number.isNaN(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new TypeError(
      "Handle claim timestamp must be valid.",
    );
  }

  return value;
}

export class DefaultAuthenticatedSeshCreatorHandleClaimService
implements AuthenticatedSeshCreatorHandleClaimService {
  readonly #creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly #reservations:
    SeshCreatorHandleReservationRepository;

  readonly #now:
    () => string;

  constructor(
    dependencies:
      DefaultAuthenticatedSeshCreatorHandleClaimServiceDependencies,
  ) {
    this.#creatorResolver =
      dependencies.creatorResolver;

    this.#reservations =
      dependencies.reservations;

    this.#now =
      dependencies.now ??
      (() =>
        new Date().toISOString());
  }

  async claimHandle(
    requestedHandle:
      unknown,
  ): Promise<
    SeshCreatorHandleClaimResult
  > {
    let normalizedHandle:
      SeshCreatorHandle;

    try {
      normalizedHandle =
        normalizeSeshCreatorHandle(
          requestedHandle,
        );
    }
    catch (error) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh creator handle is invalid.",
      );
    }

    let creator:
      Awaited<
        ReturnType<
          AuthenticatedSeshCreatorResolver[
            "resolve"
          ]
        >
      >;

    try {
      creator =
        await this.#creatorResolver
          .resolve();
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator identity is temporarily unavailable.",
      );
    }

    if (
      !creator.ok
    ) {
      return resolverFailure(
        creator.error.code,
      );
    }

    let existingForCreator:
      Awaited<
        ReturnType<
          SeshCreatorHandleReservationRepository[
            "getByCreatorId"
          ]
        >
      >;

    try {
      existingForCreator =
        await this.#reservations
          .getByCreatorId(
            creator.value.seshCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator handle reservations are temporarily unavailable.",
      );
    }

    if (
      existingForCreator.ok
    ) {
      return (
        existingForCreator
          .value
          .normalizedHandle ===
        normalizedHandle
      )
        ? success(
            existingForCreator.value,
          )
        : failure(
            "conflict",
            "This Sesh creator already owns a different handle.",
          );
    }

    if (
      existingForCreator
        .error
        .kind !==
      "not-found"
    ) {
      return failure(
        "unavailable",
        "Sesh creator handle reservations are temporarily unavailable.",
      );
    }

    let createdAt:
      string;

    try {
      createdAt =
        canonicalTimestamp(
          this.#now(),
        );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator handle claiming is temporarily unavailable.",
      );
    }

    let reserved:
      Awaited<
        ReturnType<
          SeshCreatorHandleReservationRepository[
            "reserveHandle"
          ]
        >
      >;

    try {
      reserved =
        await this.#reservations
          .reserveHandle({
            normalizedHandle,
            creatorId:
              creator.value
                .seshCreatorId,
            createdAt,
          });
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator handle claiming is temporarily unavailable.",
      );
    }

    if (
      !reserved.ok
    ) {
      return reserved.error.kind ===
        "conflict"
        ? failure(
            "conflict",
            "The requested Sesh creator handle is unavailable or this creator already owns another handle.",
          )
        : reserved.error.kind ===
            "validation"
          ? failure(
              "invalid-input",
              reserved.error.message,
            )
          : failure(
              "unavailable",
              "Sesh creator handle claiming is temporarily unavailable.",
            );
    }

    if (
      reserved.value.creatorId !==
        creator.value.seshCreatorId ||
      reserved.value.normalizedHandle !==
        normalizedHandle
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator handle reservation failed its identity invariant.",
      );
    }

    return success(
      reserved.value,
    );
  }
}