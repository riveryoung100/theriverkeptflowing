import assert from "node:assert/strict";
import test from "node:test";

import {
  D1SeshAudioAssetRepository,
} from "./d1-audio-asset-repository";
import {
  D1SeshCreatorProfileRepository,
} from "./d1-creator-profile-repository";
import {
  D1SeshProjectRepository,
} from "./d1-project-repository";
import {
  R2SeshAudioObjectStore,
} from "./r2-audio-object-store";
import {
  createSeshCloudflarePersistence,
} from "./composition";
import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
  SeshR2BucketLike,
  SeshR2ObjectLike,
} from "./types";

class FakeD1Database
implements SeshD1DatabaseLike {
  prepare(): SeshD1PreparedStatementLike {
    return new class implements SeshD1PreparedStatementLike {
      bind(): SeshD1PreparedStatementLike {
        return this;
      }

      async first<T>(): Promise<T | null> {
        return null;
      }

      async all<T>(): Promise<SeshD1AllResultLike<T>> {
        return {
          results: [],
        };
      }

      async run(): Promise<{ readonly success: boolean }> {
        return {
          success: true,
        };
      }
    }();
  }
}

class FakeR2Bucket
implements SeshR2BucketLike {
  async put():
  Promise<void> {}

  async get():
  Promise<SeshR2ObjectLike | null> {
    return null;
  }

  async delete():
  Promise<void> {}

  async head():
  Promise<unknown | null> {
    return null;
  }
}

test("composes all Sesh Cloudflare persistence adapters from injected bindings", () => {
  const composition = createSeshCloudflarePersistence({
    SESH_DB: new FakeD1Database(),
    SESH_AUDIO: new FakeR2Bucket(),
  });

  assert.ok(
    composition.creatorProfileRepository
      instanceof D1SeshCreatorProfileRepository,
  );

  assert.ok(
    composition.projectRepository
      instanceof D1SeshProjectRepository,
  );

  assert.ok(
    composition.audioAssetRepository
      instanceof D1SeshAudioAssetRepository,
  );

  assert.ok(
    composition.audioObjectStore
      instanceof R2SeshAudioObjectStore,
  );
});

test("uses one injected D1 binding for both metadata repositories", async () => {
  const database = new FakeD1Database();

  const composition = createSeshCloudflarePersistence({
    SESH_DB: database,
    SESH_AUDIO: new FakeR2Bucket(),
  });

  const projectExists =
    await composition.projectRepository.projectExists(
      "sesh-project:test" as never,
    );

  const audioListing =
    await composition.audioAssetRepository
      .listAudioAssetsForProject(
        "sesh-project:test" as never,
      );

  assert.deepEqual(projectExists, {
    ok: true,
    value: false,
  });

  assert.deepEqual(audioListing, {
    ok: true,
    value: [],
  });
});

test("rejects missing or malformed D1 bindings", () => {
  assert.throws(
    () =>
      createSeshCloudflarePersistence({
        SESH_DB: null as never,
        SESH_AUDIO: new FakeR2Bucket(),
      }),
    /SESH_DB/,
  );
});

test("rejects missing or malformed R2 bindings", () => {
  assert.throws(
    () =>
      createSeshCloudflarePersistence({
        SESH_DB: new FakeD1Database(),
        SESH_AUDIO: null as never,
      }),
    /SESH_AUDIO/,
  );
});
