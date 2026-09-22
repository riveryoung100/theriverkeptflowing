import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createAuthenticatedSeshProjectCollectionAtRuntime,
  createAuthorizedSeshProjectOperationsAtRuntime,
} from "./project-api";

class FakeSession
implements AstroSessionLike {
  get() {
    return undefined;
  }

  set() {}

  delete() {}

  async regenerate() {}

  async destroy() {}
}

class FakeD1Statement {
  bind() {
    return this;
  }

  async first() {
    return null;
  }

  async run() {
    return {
      success:
        true,

      meta: {
        changes:
          0,
      },
    };
  }
}

class FakeD1Database {
  prepare() {
    return new FakeD1Statement();
  }
}

class FakeR2Bucket {
  async put() {}

  async get() {
    return null;
  }

  async delete() {}

  async head() {
    return null;
  }
}

test(
  "composes authenticated Sesh project operations from the canonical session and Cloudflare bindings",
  () => {
    const service =
      createAuthorizedSeshProjectOperationsAtRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),

          SESH_AUDIO:
            new FakeR2Bucket(),
        },
        () =>
          "2026-09-22T00:00:00.000Z",
      );

    assert.equal(
      typeof service.readProject,
      "function",
    );

    assert.equal(
      typeof service.updateProject,
      "function",
    );

    assert.equal(
      typeof service.deleteProject,
      "function",
    );
  },
);

test(
  "fails closed without the identity D1 binding",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshProjectOperationsAtRuntime(
          new FakeSession(),
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
  "fails closed without Sesh project persistence",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshProjectOperationsAtRuntime(
          new FakeSession(),
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
  "composes authenticated Sesh creator project collection operations",
  () => {
    const service =
      createAuthenticatedSeshProjectCollectionAtRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),

          SESH_AUDIO:
            new FakeR2Bucket(),
        },
        () =>
          "2026-09-22T17:00:00.000Z",
        () =>
          "sesh-project:runtime-test",
      );

    assert.equal(
      typeof service.createProject,
      "function",
    );

    assert.equal(
      typeof service.listProjects,
      "function",
    );
  },
);