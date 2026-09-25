import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshAudioAssetId,
  createSeshCreatorId,
  createSeshMusicProjectId,
  createSeshTrackId,
} from "../identifiers";

import type {
  SeshAudioAsset,
  SeshMusicProject,
  SeshTrack,
} from "../model";

import type {
  DefaultCreatorAudioDeleteServiceDependencies,
} from "./creator-audio-delete-service";

import {
  InMemorySeshAudioAssetRepository,
  InMemorySeshAudioObjectStore,
  InMemorySeshProjectRepository,
} from "../persistence/memory";

import {
  InMemorySeshTrackRepository,
} from "../persistence/track-repository";

import {
  DefaultCreatorAudioDeleteService,
} from "./creator-audio-delete-service";

const projectId =
  "sesh-project:delete-project";

const audioAssetId =
  "sesh-audio:delete-audio";

const creatorId =
  "sesh-creator:delete-owner";

const storageReference = {
  provider:
    "r2" as const,

  bucket:
    "private-bucket",

  key:
    "sesh/projects/delete-project/audio/delete-audio/source.wav",
};

const project:
SeshMusicProject = {
  id:
    projectId,

  ownerCreatorId:
    creatorId,

  title:
    "Delete project",

  description:
    "",

  createdAt:
    "2026-09-24T00:00:00.000Z",

  updatedAt:
    "2026-09-24T00:00:00.000Z",

  trackIds:
    [],

  audioAssetIds: [
    audioAssetId,
  ],
};

const asset:
SeshAudioAsset = {
  id:
    audioAssetId,

  projectId,

  kind:
    "recording",

  name:
    "Delete me",

  createdAt:
    "2026-09-24T00:00:00.000Z",

  storageReference,

  contentType:
    "audio/wav",
};

function authorizer():
SeshProjectOwnershipAuthorizer {
  return {
    async authorize(
      receivedProjectId,
      mode,
    ) {
      assert.equal(
        receivedProjectId,
        projectId,
      );

      assert.equal(
        mode,
        "write",
      );

      return {
        ok:
          true as const,

        value: {
          projectId,

          seshCreatorId:
            creatorId,
        },
      };
    },
  };
}

function deleteService(
  dependencies:
    Omit<
      DefaultCreatorAudioDeleteServiceDependencies,
      "tracks"
    >,
): DefaultCreatorAudioDeleteService {
  return new DefaultCreatorAudioDeleteService({
    ...dependencies,

    tracks: {
      async listTracksForProject() {
        return {
          ok:
            true as const,

          value:
            [] as readonly SeshTrack[],
        };
      },
    },
  });
}

test(
  "deletes private audio by detaching project first then metadata then R2",
  async () => {
    const order:
      string[] =
        [];

    const service =
      deleteService({
        authorizer:
          authorizer(),

        projects: {
          async getProjectSnapshot() {
            order.push(
              "snapshot",
            );

            return {
              ok:
                true as const,

              value: {
                project,

                revision:
                  7,
              },
            };
          },

          async updateProjectConditionally(
            updatedProject,
            expectedRevision,
            expectedOwner,
          ) {
            order.push(
              "project-detach",
            );

            assert.equal(
              expectedRevision,
              7,
            );

            assert.equal(
              expectedOwner,
              creatorId,
            );

            const value =
              updatedProject as
                SeshMusicProject;

            assert.deepEqual(
              value.audioAssetIds,
              [],
            );

            return {
              ok:
                true as const,

              value: {
                project:
                  value,

                revision:
                  8,
              },
            };
          },
        },

        audioAssets: {
          async getAudioAsset() {
            order.push(
              "metadata-read",
            );

            return {
              ok:
                true as const,

              value:
                asset,
            };
          },

          async deleteAudioAssetMetadata() {
            order.push(
              "metadata-delete",
            );

            return {
              ok:
                true as const,

              value:
                true,
            };
          },
        },

        audioObjects: {
          async deleteObject(
            reference,
          ) {
            order.push(
              "r2-delete",
            );

            assert.deepEqual(
              reference,
              storageReference,
            );

            return {
              ok:
                true as const,

              value:
                true,
            };
          },
        },

        now:
          () =>
            "2026-09-24T01:00:00.000Z",
      });

    const result =
      await service
        .deleteProjectAudio(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      order,
      [
        "snapshot",
        "metadata-read",
        "project-detach",
        "metadata-delete",
        "r2-delete",
      ],
    );
  },
);

test(
  "stops before metadata or R2 deletion when project CAS conflicts",
  async () => {
    let metadataDeleted =
      false;

    let objectDeleted =
      false;

    const service =
      deleteService({
        authorizer:
          authorizer(),

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,

              value: {
                project,

                revision:
                  3,
              },
            };
          },

          async updateProjectConditionally() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "conflict" as const,

                message:
                  "Project changed.",
              },
            };
          },
        },

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value:
                asset,
            };
          },

          async deleteAudioAssetMetadata() {
            metadataDeleted =
              true;

            throw new Error(
              "must not delete metadata",
            );
          },
        },

        audioObjects: {
          async deleteObject() {
            objectDeleted =
              true;

            throw new Error(
              "must not delete object",
            );
          },
        },
      });

    const result =
      await service
        .deleteProjectAudio(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected conflict.",
      );
    }

    assert.equal(
      result.error.code,
      "conflict",
    );

    assert.equal(
      metadataDeleted,
      false,
    );

    assert.equal(
      objectDeleted,
      false,
    );
  },
);

test(
  "never reads metadata or storage when owner authorization fails",
  async () => {
    let touched =
      false;

    const service =
      deleteService({
        authorizer: {
          async authorize() {
            return {
              ok:
                false as const,

              error: {
                code:
                  "forbidden" as const,

                message:
                  "Forbidden.",
              },
            };
          },
        },

        projects: {
          async getProjectSnapshot() {
            touched =
              true;

            throw new Error(
              "must not read project",
            );
          },

          async updateProjectConditionally() {
            touched =
              true;

            throw new Error(
              "must not write project",
            );
          },
        },

        audioAssets: {
          async getAudioAsset() {
            touched =
              true;

            throw new Error(
              "must not read metadata",
            );
          },

          async deleteAudioAssetMetadata() {
            touched =
              true;

            throw new Error(
              "must not delete metadata",
            );
          },
        },

        audioObjects: {
          async deleteObject() {
            touched =
              true;

            throw new Error(
              "must not delete object",
            );
          },
        },
      });

    const result =
      await service
        .deleteProjectAudio(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      touched,
      false,
    );
  },
);

test(
  "retains R2 when metadata cleanup fails after project detachment",
  async () => {
    let objectDeleted =
      false;

    const service =
      deleteService({
        authorizer:
          authorizer(),

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,

              value: {
                project,

                revision:
                  1,
              },
            };
          },

          async updateProjectConditionally(
            updatedProject,
          ) {
            return {
              ok:
                true as const,

              value: {
                project:
                  updatedProject as
                    SeshMusicProject,

                revision:
                  2,
              },
            };
          },
        },

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value:
                asset,
            };
          },

          async deleteAudioAssetMetadata() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "storage" as const,

                message:
                  "D1 unavailable.",
              },
            };
          },
        },

        audioObjects: {
          async deleteObject() {
            objectDeleted =
              true;

            return {
              ok:
                true as const,

              value:
                true,
            };
          },
        },
      });

    const result =
      await service
        .deleteProjectAudio(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      objectDeleted,
      false,
    );

    if (result.ok) {
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
  "surfaces orphan cleanup risk if R2 delete fails after metadata deletion",
  async () => {
    const service =
      deleteService({
        authorizer:
          authorizer(),

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,

              value: {
                project,

                revision:
                  4,
              },
            };
          },

          async updateProjectConditionally(
            updatedProject,
          ) {
            return {
              ok:
                true as const,

              value: {
                project:
                  updatedProject as
                    SeshMusicProject,

                revision:
                  5,
              },
            };
          },
        },

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value:
                asset,
            };
          },

          async deleteAudioAssetMetadata() {
            return {
              ok:
                true as const,

              value:
                true,
            };
          },
        },

        audioObjects: {
          async deleteObject() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "storage" as const,

                message:
                  "R2 unavailable.",
              },
            };
          },
        },
      });

    const result =
      await service
        .deleteProjectAudio(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected unavailable.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.match(
      result.error.message,
      /binary cleanup failed/i,
    );
  },
);
test(
  "rejects deletion while private audio is referenced by a project track",
  async () => {
    const tracks =
      new InMemorySeshTrackRepository();

    const track:
      SeshTrack = {
        id:
          "sesh-track:delete-guard-track",

        projectId,

        name:
          "Referenced audio",

        order:
          0,

        audioAssetIds: [
          audioAssetId,
        ],
      };

    const saved =
      await tracks.saveTrack(
        track,
      );

    assert.equal(
      saved.ok,
      true,
    );

    let projectDetached =
      false;

    let metadataDeleted =
      false;

    let objectDeleted =
      false;

    const service =
      new DefaultCreatorAudioDeleteService({
        authorizer:
          authorizer(),

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,

              value: {
                project: {
                  ...project,

                  trackIds: [
                    track.id,
                  ],
                },

                revision:
                  9,
              },
            };
          },

          async updateProjectConditionally() {
            projectDetached =
              true;

            throw new Error(
              "project detach must not run while audio is referenced",
            );
          },
        },

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value:
                asset,
            };
          },

          async deleteAudioAssetMetadata() {
            metadataDeleted =
              true;

            throw new Error(
              "metadata delete must not run while audio is referenced",
            );
          },
        },

        audioObjects: {
          async deleteObject() {
            objectDeleted =
              true;

            throw new Error(
              "R2 delete must not run while audio is referenced",
            );
          },
        },

        tracks,
      });

    const result =
      await service.deleteProjectAudio(
        projectId,
        audioAssetId,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "conflict",
    );

    assert.equal(
      projectDetached,
      false,
    );

    assert.equal(
      metadataDeleted,
      false,
    );

    assert.equal(
      objectDeleted,
      false,
    );

    const retainedTrack =
      await tracks.getTrack(
        track.id,
      );

    assert.equal(
      retainedTrack.ok,
      true,
    );

    if (
      !retainedTrack.ok
    ) {
      return;
    }

    assert.deepEqual(
      retainedTrack.value.audioAssetIds,
      [
        audioAssetId,
      ],
    );
  },
);

test(
  "fails closed before destructive audio deletion when track listing is unavailable",
  async () => {
    let projectDetached =
      false;

    let metadataDeleted =
      false;

    let objectDeleted =
      false;

    const service =
      new DefaultCreatorAudioDeleteService({
        authorizer:
          authorizer(),

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,

              value: {
                project,

                revision:
                  10,
              },
            };
          },

          async updateProjectConditionally() {
            projectDetached =
              true;

            throw new Error(
              "project detach must not run after track-list failure",
            );
          },
        },

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value:
                asset,
            };
          },

          async deleteAudioAssetMetadata() {
            metadataDeleted =
              true;

            throw new Error(
              "metadata delete must not run after track-list failure",
            );
          },
        },

        audioObjects: {
          async deleteObject() {
            objectDeleted =
              true;

            throw new Error(
              "R2 delete must not run after track-list failure",
            );
          },
        },

        tracks: {
          async listTracksForProject() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "storage" as const,

                message:
                  "simulated track repository failure",
              },
            };
          },
        },
      });

    const result =
      await service.deleteProjectAudio(
        projectId,
        audioAssetId,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.equal(
      projectDetached,
      false,
    );

    assert.equal(
      metadataDeleted,
      false,
    );

    assert.equal(
      objectDeleted,
      false,
    );
  },
);
async function createCanonicalMembershipDeleteFixture(
  mode:
    "orphan" |
    "missing" |
    "duplicate",
) {
  const fixtureProjectId =
    createSeshMusicProjectId(
      `audio-delete-canonical-${mode}`,
    );

  const fixtureCreatorId =
    createSeshCreatorId(
      `audio-delete-canonical-${mode}-owner`,
    );

  const fixtureAudioAssetId =
    createSeshAudioAssetId(
      `audio-delete-canonical-${mode}-audio`,
    );

  const canonicalTrackId =
    createSeshTrackId(
      `audio-delete-canonical-${mode}-track`,
    );

  const orphanTrackId =
    createSeshTrackId(
      `audio-delete-canonical-${mode}-orphan`,
    );

  const fixtureStorageReference = {
    provider:
      "r2" as const,

    bucket:
      "private-bucket",

    key:
      `private/${fixtureProjectId}/${fixtureAudioAssetId}.wav`,
  };

  const projects =
    new InMemorySeshProjectRepository();

  const audioAssets =
    new InMemorySeshAudioAssetRepository();

  const audioObjects =
    new InMemorySeshAudioObjectStore();

  const tracks =
    new InMemorySeshTrackRepository();

  const savedProject =
    await projects.saveProject({
      id:
        fixtureProjectId,

      ownerCreatorId:
        fixtureCreatorId,

      title:
        `Canonical Guard ${mode}`,

      createdAt:
        "2026-09-25T21:00:00.000Z",

      updatedAt:
        "2026-09-25T21:00:00.000Z",

      trackIds:
        mode ===
          "orphan"
          ? []
          : [
              canonicalTrackId,
            ],

      sessionIds:
        [],

      audioAssetIds:
        [
          fixtureAudioAssetId,
        ],
    });

  assert.equal(
    savedProject.ok,
    true,
    "A2 fixture project seed must succeed.",
  );

  const savedAudioAsset =
    await audioAssets.saveAudioAsset({
      id:
        fixtureAudioAssetId,

      projectId:
        fixtureProjectId,

      kind:
        "recording",

      name:
        "Canonical Guard Take",

      createdAt:
        "2026-09-25T21:00:00.000Z",

      contentType:
        "audio/wav",

      storageReference:
        fixtureStorageReference,
    });

  assert.equal(
    savedAudioAsset.ok,
    true,
    "A2 fixture audio metadata seed must succeed.",
  );

  const savedAudioObject =
    await audioObjects.putObject(
      fixtureStorageReference,
      new Uint8Array([
        7,
        8,
        9,
      ]),
    );

  assert.equal(
    savedAudioObject.ok,
    true,
    "A2 fixture private audio object seed must succeed.",
  );

  if (
    mode ===
      "orphan"
  ) {
    const savedOrphanTrack =
      await tracks.saveTrack({
        id:
          orphanTrackId,

        projectId:
          fixtureProjectId,

        name:
          "Orphan Metadata",

        order:
          0,

        audioAssetIds:
          [
            fixtureAudioAssetId,
          ],
      });

    assert.equal(
      savedOrphanTrack.ok,
      true,
      "A2 orphan metadata track seed must succeed.",
    );
  }

  if (
    mode ===
      "duplicate"
  ) {
    const savedCanonicalTrack =
      await tracks.saveTrack({
        id:
          canonicalTrackId,

        projectId:
          fixtureProjectId,

        name:
          "Canonical Duplicate",

        order:
          0,

        audioAssetIds:
          [],
      });

    assert.equal(
      savedCanonicalTrack.ok,
      true,
      "A2 canonical metadata track seed must succeed.",
    );

    const canonicalList =
      await tracks.listTracksForProject(
        fixtureProjectId,
      );

    assert.equal(
      canonicalList.ok,
      true,
    );

    if (
      !canonicalList.ok
    ) {
      throw new Error(
        "Canonical duplicate fixture failed to read its seeded track.",
      );
    }

    const duplicatedTracks = [
      ...canonicalList.value,
      ...canonicalList.value,
    ];

    tracks.listTracksForProject =
      async (
        requestedProjectId,
      ) => {
        assert.equal(
          requestedProjectId,
          fixtureProjectId,
        );

        return {
          ok:
            true as const,

          value:
            duplicatedTracks,
        };
      };
  }

  const service =
    new DefaultCreatorAudioDeleteService({
      authorizer: {
        async authorize() {
          return {
            ok:
              true as const,

            value: {
              seshCreatorId:
                fixtureCreatorId,
            },
          };
        },
      },

      projects,
      audioAssets,
      audioObjects,
      tracks,

      now:
        () =>
          "2026-09-25T21:00:01.000Z",
    });

  return {
    fixtureProjectId,
    fixtureAudioAssetId,
    canonicalTrackId,
    orphanTrackId,
    fixtureStorageReference,
    projects,
    audioAssets,
    audioObjects,
    tracks,
    service,
  };
}

test(
  "orphan track metadata outside project trackIds does not block audio deletion",
  async () => {
    const fixture =
      await createCanonicalMembershipDeleteFixture(
        "orphan",
      );

    const result =
      await fixture.service
        .deleteProjectAudio(
          fixture.fixtureProjectId,
          fixture.fixtureAudioAssetId,
        );

    assert.equal(
      result.ok,
      true,
    );

    const projectAfter =
      await fixture.projects
        .getProjectSnapshot(
          fixture.fixtureProjectId,
        );

    assert.equal(
      projectAfter.ok,
      true,
    );

    if (
      !projectAfter.ok
    ) {
      return;
    }

    assert.equal(
      projectAfter.value.project.audioAssetIds.includes(
        fixture.fixtureAudioAssetId,
      ),
      false,
    );

    const metadataAfter =
      await fixture.audioAssets
        .getAudioAsset(
          fixture.fixtureAudioAssetId,
        );

    assert.equal(
      metadataAfter.ok,
      false,
    );

    const objectAfter =
      await fixture.audioObjects
        .objectExists(
          fixture.fixtureStorageReference,
        );

    assert.deepEqual(
      objectAfter,
      {
        ok:
          true,

        value:
          false,
      },
    );

    const orphanAfter =
      await fixture.tracks
        .getTrack(
          fixture.orphanTrackId,
        );

    assert.equal(
      orphanAfter.ok,
      true,
    );

    if (
      !orphanAfter.ok
    ) {
      return;
    }

    assert.deepEqual(
      orphanAfter.value.audioAssetIds,
      [
        fixture.fixtureAudioAssetId,
      ],
    );
  },
);

test(
  "missing canonical track metadata fails closed before destructive audio deletion",
  async () => {
    const fixture =
      await createCanonicalMembershipDeleteFixture(
        "missing",
      );

    const result =
      await fixture.service
        .deleteProjectAudio(
          fixture.fixtureProjectId,
          fixture.fixtureAudioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    const projectAfter =
      await fixture.projects
        .getProjectSnapshot(
          fixture.fixtureProjectId,
        );

    assert.equal(
      projectAfter.ok,
      true,
    );

    if (
      !projectAfter.ok
    ) {
      return;
    }

    assert.equal(
      projectAfter.value.project.audioAssetIds.includes(
        fixture.fixtureAudioAssetId,
      ),
      true,
    );

    const metadataAfter =
      await fixture.audioAssets
        .getAudioAsset(
          fixture.fixtureAudioAssetId,
        );

    assert.equal(
      metadataAfter.ok,
      true,
    );

    const objectAfter =
      await fixture.audioObjects
        .objectExists(
          fixture.fixtureStorageReference,
        );

    assert.deepEqual(
      objectAfter,
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
  "duplicate canonical track metadata fails closed before destructive audio deletion",
  async () => {
    const fixture =
      await createCanonicalMembershipDeleteFixture(
        "duplicate",
      );

    const result =
      await fixture.service
        .deleteProjectAudio(
          fixture.fixtureProjectId,
          fixture.fixtureAudioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    const projectAfter =
      await fixture.projects
        .getProjectSnapshot(
          fixture.fixtureProjectId,
        );

    assert.equal(
      projectAfter.ok,
      true,
    );

    if (
      !projectAfter.ok
    ) {
      return;
    }

    assert.equal(
      projectAfter.value.project.audioAssetIds.includes(
        fixture.fixtureAudioAssetId,
      ),
      true,
    );

    const metadataAfter =
      await fixture.audioAssets
        .getAudioAsset(
          fixture.fixtureAudioAssetId,
        );

    assert.equal(
      metadataAfter.ok,
      true,
    );

    const objectAfter =
      await fixture.audioObjects
        .objectExists(
          fixture.fixtureStorageReference,
        );

    assert.deepEqual(
      objectAfter,
      {
        ok:
          true,

        value:
          true,
      },
    );
  },
);
