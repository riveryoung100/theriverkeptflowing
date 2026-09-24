import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshMusicProjectId,
  createSeshTrackId,
} from "../identifiers";

import type {
  SeshTrack,
} from "../model";

import {
  InMemorySeshTrackRepository,
} from "./track-repository";

function track(
  overrides:
    Partial<SeshTrack> =
      {},
): SeshTrack {
  const projectId =
    overrides.projectId ??
    createSeshMusicProjectId(
      "track-project",
    );

  return {
    id:
      overrides.id ??
      createSeshTrackId(
        "track-one",
      ),

    projectId,

    name:
      overrides.name ??
      "Vocal",

    order:
      overrides.order ??
      0,

    audioAssetIds:
      overrides.audioAssetIds ??
      [
        createSeshAudioAssetId(
          "take-one",
        ),
      ],

    muted:
      overrides.muted,

    solo:
      overrides.solo,

    gain:
      overrides.gain,
  };
}

test(
  "track repository creates revision zero and returns independent copies",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const original =
      track();

    const saved =
      await repository.saveTrack(
        original,
      );

    assert.equal(
      saved.ok,
      true,
    );

    const snapshot =
      await repository.getTrackSnapshot(
        original.id,
      );

    assert.equal(
      snapshot.ok,
      true,
    );

    if (
      !snapshot.ok
    ) {
      return;
    }

    assert.equal(
      snapshot.value.revision,
      0,
    );

    assert.deepEqual(
      snapshot.value.track,
      original,
    );

    assert.notEqual(
      snapshot.value.track,
      original,
    );

    assert.notEqual(
      snapshot.value.track.audioAssetIds,
      original.audioAssetIds,
    );
  },
);

test(
  "track save is create-only",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const original =
      track();

    assert.equal(
      (
        await repository.saveTrack(
          original,
        )
      ).ok,
      true,
    );

    const duplicate =
      await repository.saveTrack(
        original,
      );

    assert.equal(
      duplicate.ok,
      false,
    );

    if (
      duplicate.ok
    ) {
      return;
    }

    assert.equal(
      duplicate.error.kind,
      "conflict",
    );
  },
);

test(
  "track collection is project-scoped and ordered by order then id",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const projectId =
      createSeshMusicProjectId(
        "ordered-project",
      );

    const otherProjectId =
      createSeshMusicProjectId(
        "other-project",
      );

    const second =
      track({
        id:
          createSeshTrackId(
            "track-b",
          ),

        projectId,

        name:
          "Second",

        order:
          1,

        audioAssetIds:
          [],
      });

    const first =
      track({
        id:
          createSeshTrackId(
            "track-a",
          ),

        projectId,

        name:
          "First",

        order:
          0,

        audioAssetIds:
          [],
      });

    const other =
      track({
        id:
          createSeshTrackId(
            "track-other",
          ),

        projectId:
          otherProjectId,

        name:
          "Other",

        order:
          0,

        audioAssetIds:
          [],
      });

    await repository.saveTrack(
      second,
    );

    await repository.saveTrack(
      first,
    );

    await repository.saveTrack(
      other,
    );

    const result =
      await repository.listTracksForProject(
        projectId,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      return;
    }

    assert.deepEqual(
      result.value.map(
        (
          item,
        ) =>
          item.id,
      ),
      [
        first.id,
        second.id,
      ],
    );
  },
);

test(
  "conditional update increments revision and permits canonical mutable fields",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const original =
      track();

    await repository.saveTrack(
      original,
    );

    const updated =
      await repository.updateTrackConditionally(
        {
          ...original,

          name:
            "Lead Vocal",

          order:
            2,

          audioAssetIds:
            [
              ...original.audioAssetIds,

              createSeshAudioAssetId(
                "take-two",
              ),
            ],

          muted:
            true,

          solo:
            false,

          gain:
            0.75,
        },
        0,
      );

    assert.equal(
      updated.ok,
      true,
    );

    if (
      !updated.ok
    ) {
      return;
    }

    assert.equal(
      updated.value.revision,
      1,
    );

    assert.equal(
      updated.value.track.name,
      "Lead Vocal",
    );

    assert.equal(
      updated.value.track.order,
      2,
    );

    assert.equal(
      updated.value.track.muted,
      true,
    );

    assert.equal(
      updated.value.track.solo,
      false,
    );

    assert.equal(
      updated.value.track.gain,
      0.75,
    );

    assert.equal(
      updated.value.track.audioAssetIds.length,
      2,
    );
  },
);

test(
  "conditional update rejects stale revision",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const original =
      track();

    await repository.saveTrack(
      original,
    );

    const first =
      await repository.updateTrackConditionally(
        {
          ...original,

          name:
            "Updated",
        },
        0,
      );

    assert.equal(
      first.ok,
      true,
    );

    const stale =
      await repository.updateTrackConditionally(
        {
          ...original,

          name:
            "Stale",
        },
        0,
      );

    assert.equal(
      stale.ok,
      false,
    );

    if (
      stale.ok
    ) {
      return;
    }

    assert.equal(
      stale.error.kind,
      "conflict",
    );
  },
);

test(
  "conditional update cannot reassign projectId",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const original =
      track();

    await repository.saveTrack(
      original,
    );

    const moved =
      await repository.updateTrackConditionally(
        {
          ...original,

          projectId:
            createSeshMusicProjectId(
              "different-project",
            ),
        },
        0,
      );

    assert.equal(
      moved.ok,
      false,
    );

    if (
      moved.ok
    ) {
      return;
    }

    assert.equal(
      moved.error.kind,
      "conflict",
    );
  },
);

test(
  "track deletion clears record and revision metadata",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const original =
      track();

    await repository.saveTrack(
      original,
    );

    const deleted =
      await repository.deleteTrack(
        original.id,
      );

    assert.deepEqual(
      deleted,
      {
        ok:
          true,

        value:
          true,
      },
    );

    const read =
      await repository.getTrackSnapshot(
        original.id,
      );

    assert.equal(
      read.ok,
      false,
    );

    if (
      read.ok
    ) {
      return;
    }

    assert.equal(
      read.error.kind,
      "not-found",
    );
  },
);

test(
  "invalid canonical track input is rejected before storage",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const invalid =
      await repository.saveTrack({
        ...track(),

        order:
          -1,
      });

    assert.equal(
      invalid.ok,
      false,
    );

    if (
      invalid.ok
    ) {
      return;
    }

    assert.equal(
      invalid.error.kind,
      "validation",
    );
  },
);