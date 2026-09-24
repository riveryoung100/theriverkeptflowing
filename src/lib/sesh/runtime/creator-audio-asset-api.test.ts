import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createCreatorAudioAssetOperationsAtRuntime,
} from "./creator-audio-asset-api";

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
  "composes private creator audio metadata operations from canonical runtime boundaries",
  () => {
    const operations =
      createCreatorAudioAssetOperationsAtRuntime(
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
      typeof operations
        .listProjectAudioAssets,
      "function",
    );

    assert.equal(
      typeof operations
        .readProjectAudioAsset,
      "function",
    );
  },
);

test(
  "fails closed without identity persistence",
  () => {
    assert.throws(
      () =>
        createCreatorAudioAssetOperationsAtRuntime(
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
  "fails closed without Sesh metadata persistence",
  () => {
    assert.throws(
      () =>
        createCreatorAudioAssetOperationsAtRuntime(
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
  },
);

test(
  "fails closed without the private Sesh audio binding",
  () => {
    assert.throws(
      () =>
        createCreatorAudioAssetOperationsAtRuntime(
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
