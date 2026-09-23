import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createAuthorizedSeshProjectPublicationOperationsAtRuntime,
} from "./project-publication-api";

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

  async all() {
    return {
      results: [],
    };
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

test(
  "composes authenticated owner-authorized project publication operations",
  () => {
    const service =
      createAuthorizedSeshProjectPublicationOperationsAtRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),
        },
        () =>
          "2026-09-23T14:00:00.000Z",
      );

    assert.equal(
      typeof service.updatePublication,
      "function",
    );
  },
);

test(
  "fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshProjectPublicationOperationsAtRuntime(
          new FakeSession(),
          {
            SESH_DB:
              new FakeD1Database(),
          },
        ),
      /RIVER_IDENTITY_DB/,
    );
  },
);

test(
  "fails closed without Sesh D1",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshProjectPublicationOperationsAtRuntime(
          new FakeSession(),
          {
            RIVER_IDENTITY_DB:
              new FakeD1Database(),
          },
        ),
      /SESH_DB/,
    );
  },
);