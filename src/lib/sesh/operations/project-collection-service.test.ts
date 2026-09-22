import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../../identity/identifiers";

import type {
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import {
  InMemorySeshProjectRepository,
} from "../persistence/memory";

import {
  DefaultAuthenticatedSeshProjectCollectionService,
} from "./project-collection-service";

const principalId =
  createPrincipalId(
    "collection-test",
  );

const creatorId =
  createSeshCreatorId(
    "collection-test",
  );

function creatorResolver():
AuthenticatedSeshCreatorResolver {
  return {
    async resolve() {
      return {
        ok:
          true,

        value: {
          principalId,
          seshCreatorId:
            creatorId,
        },
      };
    },
  };
}

test(
  "creates a project with server-derived identity ownership and timestamps",
  async () => {
    const projects =
      new InMemorySeshProjectRepository();

    const service =
      new DefaultAuthenticatedSeshProjectCollectionService({
        creatorResolver:
          creatorResolver(),

        projects,

        now:
          () =>
            "2026-09-22T17:00:00.000Z",

        createProjectId:
          () =>
            createSeshMusicProjectId(
              "server-generated",
            ),
      });

    const result =
      await service.createProject({
        title:
          "First Sesh",

        description:
          "Created through the authenticated collection boundary.",
      });

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected project creation.",
      );
    }

    assert.equal(
      result.value.id,
      "sesh-project:server-generated",
    );

    assert.equal(
      result.value.ownerCreatorId,
      creatorId,
    );

    assert.equal(
      result.value.createdAt,
      "2026-09-22T17:00:00.000Z",
    );

    assert.deepEqual(
      result.value.trackIds,
      [],
    );

    assert.deepEqual(
      result.value.sessionIds,
      [],
    );

    assert.deepEqual(
      result.value.audioAssetIds,
      [],
    );
  },
);

test(
  "rejects client attempts to supply identity lifecycle or project graph fields",
  async () => {
    const service =
      new DefaultAuthenticatedSeshProjectCollectionService({
        creatorResolver:
          creatorResolver(),

        projects:
          new InMemorySeshProjectRepository(),

        now:
          () =>
            "2026-09-22T17:00:00.000Z",

        createProjectId:
          () =>
            createSeshMusicProjectId(
              "server-generated",
            ),
      });

    for (
      const forbiddenKey of [
        "id",
        "ownerCreatorId",
        "createdAt",
        "updatedAt",
        "trackIds",
        "sessionIds",
        "audioAssetIds",
      ]
    ) {
      const result =
        await service.createProject({
          title:
            "Forbidden",

          [forbiddenKey]:
            "client-value",
        });

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected invalid creation input.",
        );
      }

      assert.equal(
        result.error.code,
        "invalid-input",
      );
    }
  },
);

test(
  "lists only projects owned by the authenticated creator",
  async () => {
    const projects =
      new InMemorySeshProjectRepository();

    await projects.saveProject({
      id:
        createSeshMusicProjectId(
          "owned-a",
        ),

      ownerCreatorId:
        creatorId,

      title:
        "Owned A",

      createdAt:
        "2026-09-22T15:00:00.000Z",

      updatedAt:
        "2026-09-22T16:00:00.000Z",

      trackIds:
        [],

      sessionIds:
        [],

      audioAssetIds:
        [],
    });

    await projects.saveProject({
      id:
        createSeshMusicProjectId(
          "owned-b",
        ),

      ownerCreatorId:
        creatorId,

      title:
        "Owned B",

      createdAt:
        "2026-09-22T15:00:00.000Z",

      updatedAt:
        "2026-09-22T17:00:00.000Z",

      trackIds:
        [],

      sessionIds:
        [],

      audioAssetIds:
        [],
    });

    await projects.saveProject({
      id:
        createSeshMusicProjectId(
          "other",
        ),

      ownerCreatorId:
        createSeshCreatorId(
          "other",
        ),

      title:
        "Other",

      createdAt:
        "2026-09-22T15:00:00.000Z",

      updatedAt:
        "2026-09-22T18:00:00.000Z",

      trackIds:
        [],

      sessionIds:
        [],

      audioAssetIds:
        [],
    });

    const service =
      new DefaultAuthenticatedSeshProjectCollectionService({
        creatorResolver:
          creatorResolver(),

        projects,

        now:
          () =>
            "2026-09-22T17:00:00.000Z",

        createProjectId:
          () =>
            createSeshMusicProjectId(
              "unused",
            ),
      });

    const result =
      await service.listProjects();

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected owned project collection.",
      );
    }

    assert.deepEqual(
      result.value.map(
        (project) =>
          project.id,
      ),
      [
        "sesh-project:owned-b",
        "sesh-project:owned-a",
      ],
    );
  },
);