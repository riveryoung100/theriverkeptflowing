import {
  parseSeshAudioAssetId,
  parseSeshBeatGridId,
  parseSeshCreatorId,
  parseSeshCueId,
  parseSeshInputEventId,
  parseSeshMusicProjectId,
  parseSeshMusicalEventId,
  parseSeshSessionId,
  parseSeshTempoMapId,
  parseSeshTrackId,
} from "./identifiers";
import {
  SESH_AUDIO_ASSET_KINDS,
  SESH_CUE_CHANNELS,
  SESH_INPUT_SOURCES,
  SESH_MUSICAL_EVENT_KINDS,
  type SeshAudioAsset,
  type SeshAudioAssetKind,
  type SeshBeatGrid,
  type SeshCreatorProfile,
  type SeshCue,
  type SeshCueChannel,
  type SeshInputEvent,
  type SeshInputSource,
  type SeshMusicProject,
  type SeshMusicalEvent,
  type SeshMusicalEventKind,
  type SeshSession,
  type SeshStorageReference,
  type SeshTempoMap,
  type SeshTempoPoint,
  type SeshTimestamp,
  type SeshTrack,
} from "./model";

type UnknownRecord = Record<string, unknown>;

function requireRecord(
  value: unknown,
  label: string,
): UnknownRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TypeError(`${label} must be an object.`);
  }

  return value as UnknownRecord;
}

function requireString(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }

  return value;
}

function optionalString(
  value: unknown,
  label: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, label);
}

function requireFiniteNumber(
  value: unknown,
  label: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }

  return value;
}

function optionalFiniteNumber(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireFiniteNumber(value, label);
}

function requirePositiveInteger(
  value: unknown,
  label: string,
): number {
  const numberValue = requireFiniteNumber(value, label);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new TypeError(`${label} must be a positive integer.`);
  }

  return numberValue;
}

function requireNonNegativeInteger(
  value: unknown,
  label: string,
): number {
  const numberValue = requireFiniteNumber(value, label);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new TypeError(`${label} must be a non-negative integer.`);
  }

  return numberValue;
}

function requireTimestamp(
  value: unknown,
  label: string,
): SeshTimestamp {
  const timestamp = requireString(value, label);

  if (
    !timestamp.endsWith("Z") ||
    !Number.isFinite(Date.parse(timestamp))
  ) {
    throw new TypeError(
      `${label} must be a valid ISO-8601 UTC timestamp.`,
    );
  }

  return timestamp;
}

function optionalTimestamp(
  value: unknown,
  label: string,
): SeshTimestamp | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireTimestamp(value, label);
}

function requireArray(
  value: unknown,
  label: string,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array.`);
  }

  return value;
}

function requireUniqueArray<T>(
  values: readonly T[],
  label: string,
): readonly T[] {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${label} must not contain duplicates.`);
  }

  return values;
}

function requireBoolean(
  value: unknown,
  label: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${label} must be a boolean.`);
  }

  return value;
}

function optionalBoolean(
  value: unknown,
  label: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireBoolean(value, label);
}

function requireEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (
    typeof value !== "string" ||
    !values.includes(value as T)
  ) {
    throw new TypeError(
      `${label} must be one of: ${values.join(", ")}.`,
    );
  }

  return value as T;
}

function validateStorageReference(
  value: unknown,
): SeshStorageReference {
  const record = requireRecord(value, "storageReference");

  return {
    provider: requireString(
      record.provider,
      "storageReference.provider",
    ),
    key: requireString(
      record.key,
      "storageReference.key",
    ),
    bucket: optionalString(
      record.bucket,
      "storageReference.bucket",
    ),
    versionId: optionalString(
      record.versionId,
      "storageReference.versionId",
    ),
  };
}

export function validateSeshCreatorProfile(
  value: unknown,
): SeshCreatorProfile {
  const record = requireRecord(value, "SeshCreatorProfile");

  return {
    id: parseSeshCreatorId(record.id),
    displayName: requireString(
      record.displayName,
      "SeshCreatorProfile.displayName",
    ),
    createdAt: requireTimestamp(
      record.createdAt,
      "SeshCreatorProfile.createdAt",
    ),
    handle: optionalString(
      record.handle,
      "SeshCreatorProfile.handle",
    ),
    bio: optionalString(
      record.bio,
      "SeshCreatorProfile.bio",
    ),
  };
}

export function validateSeshMusicProject(
  value: unknown,
): SeshMusicProject {
  const record = requireRecord(value, "SeshMusicProject");

  const createdAt = requireTimestamp(
    record.createdAt,
    "SeshMusicProject.createdAt",
  );
  const updatedAt = requireTimestamp(
    record.updatedAt,
    "SeshMusicProject.updatedAt",
  );

  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw new TypeError(
      "SeshMusicProject.updatedAt must not precede createdAt.",
    );
  }

  const trackIds = requireUniqueArray(
    requireArray(record.trackIds, "SeshMusicProject.trackIds")
      .map(parseSeshTrackId),
    "SeshMusicProject.trackIds",
  );

  const sessionIds = requireUniqueArray(
    requireArray(record.sessionIds, "SeshMusicProject.sessionIds")
      .map(parseSeshSessionId),
    "SeshMusicProject.sessionIds",
  );

  const audioAssetIds = requireUniqueArray(
    requireArray(
      record.audioAssetIds,
      "SeshMusicProject.audioAssetIds",
    ).map(parseSeshAudioAssetId),
    "SeshMusicProject.audioAssetIds",
  );

  return {
    id: parseSeshMusicProjectId(record.id),
    ownerCreatorId: parseSeshCreatorId(record.ownerCreatorId),
    title: requireString(
      record.title,
      "SeshMusicProject.title",
    ),
    createdAt,
    updatedAt,
    trackIds,
    sessionIds,
    audioAssetIds,
    tempoMapId:
      record.tempoMapId === undefined
        ? undefined
        : parseSeshTempoMapId(record.tempoMapId),
    beatGridId:
      record.beatGridId === undefined
        ? undefined
        : parseSeshBeatGridId(record.beatGridId),
    description: optionalString(
      record.description,
      "SeshMusicProject.description",
    ),
  };
}

export function validateSeshAudioAsset(
  value: unknown,
): SeshAudioAsset {
  const record = requireRecord(value, "SeshAudioAsset");

  const durationSeconds = optionalFiniteNumber(
    record.durationSeconds,
    "SeshAudioAsset.durationSeconds",
  );

  if (durationSeconds !== undefined && durationSeconds < 0) {
    throw new TypeError(
      "SeshAudioAsset.durationSeconds must be non-negative.",
    );
  }

  const sampleRateHz = optionalFiniteNumber(
    record.sampleRateHz,
    "SeshAudioAsset.sampleRateHz",
  );

  if (sampleRateHz !== undefined && sampleRateHz <= 0) {
    throw new TypeError(
      "SeshAudioAsset.sampleRateHz must be greater than zero.",
    );
  }

  let channelCount: number | undefined;

  if (record.channelCount !== undefined) {
    channelCount = requirePositiveInteger(
      record.channelCount,
      "SeshAudioAsset.channelCount",
    );
  }

  return {
    id: parseSeshAudioAssetId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    kind: requireEnum<SeshAudioAssetKind>(
      record.kind,
      SESH_AUDIO_ASSET_KINDS,
      "SeshAudioAsset.kind",
    ),
    name: requireString(
      record.name,
      "SeshAudioAsset.name",
    ),
    createdAt: requireTimestamp(
      record.createdAt,
      "SeshAudioAsset.createdAt",
    ),
    durationSeconds,
    sampleRateHz,
    channelCount,
    storageReference:
      record.storageReference === undefined
        ? undefined
        : validateStorageReference(record.storageReference),
    contentType: optionalString(
      record.contentType,
      "SeshAudioAsset.contentType",
    ),
  };
}

export function validateSeshSession(
  value: unknown,
): SeshSession {
  const record = requireRecord(value, "SeshSession");

  const startedAt = requireTimestamp(
    record.startedAt,
    "SeshSession.startedAt",
  );
  const endedAt = optionalTimestamp(
    record.endedAt,
    "SeshSession.endedAt",
  );

  if (
    endedAt !== undefined &&
    Date.parse(endedAt) < Date.parse(startedAt)
  ) {
    throw new TypeError(
      "SeshSession.endedAt must not precede startedAt.",
    );
  }

  return {
    id: parseSeshSessionId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    startedAt,
    endedAt,
    name: optionalString(record.name, "SeshSession.name"),
  };
}

export function validateSeshTrack(
  value: unknown,
): SeshTrack {
  const record = requireRecord(value, "SeshTrack");

  const audioAssetIds = requireUniqueArray(
    requireArray(
      record.audioAssetIds,
      "SeshTrack.audioAssetIds",
    ).map(parseSeshAudioAssetId),
    "SeshTrack.audioAssetIds",
  );

  return {
    id: parseSeshTrackId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    name: requireString(record.name, "SeshTrack.name"),
    order: requireNonNegativeInteger(
      record.order,
      "SeshTrack.order",
    ),
    audioAssetIds,
    muted: optionalBoolean(record.muted, "SeshTrack.muted"),
    solo: optionalBoolean(record.solo, "SeshTrack.solo"),
    gain: optionalFiniteNumber(record.gain, "SeshTrack.gain"),
  };
}

export function validateSeshTempoPoint(
  value: unknown,
): SeshTempoPoint {
  const record = requireRecord(value, "SeshTempoPoint");
  const beat = requireFiniteNumber(
    record.beat,
    "SeshTempoPoint.beat",
  );
  const bpm = requireFiniteNumber(
    record.bpm,
    "SeshTempoPoint.bpm",
  );

  if (beat < 0) {
    throw new TypeError(
      "SeshTempoPoint.beat must be non-negative.",
    );
  }

  if (bpm <= 0) {
    throw new TypeError(
      "SeshTempoPoint.bpm must be greater than zero.",
    );
  }

  return { beat, bpm };
}

export function validateSeshTempoMap(
  value: unknown,
): SeshTempoMap {
  const record = requireRecord(value, "SeshTempoMap");

  const points = requireArray(
    record.points,
    "SeshTempoMap.points",
  ).map(validateSeshTempoPoint);

  if (points.length === 0) {
    throw new TypeError(
      "SeshTempoMap.points must contain at least one tempo point.",
    );
  }

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;

    if (current.beat <= previous.beat) {
      throw new TypeError(
        "SeshTempoMap.points must be strictly ordered by beat with no duplicates.",
      );
    }
  }

  return {
    id: parseSeshTempoMapId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    points,
  };
}

export function validateSeshBeatGrid(
  value: unknown,
): SeshBeatGrid {
  const record = requireRecord(value, "SeshBeatGrid");

  return {
    id: parseSeshBeatGridId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    beatsPerBar: requirePositiveInteger(
      record.beatsPerBar,
      "SeshBeatGrid.beatsPerBar",
    ),
    beatUnit: requirePositiveInteger(
      record.beatUnit,
      "SeshBeatGrid.beatUnit",
    ),
    subdivisionsPerBeat: requirePositiveInteger(
      record.subdivisionsPerBeat,
      "SeshBeatGrid.subdivisionsPerBeat",
    ),
    startBeat: optionalFiniteNumber(
      record.startBeat,
      "SeshBeatGrid.startBeat",
    ),
  };
}

export function validateSeshMusicalEvent(
  value: unknown,
): SeshMusicalEvent {
  const record = requireRecord(value, "SeshMusicalEvent");

  const beat = requireFiniteNumber(
    record.beat,
    "SeshMusicalEvent.beat",
  );

  if (beat < 0) {
    throw new TypeError(
      "SeshMusicalEvent.beat must be non-negative.",
    );
  }

  const durationBeats = optionalFiniteNumber(
    record.durationBeats,
    "SeshMusicalEvent.durationBeats",
  );

  if (durationBeats !== undefined && durationBeats < 0) {
    throw new TypeError(
      "SeshMusicalEvent.durationBeats must be non-negative.",
    );
  }

  return {
    id: parseSeshMusicalEventId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    kind: requireEnum<SeshMusicalEventKind>(
      record.kind,
      SESH_MUSICAL_EVENT_KINDS,
      "SeshMusicalEvent.kind",
    ),
    beat,
    durationBeats,
    trackId:
      record.trackId === undefined
        ? undefined
        : parseSeshTrackId(record.trackId),
    note:
      record.note === undefined
        ? undefined
        : (
            typeof record.note === "string" ||
            typeof record.note === "number"
          )
          ? record.note
          : (() => {
              throw new TypeError(
                "SeshMusicalEvent.note must be a string or number.",
              );
            })(),
    velocity: optionalFiniteNumber(
      record.velocity,
      "SeshMusicalEvent.velocity",
    ),
    control:
      record.control === undefined
        ? undefined
        : (
            typeof record.control === "string" ||
            typeof record.control === "number"
          )
          ? record.control
          : (() => {
              throw new TypeError(
                "SeshMusicalEvent.control must be a string or number.",
              );
            })(),
    value: record.value,
    metadata:
      record.metadata === undefined
        ? undefined
        : requireRecord(
            record.metadata,
            "SeshMusicalEvent.metadata",
          ),
  };
}

export function validateSeshInputEvent(
  value: unknown,
): SeshInputEvent {
  const record = requireRecord(value, "SeshInputEvent");

  return {
    id: parseSeshInputEventId(record.id),
    source: requireEnum<SeshInputSource>(
      record.source,
      SESH_INPUT_SOURCES,
      "SeshInputEvent.source",
    ),
    occurredAt: requireTimestamp(
      record.occurredAt,
      "SeshInputEvent.occurredAt",
    ),
    kind: requireString(record.kind, "SeshInputEvent.kind"),
    control:
      record.control === undefined
        ? undefined
        : (
            typeof record.control === "string" ||
            typeof record.control === "number"
          )
          ? record.control
          : (() => {
              throw new TypeError(
                "SeshInputEvent.control must be a string or number.",
              );
            })(),
    value: record.value,
    pressure: optionalFiniteNumber(
      record.pressure,
      "SeshInputEvent.pressure",
    ),
    metadata:
      record.metadata === undefined
        ? undefined
        : requireRecord(
            record.metadata,
            "SeshInputEvent.metadata",
          ),
  };
}

export function validateSeshCue(
  value: unknown,
): SeshCue {
  const record = requireRecord(value, "SeshCue");

  const beat = requireFiniteNumber(
    record.beat,
    "SeshCue.beat",
  );

  if (beat < 0) {
    throw new TypeError("SeshCue.beat must be non-negative.");
  }

  const rawChannels = requireArray(
    record.channels,
    "SeshCue.channels",
  );

  if (rawChannels.length === 0) {
    throw new TypeError(
      "SeshCue.channels must contain at least one channel.",
    );
  }

  const channels = requireUniqueArray(
    rawChannels.map((channel) =>
      requireEnum<SeshCueChannel>(
        channel,
        SESH_CUE_CHANNELS,
        "SeshCue.channels",
      ),
    ),
    "SeshCue.channels",
  );

  const durationBeats = optionalFiniteNumber(
    record.durationBeats,
    "SeshCue.durationBeats",
  );

  if (durationBeats !== undefined && durationBeats < 0) {
    throw new TypeError(
      "SeshCue.durationBeats must be non-negative.",
    );
  }

  return {
    id: parseSeshCueId(record.id),
    projectId: parseSeshMusicProjectId(record.projectId),
    beat,
    channels,
    kind: requireString(record.kind, "SeshCue.kind"),
    durationBeats,
    intensity: optionalFiniteNumber(
      record.intensity,
      "SeshCue.intensity",
    ),
    payload: record.payload,
  };
}
