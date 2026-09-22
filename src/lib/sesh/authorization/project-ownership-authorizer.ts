import type {
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh/authenticated-creator-resolver";

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
  SeshProjectRepository,
} from "../persistence/repositories";

export type SeshProjectOwnerAction =
  | "read"
  | "write"
  | "delete";

export type SeshProjectOwnershipAuthorizationFailureCode =
  | "unauthenticated"
  | "unmapped"
  | "not-found"
  | "forbidden"
  | "unavailable";

export type SeshProjectOwnershipAuthorizationResult =
  | {
      readonly ok:
        true;

      readonly value: {
        readonly principalId:
          Awaited<
            ReturnType<
              AuthenticatedSeshCreatorResolver[
                "resolve"
              ]
            >
          > extends {
            readonly ok: true;
            readonly value: {
              readonly principalId: infer TPrincipalId;
            };
          }
            ? TPrincipalId
            : never;

        readonly seshCreatorId:
          SeshCreatorId;

        readonly projectId:
          SeshMusicProjectId;

        readonly action:
          SeshProjectOwnerAction;
      };
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          SeshProjectOwnershipAuthorizationFailureCode;

        readonly message:
          string;
      };
    };

export interface SeshProjectOwnershipAuthorizer {
  authorize(
    projectId:
      SeshMusicProjectId,

    action:
      SeshProjectOwnerAction,
  ): Promise<
    SeshProjectOwnershipAuthorizationResult
  >;
}

export interface DefaultSeshProjectOwnershipAuthorizerDependencies {
  readonly creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly projects:
    Pick<
      SeshProjectRepository,
      "getProject"
    >;
}

function failure(
  code:
    SeshProjectOwnershipAuthorizationFailureCode,

  message:
    string,
): SeshProjectOwnershipAuthorizationResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

function isOwner(
  project:
    SeshMusicProject,

  seshCreatorId:
    SeshCreatorId,
): boolean {
  let ownerCreatorId:
    SeshCreatorId;

  try {
    ownerCreatorId =
      parseSeshCreatorId(
        project.ownerCreatorId,
      );
  }
  catch {
    return false;
  }

  return ownerCreatorId ===
    seshCreatorId;
}

export class DefaultSeshProjectOwnershipAuthorizer
implements SeshProjectOwnershipAuthorizer {
  readonly #creatorResolver:
    AuthenticatedSeshCreatorResolver;

  readonly #projects:
    Pick<
      SeshProjectRepository,
      "getProject"
    >;

  constructor(
    dependencies:
      DefaultSeshProjectOwnershipAuthorizerDependencies,
  ) {
    this.#creatorResolver =
      dependencies.creatorResolver;

    this.#projects =
      dependencies.projects;
  }

  async authorize(
    projectId:
      SeshMusicProjectId,

    action:
      SeshProjectOwnerAction,
  ): Promise<
    SeshProjectOwnershipAuthorizationResult
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
        "unavailable",
        "Project authorization is unavailable.",
      );
    }

    if (
      action !== "read" &&
      action !== "write" &&
      action !== "delete"
    ) {
      return failure(
        "unavailable",
        "Project authorization is unavailable.",
      );
    }

    let creatorResult:
      Awaited<
        ReturnType<
          AuthenticatedSeshCreatorResolver[
            "resolve"
          ]
        >
      >;

    try {
      creatorResult =
        await this.#creatorResolver
          .resolve();
    }
    catch {
      return failure(
        "unavailable",
        "Project authorization is temporarily unavailable.",
      );
    }

    if (
      !creatorResult.ok
    ) {
      if (
        creatorResult.error.code ===
        "unauthenticated"
      ) {
        return failure(
          "unauthenticated",
          "Authentication is required.",
        );
      }

      if (
        creatorResult.error.code ===
        "unmapped"
      ) {
        return failure(
          "unmapped",
          "No Sesh creator identity is provisioned for the authenticated principal.",
        );
      }

      return failure(
        "unavailable",
        "Project authorization is temporarily unavailable.",
      );
    }

    let projectResult:
      Awaited<
        ReturnType<
          SeshProjectRepository[
            "getProject"
          ]
        >
      >;

    try {
      projectResult =
        await this.#projects
          .getProject(
            canonicalProjectId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Project authorization is temporarily unavailable.",
      );
    }

    if (
      !projectResult.ok
    ) {
      if (
        projectResult.error.kind ===
        "not-found"
      ) {
        return failure(
          "not-found",
          "Sesh project was not found.",
        );
      }

      return failure(
        "unavailable",
        "Project authorization is temporarily unavailable.",
      );
    }

    if (
      projectResult.value.id !==
      canonicalProjectId
    ) {
      return failure(
        "unavailable",
        "Project authorization is temporarily unavailable.",
      );
    }

    if (
      !isOwner(
        projectResult.value,
        creatorResult.value.seshCreatorId,
      )
    ) {
      return failure(
        "forbidden",
        "The authenticated Sesh creator does not own this project.",
      );
    }

    return {
      ok:
        true,

      value: {
        principalId:
          creatorResult.value.principalId,

        seshCreatorId:
          creatorResult.value.seshCreatorId,

        projectId:
          canonicalProjectId,

        action,
      },
    };
  }
}
