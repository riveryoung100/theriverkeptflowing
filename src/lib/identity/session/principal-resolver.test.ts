import assert from "node:assert/strict";
import test from "node:test";
import { AstroPrincipalSessionStore } from "./astro-session-adapter";
import { AUTHENTICATED_PRINCIPAL_SESSION_KEY } from "./model";
import type { AstroSessionLike } from "./contracts";

test("real adapter async reads preserve resolver failures, lookup identity and stale cleanup", async () => {
  for (const scenario of ["valid", "missing-session", "malformed", "expired", "read-failure", "malformed-cleanup-failure", "expired-cleanup-failure", "missing-principal", "inactive-principal", "mismatched-principal", "destroy-failure", "async-destroy"] as const) {
    const { principal, principals } = fixture();
    const payload = canonicalSession(principal.principalId);
    const events: string[] = [];
    const session: AstroSessionLike = {
      async get(key) {
        events.push("get"); assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY);
        await Promise.resolve();
        if (scenario === "read-failure") throw new Error("read failure");
        if (scenario === "missing-session") return undefined;
        if (scenario === "malformed" || scenario === "malformed-cleanup-failure") return {};
        return payload;
      },
      set() { throw new Error("unexpected set"); },
      delete(key) {
        assert.equal(key, AUTHENTICATED_PRINCIPAL_SESSION_KEY); events.push("delete");
        if (scenario.endsWith("cleanup-failure")) throw new Error("delete failure");
      },
      async regenerate() { throw new Error("unexpected regenerate"); },
      destroy() { events.push("destroy"); if (scenario === "destroy-failure") throw new Error("destroy failure"); },
    };
    if (scenario === "async-destroy") session.destroy = async () => { await Promise.resolve(); events.push("destroy"); };
    const originalLookup = principals.getPrincipal.bind(principals);
    principals.getPrincipal = async id => {
      events.push("lookup"); assert.equal(id, principal.principalId);
      if (scenario === "mismatched-principal") return { ok: true, value: { ...principal, principalId: createPrincipalId("other") } };
      return originalLookup(id);
    };
    if (["missing-principal", "destroy-failure", "async-destroy"].includes(scenario)) principals.principals.clear();
    if (scenario === "inactive-principal") principals.principals.set(principal.principalId, { ...principal, status: "disabled" });
    const expired = scenario === "expired" || scenario === "expired-cleanup-failure";
    const resolver = new DefaultSessionPrincipalResolver({ sessions: new AstroPrincipalSessionStore(session, () => new Date(expired ? payload.expiresAt : payload.authenticatedAt)), principals });
    assert.deepEqual(events, []);
    const resolved = await resolver.resolve();
    if (scenario === "valid") {
      assert.deepEqual(resolved, { ok: true, value: { principalId: principal.principalId } }); assert.deepEqual(events, ["get", "lookup"]);
    } else {
      assert(!resolved.ok);
      const unavailable = ["read-failure", "malformed-cleanup-failure", "expired-cleanup-failure", "destroy-failure"].includes(scenario);
      assert.equal(resolved.error.code, unavailable ? "unavailable" : "unauthenticated");
      if (scenario === "read-failure" || scenario === "missing-session") assert.deepEqual(events, ["get"]);
      else if (scenario === "malformed" || scenario.includes("cleanup-failure") || expired) assert.deepEqual(events, ["get", "delete"]);
      else assert.deepEqual(events, ["get", "lookup", "destroy"]);
    }
  }
});

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
