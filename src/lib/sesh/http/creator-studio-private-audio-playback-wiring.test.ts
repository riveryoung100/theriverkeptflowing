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
  "Studio renders owner-authorized private audio playback for sanitized assets",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /document\.createElement\(\s*"audio",?\s*\)/s,
    );

    assert.match(
      value,
      /player\.controls\s*=\s*true/s,
    );

    assert.match(
      value,
      /player\.preload\s*=\s*"metadata"/s,
    );

    assert.match(
      value,
      /className\s*=\s*"sesh-studio__audio-player"/s,
    );
  },
);

test(
  "Studio audio source uses only the authenticated private content endpoint",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /player\.src\s*=\s*`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/audio\/\$\{encodeURIComponent\(\s*asset\.id,\s*\)\}\/content`/s,
    );

    assert.match(
      value,
      /typeof asset\.id ===\s*"string"/s,
    );

    assert.match(
      value,
      /renderAudioAssets\(\s*audioAssetsFrom\(\s*body,\s*\),\s*projectId,\s*\)/s,
    );
  },
);

test(
  "Studio playback creates no direct private storage or public-media authority",
  async () => {
    const value =
      await source();

    for (
      const forbidden of [
        "storageReference:",
        "r2Key:",
        "bucket:",
        "signedUrl",
        "presigned",
        "publicUrl",
        "SESH_AUDIO",
        "SESH_DB",
        "RIVER_IDENTITY_DB",
      ]
    ) {
      assert.equal(
        value.includes(
          forbidden,
        ),
        false,
      );
    }

    assert.doesNotMatch(
      value,
      /URL\.createObjectURL/s,
    );

    assert.doesNotMatch(
      value,
      /new Blob\(/s,
    );
  },
);

test(
  "Studio playback does not introduce download sharing or rights controls",
  async () => {
    const value =
      await source();

    assert.doesNotMatch(
      value,
      /audioDownload/s,
    );


    assert.doesNotMatch(
      value,
      /shareAudio/s,
    );

    for (
      const forbidden of [
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

test(
  "Studio playback keeps the existing private metadata refresh path",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const loadProjectAudio\s*=\s*async/s,
    );

    assert.match(
      value,
      /\/audio\/`/s,
    );

    assert.match(
      value,
      /renderAudioAssets\(/s,
    );
  },
);