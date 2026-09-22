import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createAuthenticatedSeshCreatorProfileOperationsAtRuntime,
} from "./creator-profile-api";

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

test(
  "composes authenticated Sesh creator profile operations from canonical session and D1 bindings",
  () => {
    const service =
      createAuthenticatedSeshCreatorProfileOperationsAtRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),
        },
      );

    assert.equal(
      typeof service.readProfile,
      "function",
    );

    assert.equal(
      typeof service.updateProfile,
      "function",
    );
  },
);

test(
  "creator profile operations fail closed without identity D1",
  () => {
    assert.throws(
      () =>
        createAuthenticatedSeshCreatorProfileOperationsAtRuntime(
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
  "creator profile operations fail closed without Sesh D1",
  () => {
    assert.throws(
      () =>
        createAuthenticatedSeshCreatorProfileOperationsAtRuntime(
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