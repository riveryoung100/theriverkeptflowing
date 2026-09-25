import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  DefaultAuthorizedSeshTrackOperationService,
} from "../operations";

import {
  createAuthorizedSeshTrackOperationsAtRuntime,
} from "./track-api";

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
      results:
        [],
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
  "composes authenticated owner-authorized track operations from identity and Sesh D1 only",
  () => {
    const operations =
      createAuthorizedSeshTrackOperationsAtRuntime(
        new FakeSession(),
        {
          SESH_DB:
            new FakeD1Database(),

          RIVER_IDENTITY_DB:
            new FakeD1Database(),
        },
      );

    assert.ok(
      operations instanceof
        DefaultAuthorizedSeshTrackOperationService,
    );
  },
);

test(
  "track runtime requires no SESH_AUDIO binding",
  () => {
    assert.doesNotThrow(
      () =>
        createAuthorizedSeshTrackOperationsAtRuntime(
          new FakeSession(),
          {
            SESH_DB:
              new FakeD1Database(),

            RIVER_IDENTITY_DB:
              new FakeD1Database(),
          },
        ),
    );
  },
);

test(
  "track runtime fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshTrackOperationsAtRuntime(
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
  "track runtime fails closed without Sesh D1",
  () => {
    assert.throws(
      () =>
        createAuthorizedSeshTrackOperationsAtRuntime(
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