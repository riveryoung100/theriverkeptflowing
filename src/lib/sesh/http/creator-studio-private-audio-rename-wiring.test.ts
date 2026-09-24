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
  "Studio renders an explicit private audio rename control from sanitized assets",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /className\s*=\s*"sesh-studio__audio-delete sesh-studio__audio-rename"/s,
    );

    assert.match(
      value,
      /renameButton\.textContent\s*=\s*"Rename"/s,
    );

    assert.match(
      value,
      /window\.prompt\(\s*"Rename private audio"/s,
    );

    assert.match(
      value,
      /typeof asset\.name/s,
    );
  },
);

test(
  "Studio rename uses only the owner-authorized private audio item PATCH",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const renameProjectAudio\s*=/s,
    );

    assert.match(
      value,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/audio\/\$\{encodeURIComponent\(\s*audioAssetId,\s*\)\}`/s,
    );

    assert.match(
      value,
      /method:\s*"PATCH"/s,
    );

    assert.match(
      value,
      /"content-type":\s*"application\/json"/s,
    );

    assert.match(
      value,
      /JSON\.stringify\(\{\s*name,\s*\}\)/s,
    );

    assert.match(
      value,
      /await renameProjectAudio\(\s*projectId,\s*asset\.id,\s*name,\s*\)/s,
    );
  },
);

test(
  "Studio validates rename input and refreshes sanitized metadata after success",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /requestedName\.trim\(\)/s,
    );

    assert.match(
      value,
      /name\.length\s*===\s*0/s,
    );

    assert.match(
      value,
      /name\.length\s*>\s*120/s,
    );

    assert.match(
      value,
      /renameButton\.disabled\s*=\s*true/s,
    );

    assert.match(
      value,
      /deleteButton\.disabled\s*=\s*true/s,
    );

    assert.match(
      value,
      /Renaming private audio…/s,
    );

    assert.match(
      value,
      /await loadProjectAudio\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /Private audio renamed\./s,
    );
  },
);

test(
  "Studio rename preserves private playback and delete behavior",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /method:\s*"DELETE"/s,
    );

    assert.match(
      value,
      /document\.createElement\(\s*"audio",?\s*\)/s,
    );

    assert.match(
      value,
      /\/content`/s,
    );
  },
);

test(
  "Studio rename introduces no private storage identity public-media or rights authority",
  async () => {
    const value =
      await source();

    for (
      const forbidden of [
        "storageReference:",
        "expectedRevision:",
        "ownerCreatorId:",
        "principalId:",
        "seshCreatorId:",
        "r2Key:",
        "SESH_AUDIO",
        "SESH_DB",
        "RIVER_IDENTITY_DB",
        "signedUrl",
        "presigned",
        "publicUrl",
        "audioDownload",
        "shareAudio",
        "publishingRights:",
        "managementRights:",
        "masterRights:",
        "royaltyShare:",
      ]
    ) {
      assert.equal(
        value.includes(
          forbidden,
        ),
        false,
        `Studio unexpectedly contains ${forbidden}`,
      );
    }
  },
);