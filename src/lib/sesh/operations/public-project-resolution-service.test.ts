import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshProjectPublicationRepository,
} from "../persistence/project-publication-repository";

import type {
  SeshProjectRepository,
} from "../persistence/repositories";

import {
  DefaultPublicSeshProjectResolutionService,
} from "./public-project-resolution-service";

const projectId =
  createSeshMusicProjectId(
    "public-resolution-project",
  );

const ownerCreatorId =
  createSeshCreatorId(
    "public-resolution-owner",
  );

function publicPublication() {
  return {
    projectId,
    ownerCreatorId,
    state:
      "public" as const,
    updatedAt:
      "2026-09-23T14:00:00.000Z",
  };
}

function canonicalProject() {
  return {
    id:
      projectId,
    ownerCreatorId,
    title:
      "Public Project",
    description:
      "Public description.",
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
  };
}

function service(
  publicationResult:
    Awaited<
      ReturnType<
        SeshProjectPublicationRepository[
          "getProjectPublication"
        ]
      >
    >,

  projectResult:
    Awaited<
      ReturnType<
        SeshProjectRepository[
          "getProject"
        ]
      >
    >,
) {
  return new DefaultPublicSeshProjectResolutionService({
    publications: {
      async getProjectPublication() {
        return publicationResult;
      },
    },

    projects: {
      async getProject() {
        return projectResult;
      },
    },
  });
}

test(
  "resolves only id title and description for an explicitly public project",
  async () => {
    const resolver =
      service(
        {
          ok:
            true,
          value:
            publicPublication(),
        },
        {
          ok:
            true,
          value:
            canonicalProject(),
        },
      );

    const result =
      await resolver.resolveByProjectId(
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
        "Expected public project resolution.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        id:
          projectId,
        title:
          "Public Project",
        description:
          "Public description.",
      },
    );

    assert.deepEqual(
      Object.keys(
        result.value,
      ).sort(),
      [
        "description",
        "id",
        "title",
      ],
    );

    for (const forbidden of [
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
    ]) {
      assert.equal(
        forbidden in result.value,
        false,
      );
    }
  },
);

test(
  "absence of publication is anonymous not-found and project persistence is not read",
  async () => {
    let projectReads =
      0;

    const resolver =
      new DefaultPublicSeshProjectResolutionService({
        publications: {
          async getProjectPublication() {
            return {
              ok:
                false,
              error: {
                kind:
                  "not-found",
                message:
                  "missing",
              },
            };
          },
        },

        projects: {
          async getProject() {
            projectReads +=
              1;

            return {
              ok:
                true,
              value:
                canonicalProject(),
            };
          },
        },
      });

    const result =
      await resolver.resolveByProjectId(
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
      projectReads,
      0,
    );
  },
);

test(
  "private publication is indistinguishable from absent publication and does not read project",
  async () => {
    let projectReads =
      0;

    const resolver =
      new DefaultPublicSeshProjectResolutionService({
        publications: {
          async getProjectPublication() {
            return {
              ok:
                true,
              value: {
                ...publicPublication(),
                state:
                  "private",
              },
            };
          },
        },

        projects: {
          async getProject() {
            projectReads +=
              1;

            return {
              ok:
                true,
              value:
                canonicalProject(),
            };
          },
        },
      });

    const result =
      await resolver.resolveByProjectId(
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
        "Expected private project to remain hidden.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );

    assert.equal(
      projectReads,
      0,
    );
  },
);

test(
  "fails closed when publication owner contradicts canonical project owner",
  async () => {
    const resolver =
      service(
        {
          ok:
            true,
          value:
            publicPublication(),
        },
        {
          ok:
            true,
          value: {
            ...canonicalProject(),
            ownerCreatorId:
              createSeshCreatorId(
                "different-owner",
              ),
          },
        },
      );

    const result =
      await resolver.resolveByProjectId(
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
        "Expected owner invariant failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "invalid project id fails before any persistence read",
  async () => {
    let reads =
      0;

    const resolver =
      new DefaultPublicSeshProjectResolutionService({
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
      });

    const result =
      await resolver.resolveByProjectId(
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
  "maps persistence failures to unavailable",
  async () => {
    const publicationFailure =
      service(
        {
          ok:
            false,
          error: {
            kind:
              "storage",
            message:
              "storage",
          },
        },
        {
          ok:
            true,
          value:
            canonicalProject(),
        },
      );

    const first =
      await publicationFailure
        .resolveByProjectId(
          projectId,
        );

    assert.equal(
      first.ok,
      false,
    );

    if (
      first.ok
    ) {
      throw new Error(
        "Expected unavailable.",
      );
    }

    assert.equal(
      first.error.code,
      "unavailable",
    );

    const projectFailure =
      service(
        {
          ok:
            true,
          value:
            publicPublication(),
        },
        {
          ok:
            false,
          error: {
            kind:
              "storage",
            message:
              "storage",
          },
        },
      );

    const second =
      await projectFailure
        .resolveByProjectId(
          projectId,
        );

    assert.equal(
      second.ok,
      false,
    );

    if (
      second.ok
    ) {
      throw new Error(
        "Expected unavailable.",
      );
    }

    assert.equal(
      second.error.code,
      "unavailable",
    );
  },
);