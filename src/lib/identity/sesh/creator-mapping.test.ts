import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import {
  createSeshCreatorId,
} from "../../sesh/identifiers";

import {
  InMemoryPrincipalSeshCreatorMappingRepository,
  validatePrincipalSeshCreatorMapping,
} from "./index";

test(
  "validates an explicit PrincipalId to SeshCreatorId mapping",
  () => {
    const mapping =
      validatePrincipalSeshCreatorMapping({
        principalId:
          createPrincipalId(
            "creator-owner",
          ),

        seshCreatorId:
          createSeshCreatorId(
            "creator-owner",
          ),

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      mapping.principalId,
      "principal:creator-owner",
    );

    assert.equal(
      mapping.seshCreatorId,
      "sesh-creator:creator-owner",
    );
  },
);

test(
  "rejects malformed PrincipalId values",
  () => {
    assert.throws(
      () =>
        validatePrincipalSeshCreatorMapping({
          principalId:
            "river@example.com" as never,

          seshCreatorId:
            createSeshCreatorId(
              "creator",
            ),

          createdAt:
            "2026-09-21T22:00:00.000Z",
        }),
    );
  },
);

test(
  "rejects malformed SeshCreatorId values",
  () => {
    assert.throws(
      () =>
        validatePrincipalSeshCreatorMapping({
          principalId:
            createPrincipalId(
              "principal",
            ),

          seshCreatorId:
            "creator@example.com" as never,

          createdAt:
            "2026-09-21T22:00:00.000Z",
        }),
    );
  },
);

test(
  "stores and resolves an explicit mapping in both directions",
  async () => {
    const repository =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const principalId =
      createPrincipalId(
        "two-way",
      );

    const seshCreatorId =
      createSeshCreatorId(
        "two-way",
      );

    const saved =
      await repository.saveMapping({
        principalId,
        seshCreatorId,
        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      saved.ok,
      true,
    );

    const byPrincipal =
      await repository.getByPrincipalId(
        principalId,
      );

    const byCreator =
      await repository.getBySeshCreatorId(
        seshCreatorId,
      );

    assert.equal(
      byPrincipal.ok,
      true,
    );

    assert.equal(
      byCreator.ok,
      true,
    );

    if (
      byPrincipal.ok &&
      byCreator.ok
    ) {
      assert.equal(
        byPrincipal.value.seshCreatorId,
        seshCreatorId,
      );

      assert.equal(
        byCreator.value.principalId,
        principalId,
      );
    }
  },
);

test(
  "enforces one SeshCreatorId per PrincipalId",
  async () => {
    const repository =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const principalId =
      createPrincipalId(
        "one-principal",
      );

    const first =
      await repository.saveMapping({
        principalId,

        seshCreatorId:
          createSeshCreatorId(
            "creator-a",
          ),

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      first.ok,
      true,
    );

    const conflicting =
      await repository.saveMapping({
        principalId,

        seshCreatorId:
          createSeshCreatorId(
            "creator-b",
          ),

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      conflicting.ok,
      false,
    );

    if (
      !conflicting.ok
    ) {
      assert.equal(
        conflicting.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "enforces one PrincipalId per SeshCreatorId",
  async () => {
    const repository =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const seshCreatorId =
      createSeshCreatorId(
        "unique-creator",
      );

    const first =
      await repository.saveMapping({
        principalId:
          createPrincipalId(
            "principal-a",
          ),

        seshCreatorId,

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      first.ok,
      true,
    );

    const conflicting =
      await repository.saveMapping({
        principalId:
          createPrincipalId(
            "principal-b",
          ),

        seshCreatorId,

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      conflicting.ok,
      false,
    );

    if (
      !conflicting.ok
    ) {
      assert.equal(
        conflicting.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "preserves immutable mapping creation time",
  async () => {
    const repository =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const principalId =
      createPrincipalId(
        "immutable",
      );

    const seshCreatorId =
      createSeshCreatorId(
        "immutable",
      );

    await repository.saveMapping({
      principalId,
      seshCreatorId,
      createdAt:
        "2026-09-21T22:00:00.000Z",
    });

    const changed =
      await repository.saveMapping({
        principalId,
        seshCreatorId,
        createdAt:
          "2026-09-21T23:00:00.000Z",
      });

    assert.equal(
      changed.ok,
      false,
    );

    if (
      !changed.ok
    ) {
      assert.equal(
        changed.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "returns explicit not-found behavior",
  async () => {
    const repository =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const missing =
      await repository.getByPrincipalId(
        createPrincipalId(
          "missing",
        ),
      );

    assert.equal(
      missing.ok,
      false,
    );

    if (
      !missing.ok
    ) {
      assert.equal(
        missing.error.kind,
        "not-found",
      );
    }
  },
);

test(
  "reports mapping existence in both directions",
  async () => {
    const repository =
      new InMemoryPrincipalSeshCreatorMappingRepository();

    const principalId =
      createPrincipalId(
        "exists",
      );

    const seshCreatorId =
      createSeshCreatorId(
        "exists",
      );

    await repository.saveMapping({
      principalId,
      seshCreatorId,
      createdAt:
        "2026-09-21T22:00:00.000Z",
    });

    const principalExists =
      await repository.mappingExistsForPrincipal(
        principalId,
      );

    const creatorExists =
      await repository.mappingExistsForCreator(
        seshCreatorId,
      );

    assert.deepEqual(
      principalExists,
      {
        ok:
          true,

        value:
          true,
      },
    );

    assert.deepEqual(
      creatorExists,
      {
        ok:
          true,

        value:
          true,
      },
    );
  },
);

test(
  "mapping contains no email, CRM identity, session identity, or authorization grants",
  () => {
    const mapping =
      validatePrincipalSeshCreatorMapping({
        principalId:
          createPrincipalId(
            "minimal",
          ),

        seshCreatorId:
          createSeshCreatorId(
            "minimal",
          ),

        createdAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.deepEqual(
      Object.keys(
        mapping,
      ),
      [
        "principalId",
        "seshCreatorId",
        "createdAt",
      ],
    );
  },
);
