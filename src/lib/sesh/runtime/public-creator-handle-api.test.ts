import assert from "node:assert/strict";
import test from "node:test";

import {
  createPublicSeshCreatorHandleResolutionAtRuntime,
} from "./public-creator-handle-api";

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
  "composes anonymous public creator handle resolution from SESH_DB only",
  () => {
    const service =
      createPublicSeshCreatorHandleResolutionAtRuntime({
        SESH_DB:
          new FakeD1Database(),
      });

    assert.equal(
      typeof service.resolveByHandle,
      "function",
    );
  },
);

test(
  "public creator handle runtime fails closed without SESH_DB",
  () => {
    assert.throws(
      () =>
        createPublicSeshCreatorHandleResolutionAtRuntime(
          {},
        ),
      /SESH_DB/,
    );
  },
);

test(
  "public creator handle runtime does not require identity or session infrastructure",
  () => {
    const environment = {
      SESH_DB:
        new FakeD1Database(),
    };

    const service =
      createPublicSeshCreatorHandleResolutionAtRuntime(
        environment,
      );

    assert.equal(
      typeof service.resolveByHandle,
      "function",
    );

    assert.equal(
      "RIVER_IDENTITY_DB" in environment,
      false,
    );

    assert.equal(
      "session" in environment,
      false,
    );
  },
);