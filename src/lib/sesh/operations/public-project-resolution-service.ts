import {
  parseSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProjectId,
} from "../identifiers";

import type {
  SeshProjectPublicationRepository,
} from "../persistence/project-publication-repository";

import type {
  SeshProjectRepository,
} from "../persistence/repositories";

import {
  isSeshProjectPublic,
} from "../project-publication";

export interface PublicSeshProject {
  readonly id:
    SeshMusicProjectId;

  readonly title:
    string;

  readonly description?:
    string;
}

export type PublicSeshProjectResolutionFailureCode =
  | "invalid-input"
  | "not-found"
  | "unavailable";

export type PublicSeshProjectResolutionResult =
  | {
      readonly ok:
        true;

      readonly value:
        PublicSeshProject;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          PublicSeshProjectResolutionFailureCode;

        readonly message:
          string;
      };
    };

export interface PublicSeshProjectResolutionService {
  resolveByProjectId(
    requestedProjectId:
      unknown,
  ): Promise<
    PublicSeshProjectResolutionResult
  >;
}

export interface DefaultPublicSeshProjectResolutionServiceDependencies {
  readonly publications:
    Pick<
      SeshProjectPublicationRepository,
      "getProjectPublication"
    >;

  readonly projects:
    Pick<
      SeshProjectRepository,
      "getProject"
    >;
}

function success(
  value:
    PublicSeshProject,
): PublicSeshProjectResolutionResult {
  return {
    ok:
      true,

    value,
  };
}

function failure(
  code:
    PublicSeshProjectResolutionFailureCode,

  message:
    string,
): PublicSeshProjectResolutionResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

export class DefaultPublicSeshProjectResolutionService
implements PublicSeshProjectResolutionService {
  readonly #publications:
    DefaultPublicSeshProjectResolutionServiceDependencies[
      "publications"
    ];

  readonly #projects:
    DefaultPublicSeshProjectResolutionServiceDependencies[
      "projects"
    ];

  constructor(
    dependencies:
      DefaultPublicSeshProjectResolutionServiceDependencies,
  ) {
    this.#publications =
      dependencies.publications;

    this.#projects =
      dependencies.projects;
  }

  async resolveByProjectId(
    requestedProjectId:
      unknown,
  ): Promise<
    PublicSeshProjectResolutionResult
  > {
    let projectId:
      SeshMusicProjectId;

    try {
      projectId =
        parseSeshMusicProjectId(
          requestedProjectId,
        );
    }
    catch (error) {
      return failure(
        "invalid-input",
        error instanceof Error
          ? error.message
          : "Invalid Sesh project identifier.",
      );
    }

    let publicationResult:
      Awaited<
        ReturnType<
          SeshProjectPublicationRepository[
            "getProjectPublication"
          ]
        >
      >;

    try {
      publicationResult =
        await this.#publications
          .getProjectPublication(
            projectId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Public Sesh project resolution is temporarily unavailable.",
      );
    }

    if (
      !publicationResult.ok
    ) {
      if (
        publicationResult.error.kind ===
          "not-found"
      ) {
        return failure(
          "not-found",
          "Public Sesh project does not exist.",
        );
      }

      return failure(
        "unavailable",
        "Public Sesh project resolution is temporarily unavailable.",
      );
    }

    const publication =
      publicationResult.value;

    if (
      publication.projectId !==
        projectId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh project publication failed its project identity invariant.",
      );
    }

    if (
      !isSeshProjectPublic(
        publication,
      )
    ) {
      return failure(
        "not-found",
        "Public Sesh project does not exist.",
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
            projectId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Public Sesh project resolution is temporarily unavailable.",
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
          "Public Sesh project does not exist.",
        );
      }

      return failure(
        "unavailable",
        "Public Sesh project resolution is temporarily unavailable.",
      );
    }

    const project =
      projectResult.value;

    if (
      project.id !==
        projectId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh project failed its project identity invariant.",
      );
    }

    if (
      publication.ownerCreatorId !==
        project.ownerCreatorId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh project publication failed its owner identity invariant.",
      );
    }

    return success({
      id:
        project.id,

      title:
        project.title,

      ...(project.description ===
      undefined
        ? {}
        : {
            description:
              project.description,
          }),
    });
  }
}