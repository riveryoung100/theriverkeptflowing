import type {
  SeshAudioAssetId,
  SeshBeatGridId,
  SeshCreatorId,
  SeshCueId,
  SeshInputEventId,
  SeshMusicProjectId,
  SeshMusicalEventId,
  SeshSessionId,
  SeshTempoMapId,
  SeshTrackId,
} from "./identifiers";

export type SeshTimestamp = string;

export interface SeshStorageReference {
  readonly provider: string;
  readonly key: string;
  readonly bucket?: string;
  readonly versionId?: string;
}

export interface SeshCreatorProfile {
  readonly id: SeshCreatorId;
  readonly displayName: string;
  readonly createdAt: SeshTimestamp;
  readonly handle?: string;
  readonly bio?: string;
}

export interface SeshMusicProject {
  readonly id: SeshMusicProjectId;
  readonly ownerCreatorId: SeshCreatorId;
  readonly title: string;
  readonly createdAt: SeshTimestamp;
  readonly updatedAt: SeshTimestamp;
  readonly trackIds: readonly SeshTrackId[];
  readonly sessionIds: readonly SeshSessionId[];
  readonly audioAssetIds: readonly SeshAudioAssetId[];
  readonly tempoMapId?: SeshTempoMapId;
  readonly beatGridId?: SeshBeatGridId;
  readonly description?: string;
}

export const SESH_AUDIO_ASSET_KINDS = [
  "recording",
  "track",
  "stem",
  "sample",
  "loop",
  "one-shot",
  "render",
  "mix",
  "master",
  "reference",
] as const;

export type SeshAudioAssetKind =
  (typeof SESH_AUDIO_ASSET_KINDS)[number];

export interface SeshAudioAsset {
  readonly id: SeshAudioAssetId;
  readonly projectId: SeshMusicProjectId;
  readonly kind: SeshAudioAssetKind;
  readonly name: string;
  readonly createdAt: SeshTimestamp;
  readonly durationSeconds?: number;
  readonly sampleRateHz?: number;
  readonly channelCount?: number;
  readonly storageReference?: SeshStorageReference;
  readonly contentType?: string;
}

export interface SeshSession {
  readonly id: SeshSessionId;
  readonly projectId: SeshMusicProjectId;
  readonly startedAt: SeshTimestamp;
  readonly endedAt?: SeshTimestamp;
  readonly name?: string;
}

export interface SeshTrack {
  readonly id: SeshTrackId;
  readonly projectId: SeshMusicProjectId;
  readonly name: string;
  readonly order: number;
  readonly audioAssetIds: readonly SeshAudioAssetId[];
  readonly muted?: boolean;
  readonly solo?: boolean;
  readonly gain?: number;
}

export interface SeshTempoPoint {
  readonly beat: number;
  readonly bpm: number;
}

export interface SeshTempoMap {
  readonly id: SeshTempoMapId;
  readonly projectId: SeshMusicProjectId;
  readonly points: readonly SeshTempoPoint[];
}

export interface SeshBeatGrid {
  readonly id: SeshBeatGridId;
  readonly projectId: SeshMusicProjectId;
  readonly beatsPerBar: number;
  readonly beatUnit: number;
  readonly subdivisionsPerBeat: number;
  readonly startBeat?: number;
}

export const SESH_MUSICAL_EVENT_KINDS = [
  "note",
  "trigger",
  "hit",
  "control-change",
  "transport",
  "automation",
  "gesture",
] as const;

export type SeshMusicalEventKind =
  (typeof SESH_MUSICAL_EVENT_KINDS)[number];

export interface SeshMusicalEvent {
  readonly id: SeshMusicalEventId;
  readonly projectId: SeshMusicProjectId;
  readonly kind: SeshMusicalEventKind;
  readonly beat: number;
  readonly durationBeats?: number;
  readonly trackId?: SeshTrackId;
  readonly note?: string | number;
  readonly velocity?: number;
  readonly control?: string | number;
  readonly value?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const SESH_INPUT_SOURCES = [
  "computer-keyboard",
  "pointer",
  "touch",
  "game-controller",
  "midi",
  "sesh-device",
] as const;

export type SeshInputSource =
  (typeof SESH_INPUT_SOURCES)[number];

export interface SeshInputEvent {
  readonly id: SeshInputEventId;
  readonly source: SeshInputSource;
  readonly occurredAt: SeshTimestamp;
  readonly kind: string;
  readonly control?: string | number;
  readonly value?: unknown;
  readonly pressure?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const SESH_CUE_CHANNELS = [
  "visual",
  "haptic",
  "audio",
  "lighting",
] as const;

export type SeshCueChannel =
  (typeof SESH_CUE_CHANNELS)[number];

export interface SeshCue {
  readonly id: SeshCueId;
  readonly projectId: SeshMusicProjectId;
  readonly beat: number;
  readonly channels: readonly SeshCueChannel[];
  readonly kind: string;
  readonly durationBeats?: number;
  readonly intensity?: number;
  readonly payload?: unknown;
}
