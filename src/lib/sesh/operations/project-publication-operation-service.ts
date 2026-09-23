import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  parseSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProjectId,
} from "../identifiers";

import type {
  SeshProjectPublicationRecord,
  SeshProjectPublicationState,
} from "../project-publication";

import {
  validateSeshProjectPublicationRecord,
} from "../project-publication";

import type {
  SeshProjectPublicationRepository,
} from "../persistence/project-publication-repository";

export type SeshProjectPublicationOperationFailureCode =
  | "invalid-input"
  | "unauthenticated"
  | "unmapped"
  | "not-found"
  | "forbidden"
  | "conflict"
  | "unavailable";

export type SeshProjectPublicationOperationResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code:
          SeshProjectPublicationOperationFailureCode;
        readonly message:
          string;
      };
    };

export interface SeshProjectPublicationUpdateInput {
  readonly state:
    SeshProjectPublicationState;
}

export interface AuthorizedSeshProjectPublicationOperationService {
  updatePublication(
    projectId: unknown,
    input: unknown,
  ): Promise<
    SeshProjectPublicationOperationResult<
      SeshProjectPublicationRecord
    >
  >;
}

export interface DefaultAuthorizedSeshProjectPublicationOperationServiceDependencies {
  readonly authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly publications:
    Pick<
      SeshProjectPublicationRepository,
      | "getProjectPublication"
      | "saveProjectPublication"
      | "updateProjectPublication"
    >;

  readonly now:
    () => string;
}

function failure<T>(
  code:
    SeshProjectPublicationOperationFailureCode,
  message:
    string,
): SeshProjectPublicationOperationResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function parseUpdate(
  input: unknown,
): SeshProjectPublicationUpdateInput | null {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return null;
  }

  const candidate =
    input as Record<string, unknown>;

  const keys =
    Object.keys(candidate);

  if (
    keys.length !== 1 ||
    keys[0] !== "state"
  ) {
    return null;
  }

  if (
    candidate.state !== "private" &&
    candidate.state !== "public"
  ) {
    return null;
  }

  return {
    state:
      candidate.state,
  };
}

function mapAuthorizationFailure<T>(
  code:
    | "unauthenticated"
    | "unmapped"
    | "not-found"
    | "forbidden"
    | "unavailable",
  message:
    string,
): SeshProjectPublicationOperationResult<T> {
  return failure(
    code,
    message,
  );
}

export class DefaultAuthorizedSeshProjectPublicationOperationService
implements AuthorizedSeshProjectPublicationOperationService {
  readonly #authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly #publications:
    DefaultAuthorizedSeshProjectPublicationOperationServiceDependencies[
      "publications"
    ];

  readonly #now:
    () => string;

  constructor(
    dependencies:
      DefaultAuthorizedSeshProjectPublicationOperationServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#publications =
      dependencies.publications;

    this.#now =
      dependencies.now;
  }

  async updatePublication(
    projectId: unknown,
    input: unknown,
  ): Promise<
    SeshProjectPublicationOperationResult<
      SeshProjectPublicationRecord
    >
  > {
    let canonicalProjectId:
      SeshMusicProjectId;

    try {
      canonicalProjectId =
        parseSeshMusicProjectId(
          projectId,
        );
    }
    catch {
      return failure(
        "invalid-input",
        "A valid Sesh project identifier is required.",
      );
    }

    const update =
      parseUpdate(
        input,
      );

    if (
      update === null
    ) {
      return failure(
        "invalid-input",
        "Sesh project publication update requires exactly one state of private or public.",
      );
    }

    let authorization:
      Awaited<
        ReturnType<
          SeshProjectOwnershipAuthorizer[
            "authorize"
          ]
        >
      >;

    try {
      authorization =
        await this.#authorizer.authorize(
          canonicalProjectId,
          "write",
        );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project publication authorization is temporarily unavailable.",
      );
    }

    if (
      !authorization.ok
    ) {
      return mapAuthorizationFailure(
        authorization.error.code,
        authorization.error.message,
      );
    }

    if (
      authorization.value.projectId !==
        canonicalProjectId ||
      authorization.value.action !==
        "write"
    ) {
      return failure(
        "unavailable",
        "Sesh project publication authorization is temporarily unavailable.",
      );
    }

    let record:
      SeshProjectPublicationRecord;

    try {
      record =
        validateSeshProjectPublicationRecord({
          projectId:
            canonicalProjectId,
          ownerCreatorId:
            authorization.value.seshCreatorId,
          state:
            update.state,
          updatedAt:
            this.#now(),
        });
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project publication state could not be constructed.",
      );
    }

    let existing:
      Awaited<
        ReturnType<
          SeshProjectPublicationRepository[
            "getProjectPublication"
          ]
        >
      >;

    try {
      existing =
        await this.#publications
          .getProjectPublication(
            canonicalProjectId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project publication persistence is temporarily unavailable.",
      );
    }

    if (
      !existing.ok
    ) {
      if (
        existing.error.kind !==
          "not-found"
      ) {
        return failure(
          "unavailable",
          "Sesh project publication persistence is temporarily unavailable.",
        );
      }

      try {
        const saved =
          await this.#publications
            .saveProjectPublication(
              record,
            );

        if (
          !saved.ok
        ) {
          return saved.error.kind ===
            "conflict"
            ? failure(
                "conflict",
                "Sesh project publication changed before it could be saved.",
              )
            : failure(
                "unavailable",
                "Sesh project publication persistence is temporarily unavailable.",
              );
        }

        if (
          saved.value.projectId !==
            canonicalProjectId ||
          saved.value.ownerCreatorId !==
            authorization.value.seshCreatorId
        ) {
          return failure(
            "unavailable",
            "Sesh project publication persistence returned inconsistent identity.",
          );
        }

        return {
          ok: true,
          value:
            saved.value,
        };
      }
      catch {
        return failure(
          "unavailable",
          "Sesh project publication persistence is temporarily unavailable.",
        );
      }
    }

    if (
      existing.value.projectId !==
        canonicalProjectId ||
      existing.value.ownerCreatorId !==
        authorization.value.seshCreatorId
    ) {
      return failure(
        "conflict",
        "Sesh project publication ownership conflicts with canonical project ownership.",
      );
    }

    try {
      const updated =
        await this.#publications
          .updateProjectPublication(
            record,
          );

      if (
        !updated.ok
      ) {
        return updated.error.kind ===
          "conflict"
          ? failure(
              "conflict",
              "Sesh project publication changed before it could be updated.",
            )
          : updated.error.kind ===
              "not-found"
            ? failure(
                "conflict",
                "Sesh project publication changed before it could be updated.",
              )
            : failure(
                "unavailable",
                "Sesh project publication persistence is temporarily unavailable.",
              );
      }

      if (
        updated.value.projectId !==
          canonicalProjectId ||
        updated.value.ownerCreatorId !==
          authorization.value.seshCreatorId
      ) {
        return failure(
          "unavailable",
          "Sesh project publication persistence returned inconsistent identity.",
        );
      }

      return {
        ok: true,
        value:
          updated.value,
      };
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project publication persistence is temporarily unavailable.",
      );
    }
  }
}