import type {
  AuthenticatedSeshCreatorResolutionFailureCode,
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import type {
  SeshCreatorProfile,
} from "../model";

import {
  validateSeshCreatorProfile,
} from "../validation";

import type {
  SeshCreatorHandleReservationRepository,
  SeshCreatorProfileRepository,
} from "../persistence/repositories";

export interface SeshCreatorProfileMutableUpdate {
  readonly displayName?:
    SeshCreatorProfile["displayName"];


  readonly bio?:
    SeshCreatorProfile["bio"];
}

export type SeshCreatorProfileOperationFailureCode =
  | AuthenticatedSeshCreatorResolutionFailureCode
  | "invalid-input"
  | "not-found"
  | "conflict";

export type SeshCreatorProfileOperationResult<T> =
  | {
      readonly ok:
        true;

      readonly value:
        T;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SeshCreatorProfileOperationFailureCode;

        readonly message:
          string;
      };
    };

export interface AuthenticatedSeshCreatorProfileOperationService {
  readProfile():
  Promise<
    SeshCreatorProfileOperationResult<
      SeshCreatorProfile
    >
  >;

  updateProfile(
    update:
      unknown,
  ): Promise<
    SeshCreatorProfileOperationResult<
      SeshCreatorProfile
    >
  >;
}

export interface DefaultAuthenticatedSeshCreatorProfileOperationServiceDependencies {
  readonly creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly profiles:
    SeshCreatorProfileRepository;

  readonly handles:
    SeshCreatorHandleReservationRepository;
}

function success<T>(
  value:
    T,
): SeshCreatorProfileOperationResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function failure<T>(
  code:
    SeshCreatorProfileOperationFailureCode,

  message:
    string,
): SeshCreatorProfileOperationResult<T> {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function resolverFailure<T>(
  code:
    AuthenticatedSeshCreatorResolutionFailureCode,
): SeshCreatorProfileOperationResult<T> {
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

async function overlayCanonicalHandle(
  profile:
    SeshCreatorProfile,

  handles:
    SeshCreatorHandleReservationRepository,
): Promise<
  SeshCreatorProfileOperationResult<
    SeshCreatorProfile
  >
> {
  let reservationResult:
    Awaited<
      ReturnType<
        SeshCreatorHandleReservationRepository[
          "getByCreatorId"
        ]
      >
    >;

  try {
    reservationResult =
      await handles
        .getByCreatorId(
          profile.id,
        );
  }
  catch {
    return failure(
      "unavailable",
      "Sesh creator handle is temporarily unavailable.",
    );
  }

  if (
    !reservationResult.ok
  ) {
    if (
      reservationResult.error.kind ===
        "not-found"
    ) {
      return success({
        ...profile,

        handle:
          undefined,
      });
    }

    return failure(
      "unavailable",
      "Sesh creator handle is temporarily unavailable.",
    );
  }

  if (
    reservationResult.value.creatorId !==
      profile.id
  ) {
    return failure(
      "unavailable",
      "Persisted Sesh creator handle reservation failed its identity invariant.",
    );
  }

  return success({
    ...profile,

    handle:
      reservationResult.value
        .normalizedHandle,
  });
}
function validateUpdate(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value:
        SeshCreatorProfileMutableUpdate;
    }
  | {
      readonly ok:
        false;

      readonly message:
        string;
    } {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return {
      ok:
        false,

      message:
        "Sesh creator profile update must be an object.",
    };
  }

  const record =
    value as
      Record<string, unknown>;

  const keys =
    Object.keys(
      record,
    );

  if (
    keys.length ===
      0
  ) {
    return {
      ok:
        false,

      message:
        "Sesh creator profile update must include at least one mutable field.",
    };
  }

  const allowed =
    new Set([
      "displayName",
      "bio",
    ]);

  for (
    const key of
      keys
  ) {
    if (
      !allowed.has(
        key,
      )
    ) {
      return {
        ok:
          false,

        message:
          "Sesh creator profile update contains an unsupported field.",
      };
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      record,
      "displayName",
    ) &&
    typeof record.displayName !==
      "string"
  ) {
    return {
      ok:
        false,

      message:
        "Sesh creator profile displayName must be a string.",
    };
  }


  if (
    Object.prototype.hasOwnProperty.call(
      record,
      "bio",
    ) &&
    typeof record.bio !==
      "string"
  ) {
    return {
      ok:
        false,

      message:
        "Sesh creator profile bio must be a string.",
    };
  }

  return {
    ok:
      true,

    value: {
      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "displayName",
        )
          ? {
              displayName:
                record.displayName as string,
            }
          : {}
      ),


      ...(
        Object.prototype.hasOwnProperty.call(
          record,
          "bio",
        )
          ? {
              bio:
                record.bio as string,
            }
          : {}
      ),
    },
  };
}

export class DefaultAuthenticatedSeshCreatorProfileOperationService
implements AuthenticatedSeshCreatorProfileOperationService {
  readonly #creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly #profiles:
    SeshCreatorProfileRepository;

  readonly #handles:
    SeshCreatorHandleReservationRepository;

  constructor(
    dependencies:
      DefaultAuthenticatedSeshCreatorProfileOperationServiceDependencies,
  ) {
    this.#creatorResolver =
      dependencies.creatorResolver;

    this.#profiles =
      dependencies.profiles;

    this.#handles =
      dependencies.handles;
  }

  async #resolveCreator():
  Promise<
    | {
        readonly ok:
          true;

        readonly value:
          Awaited<
            ReturnType<
              AuthenticatedSeshCreatorResolver[
                "resolve"
              ]
            >
          > extends {
            readonly ok: true;
            readonly value: infer TValue;
          }
            ? TValue
            : never;
      }
    | {
        readonly ok:
          false;

        readonly result:
          SeshCreatorProfileOperationResult<never>;
      }
  > {
    let resolved:
      Awaited<
        ReturnType<
          AuthenticatedSeshCreatorResolver[
            "resolve"
          ]
        >
      >;

    try {
      resolved =
        await this.#creatorResolver
          .resolve();
    }
    catch {
      return {
        ok:
          false,

        result:
          failure(
            "unavailable",
            "Sesh creator identity is temporarily unavailable.",
          ),
      };
    }

    if (
      !resolved.ok
    ) {
      return {
        ok:
          false,

        result:
          resolverFailure(
            resolved.error.code,
          ),
      };
    }

    return {
      ok:
        true,

      value:
        resolved.value,
    };
  }

  async readProfile():
  Promise<
    SeshCreatorProfileOperationResult<
      SeshCreatorProfile
    >
  > {
    const creator =
      await this.#resolveCreator();

    if (
      !creator.ok
    ) {
      return creator.result;
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
            creator.value.seshCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator profile is temporarily unavailable.",
      );
    }

    if (
      !profileResult.ok
    ) {
      return profileResult.error.kind ===
        "not-found"
        ? failure(
            "not-found",
            "Sesh creator profile was not found.",
          )
        : failure(
            "unavailable",
            "Sesh creator profile is temporarily unavailable.",
          );
    }

    if (
      profileResult.value.id !==
        creator.value.seshCreatorId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator profile failed its identity invariant.",
      );
    }

    return overlayCanonicalHandle(
      profileResult.value,
      this.#handles,
    );
  }

  async updateProfile(
    update:
      unknown,
  ): Promise<
    SeshCreatorProfileOperationResult<
      SeshCreatorProfile
    >
  > {
    const validatedUpdate =
      validateUpdate(
        update,
      );

    if (
      !validatedUpdate.ok
    ) {
      return failure(
        "invalid-input",
        validatedUpdate.message,
      );
    }

    const creator =
      await this.#resolveCreator();

    if (
      !creator.ok
    ) {
      return creator.result;
    }

    let currentResult:
      Awaited<
        ReturnType<
          SeshCreatorProfileRepository[
            "getCreatorProfileSnapshot"
          ]
        >
      >;

    try {
      currentResult =
        await this.#profiles
          .getCreatorProfileSnapshot(
            creator.value.seshCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator profile update is temporarily unavailable.",
      );
    }

    if (
      !currentResult.ok
    ) {
      return currentResult.error.kind ===
        "not-found"
        ? failure(
            "not-found",
            "Sesh creator profile was not found.",
          )
        : failure(
            "unavailable",
            "Sesh creator profile update is temporarily unavailable.",
          );
    }

    const current =
      currentResult.value.profile;

    if (
      current.id !==
        creator.value.seshCreatorId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator profile failed its identity invariant.",
      );
    }

    let candidate:
      SeshCreatorProfile;

    try {
      candidate =
        validateSeshCreatorProfile({
          ...current,
          ...validatedUpdate.value,

          id:
            current.id,

          createdAt:
            current.createdAt,
        });
    }
    catch (error) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh creator profile update failed canonical validation.",
      );
    }

    let saveResult:
      Awaited<
        ReturnType<
          SeshCreatorProfileRepository[
            "updateCreatorProfileConditionally"
          ]
        >
      >;

    try {
      saveResult =
        await this.#profiles
          .updateCreatorProfileConditionally(
            candidate,
            currentResult.value.revision,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh creator profile update is temporarily unavailable.",
      );
    }

    if (
      !saveResult.ok
    ) {
      if (
        saveResult.error.kind ===
          "validation"
      ) {
        return failure(
          "invalid-input",
          "Sesh creator profile update failed canonical validation.",
        );
      }

      if (
        saveResult.error.kind ===
          "conflict" ||
        saveResult.error.kind ===
          "not-found"
      ) {
        return failure(
          "conflict",
          "Sesh creator profile changed before the update could be persisted.",
        );
      }

      return failure(
        "unavailable",
        "Sesh creator profile update is temporarily unavailable.",
      );
    }

    if (
      saveResult.value.profile.id !==
        current.id ||
      saveResult.value.profile.createdAt !==
        current.createdAt
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator profile violated an immutable profile invariant.",
      );
    }

    return overlayCanonicalHandle(
      saveResult.value.profile,
      this.#handles,
    );
  }
}