type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

export type SeshCreatorId = Brand<string, "SeshCreatorId">;
export type SeshMusicProjectId = Brand<string, "SeshMusicProjectId">;
export type SeshAudioAssetId = Brand<string, "SeshAudioAssetId">;
export type SeshSessionId = Brand<string, "SeshSessionId">;
export type SeshTrackId = Brand<string, "SeshTrackId">;
export type SeshTempoMapId = Brand<string, "SeshTempoMapId">;
export type SeshBeatGridId = Brand<string, "SeshBeatGridId">;
export type SeshMusicalEventId = Brand<string, "SeshMusicalEventId">;
export type SeshInputEventId = Brand<string, "SeshInputEventId">;
export type SeshCueId = Brand<string, "SeshCueId">;

export const SESH_IDENTIFIER_PREFIXES = {
  creator: "sesh-creator",
  musicProject: "sesh-project",
  audioAsset: "sesh-audio",
  session: "sesh-session",
  track: "sesh-track",
  tempoMap: "sesh-tempo-map",
  beatGrid: "sesh-beat-grid",
  musicalEvent: "sesh-musical-event",
  inputEvent: "sesh-input-event",
  cue: "sesh-cue",
} as const;

function parseIdentifier<T extends string>(
  value: unknown,
  prefix: string,
  label: string,
): T {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string.`);
  }

  const expectedPrefix = `${prefix}:`;

  if (!value.startsWith(expectedPrefix)) {
    throw new TypeError(
      `${label} must begin with "${expectedPrefix}".`,
    );
  }

  const localId = value.slice(expectedPrefix.length);

  if (localId.length === 0 || localId.trim().length === 0) {
    throw new TypeError(`${label} must contain a non-empty local identifier.`);
  }

  if (localId !== localId.trim()) {
    throw new TypeError(`${label} local identifier may not have surrounding whitespace.`);
  }

  return value as T;
}

function createIdentifier<T extends string>(
  localId: string,
  prefix: string,
  label: string,
): T {
  if (typeof localId !== "string" || localId.trim().length === 0) {
    throw new TypeError(`${label} local identifier must be non-empty.`);
  }

  if (localId !== localId.trim()) {
    throw new TypeError(`${label} local identifier may not have surrounding whitespace.`);
  }

  return parseIdentifier<T>(`${prefix}:${localId}`, prefix, label);
}

export function parseSeshCreatorId(value: unknown): SeshCreatorId {
  return parseIdentifier<SeshCreatorId>(
    value,
    SESH_IDENTIFIER_PREFIXES.creator,
    "SeshCreatorId",
  );
}

export function createSeshCreatorId(localId: string): SeshCreatorId {
  return createIdentifier<SeshCreatorId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.creator,
    "SeshCreatorId",
  );
}

export function parseSeshMusicProjectId(value: unknown): SeshMusicProjectId {
  return parseIdentifier<SeshMusicProjectId>(
    value,
    SESH_IDENTIFIER_PREFIXES.musicProject,
    "SeshMusicProjectId",
  );
}

export function createSeshMusicProjectId(localId: string): SeshMusicProjectId {
  return createIdentifier<SeshMusicProjectId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.musicProject,
    "SeshMusicProjectId",
  );
}

export function parseSeshAudioAssetId(value: unknown): SeshAudioAssetId {
  return parseIdentifier<SeshAudioAssetId>(
    value,
    SESH_IDENTIFIER_PREFIXES.audioAsset,
    "SeshAudioAssetId",
  );
}

export function createSeshAudioAssetId(localId: string): SeshAudioAssetId {
  return createIdentifier<SeshAudioAssetId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.audioAsset,
    "SeshAudioAssetId",
  );
}

export function parseSeshSessionId(value: unknown): SeshSessionId {
  return parseIdentifier<SeshSessionId>(
    value,
    SESH_IDENTIFIER_PREFIXES.session,
    "SeshSessionId",
  );
}

export function createSeshSessionId(localId: string): SeshSessionId {
  return createIdentifier<SeshSessionId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.session,
    "SeshSessionId",
  );
}

export function parseSeshTrackId(value: unknown): SeshTrackId {
  return parseIdentifier<SeshTrackId>(
    value,
    SESH_IDENTIFIER_PREFIXES.track,
    "SeshTrackId",
  );
}

export function createSeshTrackId(localId: string): SeshTrackId {
  return createIdentifier<SeshTrackId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.track,
    "SeshTrackId",
  );
}

export function parseSeshTempoMapId(value: unknown): SeshTempoMapId {
  return parseIdentifier<SeshTempoMapId>(
    value,
    SESH_IDENTIFIER_PREFIXES.tempoMap,
    "SeshTempoMapId",
  );
}

export function createSeshTempoMapId(localId: string): SeshTempoMapId {
  return createIdentifier<SeshTempoMapId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.tempoMap,
    "SeshTempoMapId",
  );
}

export function parseSeshBeatGridId(value: unknown): SeshBeatGridId {
  return parseIdentifier<SeshBeatGridId>(
    value,
    SESH_IDENTIFIER_PREFIXES.beatGrid,
    "SeshBeatGridId",
  );
}

export function createSeshBeatGridId(localId: string): SeshBeatGridId {
  return createIdentifier<SeshBeatGridId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.beatGrid,
    "SeshBeatGridId",
  );
}

export function parseSeshMusicalEventId(value: unknown): SeshMusicalEventId {
  return parseIdentifier<SeshMusicalEventId>(
    value,
    SESH_IDENTIFIER_PREFIXES.musicalEvent,
    "SeshMusicalEventId",
  );
}

export function createSeshMusicalEventId(localId: string): SeshMusicalEventId {
  return createIdentifier<SeshMusicalEventId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.musicalEvent,
    "SeshMusicalEventId",
  );
}

export function parseSeshInputEventId(value: unknown): SeshInputEventId {
  return parseIdentifier<SeshInputEventId>(
    value,
    SESH_IDENTIFIER_PREFIXES.inputEvent,
    "SeshInputEventId",
  );
}

export function createSeshInputEventId(localId: string): SeshInputEventId {
  return createIdentifier<SeshInputEventId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.inputEvent,
    "SeshInputEventId",
  );
}

export function parseSeshCueId(value: unknown): SeshCueId {
  return parseIdentifier<SeshCueId>(
    value,
    SESH_IDENTIFIER_PREFIXES.cue,
    "SeshCueId",
  );
}

export function createSeshCueId(localId: string): SeshCueId {
  return createIdentifier<SeshCueId>(
    localId,
    SESH_IDENTIFIER_PREFIXES.cue,
    "SeshCueId",
  );
}
