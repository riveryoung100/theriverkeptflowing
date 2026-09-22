import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createSeshCreatorProfileProvisioningAtRuntime,
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
  "composes authenticated Sesh creator provisioning from canonical session and D1 bindings",
  () => {
    const service =
      createSeshCreatorProfileProvisioningAtRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),
        },
        () =>
          "2026-09-22T19:00:00.000Z",
      );

    assert.equal(
      typeof service.provision,
      "function",
    );
  },
);

test(
  "fails closed without the identity D1 binding",
  () => {
    assert.throws(
      () =>
        createSeshCreatorProfileProvisioningAtRuntime(
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
  "fails closed without Sesh creator profile persistence",
  () => {
    assert.throws(
      () =>
        createSeshCreatorProfileProvisioningAtRuntime(
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