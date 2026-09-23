import assert from "node:assert/strict";
import test from "node:test";

import {
  createPublicSeshCreatorProjectCollectionAtRuntime,
} from "./public-creator-projects-api";

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
  "composes anonymous creator public-project collection from SESH_DB only",
  () => {
    const environment = {
      SESH_DB:
        new FakeD1Database(),
    };

    const service =
      createPublicSeshCreatorProjectCollectionAtRuntime(
        environment,
      );

    assert.equal(
      typeof service.listByHandle,
      "function",
    );

    assert.equal(
      "RIVER_IDENTITY_DB" in environment,
      false,
    );

    assert.equal(
      "SESH_AUDIO" in environment,
      false,
    );

    assert.equal(
      "session" in environment,
      false,
    );
  },
);

test(
  "public creator project collection runtime fails closed without SESH_DB",
  () => {
    assert.throws(
      () =>
        createPublicSeshCreatorProjectCollectionAtRuntime(
          {},
        ),
      /SESH_DB/,
    );
  },
);