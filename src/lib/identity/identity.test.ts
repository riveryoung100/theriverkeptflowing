import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
  InMemoryPrincipalRepository,
  parsePrincipalId,
  validateAuthenticatedPrincipal,
} from "./index";

test(
  "creates and parses canonical PrincipalId values",
  () => {
    const principalId =
      createPrincipalId(
        "river-01",
      );

    assert.equal(
      principalId,
      "principal:river-01",
    );

    assert.equal(
      parsePrincipalId(
        principalId,
      ),
      principalId,
    );
  },
);

test(
  "rejects malformed PrincipalId values",
  () => {
    assert.throws(
      () =>
        createPrincipalId(
          "",
        ),
      /non-empty canonical value/,
    );

    assert.throws(
      () =>
        createPrincipalId(
          "river:test",
        ),
      /colons/,
    );

    assert.throws(
      () =>
        parsePrincipalId(
          "sesh-creator:river",
        ),
      /principal:/,
    );

    assert.throws(
      () =>
        parsePrincipalId(
          "principal:",
        ),
      /non-empty canonical value/,
    );
  },
);

test(
  "validates a canonical active principal",
  () => {
    const principal =
      validateAuthenticatedPrincipal({
        principalId:
          "principal:river-01",
        status:
          "active",
        displayName:
          "River",
        createdAt:
          "2026-09-21T20:00:00.000Z",
        updatedAt:
          "2026-09-21T20:00:00.000Z",
      });

    assert.equal(
      principal.principalId,
      "principal:river-01",
    );

    assert.equal(
      principal.status,
      "active",
    );

    assert.equal(
      principal.displayName,
      "River",
    );
  },
);

test(
  "validates a disabled principal without requiring profile data",
  () => {
    const principal =
      validateAuthenticatedPrincipal({
        principalId:
          "principal:disabled-01",
        status:
          "disabled",
        createdAt:
          "2026-09-21T20:00:00.000Z",
        updatedAt:
          "2026-09-21T21:00:00.000Z",
      });

    assert.equal(
      principal.status,
      "disabled",
    );

    assert.equal(
      principal.displayName,
      undefined,
    );
  },
);

test(
  "rejects invalid principal status",
  () => {
    assert.throws(
      () =>
        validateAuthenticatedPrincipal({
          principalId:
            "principal:river-01",
          status:
            "deleted",
          createdAt:
            "2026-09-21T20:00:00.000Z",
          updatedAt:
            "2026-09-21T20:00:00.000Z",
        }),
      /active or disabled/,
    );
  },
);

test(
  "rejects updatedAt before createdAt",
  () => {
    assert.throws(
      () =>
        validateAuthenticatedPrincipal({
          principalId:
            "principal:river-01",
          status:
            "active",
          createdAt:
            "2026-09-21T21:00:00.000Z",
          updatedAt:
            "2026-09-21T20:00:00.000Z",
        }),
      /cannot precede createdAt/,
    );
  },
);

test(
  "stores and retrieves principals using the provider-neutral repository contract",
  async () => {
    const repository =
      new InMemoryPrincipalRepository();

    const principalId =
      createPrincipalId(
        "river-01",
      );

    const saved =
      await repository.savePrincipal({
        principalId,
        status:
          "active",
        displayName:
          "River",
        createdAt:
          "2026-09-21T20:00:00.000Z",
        updatedAt:
          "2026-09-21T20:00:00.000Z",
      });

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getPrincipal(
        principalId,
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (loaded.ok) {
      assert.equal(
        loaded.value.principalId,
        principalId,
      );

      assert.equal(
        loaded.value.displayName,
        "River",
      );
    }
  },
);

test(
  "returns explicit not-found behavior",
  async () => {
    const repository =
      new InMemoryPrincipalRepository();

    const result =
      await repository.getPrincipal(
        createPrincipalId(
          "missing",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "not-found",
      );
    }
  },
);

test(
  "distinguishes validation failure from not-found",
  async () => {
    const repository =
      new InMemoryPrincipalRepository();

    const result =
      await repository.savePrincipal({
        principalId:
          "wrong:river",
        status:
          "active",
        createdAt:
          "2026-09-21T20:00:00.000Z",
        updatedAt:
          "2026-09-21T20:00:00.000Z",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (!result.ok) {
      assert.equal(
        result.error.code,
        "validation",
      );
    }
  },
);

test(
  "preserves createdAt under an existing PrincipalId",
  async () => {
    const repository =
      new InMemoryPrincipalRepository();

    const principalId =
      createPrincipalId(
        "stable",
      );

    const first =
      await repository.savePrincipal({
        principalId,
        status:
          "active",
        createdAt:
          "2026-09-21T20:00:00.000Z",
        updatedAt:
          "2026-09-21T20:00:00.000Z",
      });

    assert.equal(
      first.ok,
      true,
    );

    const drift =
      await repository.savePrincipal({
        principalId,
        status:
          "active",
        createdAt:
          "2026-09-22T20:00:00.000Z",
        updatedAt:
          "2026-09-22T20:00:00.000Z",
      });

    assert.equal(
      drift.ok,
      false,
    );

    if (!drift.ok) {
      assert.equal(
        drift.error.code,
        "conflict",
      );
    }
  },
);

test(
  "allows mutable profile and status updates while preserving identity",
  async () => {
    const repository =
      new InMemoryPrincipalRepository();

    const principalId =
      createPrincipalId(
        "mutable-profile",
      );

    await repository.savePrincipal({
      principalId,
      status:
        "active",
      displayName:
        "First Name",
      createdAt:
        "2026-09-21T20:00:00.000Z",
      updatedAt:
        "2026-09-21T20:00:00.000Z",
    });

    const updated =
      await repository.savePrincipal({
        principalId,
        status:
          "disabled",
      displayName:
          "Updated Name",
        createdAt:
          "2026-09-21T20:00:00.000Z",
        updatedAt:
          "2026-09-21T21:00:00.000Z",
      });

    assert.equal(
      updated.ok,
      true,
    );

    if (updated.ok) {
      assert.equal(
        updated.value.principalId,
        principalId,
      );

      assert.equal(
        updated.value.status,
        "disabled",
      );

      assert.equal(
        updated.value.displayName,
        "Updated Name",
      );
    }
  },
);

test(
  "reports principal existence without exposing credentials or product identity",
  async () => {
    const repository =
      new InMemoryPrincipalRepository();

    const principalId =
      createPrincipalId(
        "exists",
      );

    const before =
      await repository.principalExists(
        principalId,
      );

    assert.deepEqual(
      before,
      {
        ok: true,
        value: false,
      },
    );

    await repository.savePrincipal({
      principalId,
      status:
        "active",
      createdAt:
        "2026-09-21T20:00:00.000Z",
      updatedAt:
        "2026-09-21T20:00:00.000Z",
    });

    const after =
      await repository.principalExists(
        principalId,
      );

    assert.deepEqual(
      after,
      {
        ok: true,
        value: true,
      },
    );
  },
);
