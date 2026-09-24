import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshMusicProjectId,
} from "../../identifiers";

import {
  createPrivateSeshAudioStorageReference,
} from "./private-audio-storage-reference";

test(
  "creates one canonical private R2 key from server resource identifiers",
  () => {
    const reference =
      createPrivateSeshAudioStorageReference(
        createSeshMusicProjectId(
          "alpha",
        ),
        createSeshAudioAssetId(
          "take-one",
        ),
      );

    assert.deepEqual(
      reference,
      {
        provider:
          "r2",

        key:
          "sesh/projects/alpha/audio/take-one/source.wav",
      },
    );
  },
);

test(
  "encodes local identifier material rather than creating path authority",
  () => {
    const reference =
      createPrivateSeshAudioStorageReference(
        createSeshMusicProjectId(
          "project/with spaces",
        ),
        createSeshAudioAssetId(
          "take/with spaces",
        ),
      );

    assert.equal(
      reference.key,
      "sesh/projects/project%2Fwith%20spaces/audio/take%2Fwith%20spaces/source.wav",
    );

    assert.equal(
      reference.bucket,
      undefined,
    );

    assert.equal(
      reference.versionId,
      undefined,
    );
  },
);
