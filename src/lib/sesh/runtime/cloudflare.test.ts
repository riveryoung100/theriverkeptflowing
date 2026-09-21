import assert from "node:assert/strict";
import test from "node:test";

import {
  D1SeshAudioAssetRepository,
} from "../persistence/cloudflare/d1-audio-asset-repository";
import {
  D1SeshProjectRepository,
} from "../persistence/cloudflare/d1-project-repository";
import {
  R2SeshAudioObjectStore,
} from "../persistence/cloudflare/r2-audio-object-store";
import type {
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
  SeshR2BucketLike,
} from "../persistence/cloudflare/types";
import {
  createSeshRuntimePersistence,
} from "./cloudflare";

function createFakeD1(): SeshD1DatabaseLike {
  const statement:
    SeshD1PreparedStatementLike = {
      bind() {
        return statement;
      },

      async first() {
        return null;
      },

      async all() {
        return {
          results: [],
        };
      },

      async run() {
        return {
          success: true,
        };
      },
    };

  return {
    prepare() {
      return statement;
    },
  };
}

function createFakeR2(): SeshR2BucketLike {
  return {
    async put() {
      return undefined;
    },

    async get() {
      return null;
    },

    async delete() {
      return undefined;
    },

    async head() {
      return null;
    },
  };
}

test(
  "composes the existing Sesh Cloudflare persistence adapters",
  () => {
    const database =
      createFakeD1();

    const bucket =
      createFakeR2();

    const persistence =
      createSeshRuntimePersistence({
        SESH_DB:
          database,

        SESH_AUDIO:
          bucket,
      });

    assert.ok(
      persistence.projectRepository instanceof
        D1SeshProjectRepository,
    );

    assert.ok(
      persistence.audioAssetRepository instanceof
        D1SeshAudioAssetRepository,
    );

    assert.ok(
      persistence.audioObjectStore instanceof
        R2SeshAudioObjectStore,
    );
  },
);

test(
  "rejects a missing SESH_DB binding",
  () => {
    assert.throws(
      () =>
        createSeshRuntimePersistence({
          SESH_AUDIO:
            createFakeR2(),
        }),
      /SESH_DB/,
    );
  },
);

test(
  "rejects a malformed SESH_DB binding",
  () => {
    assert.throws(
      () =>
        createSeshRuntimePersistence({
          SESH_DB:
            {},

          SESH_AUDIO:
            createFakeR2(),
        }),
      /SESH_DB/,
    );
  },
);

test(
  "rejects a missing SESH_AUDIO binding",
  () => {
    assert.throws(
      () =>
        createSeshRuntimePersistence({
          SESH_DB:
            createFakeD1(),
        }),
      /SESH_AUDIO/,
    );
  },
);

test(
  "rejects a malformed SESH_AUDIO binding",
  () => {
    assert.throws(
      () =>
        createSeshRuntimePersistence({
          SESH_DB:
            createFakeD1(),

          SESH_AUDIO:
            {
              put() {},
            },
        }),
      /SESH_AUDIO/,
    );
  },
);
