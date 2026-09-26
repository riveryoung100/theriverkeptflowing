import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";

const studioPagePath =
  new URL(
    "../../../pages/sesh/studio/index.astro",
    import.meta.url,
  );

async function source():
Promise<string> {
  return readFile(
    studioPagePath,
    "utf8",
  );
}

test(
  "Studio renders explicit Move up and Move down track controls",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /moveUpButton\.textContent\s*=\s*"Move up"/s,
    );

    assert.match(
      value,
      /moveDownButton\.textContent\s*=\s*"Move down"/s,
    );

    assert.match(
      value,
      /moveUpButton\.disabled\s*=\s*trackIndex\s*<=\s*0/s,
    );

    assert.match(
      value,
      /moveDownButton\.disabled[\s\S]*sanitizedTracks\.length\s*-\s*1/s,
    );
  },
);

test(
  "Studio sends one complete orderedTrackIds array to the dedicated reorder endpoint",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const reorderProjectTracks\s*=/s,
    );

    assert.match(
      value,
      /\/tracks\/reorder`/s,
    );

    assert.match(
      value,
      /method:\s*"POST"/s,
    );

    assert.match(
      value,
      /const orderedTrackIds\s*=\s*sanitizedTracks\.map/s,
    );

    assert.match(
      value,
      /JSON\.stringify\(\{\s*orderedTrackIds,\s*\}\)/s,
    );
  },
);

test(
  "Studio reloads canonical tracks after reorder rather than treating local order as canonical",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /await reorderProjectTracks\(\s*projectId,\s*orderedTrackIds,\s*\)[\s\S]*await loadProjectTracks\(\s*projectId,\s*\)/s,
    );

    assert.doesNotMatch(
      value,
      /track\.order\s*=(?!=)/s,
    );
  },
);

test(
  "Studio reorder request carries no revision numeric-order or identity authority",
  async () => {
    const value =
      await source();

    const start =
      value.indexOf(
        "const reorderProjectTracks =",
      );

    const end =
      value.indexOf(
        "const renderTracks =",
        start,
      );

    assert.ok(
      start >=
        0,
    );

    assert.ok(
      end >
        start,
    );

    const helper =
      value.slice(
        start,
        end,
      );

    for (
      const forbidden of [
        "expectedRevision",
        "revision:",
        "order:",
        "ownerCreatorId",
        "principalId",
        "seshCreatorId",
        "SESH_DB",
        "RIVER_IDENTITY_DB",
        "SESH_AUDIO",
        "D1",
        "R2",
        "publishingRights",
        "managementRights",
        "masterRights",
        "royaltyShare",
        "ownershipTransfer",
      ]
    ) {
      assert.equal(
        helper.includes(
          forbidden,
        ),
        false,
        `forbidden reorder authority: ${forbidden}`,
      );
    }
  },
);

test(
  "Studio reorder preserves existing track rename delete mix and audio controls",
  async () => {
    const value =
      await source();

    for (
      const required of [
        "renameProjectTrack",
        "deleteProjectTrack",
        "updateTrackMixField",
        "updateTrackAudioMembership",
        "audioAssetIds",
      ]
    ) {
      assert.equal(
        value.includes(
          required,
        ),
        true,
        `existing Studio track feature missing: ${required}`,
      );
    }
  },
);