import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetEnvelope,
  createSeshCreatorProfileEnvelope,
  createSeshMusicProjectEnvelope,
  deserializeSeshPersistenceEnvelope,
  serializeSeshPersistenceEnvelope,
  createSeshTrackEnvelope,
} from "./serialization";

const storedAt = "2026-09-21T20:30:00.000Z";
const createdAt = "2026-09-21T20:00:00.000Z";

test("round-trips a canonical creator profile", () => {
  const envelope =
    createSeshCreatorProfileEnvelope(
      {
        id:
          "sesh-creator:river",

        displayName:
          "River",

        createdAt,

        handle:
          "river",

        bio:
          "Making music.",
      },
      storedAt,
      0,
    );

  const restored =
    deserializeSeshPersistenceEnvelope(
      serializeSeshPersistenceEnvelope(
        envelope,
      ),
    );

  assert.equal(
    restored.recordType,
    "creator-profile",
  );

  assert.equal(
    restored.recordId,
    "sesh-creator:river",
  );

  assert.equal(
    restored.payload.id,
    "sesh-creator:river",
  );

  assert.equal(
    restored.revision,
    0,
  );

  if (
    restored.recordType !==
    "creator-profile"
  ) {
    throw new Error(
      "Unexpected restored record type.",
    );
  }

  assert.equal(
    restored.payload.displayName,
    "River",
  );

  assert.equal(
    restored.payload.handle,
    "river",
  );

  assert.equal(
    restored.payload.bio,
    "Making music.",
  );
});
test("round-trips a canonical music project", () => {
  const envelope = createSeshMusicProjectEnvelope(
    {
      id: "sesh-project:one",
      ownerCreatorId: "sesh-creator:river",
      title: "Project One",
      createdAt,
      updatedAt: createdAt,
      trackIds: [],
      sessionIds: [],
      audioAssetIds: [],
    },
    storedAt,
    1,
  );

  const serialized =
    serializeSeshPersistenceEnvelope(envelope);

  const restored =
    deserializeSeshPersistenceEnvelope(serialized);

  assert.equal(restored.recordType, "music-project");
  assert.equal(restored.recordId, "sesh-project:one");
  assert.equal(restored.payload.id, "sesh-project:one");
  assert.equal(restored.revision, 1);
});

test("round-trips a canonical audio asset", () => {
  const envelope = createSeshAudioAssetEnvelope(
    {
      id: "sesh-audio:one",
      projectId: "sesh-project:one",
      kind: "recording",
      name: "Take One",
      createdAt,
      durationSeconds: 4.5,
      storageReference: {
        provider: "memory",
        key: "one.wav",
      },
    },
    storedAt,
  );

  const restored = deserializeSeshPersistenceEnvelope(
    serializeSeshPersistenceEnvelope(envelope),
  );

  assert.equal(restored.recordType, "audio-asset");
  assert.equal(restored.recordId, "sesh-audio:one");
  assert.equal(restored.payload.id, "sesh-audio:one");
});

test("rejects malformed canonical payloads during deserialization", () => {
  assert.throws(
    () =>
      deserializeSeshPersistenceEnvelope(
        JSON.stringify({
          schemaVersion: 1,
          recordType: "music-project",
          recordId: "sesh-project:bad",
          storedAt,
          payload: {
            id: "sesh-project:bad",
            ownerCreatorId: "wrong:creator",
            title: "Bad",
            createdAt,
            updatedAt: createdAt,
            trackIds: [],
            sessionIds: [],
            audioAssetIds: [],
          },
        }),
      ),
    /SeshCreatorId/,
  );
});

test("rejects unsupported persistence schema versions", () => {
  assert.throws(
    () =>
      deserializeSeshPersistenceEnvelope(
        JSON.stringify({
          schemaVersion: 2,
          recordType: "music-project",
          recordId: "sesh-project:one",
          storedAt,
          payload: {},
        }),
      ),
    /Unsupported Sesh persistence schema version/,
  );
});

test("rejects mismatched record and payload identifiers", () => {
  assert.throws(
    () =>
      deserializeSeshPersistenceEnvelope(
        JSON.stringify({
          schemaVersion: 1,
          recordType: "audio-asset",
          recordId: "sesh-audio:different",
          storedAt,
          payload: {
            id: "sesh-audio:one",
            projectId: "sesh-project:one",
            kind: "recording",
            name: "Take One",
            createdAt,
          },
        }),
      ),
    /must match payload.id/,
  );
});

test("preserves canonical identifiers exactly", () => {
  const envelope = createSeshMusicProjectEnvelope(
    {
      id: "sesh-project:Exact-Project_01",
      ownerCreatorId: "sesh-creator:River-01",
      title: "Exact",
      createdAt,
      updatedAt: createdAt,
      trackIds: ["sesh-track:Track-A"],
      sessionIds: [],
      audioAssetIds: [],
    },
    storedAt,
  );

  const restored = deserializeSeshPersistenceEnvelope(
    serializeSeshPersistenceEnvelope(envelope),
  );

  assert.equal(
    restored.recordId,
    "sesh-project:Exact-Project_01",
  );

  if (restored.recordType !== "music-project") {
    throw new Error("Unexpected restored record type.");
  }

  assert.equal(
    restored.payload.ownerCreatorId,
    "sesh-creator:River-01",
  );
  assert.deepEqual(
    restored.payload.trackIds,
    ["sesh-track:Track-A"],
  );
});

test(
  "round-trips a canonical track",
  () => {
    const envelope =
      createSeshTrackEnvelope(
        {
          id:
            "sesh-track:serialization-track",

          projectId:
            "sesh-project:serialization-project",

          name:
            "Vocal",

          order:
            0,

          audioAssetIds: [
            "sesh-audio:serialization-take",
          ],

          muted:
            false,

          solo:
            true,

          gain:
            0.75,
        },
        "2026-09-24T22:00:00.000Z",
        3,
      );

    const restored =
      deserializeSeshPersistenceEnvelope(
        serializeSeshPersistenceEnvelope(
          envelope,
        ),
      );

    assert.equal(
      restored.recordType,
      "track",
    );

    assert.equal(
      restored.revision,
      3,
    );

    if (
      restored.recordType !==
      "track"
    ) {
      return;
    }

    assert.equal(
      restored.payload.id,
      "sesh-track:serialization-track",
    );

    assert.equal(
      restored.payload.projectId,
      "sesh-project:serialization-project",
    );

    assert.equal(
      restored.payload.name,
      "Vocal",
    );

    assert.equal(
      restored.payload.order,
      0,
    );

    assert.deepEqual(
      restored.payload.audioAssetIds,
      [
        "sesh-audio:serialization-take",
      ],
    );
  },
);