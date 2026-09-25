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
  "Studio renders mute solo and finite-number gain controls for each track",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /className\s*=\s*"sesh-studio__track-mix"/s,
    );

    assert.match(
      value,
      /const muteButton\s*=/s,
    );

    assert.match(
      value,
      /const soloButton\s*=/s,
    );

    assert.match(
      value,
      /gainInput\.type\s*=\s*"number"/s,
    );

    assert.match(
      value,
      /gainInput\.step\s*=\s*"any"/s,
    );

    assert.doesNotMatch(
      value,
      /gainInput\.min\s*=/s,
    );

    assert.doesNotMatch(
      value,
      /gainInput\.max\s*=/s,
    );
  },
);

test(
  "Studio mix mutation uses the existing authenticated track PATCH with exactly one permitted field",
  async () => {
    const value =
      await source();

    const helperStart =
      value.indexOf(
        "const updateTrackMixField =",
      );

    const helperEnd =
      value.indexOf(
        "let trackAudioInventory =",
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
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/tracks\/\$\{encodeURIComponent\(\s*trackId,\s*\)\}`/s,
    );

    assert.match(
      helper,
      /method:\s*"PATCH"/s,
    );

    assert.match(
      helper,
      /body\s*=\s*\{\s*muted:\s*value,\s*\}/s,
    );

    assert.match(
      helper,
      /body\s*=\s*\{\s*solo:\s*value,\s*\}/s,
    );

    assert.match(
      helper,
      /body\s*=\s*\{\s*gain:\s*value,\s*\}/s,
    );

    assert.match(
      helper,
      /JSON\.stringify\(\s*body,\s*\)/s,
    );

    assert.doesNotMatch(
      helper,
      /expectedRevision/s,
    );

    assert.doesNotMatch(
      helper,
      /audioAssetIds/s,
    );

    assert.doesNotMatch(
      helper,
      /order\s*:/s,
    );
  },
);

test(
  "Studio mute solo and gain changes refresh canonical track state",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /await updateTrackMixField\(\s*projectId,\s*track\.id,\s*"muted",[\s\S]*?await loadProjectTracks\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /await updateTrackMixField\(\s*projectId,\s*track\.id,\s*"solo",[\s\S]*?await loadProjectTracks\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /await updateTrackMixField\(\s*projectId,\s*track\.id,\s*"gain",[\s\S]*?await loadProjectTracks\(\s*projectId,\s*\)/s,
    );
  },
);

test(
  "Studio validates gain only against the canonical finite-number contract",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /Number\.isFinite\(\s*gain,\s*\)/s,
    );

    assert.match(
      value,
      /"Gain must be a finite number\."/s,
    );

    assert.doesNotMatch(
      value,
      /gain\s*<\s*/s,
    );

    assert.doesNotMatch(
      value,
      /gain\s*>\s*/s,
    );
  },
);

test(
  "Studio mix controls do not gain reorder audio persistence identity public-media or rights authority",
  async () => {
    const value =
      await source();

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
        "audioAssetIds:",
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