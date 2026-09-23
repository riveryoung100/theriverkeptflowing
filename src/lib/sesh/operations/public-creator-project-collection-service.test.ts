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
  DefaultPublicSeshCreatorProjectCollectionService,
} from "./public-creator-project-collection-service";

const handle =
  normalizeSeshCreatorHandle(
    "river",
  );

const creatorId =
  createSeshCreatorId(
    "public-collection-owner",
  );

const projectId =
  createSeshMusicProjectId(
    "public-collection-project",
  );

function dependencies() {
  return {
    reservations: {
      async getByHandle() {
        return {
          ok:
            true as const,

          value: {
            normalizedHandle:
              handle,
            creatorId,
            createdAt:
              "2026-09-23T13:00:00.000Z",
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
            createdAt:
              "2026-09-23T13:00:00.000Z",
          },
        };
      },
    },

    publications: {
      async listPublicProjectPublicationsForOwner() {
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
                "2026-09-23T14:00:00.000Z",
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
              "Visible description.",
            createdAt:
              "2026-09-23T13:00:00.000Z",
            updatedAt:
              "2026-09-23T14:00:00.000Z",
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
  };
}

test(
  "returns canonical handle and only sanitized explicit-public projects",
  async () => {
    const service =
      new DefaultPublicSeshCreatorProjectCollectionService(
        dependencies(),
      );

    const result =
      await service.listByHandle(
        "RIVER",
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected public collection.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        handle:
          "river",
        projects: [
          {
            id:
              projectId,
            title:
              "Public Project",
            description:
              "Visible description.",
          },
        ],
      },
    );

    assert.equal(
      "creatorId" in result.value,
      false,
    );

    for (
      const forbidden of [
        "ownerCreatorId",
        "createdAt",
        "updatedAt",
        "trackIds",
        "sessionIds",
        "audioAssetIds",
        "tempoMapId",
        "beatGridId",
        "revision",
        "schemaVersion",
      ]
    ) {
      assert.equal(
        forbidden in result.value.projects[0]!,
        false,
      );
    }
  },
);

test(
  "empty explicit-public collection succeeds without reading private projects",
  async () => {
    let projectReads =
      0;

    const base =
      dependencies();

    const service =
      new DefaultPublicSeshCreatorProjectCollectionService({
        ...base,

        publications: {
          async listPublicProjectPublicationsForOwner() {
            return {
              ok:
                true as const,
              value:
                [],
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
      });

    const result =
      await service.listByHandle(
        handle,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected empty collection.",
      );
    }

    assert.deepEqual(
      result.value.projects,
      [],
    );

    assert.equal(
      projectReads,
      0,
    );
  },
);

test(
  "missing canonical reservation returns not-found before project collection reads",
  async () => {
    let downstreamReads =
      0;

    const base =
      dependencies();

    const service =
      new DefaultPublicSeshCreatorProjectCollectionService({
        ...base,

        reservations: {
          async getByHandle() {
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

        profiles: {
          async getCreatorProfile() {
            downstreamReads +=
              1;

            return base.profiles
              .getCreatorProfile();
          },
        },

        publications: {
          async listPublicProjectPublicationsForOwner() {
            downstreamReads +=
              1;

            return base.publications
              .listPublicProjectPublicationsForOwner();
          },
        },
      });

    const result =
      await service.listByHandle(
        handle,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected not-found.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );

    assert.equal(
      downstreamReads,
      0,
    );
  },
);

test(
  "missing public creator profile returns not-found before publication collection read",
  async () => {
    let publicationReads =
      0;

    const base =
      dependencies();

    const service =
      new DefaultPublicSeshCreatorProjectCollectionService({
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

        publications: {
          async listPublicProjectPublicationsForOwner() {
            publicationReads +=
              1;

            return base.publications
              .listPublicProjectPublicationsForOwner();
          },
        },
      });

    const result =
      await service.listByHandle(
        handle,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected not-found.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );

    assert.equal(
      publicationReads,
      0,
    );
  },
);

test(
  "fails closed when publication collection contains a non-public or different-owner record",
  async () => {
    const base =
      dependencies();

    for (
      const value of [
        {
          projectId,
          ownerCreatorId:
            creatorId,
          state:
            "private" as const,
          updatedAt:
            "2026-09-23T14:00:00.000Z",
        },
        {
          projectId,
          ownerCreatorId:
            createSeshCreatorId(
              "different-owner",
            ),
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T14:00:00.000Z",
        },
      ]
    ) {
      const service =
        new DefaultPublicSeshCreatorProjectCollectionService({
          ...base,

          publications: {
            async listPublicProjectPublicationsForOwner() {
              return {
                ok:
                  true as const,
                value: [
                  value,
                ],
              };
            },
          },
        });

      const result =
        await service.listByHandle(
          handle,
        );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected invariant failure.",
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
  "fails closed when canonical project identity or owner contradicts publication",
  async () => {
    const base =
      dependencies();

    const service =
      new DefaultPublicSeshCreatorProjectCollectionService({
        ...base,

        projects: {
          async getProject() {
            return {
              ok:
                true as const,

              value: {
                ...(await base.projects
                  .getProject()).value,
                ownerCreatorId:
                  createSeshCreatorId(
                    "different-project-owner",
                  ),
              },
            };
          },
        },
      });

    const result =
      await service.listByHandle(
        handle,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected project invariant failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "invalid handle fails before persistence and operational failures map to unavailable",
  async () => {
    let reads =
      0;

    const invalid =
      new DefaultPublicSeshCreatorProjectCollectionService({
        reservations: {
          async getByHandle() {
            reads +=
              1;

            throw new Error(
              "must not run",
            );
          },
        },

        profiles:
          dependencies().profiles,

        publications:
          dependencies().publications,

        projects:
          dependencies().projects,
      });

    const invalidResult =
      await invalid.listByHandle(
        "ab",
      );

    assert.equal(
      invalidResult.ok,
      false,
    );

    if (
      invalidResult.ok
    ) {
      throw new Error(
        "Expected invalid-input.",
      );
    }

    assert.equal(
      invalidResult.error.code,
      "invalid-input",
    );

    assert.equal(
      reads,
      0,
    );

    const base =
      dependencies();

    const unavailable =
      new DefaultPublicSeshCreatorProjectCollectionService({
        ...base,

        publications: {
          async listPublicProjectPublicationsForOwner() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "storage" as const,
                message:
                  "storage",
              },
            };
          },
        },
      });

    const unavailableResult =
      await unavailable.listByHandle(
        handle,
      );

    assert.equal(
      unavailableResult.ok,
      false,
    );

    if (
      unavailableResult.ok
    ) {
      throw new Error(
        "Expected unavailable.",
      );
    }

    assert.equal(
      unavailableResult.error.code,
      "unavailable",
    );
  },
);