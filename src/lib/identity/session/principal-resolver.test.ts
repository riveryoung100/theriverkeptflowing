import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import type {
  AuthenticatedPrincipal,
} from "../model";

import type {
  PrincipalRepository,
  PrincipalRepositoryResult,
} from "../repository";

import type {
  AuthenticatedPrincipalSession,
} from "./model";

import type {
  PrincipalSessionStore,
} from "./contracts";

import {
  DefaultSessionPrincipalResolver,
} from "./principal-resolver";

class FakePrincipalSessionStore
implements PrincipalSessionStore {
  session:
    AuthenticatedPrincipalSession |
    null =
      null;

  destroyCount =
    0;

  failRead =
    false;

  failDestroy =
    false;

  async createSession():
  Promise<AuthenticatedPrincipalSession> {
    throw new Error(
      "Not required by resolver tests.",
    );
  }

  async getSession():
  Promise<
    AuthenticatedPrincipalSession |
    null
  > {
    if (
      this.failRead
    ) {
      throw new Error(
        "simulated session read failure",
      );
    }

    return this.session;
  }

  async destroySession():
  Promise<void> {
    if (
      this.failDestroy
    ) {
      throw new Error(
        "simulated session destruction failure",
      );
    }

    this.destroyCount +=
      1;

    this.session =
      null;
  }
}

class FakePrincipalRepository
implements PrincipalRepository {
  readonly principals =
    new Map<
      string,
      AuthenticatedPrincipal
    >();

  failureCode:
    "not-found" |
    "validation" |
    "conflict" |
    "storage" |
    null =
      null;

  async savePrincipal(
    principal:
      AuthenticatedPrincipal,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    this.principals.set(
      principal.principalId,
      principal,
    );

    return {
      ok:
        true,

      value:
        principal,
    };
  }

  async getPrincipal(
    principalId:
      AuthenticatedPrincipal["principalId"],
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    if (
      this.failureCode !==
      null
    ) {
      return {
        ok:
          false,

        error: {
          code:
            this.failureCode,

          message:
            "simulated principal repository failure",
        },
      };
    }

    const principal =
      this.principals.get(
        principalId,
      );

    if (
      principal ===
      undefined
    ) {
      return {
        ok:
          false,

        error: {
          code:
            "not-found",

          message:
            "principal not found",
        },
      };
    }

    return {
      ok:
        true,

      value:
        principal,
    };
  }

  async principalExists(
    principalId:
      AuthenticatedPrincipal["principalId"],
  ): Promise<
    PrincipalRepositoryResult<boolean>
  > {
    return {
      ok:
        true,

      value:
        this.principals.has(
          principalId,
        ),
    };
  }
}

function canonicalPrincipal(
  status:
    "active" |
    "disabled" =
      "active",
): AuthenticatedPrincipal {
  return {
    principalId:
      createPrincipalId(
        "session-principal-resolution",
      ),

    status,

    displayName:
      "River",

    createdAt:
      "2026-09-21T20:00:00.000Z",

    updatedAt:
      "2026-09-21T20:00:00.000Z",
  };
}

function canonicalSession(
  principalId:
    AuthenticatedPrincipal["principalId"],
): AuthenticatedPrincipalSession {
  return {
    version:
      1,

    principalId,

    authenticatedAt:
      "2026-09-21T20:00:00.000Z",

    expiresAt:
      "2026-09-22T08:00:00.000Z",
  };
}

function fixture(
  status:
    "active" |
    "disabled" =
      "active",
) {
  const sessions =
    new FakePrincipalSessionStore();

  const principals =
    new FakePrincipalRepository();

  const principal =
    canonicalPrincipal(
      status,
    );

  sessions.session =
    canonicalSession(
      principal.principalId,
    );

  principals.principals.set(
    principal.principalId,
    principal,
  );

  const resolver =
    new DefaultSessionPrincipalResolver({
      sessions,
      principals,
    });

  return {
    sessions,
    principals,
    principal,
    resolver,
  };
}

test(
  "resolves a valid authenticated session to canonical PrincipalId",
  async () => {
    const {
      resolver,
      principal,
    } =
      fixture();

    const result =
      await resolver.resolve();

    assert.deepEqual(
      result,
      {
        ok:
          true,

        value: {
          principalId:
            principal.principalId,
        },
      },
    );
  },
);

test(
  "returns unauthenticated when no authenticated principal session exists",
  async () => {
    const {
      resolver,
      sessions,
    } =
      fixture();

    sessions.session =
      null;

    const result =
      await resolver.resolve();

    assert.deepEqual(
      result,
      {
        ok:
          false,

        error: {
          code:
            "unauthenticated",

          message:
            "Authentication is required.",
        },
      },
    );
  },
);

test(
  "invalidates the session when the canonical principal no longer exists",
  async () => {
    const {
      resolver,
      principals,
      sessions,
    } =
      fixture();

    principals.principals.clear();

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      sessions.destroyCount,
      1,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unauthenticated",
      );
    }
  },
);

test(
  "invalidates the session when the principal is disabled",
  async () => {
    const {
      resolver,
      sessions,
    } =
      fixture(
        "disabled",
      );

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      sessions.destroyCount,
      1,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unauthenticated",
      );
    }
  },
);

test(
  "does not convert principal storage failures into unauthenticated",
  async () => {
    const {
      resolver,
      principals,
      sessions,
    } =
      fixture();

    principals.failureCode =
      "storage";

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      sessions.destroyCount,
      0,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "returns unavailable when session storage cannot be read",
  async () => {
    const {
      resolver,
      sessions,
    } =
      fixture();

    sessions.failRead =
      true;

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "fails closed when a stale session cannot be destroyed",
  async () => {
    const {
      resolver,
      sessions,
      principals,
    } =
      fixture();

    principals.principals.clear();

    sessions.failDestroy =
      true;

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "never returns Sesh product identity or authorization",
  async () => {
    const {
      resolver,
    } =
      fixture();

    const result =
      await resolver.resolve();

    assert.equal(
      result.ok,
      true,
    );

    if (
      result.ok
    ) {
      assert.deepEqual(
        Object.keys(
          result.value,
        ),
        [
          "principalId",
        ],
      );
    }
  },
);
