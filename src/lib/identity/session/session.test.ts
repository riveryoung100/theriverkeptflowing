import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import {
  AstroPrincipalSessionStore,
  AUTHENTICATED_PRINCIPAL_SESSION_KEY,
  AUTHENTICATED_PRINCIPAL_SESSION_TTL_SECONDS,
  AUTHENTICATED_PRINCIPAL_SESSION_VERSION,
  isAuthenticatedPrincipalSessionExpired,
  validateAuthenticatedPrincipalSession,
} from "./index";

import type {
  AstroSessionLike,
} from "./contracts";

class FakeAstroSession
implements AstroSessionLike {
  readonly values =
    new Map<
      string,
      unknown
    >();

  regenerateCount =
    0;

  destroyCount =
    0;

  deleteCount =
    0;

  lastSetTtl:
    number |
    undefined;

  async regenerate():
  Promise<void> {
    this.regenerateCount +=
      1;

    this.values.clear();
  }

  get(
    key:
      string,
  ): unknown {
    return this.values.get(
      key,
    );
  }

  set(
    key:
      string,
    value:
      unknown,
    options?: {
      readonly ttl?:
        number;
    },
  ): void {
    this.values.set(
      key,
      value,
    );

    this.lastSetTtl =
      options?.ttl;
  }

  delete(
    key:
      string,
  ): void {
    this.deleteCount +=
      1;

    this.values.delete(
      key,
    );
  }

  async destroy():
  Promise<void> {
    this.destroyCount +=
      1;

    this.values.clear();
  }
}

test(
  "validates a canonical authenticated PrincipalId session",
  () => {
    const principalId =
      createPrincipalId(
        "session-test",
      );

    const session =
      validateAuthenticatedPrincipalSession({
        version:
          AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

        principalId,

        authenticatedAt:
          "2026-09-21T20:00:00.000Z",

        expiresAt:
          "2026-09-22T08:00:00.000Z",
      });

    assert.equal(
      session.principalId,
      principalId,
    );
  },
);

test(
  "rejects malformed session payloads",
  () => {
    assert.throws(
      () =>
        validateAuthenticatedPrincipalSession({
          version:
            AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

          principalId:
            "not-a-principal",

          authenticatedAt:
            "2026-09-21T20:00:00.000Z",

          expiresAt:
            "2026-09-22T08:00:00.000Z",
        }),
    );
  },
);

test(
  "rejects sessions whose expiry does not follow authentication time",
  () => {
    assert.throws(
      () =>
        validateAuthenticatedPrincipalSession({
          version:
            AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

          principalId:
            createPrincipalId(
              "bad-expiry",
            ),

          authenticatedAt:
            "2026-09-22T08:00:00.000Z",

          expiresAt:
            "2026-09-22T08:00:00.000Z",
        }),
    );
  },
);

test(
  "detects expired authenticated sessions",
  () => {
    const session =
      validateAuthenticatedPrincipalSession({
        version:
          AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

        principalId:
          createPrincipalId(
            "expired",
          ),

        authenticatedAt:
          "2026-09-21T20:00:00.000Z",

        expiresAt:
          "2026-09-22T08:00:00.000Z",
      });

    assert.equal(
      isAuthenticatedPrincipalSessionExpired(
        session,
        new Date(
          "2026-09-22T08:00:00.000Z",
        ),
      ),
      true,
    );
  },
);

test(
  "regenerates the Astro session before storing authenticated PrincipalId",
  async () => {
    const astroSession =
      new FakeAstroSession();

    astroSession.values.set(
      "pre-auth-state",
      true,
    );

    const store =
      new AstroPrincipalSessionStore(
        astroSession,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
      );

    const principalId =
      createPrincipalId(
        "regeneration",
      );

    const created =
      await store.createSession(
        principalId,
      );

    assert.equal(
      astroSession.regenerateCount,
      1,
    );

    assert.equal(
      astroSession.values.has(
        "pre-auth-state",
      ),
      false,
    );

    assert.equal(
      created.principalId,
      principalId,
    );

    assert.equal(
      astroSession.lastSetTtl,
      AUTHENTICATED_PRINCIPAL_SESSION_TTL_SECONDS,
    );
  },
);

test(
  "stores the PrincipalId session separately from River OS operator auth",
  async () => {
    const astroSession =
      new FakeAstroSession();

    const store =
      new AstroPrincipalSessionStore(
        astroSession,
        () =>
          new Date(
            "2026-09-21T20:00:00.000Z",
          ),
      );

    await store.createSession(
      createPrincipalId(
        "separate-session",
      ),
    );

    assert.equal(
      astroSession.values.has(
        AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      ),
      true,
    );

    assert.equal(
      astroSession.values.has(
        "river-os-authenticated",
      ),
      false,
    );
  },
);

test(
  "loads a valid non-expired PrincipalId session",
  async () => {
    const astroSession =
      new FakeAstroSession();

    const store =
      new AstroPrincipalSessionStore(
        astroSession,
        () =>
          new Date(
            "2026-09-21T21:00:00.000Z",
          ),
      );

    const principalId =
      createPrincipalId(
        "load-session",
      );

    astroSession.values.set(
      AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      {
        version:
          AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

        principalId,

        authenticatedAt:
          "2026-09-21T20:00:00.000Z",

        expiresAt:
          "2026-09-22T08:00:00.000Z",
      },
    );

    const loaded =
      await store.getSession();

    assert.equal(
      loaded?.principalId,
      principalId,
    );
  },
);

test(
  "deletes malformed stored session payloads",
  async () => {
    const astroSession =
      new FakeAstroSession();

    astroSession.values.set(
      AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      {
        version:
          999,
      },
    );

    const store =
      new AstroPrincipalSessionStore(
        astroSession,
      );

    const loaded =
      await store.getSession();

    assert.equal(
      loaded,
      null,
    );

    assert.equal(
      astroSession.deleteCount,
      1,
    );
  },
);

test(
  "deletes expired stored session payloads",
  async () => {
    const astroSession =
      new FakeAstroSession();

    astroSession.values.set(
      AUTHENTICATED_PRINCIPAL_SESSION_KEY,
      {
        version:
          AUTHENTICATED_PRINCIPAL_SESSION_VERSION,

        principalId:
          createPrincipalId(
            "expired-store",
          ),

        authenticatedAt:
          "2026-09-21T20:00:00.000Z",

        expiresAt:
          "2026-09-21T21:00:00.000Z",
      },
    );

    const store =
      new AstroPrincipalSessionStore(
        astroSession,
        () =>
          new Date(
            "2026-09-21T21:00:00.000Z",
          ),
      );

    const loaded =
      await store.getSession();

    assert.equal(
      loaded,
      null,
    );

    assert.equal(
      astroSession.deleteCount,
      1,
    );
  },
);

test(
  "destroys the Astro session on logout",
  async () => {
    const astroSession =
      new FakeAstroSession();

    const store =
      new AstroPrincipalSessionStore(
        astroSession,
      );

    await store.destroySession();

    assert.equal(
      astroSession.destroyCount,
      1,
    );
  },
);
