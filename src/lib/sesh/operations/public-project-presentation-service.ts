import type {
  SeshCreatorHandle,
} from "../creator-handle";

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
  SeshCreatorHandleReservationRepository,
  SeshCreatorProfileRepository,
  SeshProjectRepository,
} from "../persistence/repositories";

import {
  isSeshProjectPublic,
} from "../project-publication";

import type {
  PublicSeshProject,
} from "./public-project-resolution-service";

export interface PublicSeshProjectCreatorPresentation {
  readonly handle:
    SeshCreatorHandle;

  readonly displayName:
    string;
}

export interface PublicSeshProjectPresentation {
  readonly project:
    PublicSeshProject;

  readonly creator?:
    PublicSeshProjectCreatorPresentation;
}

export type PublicSeshProjectPresentationFailureCode =
  | "invalid-input"
  | "not-found"
  | "unavailable";

export type PublicSeshProjectPresentationResult =
  | {
      readonly ok:
        true;

      readonly value:
        PublicSeshProjectPresentation;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          PublicSeshProjectPresentationFailureCode;

        readonly message:
          string;
      };
    };

export interface PublicSeshProjectPresentationService {
  resolveByProjectId(
    requestedProjectId:
      unknown,
  ): Promise<
    PublicSeshProjectPresentationResult
  >;
}

export interface DefaultPublicSeshProjectPresentationServiceDependencies {
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

  readonly reservations:
    Pick<
      SeshCreatorHandleReservationRepository,
      "getByCreatorId"
    >;

  readonly profiles:
    Pick<
      SeshCreatorProfileRepository,
      "getCreatorProfile"
    >;
}

function success(
  value:
    PublicSeshProjectPresentation,
): PublicSeshProjectPresentationResult {
  return {
    ok:
      true,

    value,
  };
}

function failure(
  code:
    PublicSeshProjectPresentationFailureCode,

  message:
    string,
): PublicSeshProjectPresentationResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

export class DefaultPublicSeshProjectPresentationService
implements PublicSeshProjectPresentationService {
  readonly #publications:
    DefaultPublicSeshProjectPresentationServiceDependencies[
      "publications"
    ];

  readonly #projects:
    DefaultPublicSeshProjectPresentationServiceDependencies[
      "projects"
    ];

  readonly #reservations:
    DefaultPublicSeshProjectPresentationServiceDependencies[
      "reservations"
    ];

  readonly #profiles:
    DefaultPublicSeshProjectPresentationServiceDependencies[
      "profiles"
    ];

  constructor(
    dependencies:
      DefaultPublicSeshProjectPresentationServiceDependencies,
  ) {
    this.#publications =
      dependencies.publications;

    this.#projects =
      dependencies.projects;

    this.#reservations =
      dependencies.reservations;

    this.#profiles =
      dependencies.profiles;
  }

  async resolveByProjectId(
    requestedProjectId:
      unknown,
  ): Promise<
    PublicSeshProjectPresentationResult
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
          DefaultPublicSeshProjectPresentationServiceDependencies[
            "publications"
          ][
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
        "Public Sesh project presentation is temporarily unavailable.",
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
        "Public Sesh project presentation is temporarily unavailable.",
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
          DefaultPublicSeshProjectPresentationServiceDependencies[
            "projects"
          ][
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
        "Public Sesh project presentation is temporarily unavailable.",
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
        "Public Sesh project presentation is temporarily unavailable.",
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

    const publicProject:
      PublicSeshProject = {
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
      };

    let reservationResult:
      Awaited<
        ReturnType<
          DefaultPublicSeshProjectPresentationServiceDependencies[
            "reservations"
          ][
            "getByCreatorId"
          ]
        >
      >;

    try {
      reservationResult =
        await this.#reservations
          .getByCreatorId(
            project.ownerCreatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Public Sesh creator presentation is temporarily unavailable.",
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
          project:
            publicProject,
        });
      }

      return failure(
        "unavailable",
        "Public Sesh creator presentation is temporarily unavailable.",
      );
    }

    const reservation =
      reservationResult.value;

    if (
      reservation.creatorId !==
        project.ownerCreatorId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator handle reservation failed its project owner invariant.",
      );
    }

    let profileResult:
      Awaited<
        ReturnType<
          DefaultPublicSeshProjectPresentationServiceDependencies[
            "profiles"
          ][
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
        "Public Sesh creator presentation is temporarily unavailable.",
      );
    }

    if (
      !profileResult.ok
    ) {
      if (
        profileResult.error.kind ===
          "not-found"
      ) {
        return success({
          project:
            publicProject,
        });
      }

      return failure(
        "unavailable",
        "Public Sesh creator presentation is temporarily unavailable.",
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
      project:
        publicProject,

      creator: {
        handle:
          reservation.normalizedHandle,

        displayName:
          profile.displayName,
      },
    });
  }
}