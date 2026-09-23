import type {
  SeshCreatorHandleReservationRepository,
  SeshCreatorProfileRepository,
  SeshProjectRepository,
} from "../persistence/repositories";

import type {
  SeshPublicProjectPublicationDiscoveryRepository,
} from "../persistence/project-publication-repository";

import type {
  PublicSeshProject,
} from "./public-project-resolution-service";

import type {
  PublicSeshProjectCreatorPresentation,
} from "./public-project-presentation-service";

export interface PublicSeshProjectDiscoveryItem {
  readonly project:
    PublicSeshProject;

  readonly creator?:
    PublicSeshProjectCreatorPresentation;
}

export interface PublicSeshProjectDiscovery {
  readonly projects:
    readonly PublicSeshProjectDiscoveryItem[];
}

export type PublicSeshProjectDiscoveryFailureCode =
  | "invalid-input"
  | "unavailable";

export type PublicSeshProjectDiscoveryResult =
  | {
      readonly ok:
        true;

      readonly value:
        PublicSeshProjectDiscovery;
    }
  | {
      readonly ok:
        false;

      readonly error: {
        readonly code:
          PublicSeshProjectDiscoveryFailureCode;

        readonly message:
          string;
      };
    };

export interface PublicSeshProjectDiscoveryService {
  listPublicProjects(
    limit: number,
  ): Promise<
    PublicSeshProjectDiscoveryResult
  >;
}

export interface DefaultPublicSeshProjectDiscoveryServiceDependencies {
  readonly publications:
    Pick<
      SeshPublicProjectPublicationDiscoveryRepository,
      "listPublicProjectPublications"
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
    PublicSeshProjectDiscovery,
): PublicSeshProjectDiscoveryResult {
  return {
    ok:
      true,
    value,
  };
}

function failure(
  code:
    PublicSeshProjectDiscoveryFailureCode,
  message:
    string,
): PublicSeshProjectDiscoveryResult {
  return {
    ok:
      false,
    error: {
      code,
      message,
    },
  };
}

export class DefaultPublicSeshProjectDiscoveryService
implements PublicSeshProjectDiscoveryService {
  readonly #publications:
    DefaultPublicSeshProjectDiscoveryServiceDependencies[
      "publications"
    ];

  readonly #projects:
    DefaultPublicSeshProjectDiscoveryServiceDependencies[
      "projects"
    ];

  readonly #reservations:
    DefaultPublicSeshProjectDiscoveryServiceDependencies[
      "reservations"
    ];

  readonly #profiles:
    DefaultPublicSeshProjectDiscoveryServiceDependencies[
      "profiles"
    ];

  constructor(
    dependencies:
      DefaultPublicSeshProjectDiscoveryServiceDependencies,
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

  async listPublicProjects(
    limit:
      number,
  ): Promise<
    PublicSeshProjectDiscoveryResult
  > {
    if (
      !Number.isInteger(
        limit,
      ) ||
      limit <
        1 ||
      limit >
        50
    ) {
      return failure(
        "invalid-input",
        "Public Sesh project discovery limit must be an integer from 1 through 50.",
      );
    }

    let publicationResult:
      Awaited<
        ReturnType<
          DefaultPublicSeshProjectDiscoveryServiceDependencies[
            "publications"
          ][
            "listPublicProjectPublications"
          ]
        >
      >;

    try {
      publicationResult =
        await this.#publications
          .listPublicProjectPublications(
            limit,
          );
    }
    catch {
      return failure(
        "unavailable",
        "Public Sesh project discovery is temporarily unavailable.",
      );
    }

    if (
      !publicationResult.ok
    ) {
      return failure(
        publicationResult.error.kind ===
          "validation"
          ? "invalid-input"
          : "unavailable",
        publicationResult.error.kind ===
          "validation"
          ? "Public Sesh project discovery input is invalid."
          : "Public Sesh project discovery is temporarily unavailable.",
      );
    }

    if (
      publicationResult.value.length >
        limit
    ) {
      return failure(
        "unavailable",
        "Public Sesh project discovery exceeded its requested result bound.",
      );
    }

    const discovered:
      PublicSeshProjectDiscoveryItem[] =
        [];

    for (
      const publication of
      publicationResult.value
    ) {
      if (
        publication.state !==
          "public"
      ) {
        return failure(
          "unavailable",
          "Persisted Sesh discovery publication failed its public-state invariant.",
        );
      }

      let projectResult:
        Awaited<
          ReturnType<
            DefaultPublicSeshProjectDiscoveryServiceDependencies[
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
              publication.projectId,
            );
      }
      catch {
        return failure(
          "unavailable",
          "Public Sesh project discovery is temporarily unavailable.",
        );
      }

      if (
        !projectResult.ok
      ) {
        return failure(
          "unavailable",
          "Public Sesh project discovery is temporarily unavailable.",
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
          "Persisted Sesh discovery project failed its publication identity invariant.",
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
            DefaultPublicSeshProjectDiscoveryServiceDependencies[
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
          "Public Sesh creator discovery is temporarily unavailable.",
        );
      }

      if (
        !reservationResult.ok
      ) {
        if (
          reservationResult.error.kind ===
            "not-found"
        ) {
          discovered.push({
            project:
              publicProject,
          });

          continue;
        }

        return failure(
          "unavailable",
          "Public Sesh creator discovery is temporarily unavailable.",
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
          "Persisted Sesh creator handle reservation failed its discovery owner invariant.",
        );
      }

      let profileResult:
        Awaited<
          ReturnType<
            DefaultPublicSeshProjectDiscoveryServiceDependencies[
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
          "Public Sesh creator discovery is temporarily unavailable.",
        );
      }

      if (
        !profileResult.ok
      ) {
        if (
          profileResult.error.kind ===
            "not-found"
        ) {
          discovered.push({
            project:
              publicProject,
          });

          continue;
        }

        return failure(
          "unavailable",
          "Public Sesh creator discovery is temporarily unavailable.",
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
          "Persisted Sesh creator profile failed its discovery reservation invariant.",
        );
      }

      discovered.push({
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

    return success({
      projects:
        discovered,
    });
  }
}