import assert from "node:assert/strict";
import test from "node:test";

import {
  DefaultCreatorAudioAssetOperationService,
} from "./creator-audio-asset-operation-service";

const projectId =
  "sesh-project:project-one";

const assetId =
  "sesh-audio:take-one";

function authorizedProjectReader() {
  return {
    async readProject() {
      return {
        ok:
          true as const,

        value: {
          id:
            projectId,

          ownerCreatorId:
            "sesh-creator:river",

          title:
            "Project",

          createdAt:
            "2026-09-24T15:00:00.000Z",

          updatedAt:
            "2026-09-24T15:00:00.000Z",

          trackIds:
            [],

          sessionIds:
            [],

          audioAssetIds:
            [assetId],
        },
      };
    },
  };
}

function authorizedAsset() {
  return {
    id:
      assetId,

    projectId,

    kind:
      "recording" as const,

    name:
      "Take One",

    createdAt:
      "2026-09-24T15:00:00.000Z",

    durationSeconds:
      42,

    sampleRateHz:
      48000,

    channelCount:
      2,

    contentType:
      "audio/wav",

    storageReference: {
      provider:
        "r2",

      bucket:
        "private-bucket",

      key:
        "private/project-one/take-one.wav",

      versionId:
        "private-version",
    },
  };
}

test(
  "lists sanitized audio metadata only after project-owner authorization",
  async () => {
    let listCalls =
      0;

    const service =
      new DefaultCreatorAudioAssetOperationService({
        projects:
          authorizedProjectReader(),

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "not-found" as const,

                message:
                  "Not found.",
              },
            };
          },

          async listAudioAssetsForProject() {
            listCalls++;

            return {
              ok:
                true as const,

              value:
                [
                  authorizedAsset(),
                ],
            };
          },
        },
      });

    const result =
      await service
        .listProjectAudioAssets(
          projectId,
        );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      listCalls,
      1,
    );

    if (!result.ok) {
      throw new Error(
        "Expected audio collection.",
      );
    }

    assert.deepEqual(
      result.value,
      [
        {
          id:
            assetId,

          kind:
            "recording",

          name:
            "Take One",

          durationSeconds:
            42,

          sampleRateHz:
            48000,

          channelCount:
            2,

          contentType:
            "audio/wav",

          hasStoredAudio:
            true,
        },
      ],
    );

    assert.equal(
      "storageReference" in
        result.value[0],
      false,
    );

    assert.equal(
      "projectId" in
        result.value[0],
      false,
    );

    assert.equal(
      "createdAt" in
        result.value[0],
      false,
    );
  },
);

test(
  "does not read audio metadata when project authorization fails",
  async () => {
    let audioRead =
      false;

    const service =
      new DefaultCreatorAudioAssetOperationService({
        projects: {
          async readProject() {
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

        audioAssets: {
          async getAudioAsset() {
            audioRead =
              true;

            throw new Error(
              "Must not execute.",
            );
          },

          async listAudioAssetsForProject() {
            audioRead =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },
      });

    const result =
      await service
        .listProjectAudioAssets(
          projectId,
        );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      audioRead,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected forbidden result.",
      );
    }

    assert.equal(
      result.error.code,
      "forbidden",
    );
  },
);

test(
  "reads one sanitized audio asset only through its authorized project",
  async () => {
    const service =
      new DefaultCreatorAudioAssetOperationService({
        projects:
          authorizedProjectReader(),

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value:
                authorizedAsset(),
            };
          },

          async listAudioAssetsForProject() {
            return {
              ok:
                true as const,

              value:
                [],
            };
          },
        },
      });

    const result =
      await service
        .readProjectAudioAsset(
          projectId,
          assetId,
        );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      throw new Error(
        "Expected audio asset.",
      );
    }

    assert.equal(
      result.value.id,
      assetId,
    );

    assert.equal(
      result.value.hasStoredAudio,
      true,
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
  "fails closed when an audio asset belongs to a different project",
  async () => {
    const service =
      new DefaultCreatorAudioAssetOperationService({
        projects:
          authorizedProjectReader(),

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value: {
                ...authorizedAsset(),

                projectId:
                  "sesh-project:other",
              },
            };
          },

          async listAudioAssetsForProject() {
            return {
              ok:
                true as const,

              value:
                [],
            };
          },
        },
      });

    const result =
      await service
        .readProjectAudioAsset(
          projectId,
          assetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
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
  "fails closed when collection persistence contradicts the authorized project",
  async () => {
    const service =
      new DefaultCreatorAudioAssetOperationService({
        projects:
          authorizedProjectReader(),

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "not-found" as const,

                message:
                  "Not found.",
              },
            };
          },

          async listAudioAssetsForProject() {
            return {
              ok:
                true as const,

              value: [
                {
                  ...authorizedAsset(),

                  projectId:
                    "sesh-project:other",
                },
              ],
            };
          },
        },
      });

    const result =
      await service
        .listProjectAudioAssets(
          projectId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
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
  "rejects malformed resource identifiers before persistence access",
  async () => {
    let touched =
      false;

    const service =
      new DefaultCreatorAudioAssetOperationService({
        projects: {
          async readProject() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },

        audioAssets: {
          async getAudioAsset() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },

          async listAudioAssetsForProject() {
            touched =
              true;

            throw new Error(
              "Must not execute.",
            );
          },
        },
      });

    const result =
      await service
        .readProjectAudioAsset(
          "wrong-project",
          "wrong-audio",
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
        "Expected invalid-input result.",
      );
    }

    assert.equal(
      result.error.code,
      "invalid-input",
    );
  },
);
