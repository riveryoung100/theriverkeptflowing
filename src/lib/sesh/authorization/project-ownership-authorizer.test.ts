import assert from "node:assert/strict";
import test from "node:test";

import type {
  PrincipalId,
} from "../../identity/identifiers";

import type {
  AuthenticatedSeshCreatorResolutionResult,
  AuthenticatedSeshCreatorResolver,
} from "../../identity/sesh/authenticated-creator-resolver";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshMusicProject,
} from "../model";

import type {
  SeshPersistenceResult,
} from "../persistence/model";

import {
  DefaultSeshProjectOwnershipAuthorizer,
} from "./project-ownership-authorizer";

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

const timestamp =
  "2026-09-22T15:00:00.000Z";

const project:
  SeshMusicProject = {
    id:
      projectId,

    ownerCreatorId:
      creatorId,

    title:
      "Song One",

    createdAt:
      timestamp,

    updatedAt:
      timestamp,

    trackIds:
      [],

    sessionIds:
      [],

    audioAssetIds:
      [],
  };

function creatorResolver(
  result:
    AuthenticatedSeshCreatorResolutionResult,
): AuthenticatedSeshCreatorResolver {
  return {
    async resolve() {
      return result;
    },
  };
}

function projectReader(
  result:
    SeshPersistenceResult<
      SeshMusicProject
    >,
) {
  return {
    async getProject() {
      return result;
    },
  };
}

for (
  const action of [
    "read",
    "write",
    "delete",
  ] as const
) {
  test(
    `authorizes project owner for ${action}`,
    async () => {
      const authorizer =
        new DefaultSeshProjectOwnershipAuthorizer({
          creatorResolver:
            creatorResolver({
              ok:
                true,

              value: {
                principalId,
                seshCreatorId:
                  creatorId,
              },
            }),

          projects:
            projectReader({
              ok:
                true,

              value:
                project,
            }),
        });

      const result =
        await authorizer.authorize(
          projectId,
          action,
        );

      assert.equal(
        result.ok,
        true,
      );

      if (
        !result.ok
      ) {
        throw new Error(
          "Expected ownership authorization.",
        );
      }

      assert.deepEqual(
        result.value,
        {
          principalId:
            "principal:river",

          seshCreatorId:
            "sesh-creator:river",

          projectId:
            "sesh-project:song-one",

          action,
        },
      );
    },
  );
}

test(
  "denies an authenticated creator who does not own the project",
  async () => {
    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              true,

            value: {
              principalId,
              seshCreatorId:
                otherCreatorId,
            },
          }),

        projects:
          projectReader({
            ok:
              true,

            value:
              project,
          }),
      });

    const result =
      await authorizer.authorize(
        projectId,
        "read",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected forbidden authorization.",
      );
    }

    assert.equal(
      result.error.code,
      "forbidden",
    );
  },
);

test(
  "preserves unauthenticated state",
  async () => {
    let projectReads =
      0;

    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              false,

            error: {
              code:
                "unauthenticated",

              message:
                "Authentication is required.",
            },
          }),

        projects: {
          async getProject() {
            projectReads +=
              1;

            throw new Error(
              "Project lookup must not run.",
            );
          },
        },
      });

    const result =
      await authorizer.authorize(
        projectId,
        "read",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unauthenticated result.",
      );
    }

    assert.equal(
      result.error.code,
      "unauthenticated",
    );

    assert.equal(
      projectReads,
      0,
    );
  },
);

test(
  "preserves authenticated but unmapped creator state",
  async () => {
    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              false,

            error: {
              code:
                "unmapped",

              message:
                "No mapping.",
            },
          }),

        projects:
          projectReader({
            ok:
              true,

            value:
              project,
          }),
      });

    const result =
      await authorizer.authorize(
        projectId,
        "read",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unmapped result.",
      );
    }

    assert.equal(
      result.error.code,
      "unmapped",
    );
  },
);

test(
  "returns not-found when the canonical project does not exist",
  async () => {
    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              true,

            value: {
              principalId,
              seshCreatorId:
                creatorId,
            },
          }),

        projects:
          projectReader({
            ok:
              false,

            error: {
              kind:
                "not-found",

              message:
                "Missing.",
            },
          }),
      });

    const result =
      await authorizer.authorize(
        projectId,
        "read",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected not-found result.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );
  },
);

test(
  "maps project persistence failures to unavailable",
  async () => {
    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              true,

            value: {
              principalId,
              seshCreatorId:
                creatorId,
            },
          }),

        projects:
          projectReader({
            ok:
              false,

            error: {
              kind:
                "storage",

              message:
                "Unavailable.",
            },
          }),
      });

    const result =
      await authorizer.authorize(
        projectId,
        "write",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable result.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "fails closed when repository project identity does not match requested project",
  async () => {
    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              true,

            value: {
              principalId,
              seshCreatorId:
                creatorId,
            },
          }),

        projects:
          projectReader({
            ok:
              true,

            value: {
              ...project,

              id:
                createSeshMusicProjectId(
                  "different-project",
                ),
            },
          }),
      });

    const result =
      await authorizer.authorize(
        projectId,
        "delete",
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable result.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "does not grant collaborator publishing or management authorization",
  async () => {
    const authorizer =
      new DefaultSeshProjectOwnershipAuthorizer({
        creatorResolver:
          creatorResolver({
            ok:
              true,

            value: {
              principalId,
              seshCreatorId:
                creatorId,
            },
          }),

        projects:
          projectReader({
            ok:
              true,

            value:
              project,
          }),
      });

    const result =
      await authorizer.authorize(
        projectId,
        "read",
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected ownership authorization.",
      );
    }

    assert.deepEqual(
      Object.keys(
        result.value,
      ),
      [
        "principalId",
        "seshCreatorId",
        "projectId",
        "action",
      ],
    );
  },
);
