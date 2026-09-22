import {
  normalizeSeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshCreatorHandleReservationRepository,
  SeshCreatorProfileRepository,
} from "../persistence/repositories";

export interface PublicSeshCreatorProfile {
  readonly handle:
    SeshCreatorHandle;

  readonly displayName:
    string;

  readonly bio?:
    string;
}

export type PublicSeshCreatorHandleResolutionFailureCode =
  | "invalid-input"
  | "not-found"
  | "unavailable";

export type PublicSeshCreatorHandleResolutionResult =
  | {
      readonly ok:
        true;

      readonly value:
        PublicSeshCreatorProfile;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          PublicSeshCreatorHandleResolutionFailureCode;

        readonly message:
          string;
      };
    };

export interface PublicSeshCreatorHandleResolutionService {
  resolveByHandle(
    requestedHandle:
      unknown,
  ): Promise<
    PublicSeshCreatorHandleResolutionResult
  >;
}

export interface DefaultPublicSeshCreatorHandleResolutionServiceDependencies {
  readonly reservations:
    SeshCreatorHandleReservationRepository;

  readonly profiles:
    SeshCreatorProfileRepository;
}

function success(
  value:
    PublicSeshCreatorProfile,
): PublicSeshCreatorHandleResolutionResult {
  return {
    ok:
      true,

    value,
  };
}

function failure(
  code:
    PublicSeshCreatorHandleResolutionFailureCode,

  message:
    string,
): PublicSeshCreatorHandleResolutionResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

export class DefaultPublicSeshCreatorHandleResolutionService
implements PublicSeshCreatorHandleResolutionService {
  readonly #reservations:
    SeshCreatorHandleReservationRepository;

  readonly #profiles:
    SeshCreatorProfileRepository;

  constructor(
    dependencies:
      DefaultPublicSeshCreatorHandleResolutionServiceDependencies,
  ) {
    this.#reservations =
      dependencies.reservations;

    this.#profiles =
      dependencies.profiles;
  }

  async resolveByHandle(
    requestedHandle:
      unknown,
  ): Promise<
    PublicSeshCreatorHandleResolutionResult
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
          : "Invalid Sesh creator handle.",
      );
    }

    let reservationResult:
      Awaited<
        ReturnType<
          SeshCreatorHandleReservationRepository[
            "getByHandle"
          ]
        >
      >;

    try {
      reservationResult =
        await this.#reservations
          .getByHandle(
            normalizedHandle,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator handle resolution is temporarily unavailable.",
      );
    }

    if (
      !reservationResult.ok
    ) {
      if (
        reservationResult.error.kind ===
          "not-found"
      ) {
        return failure(
          "not-found",
          "Sesh creator does not exist.",
        );
      }

      return failure(
        "unavailable",
        "Sesh creator handle resolution is temporarily unavailable.",
      );
    }

    const reservation =
      reservationResult.value;

    if (
      reservation.normalizedHandle !==
        normalizedHandle
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator handle reservation failed its canonical handle invariant.",
      );
    }

    let profileResult:
      Awaited<
        ReturnType<
          SeshCreatorProfileRepository[
            "getCreatorProfile"
          ]
        >
      >;

    try {
      profileResult =
        await this.#profiles
          .getCreatorProfile(
            reservation.creatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator profile resolution is temporarily unavailable.",
      );
    }

    if (
      !profileResult.ok
    ) {
      if (
        profileResult.error.kind ===
          "not-found"
      ) {
        return failure(
          "not-found",
          "Sesh creator does not exist.",
        );
      }

      return failure(
        "unavailable",
        "Sesh creator profile resolution is temporarily unavailable.",
      );
    }

    const profile =
      profileResult.value;

    if (
      profile.id !==
        reservation.creatorId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator profile failed its reservation identity invariant.",
      );
    }

    return success({
      handle:
        reservation.normalizedHandle,

      displayName:
        profile.displayName,

      bio:
        profile.bio,
    });
  }
}