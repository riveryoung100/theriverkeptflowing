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
  "Studio renders canonical private-audio controls inside each track",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /className\s*=\s*"sesh-studio__track-audio"/s,
    );

    assert.match(
      value,
      /track\.audioAssetIds/s,
    );

    assert.match(
      value,
      /"No private audio is attached to this track\."/s,
    );

    assert.match(
      value,
      /detachButton\.textContent\s*=\s*"Detach"/s,
    );

    assert.match(
      value,
      /attachButton\.textContent\s*=\s*"Attach"/s,
    );
  },
);

test(
  "Studio attachment choices come from the authenticated project private-audio inventory",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const loadTrackAudioInventory\s*=\s*async/s,
    );

    assert.match(
      value,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/audio`/s,
    );

    assert.match(
      value,
      /return audioAssetsFrom\(\s*body,\s*\)/s,
    );

    assert.match(
      value,
      /!attachedIds\.includes\(\s*asset\.id,\s*\)/s,
    );

    assert.match(
      value,
      /freshInventory\.some/s,
    );
  },
);

test(
  "Studio uses only the dedicated route identifiers for attach and detach",
  async () => {
    const value =
      await source();

    const helperStart =
      value.indexOf(
        "const updateTrackAudioMembership =",
      );

    const helperEnd =
      value.indexOf(
        "const reorderProjectTracks =",
        helperStart,
      );

    assert.ok(
      helperStart >=
        0,
    );

    assert.ok(
      helperEnd >
        helperStart,
    );

    const helper =
      value.slice(
        helperStart,
        helperEnd,
      );

    assert.match(
      helper,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/tracks\/\$\{encodeURIComponent\(\s*trackId,\s*\)\}\/audio\/\$\{encodeURIComponent\(\s*audioAssetId,\s*\)\}`/s,
    );

    assert.match(
      helper,
      /method !==\s*"PUT"/s,
    );

    assert.match(
      helper,
      /method !==\s*"DELETE"/s,
    );

    assert.doesNotMatch(
      helper,
      /body\s*:/s,
    );

    assert.doesNotMatch(
      helper,
      /expectedRevision/s,
    );
  },
);

test(
  "Studio refreshes canonical track state after track-audio mutation",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /await updateTrackAudioMembership\(\s*projectId,\s*track\.id,\s*attachedId,\s*"DELETE",\s*\)[\s\S]*?await loadProjectTracks\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /await updateTrackAudioMembership\(\s*projectId,\s*track\.id,\s*audioAssetId,\s*"PUT",\s*\)[\s\S]*?await loadProjectTracks\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /"Private audio attached to track\."/s,
    );

    assert.match(
      value,
      /"Private audio detached from track\."/s,
    );
  },
);

test(
  "Studio track-audio UI does not gain revision persistence storage public-media or rights authority",
  async () => {
    const value =
      await source();

    assert.doesNotMatch(
      value,
      /audioAssetIds\s*:/s,
    );

    for (
      const forbidden of [
        "expectedRevision:",
        "ownerCreatorId:",
        "principalId:",
        "seshCreatorId:",
        "storageReference:",
        "r2Key:",
        "SESH_AUDIO",
        "SESH_DB",
        "RIVER_IDENTITY_DB",
        "publishingRights:",
        "managementRights:",
        "masterRights:",
        "royaltyShare:",
        "ownershipTransfer:",
      ]
    ) {
      assert.equal(
        value.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);