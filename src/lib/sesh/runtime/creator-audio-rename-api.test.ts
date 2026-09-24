import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createCreatorAudioRenameAtRuntime,
} from "./creator-audio-rename-api";

test(
  "private audio rename runtime rejects missing session support",
  () => {
    assert.throws(
      () =>
        createCreatorAudioRenameAtRuntime(
          null as unknown as AstroSessionLike,
          {} as never,
        ),
      /Astro session support/,
    );
  },
);

test(
  "private audio rename runtime fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createCreatorAudioRenameAtRuntime(
          {} as AstroSessionLike,
          {
            SESH_DB:
              {},

            SESH_AUDIO:
              {},
          } as never,
        ),
      /RIVER_IDENTITY_DB/,
    );
  },
);

test(
  "private audio rename runtime exposes only rename operation authority",
  () => {
    class FakeD1 {
      prepare() {
        return {
          bind() {
            return this;
          },

          async first() {
            return null;
          },

          async all() {
            return {
              results:
                [],
            };
          },

          async run() {
            return {
              success:
                true,

              meta: {
                changes:
                  1,
              },
            };
          },
        };
      }
    }

    class FakeR2 {
      async put() {}
      async get() {
        return null;
      }
      async delete() {}
      async head() {
        return null;
      }
    }

    const renames =
      createCreatorAudioRenameAtRuntime(
        {} as AstroSessionLike,
        {
          RIVER_IDENTITY_DB:
            new FakeD1(),

          SESH_DB:
            new FakeD1(),

          SESH_AUDIO:
            new FakeR2(),
        } as never,
      );

    assert.equal(
      typeof renames.renameProjectAudio,
      "function",
    );

    assert.equal(
      "deleteProjectAudio" in
        renames,
      false,
    );

    assert.equal(
      "uploadProjectAudio" in
        renames,
      false,
    );
  },
);