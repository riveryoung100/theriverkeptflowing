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
  "Studio exposes private WAV upload tied to one creator project",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /id="studio-audio-form"/s,
    );

    assert.match(
      value,
      /id="studio-audio-project"/s,
    );

    assert.match(
      value,
      /type="file"/s,
    );

    assert.match(
      value,
      /accept="\.wav,audio\/wav"/s,
    );

    assert.match(
      value,
      /Maximum file size:\s*25 MiB/s,
    );
  },
);

test(
  "Studio sends raw WAV bytes only through the private project audio API",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /`\/api\/sesh\/projects\/\$\{encodeURIComponent\(\s*projectId,\s*\)\}\/audio\/`/s,
    );

    assert.match(
      value,
      /method:\s*"POST"/s,
    );

    assert.match(
      value,
      /"content-type":\s*"audio\/wav"/s,
    );

    assert.match(
      value,
      /"x-sesh-audio-name":\s*name/s,
    );

    assert.match(
      value,
      /body:\s*file/s,
    );

    assert.match(
      value,
      /file\.size\s*>\s*26214400/s,
    );

    assert.doesNotMatch(
      value,
      /FileReader\(/s,
    );
  },
);

test(
  "Studio refreshes sanitized private audio metadata",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const loadProjectAudio\s*=\s*async/s,
    );

    assert.match(
      value,
      /audioProject\.addEventListener\(\s*"change"/s,
    );

    assert.match(
      value,
      /await loadProjectAudio\(\s*projectId,\s*\)/s,
    );

    assert.match(
      value,
      /renderAudioAssets\(/s,
    );

    assert.match(
      value,
      /asset\.name/s,
    );

    assert.match(
      value,
      /asset\.contentType/s,
    );
  },
);

test(
  "Studio renders project title rather than project id in its audio selector",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /option\.value\s*=\s*project\.id/s,
    );

    assert.match(
      value,
      /option\.textContent\s*=\s*project\.title/s,
    );

    assert.doesNotMatch(
      value,
      /option\.textContent\s*=\s*project\.id/s,
    );
  },
);

test(
  "Studio audio UI adds no private persistence playback or identity authority",
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
        "publishingRights:",
        "managementRights:",
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
      /<audio[\s>]/s,
    );
  },
);

test(
  "Studio explains that private upload grants no unrelated music rights",
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /Audio uploaded here stays private\./s,
    );

    assert.match(
      value,
      /publishing rights,/s,
    );

    assert.match(
      value,
      /master rights,/s,
    );

    assert.match(
      value,
      /management rights,/s,
    );

    assert.match(
      value,
      /royalties/s,
    );
  },
);