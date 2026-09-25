import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import type {
  SeshAudioAsset,
  SeshMusicProject,
  SeshTrack,
} from "../model";

import type {
  DefaultCreatorAudioDeleteServiceDependencies,
} from "./creator-audio-delete-service";

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
                project,

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
