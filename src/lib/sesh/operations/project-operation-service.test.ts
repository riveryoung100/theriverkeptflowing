import assert from "node:assert/strict";
import test from "node:test";

import type {
  PrincipalId,
} from "../../identity/identifiers";

import type {
  SeshProjectOwnershipAuthorizationResult,
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProject,
} from "../model";

import {
  InMemorySeshProjectRepository,
} from "../persistence/memory";

import {
  DefaultAuthorizedSeshProjectOperationService,
} from "./project-operation-service";

const principalId =
  "principal:river" as PrincipalId;

const creatorId =
  createSeshCreatorId(
    "river",
  );

const otherCreatorId =
  createSeshCreatorId(
    "other",
  );

const projectId =
  createSeshMusicProjectId(
    "song-one",
  );

const createdAt =
  "2026-09-22T15:00:00.000Z";

const updatedAt =
  "2026-09-22T15:10:00.000Z";

const project:
  SeshMusicProject = {
    id:
      projectId,

    ownerCreatorId:
      creatorId,

    title:
      "Original",

    createdAt,

    updatedAt:
      createdAt,

    trackIds:
      [],

    sessionIds:
      [],

    audioAssetIds:
      [],
  };

function authorizer(
  result:
    SeshProjectOwnershipAuthorizationResult,
): SeshProjectOwnershipAuthorizer {
  return {
    async authorize() {
      return result;
    },
  };
}

function ownerAuthorization(
  action:
    "read" |
    "write" |
    "delete",
): SeshProjectOwnershipAuthorizationResult {
  return {
    ok:
      true,

    value: {
      principalId,
      seshCreatorId:
        creatorId,
      projectId,
      action,
    },
  };
}

async function repositoryWithProject() {
  const repository =
    new InMemorySeshProjectRepository();

  const saved =
    await repository.saveProject(
      project,
    );

  assert.equal(
    saved.ok,
    true,
  );

  return repository;
}

test(
  "reads a project only after owner authorization",
  async () => {
    const repository =
      await repositoryWithProject();

    const service =
      new DefaultAuthorizedSeshProjectOperationService({
        authorizer:
          authorizer(
            ownerAuthorization(
              "read",
            ),
          ),

        projects:
          repository,

        now:
          () => updatedAt,
      });

    const result =
      await service.readProject(
        projectId,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected authorized project read.",
      );
    }

    assert.equal(
      result.value.ownerCreatorId,
      creatorId,
    );
  },
);

test(
  "does not touch project persistence when authorization fails",
  async () => {
    let reads =
      0;

    let writes =
      0;

    let deletes =
      0;

    const service =
      new DefaultAuthorizedSeshProjectOperationService({
        authorizer:
          authorizer({
            ok:
              false,

            error: {
              code:
                "forbidden",

              message:
                "Forbidden.",
            },
          }),

        projects: {
          async getProject() {
            reads +=
              1;

            throw new Error(
              "Unexpected read.",
            );
          },

          async saveProject() {
            writes +=
              1;

            throw new Error(
              "Unexpected write.",
            );
          },

          async getProjectSnapshot() {
            reads +=
              1;

            throw new Error(
              "Unexpected snapshot read.",
            );
          },

          async updateProjectConditionally() {
            writes +=
              1;

            throw new Error(
              "Unexpected conditional write.",
            );
          },

          async deleteProjectConditionally() {
            deletes +=
              1;

            throw new Error(
              "Unexpected conditional delete.",
            );
          },

          async deleteProject() {
            deletes +=
              1;

            throw new Error(
              "Unexpected delete.",
            );
          },

          async projectExists() {
            throw new Error(
              "Unexpected existence check.",
            );
          },
        },

        now:
          () => updatedAt,
      });

    const result =
      await service.updateProject(
        projectId,
        {
          title:
            "Blocked",
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected forbidden result.",
      );
    }

    assert.equal(
      result.error.code,
      "forbidden",
    );

    assert.equal(
      reads,
      0,
    );

    assert.equal(
      writes,
      0,
    );

    assert.equal(
      deletes,
      0,
    );
  },
);

test(
  "updates mutable fields while preserving id ownerCreatorId and createdAt",
  async () => {
    const repository =
      await repositoryWithProject();

    const service =
      new DefaultAuthorizedSeshProjectOperationService({
        authorizer:
          authorizer(
            ownerAuthorization(
              "write",
            ),
          ),

        projects:
          repository,

        now:
          () => updatedAt,
      });

    const result =
      await service.updateProject(
        projectId,
        {
          title:
            "Updated",

          description:
            "New description",
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected successful update.",
      );
    }

    assert.equal(
      result.value.id,
      projectId,
    );

    assert.equal(
      result.value.ownerCreatorId,
      creatorId,
    );

    assert.equal(
      result.value.createdAt,
      createdAt,
    );

    assert.equal(
      result.value.updatedAt,
      updatedAt,
    );

    assert.equal(
      result.value.title,
      "Updated",
    );

    assert.equal(
      result.value.description,
      "New description",
    );
  },
);

for (
  const immutableField of [
    "id",
    "ownerCreatorId",
    "createdAt",
  ] as const
) {
  test(
    `rejects ordinary update attempts to modify immutable ${immutableField}`,
    async () => {
      let authorizationCalls =
        0;

      const repository =
        await repositoryWithProject();

      const service =
        new DefaultAuthorizedSeshProjectOperationService({
          authorizer: {
            async authorize() {
              authorizationCalls +=
                1;

              return ownerAuthorization(
                "write",
              );
            },
          },

          projects:
            repository,

          now:
            () => updatedAt,
        });

      const result =
        await service.updateProject(
          projectId,
          {
            [immutableField]:
              immutableField ===
                "ownerCreatorId"
                ? otherCreatorId
                : "forbidden",
          },
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected immutable-field rejection.",
        );
      }

      assert.equal(
        result.error.code,
        "invalid-input",
      );

      assert.equal(
        authorizationCalls,
        0,
      );

      const loaded =
        await repository.getProject(
          projectId,
        );

      assert.equal(
        loaded.ok,
        true,
      );

      if (
        loaded.ok
      ) {
        assert.equal(
          loaded.value.ownerCreatorId,
          creatorId,
        );
      }
    },
  );
}

test(
  "rejects unknown update fields before authorization",
  async () => {
    let authorizationCalls =
      0;

    const repository =
      await repositoryWithProject();

    const service =
      new DefaultAuthorizedSeshProjectOperationService({
        authorizer: {
          async authorize() {
            authorizationCalls +=
              1;

            return ownerAuthorization(
              "write",
            );
          },
        },

        projects:
          repository,

        now:
          () => updatedAt,
      });

    const result =
      await service.updateProject(
        projectId,
        {
          title:
            "Allowed",

          collaboratorIds:
            ["sesh-creator:other"],
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected invalid-input result.",
      );
    }

    assert.equal(
      result.error.code,
      "invalid-input",
    );

    assert.equal(
      authorizationCalls,
      0,
    );
  },
);

test(
  "maps conditional repository conflicts to operation conflicts",
  async () => {
    const repository =
      await repositoryWithProject();

    const service =
      new DefaultAuthorizedSeshProjectOperationService({
        authorizer:
          authorizer(
            ownerAuthorization(
              "write",
            ),
          ),

        projects: {
          ...repository,

          getProject:
            repository.getProject.bind(
              repository,
            ),

          getProjectSnapshot:
            repository.getProjectSnapshot.bind(
              repository,
            ),

          saveProject:
            repository.saveProject.bind(
              repository,
            ),

          projectExists:
            repository.projectExists.bind(
              repository,
            ),

          deleteProject:
            repository.deleteProject.bind(
              repository,
            ),

          deleteProjectConditionally:
            repository.deleteProjectConditionally.bind(
              repository,
            ),

          async updateProjectConditionally() {
            return {
              ok:
                false,

              error: {
                kind:
                  "conflict",

                message:
                  "Concurrent mutation.",
              },
            };
          },
        },

        now:
          () => updatedAt,
      });

    const result =
      await service.updateProject(
        projectId,
        {
          title:
            "Must conflict",
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected conflict.",
      );
    }

    assert.equal(
      result.error.code,
      "conflict",
    );
  },
);

test(
  "deletes only after owner authorization and current-owner recheck",
  async () => {
    const repository =
      await repositoryWithProject();

    const service =
      new DefaultAuthorizedSeshProjectOperationService({
        authorizer:
          authorizer(
            ownerAuthorization(
              "delete",
            ),
          ),

        projects:
          repository,

        now:
          () => updatedAt,
      });

    const result =
      await service.deleteProject(
        projectId,
      );

    assert.deepEqual(
      result,
      {
        ok:
          true,

        value:
          true,
      },
    );

    const loaded =
      await repository.getProject(
        projectId,
      );

    assert.equal(
      loaded.ok,
      false,
    );
  },
);
