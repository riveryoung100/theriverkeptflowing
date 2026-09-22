import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstroSessionLike,
} from "../../identity/session";

import {
  createAuthenticatedSeshCreatorHandleClaimAtRuntime,
} from "./creator-handle-claim-api";

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
  "composes authenticated Sesh creator handle claims from canonical session and D1 bindings",
  () => {
    const service =
      createAuthenticatedSeshCreatorHandleClaimAtRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeD1Database(),

          SESH_DB:
            new FakeD1Database(),
        },
      );

    assert.equal(
      typeof service.claimHandle,
      "function",
    );

    const surface =
      service as unknown as
        Record<
          string,
          unknown
        >;

    assert.equal(
      surface.releaseHandle,
      undefined,
    );

    assert.equal(
      surface.renameHandle,
      undefined,
    );
  },
);

test(
  "handle claim runtime fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createAuthenticatedSeshCreatorHandleClaimAtRuntime(
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
  "handle claim runtime fails closed without Sesh D1",
  () => {
    assert.throws(
      () =>
        createAuthenticatedSeshCreatorHandleClaimAtRuntime(
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