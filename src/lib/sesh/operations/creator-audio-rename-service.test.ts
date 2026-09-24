import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshAudioAssetId,
} from "../identifiers";

import {
  InMemorySeshAudioAssetRepository,
} from "../persistence/memory";

import {
  DefaultCreatorAudioRenameService,
} from "./creator-audio-rename-service";

const timestamp =
  "2026-09-24T20:00:00.000Z";

function ownerAuthorizer(
  onAuthorize?:
    () => void,
): SeshProjectOwnershipAuthorizer {
  return {
    async authorize(
      projectId,
      action,
    ) {
      onAuthorize?.();

      return {
        ok:
          true,

        value: {
          projectId,
          action,
          seshCreatorId:
            "sesh-creator:rename-owner",
        },
      } as never;
    },
  };
}

async function repositoryWithAsset() {
  const repository =
    new InMemorySeshAudioAssetRepository();

  const saved =
    await repository.saveAudioAsset({
      id:
        "sesh-audio:rename-one",

      projectId:
        "sesh-project:rename-project",

      kind:
        "recording",

      name:
        "Original",

      createdAt:
        timestamp,

      durationSeconds:
        10,

      sampleRateHz:
        48000,

      channelCount:
        2,

      contentType:
        "audio/wav",

      storageReference: {
        provider:
          "r2",

        key:
          "sesh/projects/rename-project/audio/rename-one/take.wav",

        bucket:
          "private",
      },
    });

  assert.equal(
    saved.ok,
    true,
  );

  return repository;
}

test(
  "owner renames only audio name through metadata CAS and receives sanitized view",
  async () => {
    const repository =
      await repositoryWithAsset();

    const service =
      new DefaultCreatorAudioRenameService({
        authorizer:
          ownerAuthorizer(),

        audioAssets:
          repository,
      });

    const before =
      await repository.getAudioAssetSnapshot(
        createSeshAudioAssetId(
          "rename-one",
        ),
      );

    assert.equal(
      before.ok,
      true,
    );

    if (!before.ok) {
      throw new Error(
        "Expected initial audio snapshot.",
      );
    }

    const result =
      await service.renameProjectAudio(
        "sesh-project:rename-project",
        "sesh-audio:rename-one",
        {
          name:
            "  New Name  ",
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      throw new Error(
        "Expected successful rename.",
      );
    }

    assert.equal(
      result.value.name,
      "New Name",
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

    assert.equal(
      "revision" in
        result.value,
      false,
    );

    const after =
      await repository.getAudioAssetSnapshot(
        createSeshAudioAssetId(
          "rename-one",
        ),
      );

    assert.equal(
      after.ok,
      true,
    );

    if (!after.ok) {
      throw new Error(
        "Expected renamed audio snapshot.",
      );
    }

    assert.equal(
      after.value.revision,
      before.value.revision +
        1,
    );

    assert.equal(
      after.value.asset.name,
      "New Name",
    );

    assert.equal(
      after.value.asset.id,
      before.value.asset.id,
    );

    assert.equal(
      after.value.asset.projectId,
      before.value.asset.projectId,
    );

    assert.equal(
      after.value.asset.kind,
      before.value.asset.kind,
    );

    assert.equal(
      after.value.asset.createdAt,
      before.value.asset.createdAt,
    );

    assert.deepEqual(
      after.value.asset.storageReference,
      before.value.asset.storageReference,
    );
  },
);

test(
  "rename rejects extra fields before authorization or persistence",
  async () => {
    let authorized =
      false;

    let read =
      false;

    const service =
      new DefaultCreatorAudioRenameService({
        authorizer:
          ownerAuthorizer(
            () => {
              authorized =
                true;
            },
          ),

        audioAssets: {
          async getAudioAssetSnapshot() {
            read =
              true;

            throw new Error(
              "must not execute",
            );
          },

          async updateAudioAssetConditionally() {
            throw new Error(
              "must not execute",
            );
          },
        },
      });

    const result =
      await service.renameProjectAudio(
        "sesh-project:rename-project",
        "sesh-audio:rename-one",
        {
          name:
            "Renamed",

          storageReference:
            "forbidden",
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

    assert.equal(
      read,
      false,
    );
  },
);

test(
  "rename does not read private audio metadata when owner authorization fails",
  async () => {
    let read =
      false;

    const authorizer:
      SeshProjectOwnershipAuthorizer = {
        async authorize() {
          return {
            ok:
              false,

            error: {
              code:
                "forbidden",

              message:
                "Rejected.",
            },
          };
        },
      };

    const service =
      new DefaultCreatorAudioRenameService({
        authorizer,

        audioAssets: {
          async getAudioAssetSnapshot() {
            read =
              true;

            throw new Error(
              "must not execute",
            );
          },

          async updateAudioAssetConditionally() {
            throw new Error(
              "must not execute",
            );
          },
        },
      });

    const result =
      await service.renameProjectAudio(
        "sesh-project:rename-project",
        "sesh-audio:rename-one",
        {
          name:
            "Renamed",
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected authorization failure.",
      );
    }

    assert.equal(
      result.error.code,
      "forbidden",
    );

    assert.equal(
      read,
      false,
    );
  },
);

test(
  "rename fails closed when audio belongs to a different project",
  async () => {
    const repository =
      await repositoryWithAsset();

    const service =
      new DefaultCreatorAudioRenameService({
        authorizer:
          ownerAuthorizer(),

        audioAssets:
          repository,
      });

    const result =
      await service.renameProjectAudio(
        "sesh-project:different-project",
        "sesh-audio:rename-one",
        {
          name:
            "Renamed",
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected project mismatch failure.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );
  },
);

test(
  "rename maps stale audio metadata CAS to conflict",
  async () => {
    const repository =
      await repositoryWithAsset();

    const service =
      new DefaultCreatorAudioRenameService({
        authorizer:
          ownerAuthorizer(),

        audioAssets: {
          getAudioAssetSnapshot:
            repository.getAudioAssetSnapshot.bind(
              repository,
            ),

          async updateAudioAssetConditionally() {
            return {
              ok:
                false,

              error: {
                kind:
                  "conflict",

                message:
                  "stale",
              },
            };
          },
        },
      });

    const result =
      await service.renameProjectAudio(
        "sesh-project:rename-project",
        "sesh-audio:rename-one",
        {
          name:
            "Renamed",
        },
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
  },
);