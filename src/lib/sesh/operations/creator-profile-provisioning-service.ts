import type {
  PrincipalId,
} from "../../identity/identifiers";

import type {
  SessionPrincipalResolver,
} from "../../identity/session/principal-resolver";

import type {
  PrincipalSeshCreatorMapping,
} from "../../identity/sesh/creator-mapping";

import type {
  PrincipalSeshCreatorMappingRepository,
} from "../../identity/sesh/creator-mapping-repository";

import {
  createSeshCreatorId,
  parseSeshCreatorId,
} from "../identifiers";

import type {
  SeshCreatorId,
} from "../identifiers";

import type {
  SeshCreatorProfile,
} from "../model";

import type {
  SeshCreatorProfileRepository,
} from "../persistence/repositories";

export type SeshCreatorProfileProvisioningFailureCode =
  | "invalid-input"
  | "unauthenticated"
  | "conflict"
  | "unavailable";

export type SeshCreatorProfileProvisioningResult =
  | {
      readonly ok:
        true;

      readonly value: {
        readonly principalId:
          PrincipalId;

        readonly seshCreatorId:
          SeshCreatorId;

        readonly profile:
          SeshCreatorProfile;
      };
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SeshCreatorProfileProvisioningFailureCode;

        readonly message:
          string;
      };
    };

export interface SeshCreatorProfileProvisioningInput {
  readonly displayName:
    string;
}

export interface SeshCreatorProfileProvisioningService {
  provision(
    input:
      SeshCreatorProfileProvisioningInput,
  ): Promise<
    SeshCreatorProfileProvisioningResult
  >;
}

export interface DefaultSeshCreatorProfileProvisioningServiceDependencies {
  readonly principalResolver:
    SessionPrincipalResolver;

  readonly mappings:
    PrincipalSeshCreatorMappingRepository;

  readonly profiles:
    SeshCreatorProfileRepository;

  readonly now?:
    () => string;

  readonly createCreatorId?:
    () => SeshCreatorId;
}

function failure(
  code:
    SeshCreatorProfileProvisioningFailureCode,
  message:
    string,
): SeshCreatorProfileProvisioningResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function unauthenticated():
SeshCreatorProfileProvisioningResult {
  return failure(
    "unauthenticated",
    "Authentication is required.",
  );
}

function unavailable():
SeshCreatorProfileProvisioningResult {
  return failure(
    "unavailable",
    "Sesh creator profile provisioning is temporarily unavailable.",
  );
}

function conflict(
  message:
    string,
): SeshCreatorProfileProvisioningResult {
  return failure(
    "conflict",
    message,
  );
}

function validateDisplayName(
  value:
    unknown,
): string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new TypeError(
      "Sesh creator displayName must be a non-empty string.",
    );
  }

  return value;
}

function validateTimestamp(
  value:
    unknown,
): string {
  if (
    typeof value !==
      "string" ||
    value.length ===
      0 ||
    value.trim() !==
      value ||
    !value.endsWith(
      "Z",
    ) ||
    !Number.isFinite(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new TypeError(
      "Sesh creator provisioning timestamp must be a canonical UTC timestamp.",
    );
  }

  return value;
}

export class DefaultSeshCreatorProfileProvisioningService
implements SeshCreatorProfileProvisioningService {
  readonly #principalResolver:
    SessionPrincipalResolver;

  readonly #mappings:
    PrincipalSeshCreatorMappingRepository;

  readonly #profiles:
    SeshCreatorProfileRepository;

  readonly #now:
    () => string;

  readonly #createCreatorId:
    () => SeshCreatorId;

  constructor(
    dependencies:
      DefaultSeshCreatorProfileProvisioningServiceDependencies,
  ) {
    this.#principalResolver =
      dependencies.principalResolver;

    this.#mappings =
      dependencies.mappings;

    this.#profiles =
      dependencies.profiles;

    this.#now =
      dependencies.now ??
      (() =>
        new Date().toISOString());

    this.#createCreatorId =
      dependencies.createCreatorId ??
      (() =>
        createSeshCreatorId(
          crypto.randomUUID(),
        ));
  }

  async #loadOrCreateMapping(
    principalId:
      PrincipalId,
  ): Promise<
    | {
        readonly ok:
          true;

        readonly value:
          PrincipalSeshCreatorMapping;
      }
    | {
        readonly ok:
          false;

        readonly result:
          SeshCreatorProfileProvisioningResult;
      }
  > {
    let existing:
      Awaited<
        ReturnType<
          PrincipalSeshCreatorMappingRepository[
            "getByPrincipalId"
          ]
        >
      >;

    try {
      existing =
        await this.#mappings
          .getByPrincipalId(
            principalId,
          );
    }
    catch {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    if (
      existing.ok
    ) {
      return {
        ok:
          true,

        value:
          existing.value,
      };
    }

    if (
      existing.error.kind !==
      "not-found"
    ) {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    let seshCreatorId:
      SeshCreatorId;

    let createdAt:
      string;

    try {
      seshCreatorId =
        parseSeshCreatorId(
          this.#createCreatorId(),
        );

      createdAt =
        validateTimestamp(
          this.#now(),
        );
    }
    catch {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    let saved:
      Awaited<
        ReturnType<
          PrincipalSeshCreatorMappingRepository[
            "saveMapping"
          ]
        >
      >;

    try {
      saved =
        await this.#mappings
          .saveMapping({
            principalId,
            seshCreatorId,
            createdAt,
          });
    }
    catch {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    if (
      saved.ok
    ) {
      if (
        saved.value.principalId !==
          principalId
      ) {
        return {
          ok:
            false,

          result:
            unavailable(),
        };
      }

      return {
        ok:
          true,

        value:
          saved.value,
      };
    }

    if (
      saved.error.kind !==
      "conflict"
    ) {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    let raced:
      Awaited<
        ReturnType<
          PrincipalSeshCreatorMappingRepository[
            "getByPrincipalId"
          ]
        >
      >;

    try {
      raced =
        await this.#mappings
          .getByPrincipalId(
            principalId,
          );
    }
    catch {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    if (
      !raced.ok
    ) {
      return {
        ok:
          false,

        result:
          raced.error.kind ===
            "not-found"
            ? conflict(
                "Sesh creator identity provisioning conflicted before a canonical mapping could be established.",
              )
            : unavailable(),
      };
    }

    if (
      raced.value.principalId !==
        principalId
    ) {
      return {
        ok:
          false,

        result:
          unavailable(),
      };
    }

    return {
      ok:
        true,

      value:
        raced.value,
    };
  }

  async provision(
    input:
      SeshCreatorProfileProvisioningInput,
  ): Promise<
    SeshCreatorProfileProvisioningResult
  > {
    let displayName:
      string;

    try {
      displayName =
        validateDisplayName(
          input?.displayName,
        );
    }
    catch (error) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Sesh creator profile input is invalid.",
      );
    }

    let principal:
      Awaited<
        ReturnType<
          SessionPrincipalResolver[
            "resolve"
          ]
        >
      >;

    try {
      principal =
        await this.#principalResolver
          .resolve();
    }
    catch {
      return unavailable();
    }

    if (
      !principal.ok
    ) {
      return principal.error.code ===
        "unauthenticated"
        ? unauthenticated()
        : unavailable();
    }

    const mapping =
      await this.#loadOrCreateMapping(
        principal.value.principalId,
      );

    if (
      !mapping.ok
    ) {
      return mapping.result;
    }

    let seshCreatorId:
      SeshCreatorId;

    try {
      seshCreatorId =
        parseSeshCreatorId(
          mapping.value.seshCreatorId,
        );
    }
    catch {
      return unavailable();
    }

    let existingProfile:
      Awaited<
        ReturnType<
          SeshCreatorProfileRepository[
            "getCreatorProfile"
          ]
        >
      >;

    try {
      existingProfile =
        await this.#profiles
          .getCreatorProfile(
            seshCreatorId,
          );
    }
    catch {
      return unavailable();
    }

    if (
      existingProfile.ok
    ) {
      if (
        existingProfile.value.id !==
          seshCreatorId
      ) {
        return unavailable();
      }

      if (
        existingProfile.value.createdAt !==
          mapping.value.createdAt
      ) {
        return conflict(
          "Sesh creator identity mapping and creator profile creation timestamps do not agree.",
        );
      }

      return {
        ok:
          true,

        value: {
          principalId:
            principal.value.principalId,

          seshCreatorId,

          profile:
            existingProfile.value,
        },
      };
    }

    if (
      existingProfile.error.kind !==
      "not-found"
    ) {
      return unavailable();
    }

    let savedProfile:
      Awaited<
        ReturnType<
          SeshCreatorProfileRepository[
            "saveCreatorProfile"
          ]
        >
      >;

    try {
      savedProfile =
        await this.#profiles
          .saveCreatorProfile({
            id:
              seshCreatorId,

            displayName,

            createdAt:
              mapping.value.createdAt,
          });
    }
    catch {
      return unavailable();
    }

    if (
      !savedProfile.ok
    ) {
      return savedProfile.error.kind ===
        "conflict"
        ? conflict(
            "Sesh creator profile conflicts with the canonical creator identity.",
          )
        : unavailable();
    }

    if (
      savedProfile.value.id !==
        seshCreatorId ||
      savedProfile.value.createdAt !==
        mapping.value.createdAt
    ) {
      return unavailable();
    }

    return {
      ok:
        true,

      value: {
        principalId:
          principal.value.principalId,

        seshCreatorId,

        profile:
          savedProfile.value,
      },
    };
  }
}