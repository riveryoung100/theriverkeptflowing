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
  "Studio renders an explicit private audio delete control for sanitized assets",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /document\.createElement\(\s*"button",?\s*\)/s,
    );

    assert.match(
      value,
      /className\s*=\s*"sesh-studio__audio-delete"/s,
    );

    assert.match(
      value,
      /deleteButton\.textContent\s*=\s*"Delete"/s,
    );

    assert.match(
      value,
      /window\.confirm\(/s,
    );
  },
);

test(
  "Studio deletes only through the authenticated private audio item endpoint",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const deleteProjectAudio\s*=/s,
    );

    assert.match(
      value,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/audio\/\$\{encodeURIComponent\(\s*audioAssetId,\s*\)\}`/s,
    );

    assert.match(
      value,
      /method:\s*"DELETE"/s,
    );

    assert.match(
      value,
      /await deleteProjectAudio\(\s*projectId,\s*asset\.id,\s*\)/s,
    );
  },
);

test(
  "Studio disables delete during mutation and refreshes sanitized metadata after success",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /deleteButton\.disabled\s*=\s*true/s,
    );

    assert.match(
      value,
      /Deleting private audio…/s,
    );

    assert.match(
      value,
      /await loadProjectAudio\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /Private audio deleted\./s,
    );

    assert.match(
      value,
      /deleteButton\.disabled\s*=\s*false/s,
    );
  },
);

test(
  "Studio private audio deletion creates no direct storage public download sharing or rights authority",
  async () => {
    const value =
      await source();

    for (
      const forbidden of [
        "storageReference:",
        "r2Key:",
        "ownerCreatorId:",
        "principalId:",
        "seshCreatorId:",
        "expectedRevision:",
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
      );
    }
  },
);