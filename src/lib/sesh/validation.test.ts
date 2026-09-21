import assert from "node:assert/strict";
import test from "node:test";

import {
  validateSeshAudioAsset,
  validateSeshBeatGrid,
  validateSeshCreatorProfile,
  validateSeshCue,
  validateSeshInputEvent,
  validateSeshMusicProject,
  validateSeshMusicalEvent,
  validateSeshSession,
  validateSeshTempoMap,
  validateSeshTrack,
} from "./validation";

const timestamp = "2026-09-21T20:00:00.000Z";

test("accepts a valid minimal creator profile", () => {
  const creator = validateSeshCreatorProfile({
    id: "sesh-creator:river",
    displayName: "River",
    createdAt: timestamp,
  });

  assert.equal(creator.displayName, "River");
});

test("rejects an empty creator display name", () => {
  assert.throws(
    () =>
      validateSeshCreatorProfile({
        id: "sesh-creator:river",
        displayName: "   ",
        createdAt: timestamp,
      }),
    /displayName/,
  );
});

test("accepts a valid minimal music project", () => {
  const project = validateSeshMusicProject({
    id: "sesh-project:first-song",
    ownerCreatorId: "sesh-creator:river",
    title: "First Song",
    createdAt: timestamp,
    updatedAt: timestamp,
    trackIds: [],
    sessionIds: [],
    audioAssetIds: [],
  });

  assert.equal(project.title, "First Song");
});

test("rejects project updates before project creation", () => {
  assert.throws(
    () =>
      validateSeshMusicProject({
        id: "sesh-project:first-song",
        ownerCreatorId: "sesh-creator:river",
        title: "First Song",
        createdAt: "2026-09-21T20:00:00.000Z",
        updatedAt: "2026-09-21T19:59:59.000Z",
        trackIds: [],
        sessionIds: [],
        audioAssetIds: [],
      }),
    /must not precede/,
  );
});

test("rejects duplicate project references", () => {
  assert.throws(
    () =>
      validateSeshMusicProject({
        id: "sesh-project:first-song",
        ownerCreatorId: "sesh-creator:river",
        title: "First Song",
        createdAt: timestamp,
        updatedAt: timestamp,
        trackIds: ["sesh-track:one", "sesh-track:one"],
        sessionIds: [],
        audioAssetIds: [],
      }),
    /duplicates/,
  );
});

test("accepts every canonical audio asset kind", () => {
  const kinds = [
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

  for (const kind of kinds) {
    const asset = validateSeshAudioAsset({
      id: `sesh-audio:${kind}`,
      projectId: "sesh-project:first-song",
      kind,
      name: kind,
      createdAt: timestamp,
    });

    assert.equal(asset.kind, kind);
  }
});

test("rejects invalid audio metadata ranges", () => {
  assert.throws(
    () =>
      validateSeshAudioAsset({
        id: "sesh-audio:bad",
        projectId: "sesh-project:first-song",
        kind: "recording",
        name: "Bad",
        createdAt: timestamp,
        durationSeconds: -1,
      }),
    /durationSeconds/,
  );

  assert.throws(
    () =>
      validateSeshAudioAsset({
        id: "sesh-audio:bad-rate",
        projectId: "sesh-project:first-song",
        kind: "recording",
        name: "Bad Rate",
        createdAt: timestamp,
        sampleRateHz: 0,
      }),
    /sampleRateHz/,
  );

  assert.throws(
    () =>
      validateSeshAudioAsset({
        id: "sesh-audio:bad-channels",
        projectId: "sesh-project:first-song",
        kind: "recording",
        name: "Bad Channels",
        createdAt: timestamp,
        channelCount: 0,
      }),
    /channelCount/,
  );
});

test("rejects session end before session start", () => {
  assert.throws(
    () =>
      validateSeshSession({
        id: "sesh-session:one",
        projectId: "sesh-project:first-song",
        startedAt: "2026-09-21T20:00:00.000Z",
        endedAt: "2026-09-21T19:00:00.000Z",
      }),
    /must not precede/,
  );
});

test("rejects negative track order", () => {
  assert.throws(
    () =>
      validateSeshTrack({
        id: "sesh-track:one",
        projectId: "sesh-project:first-song",
        name: "Track",
        order: -1,
        audioAssetIds: [],
      }),
    /non-negative integer/,
  );
});

test("accepts a valid tempo map", () => {
  const tempoMap = validateSeshTempoMap({
    id: "sesh-tempo-map:main",
    projectId: "sesh-project:first-song",
    points: [
      { beat: 0, bpm: 120 },
      { beat: 32, bpm: 124 },
    ],
  });

  assert.equal(tempoMap.points.length, 2);
});

test("rejects an empty tempo map", () => {
  assert.throws(
    () =>
      validateSeshTempoMap({
        id: "sesh-tempo-map:main",
        projectId: "sesh-project:first-song",
        points: [],
      }),
    /at least one/,
  );
});

test("rejects unordered or duplicate tempo points", () => {
  assert.throws(
    () =>
      validateSeshTempoMap({
        id: "sesh-tempo-map:main",
        projectId: "sesh-project:first-song",
        points: [
          { beat: 8, bpm: 120 },
          { beat: 8, bpm: 121 },
        ],
      }),
    /strictly ordered/,
  );

  assert.throws(
    () =>
      validateSeshTempoMap({
        id: "sesh-tempo-map:main",
        projectId: "sesh-project:first-song",
        points: [
          { beat: 8, bpm: 120 },
          { beat: 4, bpm: 121 },
        ],
      }),
    /strictly ordered/,
  );
});

test("accepts valid beat grids and rejects invalid meter values", () => {
  const grid = validateSeshBeatGrid({
    id: "sesh-beat-grid:main",
    projectId: "sesh-project:first-song",
    beatsPerBar: 4,
    beatUnit: 4,
    subdivisionsPerBeat: 4,
  });

  assert.equal(grid.beatsPerBar, 4);

  assert.throws(
    () =>
      validateSeshBeatGrid({
        id: "sesh-beat-grid:bad",
        projectId: "sesh-project:first-song",
        beatsPerBar: 0,
        beatUnit: 4,
        subdivisionsPerBeat: 4,
      }),
    /positive integer/,
  );
});

test("accepts every musical event kind and rejects negative beat positions", () => {
  const kinds = [
    "note",
    "trigger",
    "hit",
    "control-change",
    "transport",
    "automation",
    "gesture",
  ] as const;

  for (const kind of kinds) {
    const event = validateSeshMusicalEvent({
      id: `sesh-musical-event:${kind}`,
      projectId: "sesh-project:first-song",
      kind,
      beat: 0,
    });

    assert.equal(event.kind, kind);
  }

  assert.throws(
    () =>
      validateSeshMusicalEvent({
        id: "sesh-musical-event:bad",
        projectId: "sesh-project:first-song",
        kind: "note",
        beat: -1,
      }),
    /non-negative/,
  );
});

test("accepts every canonical input source", () => {
  const sources = [
    "computer-keyboard",
    "pointer",
    "touch",
    "game-controller",
    "midi",
    "sesh-device",
  ] as const;

  for (const source of sources) {
    const input = validateSeshInputEvent({
      id: `sesh-input-event:${source}`,
      source,
      occurredAt: timestamp,
      kind: "press",
    });

    assert.equal(input.source, source);
  }
});

test("rejects unsupported input sources", () => {
  assert.throws(
    () =>
      validateSeshInputEvent({
        id: "sesh-input-event:unsupported",
        source: "unknown-controller",
        occurredAt: timestamp,
        kind: "press",
      }),
    /must be one of/,
  );
});

test("accepts synchronized multi-channel cues", () => {
  const cue = validateSeshCue({
    id: "sesh-cue:downbeat",
    projectId: "sesh-project:first-song",
    beat: 0,
    channels: ["visual", "haptic", "audio"],
    kind: "downbeat",
    intensity: 1,
  });

  assert.deepEqual(
    cue.channels,
    ["visual", "haptic", "audio"],
  );
});

test("rejects cues without channels", () => {
  assert.throws(
    () =>
      validateSeshCue({
        id: "sesh-cue:none",
        projectId: "sesh-project:first-song",
        beat: 0,
        channels: [],
        kind: "downbeat",
      }),
    /at least one/,
  );
});

test("rejects unsupported cue channels", () => {
  assert.throws(
    () =>
      validateSeshCue({
        id: "sesh-cue:bad",
        projectId: "sesh-project:first-song",
        beat: 0,
        channels: ["telepathy"],
        kind: "downbeat",
      }),
    /must be one of/,
  );
});

test("rejects NaN and Infinity in canonical musical values", () => {
  assert.throws(
    () =>
      validateSeshTempoMap({
        id: "sesh-tempo-map:nan",
        projectId: "sesh-project:first-song",
        points: [{ beat: 0, bpm: Number.NaN }],
      }),
    /finite number/,
  );

  assert.throws(
    () =>
      validateSeshCue({
        id: "sesh-cue:infinity",
        projectId: "sesh-project:first-song",
        beat: Number.POSITIVE_INFINITY,
        channels: ["visual"],
        kind: "pulse",
      }),
    /finite number/,
  );
});
