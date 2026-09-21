import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshCreatorId,
  createSeshMusicProjectId,
  createSeshSessionId,
  createSeshTrackId,
} from "./identifiers";
import type {
  SeshAudioAsset,
  SeshCreatorProfile,
  SeshMusicProject,
  SeshSession,
  SeshTrack,
} from "./model";

test("canonical Sesh records serialize to JSON-compatible data", () => {
  const creator: SeshCreatorProfile = {
    id: createSeshCreatorId("river"),
    displayName: "River",
    createdAt: "2026-09-21T20:00:00.000Z",
  };

  const projectId = createSeshMusicProjectId("first-song");
  const trackId = createSeshTrackId("track-1");
  const sessionId = createSeshSessionId("session-1");
  const audioId = createSeshAudioAssetId("audio-1");

  const project: SeshMusicProject = {
    id: projectId,
    ownerCreatorId: creator.id,
    title: "First Song",
    createdAt: "2026-09-21T20:00:00.000Z",
    updatedAt: "2026-09-21T20:00:00.000Z",
    trackIds: [trackId],
    sessionIds: [sessionId],
    audioAssetIds: [audioId],
  };

  const audio: SeshAudioAsset = {
    id: audioId,
    projectId,
    kind: "recording",
    name: "Take 1",
    createdAt: "2026-09-21T20:00:00.000Z",
    durationSeconds: 12.5,
    sampleRateHz: 48000,
    channelCount: 2,
    storageReference: {
      provider: "example-object-store",
      key: "projects/first-song/take-1.wav",
    },
  };

  const session: SeshSession = {
    id: sessionId,
    projectId,
    startedAt: "2026-09-21T20:00:00.000Z",
  };

  const track: SeshTrack = {
    id: trackId,
    projectId,
    name: "Vocal",
    order: 0,
    audioAssetIds: [audioId],
  };

  const serialized = JSON.stringify({
    creator,
    project,
    audio,
    session,
    track,
  });

  const parsed = JSON.parse(serialized);

  assert.equal(parsed.creator.displayName, "River");
  assert.equal(parsed.project.title, "First Song");
  assert.equal(parsed.audio.kind, "recording");
  assert.equal(parsed.track.order, 0);
});
