import type {
  SeshProjectOwnershipAuthorizationFailureCode,
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  parseSeshCreatorId,
  parseSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshCreatorId,
  SeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProject,
} from "../model";

import type {
  SeshPersistenceResult,
} from "../persistence/model";

import type {
  SeshProjectRepository,
} from "../persistence/repositories";

import {
  validateSeshMusicProject,
} from "../validation";

export interface SeshProjectMutableUpdate {
  readonly title?:
    string;

  readonly trackIds?:
    SeshMusicProject["trackIds"];

  readonly sessionIds?:
    SeshMusicProject["sessionIds"];

  readonly audioAssetIds?:
    SeshMusicProject["audioAssetIds"];

  readonly tempoMapId?:
    SeshMusicProject["tempoMapId"];

  readonly beatGridId?:
    SeshMusicProject["beatGridId"];

  readonly description?:
    SeshMusicProject["description"];
}

export type SeshProjectOperationFailureCode =
  | SeshProjectOwnershipAuthorizationFailureCode
  | "invalid-input"
  | "conflict";

export type SeshProjectOperationResult<T> =
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
          SeshProjectOperationFailureCode;

        readonly message:
          string;
      };
    };

export interface AuthorizedSeshProjectOperationService {
  readProject(
    projectId:
      SeshMusicProjectId,
  ): Promise<
    SeshProjectOperationResult<
      SeshMusicProject
    >
  >;

  updateProject(
    projectId:
      SeshMusicProjectId,

    update:
      unknown,
  ): Promise<
    SeshProjectOperationResult<
      SeshMusicProject
    >
  >;

  deleteProject(
    projectId:
      SeshMusicProjectId,
  ): Promise<
    SeshProjectOperationResult<boolean>
  >;
}

export interface DefaultAuthorizedSeshProjectOperationServiceDependencies {
  readonly authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly projects:
    SeshProjectRepository;

  readonly now:
    () => string;
}

const MUTABLE_UPDATE_KEYS =
  new Set([
    "title",
    "trackIds",
    "sessionIds",
    "audioAssetIds",
    "tempoMapId",
    "beatGridId",
    "description",
  ]);

function failure<T>(
  code:
    SeshProjectOperationFailureCode,

  message:
    string,
): SeshProjectOperationResult<T> {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function success<T>(
  value:
    T,
): SeshProjectOperationResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function mapAuthorizationFailure<T>(
  error: {
    readonly code:
      SeshProjectOwnershipAuthorizationFailureCode;

    readonly message:
      string;
  },
): SeshProjectOperationResult<T> {
  return failure(
    error.code,
    error.message,
  );
}

function mapProjectReadFailure<T>(
  result:
    Exclude<
      SeshPersistenceResult<SeshMusicProject>,
      {
        readonly ok:
          true;
      }
    >,
): SeshProjectOperationResult<T> {
  if (
    result.error.kind ===
    "not-found"
  ) {
    return failure(
      "not-found",
      "Sesh project was not found.",
    );
  }

  return failure(
    "unavailable",
    "Sesh project operation is temporarily unavailable.",
  );
}

function validateUpdate(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value:
        SeshProjectMutableUpdate;
    }
  | {
      readonly ok:
        false;
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
    };
  }

  const record =
    value as Record<
      string,
      unknown
    >;

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
    };
  }

  for (
    const key of keys
  ) {
    if (
      !MUTABLE_UPDATE_KEYS.has(
        key,
      )
    ) {
      return {
        ok:
          false,
      };
    }
  }

  return {
    ok:
      true,

    value:
      record as unknown as SeshProjectMutableUpdate,
  };
}

function canonicalOwnerMatches(
  project:
    SeshMusicProject,

  expectedCreatorId:
    SeshCreatorId,
): boolean {
  try {
    return (
      parseSeshCreatorId(
        project.ownerCreatorId,
      ) ===
      expectedCreatorId
    );
  }
  catch {
    return false;
  }
}

export class DefaultAuthorizedSeshProjectOperationService
implements AuthorizedSeshProjectOperationService {
  readonly #authorizer:
    SeshProjectOwnershipAuthorizer;

  readonly #projects:
    SeshProjectRepository;

  readonly #now:
    () => string;

  constructor(
    dependencies:
      DefaultAuthorizedSeshProjectOperationServiceDependencies,
  ) {
    this.#authorizer =
      dependencies.authorizer;

    this.#projects =
      dependencies.projects;

    this.#now =
      dependencies.now;
  }

  async #authorize(
    projectId:
      SeshMusicProjectId,

    action:
      "read" |
      "write" |
      "delete",
  ) {
    try {
      return await this.#authorizer
        .authorize(
          projectId,
          action,
        );
    }
    catch {
      return {
        ok:
          false as const,

        error: {
          code:
            "unavailable" as const,

          message:
            "Sesh project authorization is temporarily unavailable.",
        },
      };
    }
  }

  async #loadCanonicalProject(
    projectId:
      SeshMusicProjectId,
  ):
  Promise<
    SeshPersistenceResult<
      SeshMusicProject
    >
  > {
    try {
      return await this.#projects
        .getProject(
          projectId,
        );
    }
    catch {
      return {
        ok:
          false,

        error: {
          kind:
            "storage",

          message:
            "Sesh project repository threw during read.",
        },
      };
    }
  }

  async readProject(
    projectId:
      SeshMusicProjectId,
  ): Promise<
    SeshProjectOperationResult<
      SeshMusicProject
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
        "A canonical Sesh project identifier is required.",
      );
    }

    const authorization =
      await this.#authorize(
        canonicalProjectId,
        "read",
      );

    if (
      !authorization.ok
    ) {
      return mapAuthorizationFailure(
        authorization.error,
      );
    }

    const projectResult =
      await this.#loadCanonicalProject(
        canonicalProjectId,
      );

    if (
      !projectResult.ok
    ) {
      return mapProjectReadFailure(
        projectResult,
      );
    }

    if (
      projectResult.value.id !==
        canonicalProjectId ||
      !canonicalOwnerMatches(
        projectResult.value,
        authorization.value.seshCreatorId,
      )
    ) {
      return failure(
        "unavailable",
        "Project state changed after authorization.",
      );
    }

    return success(
      projectResult.value,
    );
  }

  async updateProject(
    projectId:
      SeshMusicProjectId,

    update:
      unknown,
  ): Promise<
    SeshProjectOperationResult<
      SeshMusicProject
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
        "A canonical Sesh project identifier is required.",
      );
    }

    const validatedUpdate =
      validateUpdate(
        update,
      );

    if (
      !validatedUpdate.ok
    ) {
      return failure(
        "invalid-input",
        "Project update contains no permitted mutable fields or attempts to modify an immutable field.",
      );
    }

    const authorization =
      await this.#authorize(
        canonicalProjectId,
        "write",
      );

    if (
      !authorization.ok
    ) {
      return mapAuthorizationFailure(
        authorization.error,
      );
    }

    let currentResult:
      Awaited<
        ReturnType<
          SeshProjectRepository[
            "getProjectSnapshot"
          ]
        >
      >;

    try {
      currentResult =
        await this.#projects
          .getProjectSnapshot(
            canonicalProjectId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project update is temporarily unavailable.",
      );
    }

    if (
      !currentResult.ok
    ) {
      if (
        currentResult.error.kind ===
        "not-found"
      ) {
        return failure(
          "not-found",
          "Sesh project was not found.",
        );
      }

      return failure(
        "unavailable",
        "Sesh project update is temporarily unavailable.",
      );
    }

    const current =
      currentResult.value.project;

    if (
      current.id !==
        canonicalProjectId ||
      !canonicalOwnerMatches(
        current,
        authorization.value.seshCreatorId,
      )
    ) {
      return failure(
        "unavailable",
        "Project state changed after authorization.",
      );
    }

    let candidate:
      SeshMusicProject;

    try {
      const mutable =
        validatedUpdate.value;

      candidate =
        validateSeshMusicProject({
          ...current,

          ...mutable,

          id:
            current.id,

          ownerCreatorId:
            current.ownerCreatorId,

          createdAt:
            current.createdAt,

          updatedAt:
            this.#now(),
        });
    }
    catch {
      return failure(
        "invalid-input",
        "Project update failed canonical validation.",
      );
    }

    let saveResult:
      Awaited<
        ReturnType<
          SeshProjectRepository[
            "saveProject"
          ]
        >
      >;

    try {
      saveResult =
        await this.#projects
          .updateProjectConditionally(
            candidate,
            currentResult.value.revision,
            authorization.value.seshCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project update is temporarily unavailable.",
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
          "Project update failed canonical validation.",
        );
      }

      if (
        saveResult.error.kind ===
        "conflict"
      ) {
        return failure(
          "conflict",
          "Project changed before the update could be persisted.",
        );
      }

      return failure(
        "unavailable",
        "Sesh project update is temporarily unavailable.",
      );
    }

    if (
      saveResult.value.project.id !==
        current.id ||
      saveResult.value.project.ownerCreatorId !==
        current.ownerCreatorId ||
      saveResult.value.project.createdAt !==
        current.createdAt
    ) {
      return failure(
        "unavailable",
        "Persisted project violated an immutable project invariant.",
      );
    }

    return success(
      saveResult.value.project,
    );
  }

  async deleteProject(
    projectId:
      SeshMusicProjectId,
  ): Promise<
    SeshProjectOperationResult<boolean>
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
        "A canonical Sesh project identifier is required.",
      );
    }

    const authorization =
      await this.#authorize(
        canonicalProjectId,
        "delete",
      );

    if (
      !authorization.ok
    ) {
      return mapAuthorizationFailure(
        authorization.error,
      );
    }

    let currentResult:
      Awaited<
        ReturnType<
          SeshProjectRepository[
            "getProjectSnapshot"
          ]
        >
      >;

    try {
      currentResult =
        await this.#projects
          .getProjectSnapshot(
            canonicalProjectId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project deletion is temporarily unavailable.",
      );
    }

    if (
      !currentResult.ok
    ) {
      if (
        currentResult.error.kind ===
        "not-found"
      ) {
        return failure(
          "not-found",
          "Sesh project was not found.",
        );
      }

      return failure(
        "unavailable",
        "Sesh project deletion is temporarily unavailable.",
      );
    }

    if (
      currentResult.value.project.id !==
        canonicalProjectId ||
      !canonicalOwnerMatches(
        currentResult.value.project,
        authorization.value.seshCreatorId,
      )
    ) {
      return failure(
        "unavailable",
        "Project state changed after authorization.",
      );
    }

    let deleteResult:
      Awaited<
        ReturnType<
          SeshProjectRepository[
            "deleteProject"
          ]
        >
      >;

    try {
      deleteResult =
        await this.#projects
          .deleteProjectConditionally(
            canonicalProjectId,
            currentResult.value.revision,
            authorization.value.seshCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project deletion is temporarily unavailable.",
      );
    }

    if (
      !deleteResult.ok
    ) {
      if (
        deleteResult.error.kind ===
        "conflict"
      ) {
        return failure(
          "conflict",
          "Project changed before deletion could complete.",
        );
      }

      if (
        deleteResult.error.kind ===
        "not-found"
      ) {
        return failure(
          "conflict",
          "Project disappeared before deletion could complete.",
        );
      }

      return failure(
        "unavailable",
        "Sesh project deletion is temporarily unavailable.",
      );
    }

    if (
      deleteResult.value !==
      true
    ) {
      return failure(
        "conflict",
        "Project disappeared before deletion could complete.",
      );
    }

    return success(
      true,
    );
  }
}
