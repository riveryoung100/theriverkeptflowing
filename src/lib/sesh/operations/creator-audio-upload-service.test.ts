import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshAudioAssetId,
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../identifiers";

import type {
  SeshAudioAsset,
  SeshMusicProject,
  SeshStorageReference,
} from "../model";

import {
  DefaultCreatorAudioUploadService,
  SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES,
} from "./creator-audio-upload-service";

const projectId =
  createSeshMusicProjectId(
    "upload-project",
  );

const creatorId =
  createSeshCreatorId(
    "river",
  );

const audioAssetId =
  createSeshAudioAssetId(
    "generated",
  );

const timestamp =
  "2026-09-24T16:00:00.000Z";

const project:
SeshMusicProject =
  {
    id:
      projectId,

    ownerCreatorId:
      creatorId,

    title:
      "Upload Project",

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

const storageReference:
SeshStorageReference =
  {
    provider:
      "r2",

    key:
      "sesh/projects/upload-project/audio/generated/source.wav",
  };

function authorizer(
  result:
    | "authorized"
    | "forbidden" =
      "authorized",
): SeshProjectOwnershipAuthorizer {
  return {
    async authorize(
      requestedProjectId,
      action,
    ) {
      if (
        result ===
        "forbidden"
      ) {
        return {
          ok:
            false,

          error: {
            code:
              "forbidden",

            message:
              "Forbidden.",
          },
        };
      }

      return {
        ok:
          true,

        value: {
          principalId:
            "principal:river" as never,

          seshCreatorId:
            creatorId,

          projectId:
            requestedProjectId,

          action,
        },
      };
    },
  };
}

function input() {
  return {
    kind:
      "recording" as const,

    name:
      "Take One",

    contentType:
      "audio/wav" as const,

    bytes:
      new Uint8Array([
        1,
        2,
        3,
      ]),

    durationSeconds:
      1,

    sampleRateHz:
      48000,

    channelCount:
      2,
  };
}

test(
  "uploads in R2 metadata project-CAS order and returns sanitized metadata",
  async () => {
    const order:
      string[] =
        [];

    const service =
      new DefaultCreatorAudioUploadService({
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
            updated,
            expectedRevision,
            expectedOwner,
          ) {
            order.push(
              "project",
            );

            assert.equal(
              expectedRevision,
              7,
            );

            assert.equal(
              expectedOwner,
              creatorId,
            );

            const updatedProject =
              updated as
                SeshMusicProject;

            assert.deepEqual(
              updatedProject.audioAssetIds,
              [
                audioAssetId,
              ],
            );

            return {
              ok:
                true as const,

              value: {
                project:
                  updatedProject,

                revision:
                  8,
              },
            };
          },
        },

        audioAssets: {
          async saveAudioAsset(
            asset,
          ) {
            order.push(
              "metadata",
            );

            return {
              ok:
                true as const,

              value:
                asset as
                  SeshAudioAsset,
            };
          },

          async deleteAudioAssetMetadata() {
            throw new Error(
              "Unexpected metadata rollback.",
            );
          },
        },

        audioObjects: {
          async putObject(
            reference,
            bytes,
          ) {
            order.push(
              "r2",
            );

            assert.deepEqual(
              reference,
              storageReference,
            );

            assert.deepEqual(
              Array.from(
                bytes,
              ),
              [
                1,
                2,
                3,
              ],
            );

            return {
              ok:
                true as const,

              value:
                reference,
            };
          },

          async deleteObject() {
            throw new Error(
              "Unexpected R2 rollback.",
            );
          },
        },

        now:
          () =>
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          input(),
        );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      order,
      [
        "snapshot",
        "r2",
        "metadata",
        "project",
      ],
    );

    if (!result.ok) {
      throw new Error(
        "Expected successful upload.",
      );
    }

    assert.deepEqual(
      result.value,
      {
        id:
          audioAssetId,

        kind:
          "recording",

        name:
          "Take One",

        contentType:
          "audio/wav",

        durationSeconds:
          1,

        sampleRateHz:
          48000,

        channelCount:
          2,

        hasStoredAudio:
          true,
      },
    );

    assert.equal(
      "storageReference" in
        result.value,
      false,
    );

    assert.equal(
      "projectId" in
        result.value,
      false,
    );
  },
);

test(
  "rejects invalid input before authorization or persistence",
  async () => {
    let touched =
      false;

    const service =
      new DefaultCreatorAudioUploadService({
        authorizer: {
          async authorize() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        projects: {
          async getProjectSnapshot() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },

          async updateProjectConditionally() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioAssets: {
          async saveAudioAsset() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },

          async deleteAudioAssetMetadata() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioObjects: {
          async putObject() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },

          async deleteObject() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        now:
          () =>
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          {
            ...input(),

            bytes:
              new Uint8Array(),
          },
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      touched,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected invalid input.",
      );
    }

    assert.equal(
      result.error.code,
      "invalid-input",
    );
  },
);

test(
  "rejects uploads larger than the phase-one maximum before writes",
  async () => {
    let authorized =
      false;

    const service =
      new DefaultCreatorAudioUploadService({
        authorizer: {
          async authorize() {
            authorized =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        projects: {
          async getProjectSnapshot() {
            throw new Error(
              "Must not execute.",
            );
          },

          async updateProjectConditionally() {
            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioAssets: {
          async saveAudioAsset() {
            throw new Error(
              "Must not execute.",
            );
          },

          async deleteAudioAssetMetadata() {
            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioObjects: {
          async putObject() {
            throw new Error(
              "Must not execute.",
            );
          },

          async deleteObject() {
            throw new Error(
              "Must not execute.",
            );
          },
        },

        now:
          () =>
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          {
            ...input(),

            bytes:
              new Uint8Array(
                SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES +
                  1,
              ),
          },
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      authorized,
      false,
    );
  },
);

test(
  "does not write when canonical owner authorization fails",
  async () => {
    let writes =
      0;

    const service =
      new DefaultCreatorAudioUploadService({
        authorizer:
          authorizer(
            "forbidden",
          ),

        projects: {
          async getProjectSnapshot() {
            writes++;

            throw new Error(
              "Must not execute.",
            );
          },

          async updateProjectConditionally() {
            writes++;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioAssets: {
          async saveAudioAsset() {
            writes++;

            throw new Error(
              "Must not execute.",
            );
          },

          async deleteAudioAssetMetadata() {
            writes++;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioObjects: {
          async putObject() {
            writes++;

            throw new Error(
              "Must not execute.",
            );
          },

          async deleteObject() {
            writes++;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        now:
          () =>
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          input(),
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      writes,
      0,
    );

    if (result.ok) {
      throw new Error(
        "Expected forbidden upload.",
      );
    }

    assert.equal(
      result.error.code,
      "forbidden",
    );
  },
);

test(
  "compensates R2 when metadata creation fails",
  async () => {
    const order:
      string[] =
        [];

    const service =
      new DefaultCreatorAudioUploadService({
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
                  0,
              },
            };
          },

          async updateProjectConditionally() {
            throw new Error(
              "Must not attach project.",
            );
          },
        },

        audioAssets: {
          async saveAudioAsset() {
            order.push(
              "metadata-fail",
            );

            return {
              ok:
                false as const,

              error: {
                kind:
                  "storage" as const,

                message:
                  "Metadata failed.",
              },
            };
          },

          async deleteAudioAssetMetadata() {
            throw new Error(
              "Metadata never persisted.",
            );
          },
        },

        audioObjects: {
          async putObject(
            reference,
          ) {
            order.push(
              "r2-write",
            );

            return {
              ok:
                true as const,

              value:
                reference,
            };
          },

          async deleteObject() {
            order.push(
              "r2-rollback",
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
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          input(),
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.deepEqual(
      order,
      [
        "r2-write",
        "metadata-fail",
        "r2-rollback",
      ],
    );
  },
);

test(
  "compensates metadata then R2 when project CAS conflicts",
  async () => {
    const order:
      string[] =
        [];

    const service =
      new DefaultCreatorAudioUploadService({
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

          async updateProjectConditionally() {
            order.push(
              "project-conflict",
            );

            return {
              ok:
                false as const,

              error: {
                kind:
                  "conflict" as const,

                message:
                  "Stale project.",
              },
            };
          },
        },

        audioAssets: {
          async saveAudioAsset(
            asset,
          ) {
            order.push(
              "metadata-write",
            );

            return {
              ok:
                true as const,

              value:
                asset as
                  SeshAudioAsset,
            };
          },

          async deleteAudioAssetMetadata() {
            order.push(
              "metadata-rollback",
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
          async putObject(
            reference,
          ) {
            order.push(
              "r2-write",
            );

            return {
              ok:
                true as const,

              value:
                reference,
            };
          },

          async deleteObject() {
            order.push(
              "r2-rollback",
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
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          input(),
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected project conflict.",
      );
    }

    assert.equal(
      result.error.code,
      "conflict",
    );

    assert.deepEqual(
      order,
      [
        "r2-write",
        "metadata-write",
        "project-conflict",
        "metadata-rollback",
        "r2-rollback",
      ],
    );
  },
);

test(
  "retains binary when metadata rollback itself fails after project failure",
  async () => {
    let r2DeleteCalls =
      0;

    const service =
      new DefaultCreatorAudioUploadService({
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
                  2,
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
                  "Conflict.",
              },
            };
          },
        },

        audioAssets: {
          async saveAudioAsset(
            asset,
          ) {
            return {
              ok:
                true as const,

              value:
                asset as
                  SeshAudioAsset,
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
                  "Rollback failed.",
              },
            };
          },
        },

        audioObjects: {
          async putObject(
            reference,
          ) {
            return {
              ok:
                true as const,

              value:
                reference,
            };
          },

          async deleteObject() {
            r2DeleteCalls++;

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
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          input(),
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      r2DeleteCalls,
      0,
    );

    if (result.ok) {
      throw new Error(
        "Expected compensation failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );
  },
);

test(
  "surfaces binary orphan risk when final R2 rollback fails",
  async () => {
    const service =
      new DefaultCreatorAudioUploadService({
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
                  2,
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
                  "Conflict.",
              },
            };
          },
        },

        audioAssets: {
          async saveAudioAsset(
            asset,
          ) {
            return {
              ok:
                true as const,

              value:
                asset as
                  SeshAudioAsset,
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
          async putObject(
            reference,
          ) {
            return {
              ok:
                true as const,

              value:
                reference,
            };
          },

          async deleteObject() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "storage" as const,

                message:
                  "R2 cleanup failed.",
              },
            };
          },
        },

        now:
          () =>
            timestamp,

        createAudioAssetId:
          () =>
            audioAssetId,

        createStorageReference:
          () =>
            storageReference,
      });

    const result =
      await service
        .uploadProjectAudio(
          projectId,
          input(),
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected compensation failure.",
      );
    }

    assert.equal(
      result.error.code,
      "unavailable",
    );

    assert.match(
      result.error.message,
      /binary compensation/i,
    );
  },
);
