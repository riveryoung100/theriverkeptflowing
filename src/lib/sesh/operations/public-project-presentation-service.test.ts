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
  DefaultPublicSeshProjectPresentationService,
} from "./public-project-presentation-service";

const projectId =
  createSeshMusicProjectId(
    "presentation-project",
  );

const creatorId =
  createSeshCreatorId(
    "presentation-creator",
  );

const handle =
  normalizeSeshCreatorHandle(
    "river",
  );

const publication = () => ({
  projectId,
  ownerCreatorId:
    creatorId,
  state:
    "public" as const,
  updatedAt:
    "2026-09-23T00:00:00.000Z",
});

const project = () => ({
  id:
    projectId,
  ownerCreatorId:
    creatorId,
  title:
    "Public Project",
  description:
    "Public description.",
  createdAt:
    "2026-09-23T00:00:00.000Z",
  updatedAt:
    "2026-09-23T00:00:00.000Z",
});

const reservation = () => ({
  normalizedHandle:
    handle,
  creatorId,
  createdAt:
    "2026-09-23T00:00:00.000Z",
});

const profile = () => ({
  id:
    creatorId,
  displayName:
    "River",
  bio:
    "Public bio.",
  createdAt:
    "2026-09-23T00:00:00.000Z",
  updatedAt:
    "2026-09-23T00:00:00.000Z",
});

function service(
  overrides: {
    readonly publicationResult?:
      unknown;
    readonly projectResult?:
      unknown;
    readonly reservationResult?:
      unknown;
    readonly profileResult?:
      unknown;
  } = {},
) {
  return new DefaultPublicSeshProjectPresentationService({
    publications: {
      async getProjectPublication() {
        return (
          overrides.publicationResult ??
          {
            ok:
              true,
            value:
              publication(),
          }
        ) as never;
      },
    },

    projects: {
      async getProject() {
        return (
          overrides.projectResult ??
          {
            ok:
              true,
            value:
              project(),
          }
        ) as never;
      },
    },

    reservations: {
      async getByCreatorId() {
        return (
          overrides.reservationResult ??
          {
            ok:
              true,
            value:
              reservation(),
          }
        ) as never;
      },
    },

    profiles: {
      async getCreatorProfile() {
        return (
          overrides.profileResult ??
          {
            ok:
              true,
            value:
              profile(),
          }
        ) as never;
      },
    },
  });
}

test(
  "resolves explicit-public project with canonical public creator presentation",
  async () => {
    const result =
      await service()
        .resolveByProjectId(
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
        "Expected success.",
      );
    }

    assert.deepEqual(
      result.value,
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
    );

    assert.equal(
      "ownerCreatorId" in
        result.value.project,
      false,
    );

    assert.equal(
      "creatorId" in
        result.value.creator!,
      false,
    );
  },
);

test(
  "public project remains readable without a creator handle reservation",
  async () => {
    const result =
      await service({
        reservationResult: {
          ok:
            false,
          error: {
            kind:
              "not-found",
            message:
              "missing",
          },
        },
      })
        .resolveByProjectId(
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
        "Expected success.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        project: {
          id:
            projectId,
          title:
            "Public Project",
          description:
            "Public description.",
        },
      },
    );
  },
);

test(
  "public project remains readable when reserved creator has no public profile",
  async () => {
    const result =
      await service({
        profileResult: {
          ok:
            false,
          error: {
            kind:
              "not-found",
            message:
              "missing",
          },
        },
      })
        .resolveByProjectId(
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
        "Expected success.",
      );
    }

    assert.equal(
      result.value.creator,
      undefined,
    );
  },
);

test(
  "private project remains anonymous not-found before creator lookup",
  async () => {
    let reservationReads =
      0;

    const resolver =
      new DefaultPublicSeshProjectPresentationService({
        publications: {
          async getProjectPublication() {
            return {
              ok:
                true,
              value: {
                ...publication(),
                state:
                  "private",
              },
            } as never;
          },
        },

        projects: {
          async getProject() {
            throw new Error(
              "must not run",
            );
          },
        },

        reservations: {
          async getByCreatorId() {
            reservationReads +=
              1;

            throw new Error(
              "must not run",
            );
          },
        },

        profiles: {
          async getCreatorProfile() {
            throw new Error(
              "must not run",
            );
          },
        },
      });

    const result =
      await resolver
        .resolveByProjectId(
          projectId,
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
      reservationReads,
      0,
    );
  },
);

test(
  "fails closed when publication and project owners disagree",
  async () => {
    const otherCreatorId =
      createSeshCreatorId(
        "other-owner",
      );

    const result =
      await service({
        projectResult: {
          ok:
            true,
          value: {
            ...project(),
            ownerCreatorId:
              otherCreatorId,
          },
        },
      })
        .resolveByProjectId(
          projectId,
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
  "fails closed when creator reservation contradicts verified project owner",
  async () => {
    const result =
      await service({
        reservationResult: {
          ok:
            true,
          value: {
            ...reservation(),
            creatorId:
              createSeshCreatorId(
                "wrong-reservation-owner",
              ),
          },
        },
      })
        .resolveByProjectId(
          projectId,
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
  "fails closed when creator profile contradicts canonical reservation",
  async () => {
    const result =
      await service({
        profileResult: {
          ok:
            true,
          value: {
            ...profile(),
            id:
              createSeshCreatorId(
                "wrong-profile-owner",
              ),
          },
        },
      })
        .resolveByProjectId(
          projectId,
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
  "invalid project identifier fails before persistence reads",
  async () => {
    let reads =
      0;

    const resolver =
      new DefaultPublicSeshProjectPresentationService({
        publications: {
          async getProjectPublication() {
            reads +=
              1;

            throw new Error(
              "must not run",
            );
          },
        },

        projects: {
          async getProject() {
            reads +=
              1;

            throw new Error(
              "must not run",
            );
          },
        },

        reservations: {
          async getByCreatorId() {
            reads +=
              1;

            throw new Error(
              "must not run",
            );
          },
        },

        profiles: {
          async getCreatorProfile() {
            reads +=
              1;

            throw new Error(
              "must not run",
            );
          },
        },
      });

    const result =
      await resolver
        .resolveByProjectId(
          "invalid",
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
  },
);

test(
  "maps creator persistence failures to unavailable without leaking identity",
  async () => {
    const result =
      await service({
        reservationResult: {
          ok:
            false,
          error: {
            kind:
              "storage",
            message:
              "storage",
          },
        },
      })
        .resolveByProjectId(
          projectId,
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

    assert.doesNotMatch(
      result.error.message,
      /creatorId|ownerCreatorId|principal/i,
    );
  },
);