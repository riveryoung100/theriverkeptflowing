import {
  parseSeshCreatorId,
  parseSeshMusicProjectId,
} from "./identifiers";

import type {
  SeshCreatorId,
  SeshMusicProjectId,
} from "./identifiers";

import type {
  SeshTimestamp,
} from "./model";

export const SESH_PROJECT_PUBLICATION_STATES = [
  "private",
  "public",
] as const;

export type SeshProjectPublicationState =
  (typeof SESH_PROJECT_PUBLICATION_STATES)[number];

export interface SeshProjectPublicationRecord {
  readonly projectId:
    SeshMusicProjectId;

  readonly ownerCreatorId:
    SeshCreatorId;

  readonly state:
    SeshProjectPublicationState;

  readonly updatedAt:
    SeshTimestamp;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function canonicalTimestamp(
  value: unknown,
): SeshTimestamp {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Sesh project publication updatedAt must be a canonical timestamp.",
    );
  }

  const parsed =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    ) ||
    parsed.toISOString() !==
      value
  ) {
    throw new TypeError(
      "Sesh project publication updatedAt must be a canonical ISO-8601 timestamp.",
    );
  }

  return value;
}

export function isSeshProjectPublicationState(
  value: unknown,
): value is SeshProjectPublicationState {
  return (
    typeof value ===
      "string" &&
    (
      SESH_PROJECT_PUBLICATION_STATES as readonly string[]
    ).includes(
      value,
    )
  );
}

export function validateSeshProjectPublicationRecord(
  value: unknown,
): SeshProjectPublicationRecord {
  if (
    !isRecord(
      value,
    )
  ) {
    throw new TypeError(
      "Sesh project publication record must be an object.",
    );
  }

  const keys =
    Object.keys(
      value,
    ).sort();

  const expectedKeys = [
    "ownerCreatorId",
    "projectId",
    "state",
    "updatedAt",
  ];

  if (
    keys.length !==
      expectedKeys.length ||
    keys.some(
      (key, index) =>
        key !==
          expectedKeys[index],
    )
  ) {
    throw new TypeError(
      "Sesh project publication record contains unsupported fields.",
    );
  }

  const projectId =
    parseSeshMusicProjectId(
      value.projectId,
    );

  const ownerCreatorId =
    parseSeshCreatorId(
      value.ownerCreatorId,
    );

  if (
    !isSeshProjectPublicationState(
      value.state,
    )
  ) {
    throw new TypeError(
      "Sesh project publication state must be private or public.",
    );
  }

  const updatedAt =
    canonicalTimestamp(
      value.updatedAt,
    );

  return {
    projectId,
    ownerCreatorId,
    state:
      value.state,
    updatedAt,
  };
}

export function isSeshProjectPublic(
  value: SeshProjectPublicationRecord,
): boolean {
  const validated =
    validateSeshProjectPublicationRecord(
      value,
    );

  return (
    validated.state ===
      "public"
  );
}