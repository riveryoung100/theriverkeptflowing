import assert from "node:assert/strict";
import test from "node:test";

import {
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
  id:
    string,

  order:
    number,
): SeshTrack {
  return {
    id:
      createSeshTrackId(
        id,
      ),

    projectId:
      createSeshMusicProjectId(
        "atomic-reorder-project",
      ),

    name:
      `Track ${id}`,

    order,

    audioAssetIds:
      [],

    muted:
      id ===
        "b",

    solo:
      id ===
        "c",

    gain:
      order +
        0.5,
  };
}

test(
  "in-memory atomic reorder updates every order and revision together",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const a =
      track(
        "a",
        0,
      );

    const b =
      track(
        "b",
        1,
      );

    const c =
      track(
        "c",
        2,
      );

    for (
      const value of
      [
        a,
        b,
        c,
      ]
    ) {
      const saved =
        await repository.saveTrack(
          value,
        );

      assert.equal(
        saved.ok,
        true,
      );
    }

    const result =
      await repository.reorderProjectTracksAtomically(
        a.projectId,
        [
          {
            id:
              c.id,
            expectedRevision:
              0,
            order:
              0,
          },
          {
            id:
              a.id,
            expectedRevision:
              0,
            order:
              1,
          },
          {
            id:
              b.id,
            expectedRevision:
              0,
            order:
              2,
          },
        ],
      );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      return;
    }

    assert.deepEqual(
      result.value.map(
        (
          value,
        ) => [
          value.id,
          value.order,
        ],
      ),
      [
        [
          c.id,
          0,
        ],
        [
          a.id,
          1,
        ],
        [
          b.id,
          2,
        ],
      ],
    );

    for (
      const value of
      result.value
    ) {
      const snapshot =
        await repository.getTrackSnapshot(
          value.id,
        );

      assert.equal(
        snapshot.ok,
        true,
      );

      if (
        snapshot.ok
      ) {
        assert.equal(
          snapshot.value.revision,
          1,
        );
      }
    }

    const reorderedB =
      result.value.find(
        (
          value,
        ) =>
          value.id ===
          b.id,
      );

    assert.ok(
      reorderedB,
    );

    assert.equal(
      reorderedB.name,
      b.name,
    );

    assert.deepEqual(
      reorderedB.audioAssetIds,
      b.audioAssetIds,
    );

    assert.equal(
      reorderedB.muted,
      b.muted,
    );

    assert.equal(
      reorderedB.solo,
      b.solo,
    );

    assert.equal(
      reorderedB.gain,
      b.gain,
    );
  },
);

test(
  "stale revision rejects entire in-memory reorder without partial mutation",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const a =
      track(
        "a",
        0,
      );

    const b =
      track(
        "b",
        1,
      );

    await repository.saveTrack(
      a,
    );

    await repository.saveTrack(
      b,
    );

    const result =
      await repository.reorderProjectTracksAtomically(
        a.projectId,
        [
          {
            id:
              b.id,
            expectedRevision:
              0,
            order:
              0,
          },
          {
            id:
              a.id,
            expectedRevision:
              999,
            order:
              1,
          },
        ],
      );

    assert.equal(
      result.ok,
      false,
    );

    const listed =
      await repository.listTracksForProject(
        a.projectId,
      );

    assert.equal(
      listed.ok,
      true,
    );

    if (
      listed.ok
    ) {
      assert.deepEqual(
        listed.value.map(
          (
            value,
          ) => [
            value.id,
            value.order,
          ],
        ),
        [
          [
            a.id,
            0,
          ],
          [
            b.id,
            1,
          ],
        ],
      );
    }
  },
);

test(
  "atomic reorder rejects duplicate ids noncontiguous order and foreign project before mutation",
  async () => {
    const repository =
      new InMemorySeshTrackRepository();

    const a =
      track(
        "a",
        0,
      );

    await repository.saveTrack(
      a,
    );

    const duplicate =
      await repository.reorderProjectTracksAtomically(
        a.projectId,
        [
          {
            id:
              a.id,
            expectedRevision:
              0,
            order:
              0,
          },
          {
            id:
              a.id,
            expectedRevision:
              0,
            order:
              1,
          },
        ],
      );

    assert.equal(
      duplicate.ok,
      false,
    );

    const noncontiguous =
      await repository.reorderProjectTracksAtomically(
        a.projectId,
        [
          {
            id:
              a.id,
            expectedRevision:
              0,
            order:
              7,
          },
        ],
      );

    assert.equal(
      noncontiguous.ok,
      false,
    );

    const foreign =
      await repository.reorderProjectTracksAtomically(
        createSeshMusicProjectId(
          "foreign-project",
        ),
        [
          {
            id:
              a.id,
            expectedRevision:
              0,
            order:
              0,
          },
        ],
      );

    assert.equal(
      foreign.ok,
      false,
    );
  },
);

test(
  "D1 source uses a single globally gated SQL update and no batch orchestration",
  async () => {
    const {
      readFile,
    } =
      await import(
        "node:fs/promises"
      );

    const source =
      await readFile(
        new URL(
          "./cloudflare/d1-track-repository.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /SESH_ATOMIC_TRACK_REORDER/,
    );

    assert.match(
      source,
      /WITH desired\(track_id, expected_revision, next_order\)/,
    );

    assert.match(
      source,
      /COALESCE\(current\.revision, 0\) = desired\.expected_revision/,
    );

    assert.match(
      source,
      /json_set\(/,
    );

    assert.match(
      source,
      /\$\.payload\.order/,
    );

    assert.match(
      source,
      /result\.meta\?\.changes !==/,
    );

    assert.equal(
      source.includes(
        ".batch(",
      ),
      false,
    );

    assert.equal(
      source.includes(
        "this.#database",
      ),
      false,
    );

    assert.match(
      source,
      /this\.database/,
    );
  },
);