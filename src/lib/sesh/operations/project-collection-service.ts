import type {
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import {
  createSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProject,
} from "../model";

import type {
  SeshProjectRepository,
} from "../persistence/repositories";

export type SeshProjectCollectionFailureCode =
  | "unauthenticated"
  | "unmapped"
  | "invalid-input"
  | "conflict"
  | "unavailable";

export type SeshProjectCollectionResult<T> =
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
          SeshProjectCollectionFailureCode;

        readonly message:
          string;
      };
    };

export interface SeshProjectCreateInput {
  readonly title:
    string;

  readonly description?:
    string;
}

export interface AuthenticatedSeshProjectCollectionService {
  createProject(
    input:
      unknown,
  ): Promise<
    SeshProjectCollectionResult<
      SeshMusicProject
    >
  >;

  listProjects():
  Promise<
    SeshProjectCollectionResult<
      readonly SeshMusicProject[]
    >
  >;
}

export interface DefaultAuthenticatedSeshProjectCollectionServiceDependencies {
  readonly creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly projects:
    Pick<
      SeshProjectRepository,
      | "saveProject"
      | "listProjectsForOwner"
    >;

  readonly now:
    () => string;

  readonly createProjectId:
    () => SeshMusicProjectId;
}

function failure<T>(
  code:
    SeshProjectCollectionFailureCode,

  message:
    string,
): SeshProjectCollectionResult<T> {
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
): SeshProjectCollectionResult<T> {
  return {
    ok:
      true,

    value,
  };
}

function validateCreateInput(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value:
        SeshProjectCreateInput;
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

  for (
    const key of keys
  ) {
    if (
      key !==
        "title" &&
      key !==
        "description"
    ) {
      return {
        ok:
          false,
      };
    }
  }

  if (
    typeof record.title !==
      "string" ||
    record.title.trim().length ===
      0
  ) {
    return {
      ok:
        false,
    };
  }

  if (
    record.description !==
      undefined &&
    typeof record.description !==
      "string"
  ) {
    return {
      ok:
        false,
    };
  }

  return {
    ok:
      true,

    value: {
      title:
        record.title,

      ...(record.description ===
      undefined
        ? {}
        : {
            description:
              record.description,
          }),
    },
  };
}

async function resolveCreator(
  resolver:
    AuthenticatedSeshCreatorResolver,
) {
  try {
    const result =
      await resolver.resolve();

    if (
      result.ok
    ) {
      return result;
    }

    if (
      result.error.code ===
      "unauthenticated"
    ) {
      return failure(
        "unauthenticated",
        "Authentication is required.",
      );
    }

    if (
      result.error.code ===
      "unmapped"
    ) {
      return failure(
        "unmapped",
        "No Sesh creator identity is provisioned for the authenticated principal.",
      );
    }

    return failure(
      "unavailable",
      "Sesh creator resolution is temporarily unavailable.",
    );
  }
  catch {
    return failure(
      "unavailable",
      "Sesh creator resolution is temporarily unavailable.",
    );
  }
}

export class DefaultAuthenticatedSeshProjectCollectionService
implements AuthenticatedSeshProjectCollectionService {
  readonly #creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly #projects:
    Pick<
      SeshProjectRepository,
      | "saveProject"
      | "listProjectsForOwner"
    >;

  readonly #now:
    () => string;

  readonly #createProjectId:
    () => SeshMusicProjectId;

  constructor(
    dependencies:
      DefaultAuthenticatedSeshProjectCollectionServiceDependencies,
  ) {
    this.#creatorResolver =
      dependencies.creatorResolver;

    this.#projects =
      dependencies.projects;

    this.#now =
      dependencies.now;

    this.#createProjectId =
      dependencies.createProjectId;
  }

  async createProject(
    input:
      unknown,
  ): Promise<
    SeshProjectCollectionResult<
      SeshMusicProject
    >
  > {
    const validated =
      validateCreateInput(
        input,
      );

    if (
      !validated.ok
    ) {
      return failure(
        "invalid-input",
        "Sesh project creation input is invalid.",
      );
    }

    const creatorResult =
      await resolveCreator(
        this.#creatorResolver,
      );

    if (
      !creatorResult.ok
    ) {
      return creatorResult;
    }

    let projectId:
      SeshMusicProjectId;

    let now:
      string;

    try {
      projectId =
        createSeshMusicProjectId(
          this.#createProjectId()
            .slice(
              "sesh-project:".length,
            ),
        );

      now =
        this.#now();
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project creation is temporarily unavailable.",
      );
    }

    const project = {
      id:
        projectId,

      ownerCreatorId:
        creatorResult.value.seshCreatorId,

      title:
        validated.value.title,

      createdAt:
        now,

      updatedAt:
        now,

      trackIds:
        [],

      sessionIds:
        [],

      audioAssetIds:
        [],

      ...(validated.value.description ===
      undefined
        ? {}
        : {
            description:
              validated.value.description,
          }),
    };

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
          .saveProject(
            project,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project creation is temporarily unavailable.",
      );
    }

    if (
      !saveResult.ok
    ) {
      if (
        saveResult.error.kind ===
        "conflict"
      ) {
        return failure(
          "conflict",
          "Sesh project identifier conflict.",
        );
      }

      if (
        saveResult.error.kind ===
        "validation"
      ) {
        return failure(
          "invalid-input",
          "Sesh project creation input is invalid.",
        );
      }

      return failure(
        "unavailable",
        "Sesh project creation is temporarily unavailable.",
      );
    }

    if (
      saveResult.value.ownerCreatorId !==
        creatorResult.value.seshCreatorId ||
      saveResult.value.id !==
        projectId ||
      saveResult.value.createdAt !==
        now
    ) {
      return failure(
        "unavailable",
        "Sesh project creation result failed canonical identity checks.",
      );
    }

    return success(
      saveResult.value,
    );
  }

  async listProjects():
  Promise<
    SeshProjectCollectionResult<
      readonly SeshMusicProject[]
    >
  > {
    const creatorResult =
      await resolveCreator(
        this.#creatorResolver,
      );

    if (
      !creatorResult.ok
    ) {
      return creatorResult;
    }

    let listResult:
      Awaited<
        ReturnType<
          SeshProjectRepository[
            "listProjectsForOwner"
          ]
        >
      >;

    try {
      listResult =
        await this.#projects
          .listProjectsForOwner(
            creatorResult.value.seshCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Sesh project collection is temporarily unavailable.",
      );
    }

    if (
      !listResult.ok
    ) {
      return failure(
        "unavailable",
        "Sesh project collection is temporarily unavailable.",
      );
    }

    for (
      const project of
        listResult.value
    ) {
      if (
        project.ownerCreatorId !==
        creatorResult.value.seshCreatorId
      ) {
        return failure(
          "unavailable",
          "Sesh project collection failed its ownership invariant.",
        );
      }
    }

    return success(
      listResult.value,
    );
  }
}