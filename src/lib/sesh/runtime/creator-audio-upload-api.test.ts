import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createCreatorAudioUploadAtRuntime,
} from "./creator-audio-upload-api";

test(
  "private audio upload runtime fails closed without an identity database binding",
  () => {
    assert.throws(
      () =>
        createCreatorAudioUploadAtRuntime(
          {} as AstroSessionLike,
          {
            SESH_DB:
              {},

            SESH_AUDIO:
              {},
          },
        ),
      /RIVER_IDENTITY_DB/,
    );
  },
);

test(
  "private audio upload runtime rejects missing session support",
  () => {
    assert.throws(
      () =>
        createCreatorAudioUploadAtRuntime(
          null as unknown as AstroSessionLike,
          {} as never,
        ),
      /Astro session support/,
    );
  },
);