import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshBeatGridId,
  createSeshCreatorId,
  createSeshCueId,
  createSeshInputEventId,
  createSeshMusicProjectId,
  createSeshMusicalEventId,
  createSeshSessionId,
  createSeshTempoMapId,
  createSeshTrackId,
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

test("creates and parses all canonical Sesh identifiers", () => {
  const cases = [
    [createSeshCreatorId, parseSeshCreatorId, "sesh-creator:river"],
    [createSeshMusicProjectId, parseSeshMusicProjectId, "sesh-project:first-song"],
    [createSeshAudioAssetId, parseSeshAudioAssetId, "sesh-audio:take-1"],
    [createSeshSessionId, parseSeshSessionId, "sesh-session:session-1"],
    [createSeshTrackId, parseSeshTrackId, "sesh-track:vocal"],
    [createSeshTempoMapId, parseSeshTempoMapId, "sesh-tempo-map:main"],
    [createSeshBeatGridId, parseSeshBeatGridId, "sesh-beat-grid:main"],
    [createSeshMusicalEventId, parseSeshMusicalEventId, "sesh-musical-event:event-1"],
    [createSeshInputEventId, parseSeshInputEventId, "sesh-input-event:input-1"],
    [createSeshCueId, parseSeshCueId, "sesh-cue:cue-1"],
  ] as const;

  for (const [create, parse, expected] of cases) {
    const localId = expected.slice(expected.indexOf(":") + 1);
    const created = create(localId);

    assert.equal(created, expected);
    assert.equal(parse(created), expected);
  }
});

test("rejects empty identifier local values", () => {
  assert.throws(
    () => createSeshCreatorId(""),
    /non-empty/,
  );

  assert.throws(
    () => parseSeshTrackId("sesh-track:"),
    /non-empty/,
  );
});

test("rejects wrong identifier prefixes", () => {
  assert.throws(
    () => parseSeshCreatorId("sesh-project:river"),
    /must begin/,
  );

  assert.throws(
    () => parseSeshCueId("cue:one"),
    /must begin/,
  );
});

test("identifier creation is deterministic for caller-supplied values", () => {
  assert.equal(
    createSeshMusicProjectId("project-alpha"),
    createSeshMusicProjectId("project-alpha"),
  );
});
