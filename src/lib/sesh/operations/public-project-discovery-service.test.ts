import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSeshCreatorHandle,
} from "../creator-handle";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import {
  DefaultPublicSeshProjectDiscoveryService,
} from "./public-project-discovery-service";

const creatorId =
  createSeshCreatorId(
    "discovery-owner",
  );

const projectId =
  createSeshMusicProjectId(
    "discovery-project",
  );

const handle =
  normalizeSeshCreatorHandle(
    "river",
  );

function dependencies() {
  return {
    publications: {
      async listPublicProjectPublications() {
        return {
          ok:
            true as const,
          value: [
            {
              projectId,
              ownerCreatorId:
                creatorId,
              state:
                "public" as const,
              updatedAt:
                "2026-09-23T15:00:00.000Z",
            },
          ],
        };
      },
    },

    projects: {
      async getProject() {
        return {
          ok:
            true as const,
          value: {
            id:
              projectId,
            ownerCreatorId:
              creatorId,
            title:
              "Public Project",
            description:
              "Public description.",
            createdAt:
              "2026-09-23T14:00:00.000Z",
            updatedAt:
              "2026-09-23T15:00:00.000Z",
            trackIds:
              [],
            sessionIds:
              [],
            audioAssetIds:
              [],
          },
        };
      },
    },

    reservations: {
      async getByCreatorId() {
        return {
          ok:
            true as const,
          value: {
            normalizedHandle:
              handle,
            creatorId,
            createdAt:
              "2026-09-23T14:00:00.000Z",
          },
        };
      },
    },

    profiles: {
      async getCreatorProfile() {
        return {
          ok:
            true as const,
          value: {
            id:
              creatorId,
            displayName:
              "River",
            bio:
              "Private-to-this-output bio.",
            createdAt:
              "2026-09-23T14:00:00.000Z",
            updatedAt:
              "2026-09-23T15:00:00.000Z",
          },
        };
      },
    },
  };
}

test(
  "returns only sanitized explicit-public projects with optional canonical creator attribution",
  async () => {
    const result =
      await new DefaultPublicSeshProjectDiscoveryService(
        dependencies(),
      ).listPublicProjects(
        20,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected public discovery success.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        projects: [
          {
            project: {
              id:
                projectId,
              title:
                "Public Project",
              description:
                "Public description.",
            },
            creator: {
              handle,
              displayName:
                "River",
            },
          },
        ],
      },
    );

    const item =
      result.value.projects[0]!;

    for (
      const forbidden of [
        "ownerCreatorId",
        "createdAt",
        "updatedAt",
        "trackIds",
        "sessionIds",
        "audioAssetIds",
        "revision",
        "schemaVersion",
      ]
    ) {
      assert.equal(
        forbidden in item.project,
        false,
      );
    }

    assert.equal(
      "creatorId" in item.creator!,
      false,
    );

    assert.equal(
      "id" in item.creator!,
      false,
    );

    assert.equal(
      "bio" in item.creator!,
      false,
    );
  },
);

test(
  "missing canonical handle keeps an explicit-public project discoverable without creator attribution",
  async () => {
    const base =
      dependencies();

    const result =
      await new DefaultPublicSeshProjectDiscoveryService({
        ...base,

        reservations: {
          async getByCreatorId() {
            return {
              ok:
                false as const,
              error: {
                kind:
                  "not-found" as const,
                message:
                  "missing",
              },
            };
          },
        },
      }).listPublicProjects(
        20,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected public discovery success.",
      );
    }

    assert.equal(
      result.value.projects.length,
      1,
    );

    assert.equal(
      result.value.projects[0]?.creator,
      undefined,
    );
  },
);

test(
  "missing public creator profile keeps an explicit-public project discoverable without creator attribution",
  async () => {
    const base =
      dependencies();

    const result =
      await new DefaultPublicSeshProjectDiscoveryService({
        ...base,

        profiles: {
          async getCreatorProfile() {
            return {
              ok:
                false as const,
              error: {
                kind:
                  "not-found" as const,
                message:
                  "missing",
              },
            };
          },
        },
      }).listPublicProjects(
        20,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected public discovery success.",
      );
    }

    assert.equal(
      result.value.projects[0]?.creator,
      undefined,
    );
  },
);

test(
  "rejects invalid discovery limits before persistence reads",
  async () => {
    for (
      const limit of [
        0,
        -1,
        1.5,
        51,
        Number.NaN,
        Number.POSITIVE_INFINITY,
      ]
    ) {
      let reads =
        0;

      const base =
        dependencies();

      const result =
        await new DefaultPublicSeshProjectDiscoveryService({
          ...base,

          publications: {
            async listPublicProjectPublications() {
              reads +=
                1;

              throw new Error(
                "must not run",
              );
            },
          },
        }).listPublicProjects(
          limit,
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected invalid-input.",
        );
      }

      assert.equal(
        result.error.code,
        "invalid-input",
      );

      assert.equal(
        reads,
        0,
      );
    }
  },
);

test(
  "fails closed if discovery persistence returns a private publication",
  async () => {
    const base =
      dependencies();

    let projectReads =
      0;

    const result =
      await new DefaultPublicSeshProjectDiscoveryService({
        ...base,

        publications: {
          async listPublicProjectPublications() {
            return {
              ok:
                true as const,
              value: [
                {
                  projectId,
                  ownerCreatorId:
                    creatorId,
                  state:
                    "private" as const,
                  updatedAt:
                    "2026-09-23T15:00:00.000Z",
                },
              ],
            };
          },
        },

        projects: {
          async getProject() {
            projectReads +=
              1;

            return base.projects
              .getProject();
          },
        },
      }).listPublicProjects(
        20,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.equal(
      projectReads,
      0,
    );
  },
);

test(
  "fails closed when publication and canonical project identity disagree",
  async () => {
    const base =
      dependencies();

    const result =
      await new DefaultPublicSeshProjectDiscoveryService({
        ...base,

        projects: {
          async getProject() {
            const current =
              await base.projects
                .getProject();

            return {
              ...current,
              value: {
                ...current.value,
                ownerCreatorId:
                  createSeshCreatorId(
                    "different-owner",
                  ),
              },
            };
          },
        },
      }).listPublicProjects(
        20,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected unavailable.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "fails closed when creator reservation or profile contradicts verified project owner",
  async () => {
    const base =
      dependencies();

    const wrongCreator =
      createSeshCreatorId(
        "wrong-discovery-creator",
      );

    for (
      const overrides of [
        {
          reservations: {
            async getByCreatorId() {
              return {
                ok:
                  true as const,
                value: {
                  normalizedHandle:
                    handle,
                  creatorId:
                    wrongCreator,
                  createdAt:
                    "2026-09-23T14:00:00.000Z",
                },
              };
            },
          },
        },
        {
          profiles: {
            async getCreatorProfile() {
              return {
                ok:
                  true as const,
                value: {
                  id:
                    wrongCreator,
                  displayName:
                    "Wrong",
                  createdAt:
                    "2026-09-23T14:00:00.000Z",
                  updatedAt:
                    "2026-09-23T15:00:00.000Z",
                },
              };
            },
          },
        },
      ]
    ) {
      const result =
        await new DefaultPublicSeshProjectDiscoveryService({
          ...base,
          ...overrides,
        } as never).listPublicProjects(
          20,
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected unavailable.",
        );
      }

      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "maps publication project and creator persistence failures to unavailable",
  async () => {
    const base =
      dependencies();

    const failureResult = {
      ok:
        false as const,
      error: {
        kind:
          "storage" as const,
        message:
          "storage",
      },
    };

    const variants = [
      {
        publications: {
          async listPublicProjectPublications() {
            return failureResult;
          },
        },
      },
      {
        projects: {
          async getProject() {
            return failureResult;
          },
        },
      },
      {
        reservations: {
          async getByCreatorId() {
            return failureResult;
          },
        },
      },
      {
        profiles: {
          async getCreatorProfile() {
            return failureResult;
          },
        },
      },
    ];

    for (
      const variant of variants
    ) {
      const result =
        await new DefaultPublicSeshProjectDiscoveryService({
          ...base,
          ...variant,
        } as never).listPublicProjects(
          20,
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected unavailable.",
        );
      }

      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);