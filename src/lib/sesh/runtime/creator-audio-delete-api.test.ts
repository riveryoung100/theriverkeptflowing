import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createCreatorAudioDeleteAtRuntime,
} from "./creator-audio-delete-api";

class FakeD1Database {
  prepare() {
    const statement = {
      bind() {
        return statement;
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
        };
      },
    };

    return statement;
  }
}

class FakeR2Bucket {
  async put() {
    return {};
  }

  async get() {
    return null;
  }

  async delete() {}

  async head() {
    return null;
  }
}

const session =
  {} as AstroSessionLike;

test(
  "composes owner-authorized private audio delete from canonical runtime boundaries",
  () => {
    const deletes =
      createCreatorAudioDeleteAtRuntime(
        session,
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),

          SESH_AUDIO:
            new FakeR2Bucket(),
        },
      );

    assert.equal(
      typeof deletes
        .deleteProjectAudio,
      "function",
    );
  },
);

test(
  "private audio delete runtime fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createCreatorAudioDeleteAtRuntime(
          session,
          {
            SESH_DB:
              new FakeD1Database(),

            SESH_AUDIO:
              new FakeR2Bucket(),
          },
        ),
      /RIVER_IDENTITY_DB/,
    );
  },
);

test(
  "private audio delete runtime fails closed without Sesh persistence",
  () => {
    assert.throws(
      () =>
        createCreatorAudioDeleteAtRuntime(
          session,
          {
            RIVER_IDENTITY_DB:
              new FakeD1Database(),

            SESH_AUDIO:
              new FakeR2Bucket(),
          },
        ),
      /SESH_DB/,
    );

    assert.throws(
      () =>
        createCreatorAudioDeleteAtRuntime(
          session,
          {
            RIVER_IDENTITY_DB:
              new FakeD1Database(),

            SESH_DB:
              new FakeD1Database(),
          },
        ),
      /SESH_AUDIO/,
    );
  },
);