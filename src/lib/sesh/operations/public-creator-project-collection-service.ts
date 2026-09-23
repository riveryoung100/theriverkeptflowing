import {
  normalizeSeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshCreatorHandle,
} from "../creator-handle";

import type {
  SeshProjectPublicationRepository,
} from "../persistence/project-publication-repository";

import type {
  SeshCreatorHandleReservationRepository,
  SeshCreatorProfileRepository,
  SeshProjectRepository,
} from "../persistence/repositories";

import type {
  PublicSeshProject,
} from "./public-project-resolution-service";

export interface PublicSeshCreatorProjectCollection {
  readonly handle:
    SeshCreatorHandle;

  readonly projects:
    readonly PublicSeshProject[];
}

export type PublicSeshCreatorProjectCollectionFailureCode =
  | "invalid-input"
  | "not-found"
  | "unavailable";

export type PublicSeshCreatorProjectCollectionResult =
  | {
      readonly ok:
        true;

      readonly value:
        PublicSeshCreatorProjectCollection;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          PublicSeshCreatorProjectCollectionFailureCode;

        readonly message:
          string;
      };
    };

export interface PublicSeshCreatorProjectCollectionService {
  listByHandle(
    requestedHandle:
      unknown,
  ): Promise<
    PublicSeshCreatorProjectCollectionResult
  >;
}

export interface DefaultPublicSeshCreatorProjectCollectionServiceDependencies {
  readonly reservations:
    Pick<
      SeshCreatorHandleReservationRepository,
      "getByHandle"
    >;

  readonly profiles:
    Pick<
      SeshCreatorProfileRepository,
      "getCreatorProfile"
    >;

  readonly publications:
    Pick<
      SeshProjectPublicationRepository,
      "listPublicProjectPublicationsForOwner"
    >;

  readonly projects:
    Pick<
      SeshProjectRepository,
      "getProject"
    >;
}

function success(
  value:
    PublicSeshCreatorProjectCollection,
): PublicSeshCreatorProjectCollectionResult {
  return {
    ok:
      true,

    value,
  };
}

function failure(
  code:
    PublicSeshCreatorProjectCollectionFailureCode,

  message:
    string,
): PublicSeshCreatorProjectCollectionResult {
  return {
    ok:
      false,

    error: {
      code,
      message,
    },
  };
}

export class DefaultPublicSeshCreatorProjectCollectionService
implements PublicSeshCreatorProjectCollectionService {
  readonly #reservations:
    DefaultPublicSeshCreatorProjectCollectionServiceDependencies[
      "reservations"
    ];

  readonly #profiles:
    DefaultPublicSeshCreatorProjectCollectionServiceDependencies[
      "profiles"
    ];

  readonly #publications:
    DefaultPublicSeshCreatorProjectCollectionServiceDependencies[
      "publications"
    ];

  readonly #projects:
    DefaultPublicSeshCreatorProjectCollectionServiceDependencies[
      "projects"
    ];

  constructor(
    dependencies:
      DefaultPublicSeshCreatorProjectCollectionServiceDependencies,
  ) {
    this.#reservations =
      dependencies.reservations;

    this.#profiles =
      dependencies.profiles;

    this.#publications =
      dependencies.publications;

    this.#projects =
      dependencies.projects;
  }

  async listByHandle(
    requestedHandle:
      unknown,
  ): Promise<
    PublicSeshCreatorProjectCollectionResult
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
        "Public Sesh creator project collection is temporarily unavailable.",
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
        "Public Sesh creator project collection is temporarily unavailable.",
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
        "Public Sesh creator project collection is temporarily unavailable.",
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
        "Public Sesh creator project collection is temporarily unavailable.",
      );
    }

    if (
      profileResult.value.id !==
        reservation.creatorId
    ) {
      return failure(
        "unavailable",
        "Persisted Sesh creator profile failed its reservation identity invariant.",
      );
    }

    let publicationResult:
      Awaited<
        ReturnType<
          SeshProjectPublicationRepository[
            "listPublicProjectPublicationsForOwner"
          ]
        >
      >;

    try {
      publicationResult =
        await this.#publications
          .listPublicProjectPublicationsForOwner(
            reservation.creatorId,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Public Sesh creator project collection is temporarily unavailable.",
      );
    }

    if (
      !publicationResult.ok
    ) {
      return failure(
        "unavailable",
        "Public Sesh creator project collection is temporarily unavailable.",
      );
    }

    const projects:
      PublicSeshProject[] =
        [];

    for (
      const publication of
        publicationResult.value
    ) {
      if (
        publication.ownerCreatorId !==
          reservation.creatorId ||
        publication.state !==
          "public"
      ) {
        return failure(
          "unavailable",
          "Persisted Sesh publication collection failed its public owner invariant.",
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
              publication.projectId,
            );
      }
      catch {
        return failure(
          "unavailable",
          "Public Sesh creator project collection is temporarily unavailable.",
        );
      }

      if (
        !projectResult.ok
      ) {
        return failure(
          "unavailable",
          "Public Sesh creator project collection is temporarily unavailable.",
        );
      }

      const project =
        projectResult.value;

      if (
        project.id !==
          publication.projectId ||
        project.ownerCreatorId !==
          publication.ownerCreatorId
      ) {
        return failure(
          "unavailable",
          "Persisted Sesh project failed its public publication identity invariant.",
        );
      }

      projects.push({
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

    return success({
      handle:
        reservation.normalizedHandle,

      projects,
    });
  }
}