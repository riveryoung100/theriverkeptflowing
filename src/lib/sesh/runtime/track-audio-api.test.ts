import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuthorizedSeshTrackAudioOperationsAtRuntime,
} from "./track-audio-api";

const fakeDatabase = {
  prepare() {
    return {};
  },
};

const fakeSession = {
  get() {
    return undefined;
  },

  set() {
    return undefined;
  },

  delete() {
    return undefined;
  },

  regenerate() {
    return undefined;
  },

  destroy() {
    return undefined;
  },
};

test(
  "track audio runtime composes owner-authorized operations from identity and Sesh D1 only",
  () => {
    const operations =
      createAuthorizedSeshTrackAudioOperationsAtRuntime(
        fakeSession,
        {
          RIVER_IDENTITY_DB:
            fakeDatabase,

          SESH_DB:
            fakeDatabase,
        },
      );

    assert.equal(
      typeof operations.attachAudioAsset,
      "function",
    );

    assert.equal(
      typeof operations.detachAudioAsset,
      "function",
    );
  },
);

test(
  "track audio runtime requires no SESH_AUDIO binding",
  () => {
    assert.doesNotThrow(
      () =>
        createAuthorizedSeshTrackAudioOperationsAtRuntime(
          fakeSession,
          {
            RIVER_IDENTITY_DB:
              fakeDatabase,

            SESH_DB:
              fakeDatabase,
          },
        ),
    );
  },
);

test(
  "track audio runtime fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshTrackAudioOperationsAtRuntime(
          fakeSession,
          {
            SESH_DB:
              fakeDatabase,
          },
        ),
      /RIVER_IDENTITY_DB/,
    );
  },
);

test(
  "track audio runtime fails closed without Sesh D1",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshTrackAudioOperationsAtRuntime(
          fakeSession,
          {
            RIVER_IDENTITY_DB:
              fakeDatabase,
          },
        ),
      /SESH_DB/,
    );
  },
);