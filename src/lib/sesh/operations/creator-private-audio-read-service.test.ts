import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshAudioAsset,
} from "../model";

import {
  DefaultCreatorPrivateAudioReadService,
} from "./creator-private-audio-read-service";

const projectId =
  "sesh-project:binary-project";

const audioAssetId =
  "sesh-audio:binary-audio";

const storageReference = {
  provider:
    "r2" as const,

  bucket:
    "private-bucket",

  key:
    "sesh/projects/binary-project/audio/binary-audio/source.wav",
};

function asset():
SeshAudioAsset {
  return {
    id:
      audioAssetId,

    projectId,

    kind:
      "recording",

    name:
      "Private take",

    createdAt:
      "2026-09-24T00:00:00.000Z",

    storageReference,

    contentType:
      "audio/wav",
  };
}

test(
  "reads private bytes only after the existing owner-authorized item read succeeds",
  async () => {
    let metadataReads =
      0;

    let objectReads =
      0;

    const service =
      new DefaultCreatorPrivateAudioReadService({
        authorizedAssets: {
          async listProjectAudioAssets() {
            throw new Error(
              "Unexpected collection read.",
            );
          },

          async readProjectAudioAsset(
            receivedProjectId,
            receivedAudioAssetId,
          ) {
            assert.equal(
              receivedProjectId,
              projectId,
            );

            assert.equal(
              receivedAudioAssetId,
              audioAssetId,
            );

            return {
              ok:
                true as const,

              value: {
                id:
                  audioAssetId,

                kind:
                  "recording" as const,

                name:
                  "Private take",

                createdAt:
                  "2026-09-24T00:00:00.000Z",

                contentType:
                  "audio/wav",

                hasStoredAudio:
                  true,
              },
            };
          },
        },

        audioAssets: {
          async getAudioAsset(
            receivedAudioAssetId,
          ) {
            metadataReads++;

            assert.equal(
              receivedAudioAssetId,
              audioAssetId,
            );

            return {
              ok:
                true as const,

              value:
                asset(),
            };
          },
        },

        audioObjects: {
          async getObject(
            receivedReference,
          ) {
            objectReads++;

            assert.deepEqual(
              receivedReference,
              storageReference,
            );

            return {
              ok:
                true as const,

              value: {
                bytes:
                  Uint8Array.from([
                    82,
                    73,
                    70,
                    70,
                  ]),
              },
            };
          },
        },
      });

    const result =
      await service
        .readProjectAudioBytes(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      throw new Error(
        "Expected binary audio.",
      );
    }

    assert.deepEqual(
      result.value.bytes,
      Uint8Array.from([
        82,
        73,
        70,
        70,
      ]),
    );

    assert.equal(
      result.value.contentType,
      "audio/wav",
    );

    assert.equal(
      metadataReads,
      1,
    );

    assert.equal(
      objectReads,
      1,
    );
  },
);

test(
  "does not touch private metadata or R2 when owner authorization fails",
  async () => {
    let touched =
      false;

    const service =
      new DefaultCreatorPrivateAudioReadService({
        authorizedAssets: {
          async listProjectAudioAssets() {
            throw new Error(
              "Unexpected collection read.",
            );
          },

          async readProjectAudioAsset() {
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
            touched =
              true;

            throw new Error(
              "Metadata must not be read.",
            );
          },
        },

        audioObjects: {
          async getObject() {
            touched =
              true;

            throw new Error(
              "R2 must not be read.",
            );
          },
        },
      });

    const result =
      await service
        .readProjectAudioBytes(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected forbidden.",
      );
    }

    assert.equal(
      result.error.code,
      "forbidden",
    );

    assert.equal(
      touched,
      false,
    );
  },
);

test(
  "fails closed when canonical metadata contradicts the authorized resource",
  async () => {
    let objectRead =
      false;

    const service =
      new DefaultCreatorPrivateAudioReadService({
        authorizedAssets: {
          async listProjectAudioAssets() {
            throw new Error(
              "Unexpected collection read.",
            );
          },

          async readProjectAudioAsset() {
            return {
              ok:
                true as const,

              value: {
                id:
                  audioAssetId,

                kind:
                  "recording" as const,

                name:
                  "Private take",

                createdAt:
                  "2026-09-24T00:00:00.000Z",

                contentType:
                  "audio/wav",

                hasStoredAudio:
                  true,
              },
            };
          },
        },

        audioAssets: {
          async getAudioAsset() {
            return {
              ok:
                true as const,

              value: {
                ...asset(),

                projectId:
                  "sesh-project:different",
              },
            };
          },
        },

        audioObjects: {
          async getObject() {
            objectRead =
              true;

            throw new Error(
              "R2 must not be read.",
            );
          },
        },
      });

    const result =
      await service
        .readProjectAudioBytes(
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

    assert.equal(
      objectRead,
      false,
    );
  },
);

test(
  "maps missing private object to not-found without exposing storage identity",
  async () => {
    const service =
      new DefaultCreatorPrivateAudioReadService({
        authorizedAssets: {
          async listProjectAudioAssets() {
            throw new Error(
              "Unexpected collection read.",
            );
          },

          async readProjectAudioAsset() {
            return {
              ok:
                true as const,

              value: {
                id:
                  audioAssetId,

                kind:
                  "recording" as const,

                name:
                  "Private take",

                createdAt:
                  "2026-09-24T00:00:00.000Z",

                contentType:
                  "audio/wav",

                hasStoredAudio:
                  true,
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
                asset(),
            };
          },
        },

        audioObjects: {
          async getObject() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "not-found" as const,

                message:
                  "provider detail must not escape",
              },
            };
          },
        },
      });

    const result =
      await service
        .readProjectAudioBytes(
          projectId,
          audioAssetId,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected not-found.",
      );
    }

    assert.equal(
      result.error.code,
      "not-found",
    );

    assert.equal(
      result.error.message.includes(
        "provider detail",
      ),
      false,
    );
  },
);
test(
  "passes a bounded byte range to private storage only after owner authorization",
  async () => {
    let receivedRange:
      unknown;

    const service =
      new DefaultCreatorPrivateAudioReadService({
        authorizedAssets: {
          async listProjectAudioAssets() {
            throw new Error(
              "Unexpected collection read.",
            );
          },

          async readProjectAudioAsset() {
            return {
              ok:
                true as const,

              value: {
                id:
                  audioAssetId,

                kind:
                  "recording" as const,

                name:
                  "Private take",

                createdAt:
                  "2026-09-24T00:00:00.000Z",

                contentType:
                  "audio/wav",

                hasStoredAudio:
                  true,
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
                asset(),
            };
          },
        },

        audioObjects: {
          async getObject(
            _reference,
            range,
          ) {
            receivedRange =
              range;

            return {
              ok:
                true as const,

              value: {
                bytes:
                  Uint8Array.from([
                    30,
                    40,
                  ]),

                totalSize:
                  5,

                range: {
                  offset:
                    2,

                  length:
                    2,
                },
              },
            };
          },
        },
      });

    const result =
      await service
        .readProjectAudioBytes(
          projectId,
          audioAssetId,
          {
            offset:
              2,

            length:
              2,
          },
        );

    assert.deepEqual(
      receivedRange,
      {
        offset:
          2,

        length:
          2,
      },
    );

    assert.equal(
      result.ok,
      true,
    );

    if (!result.ok) {
      throw new Error(
        "Expected ranged private audio.",
      );
    }

    assert.equal(
      result.value.totalSize,
      5,
    );

    assert.deepEqual(
      result.value.range,
      {
        offset:
          2,

        length:
          2,
      },
    );
  },
);

test(
  "maps ranged storage validation failure to range-not-satisfiable",
  async () => {
    const service =
      new DefaultCreatorPrivateAudioReadService({
        authorizedAssets: {
          async listProjectAudioAssets() {
            throw new Error(
              "Unexpected collection read.",
            );
          },

          async readProjectAudioAsset() {
            return {
              ok:
                true as const,

              value: {
                id:
                  audioAssetId,

                kind:
                  "recording" as const,

                name:
                  "Private take",

                createdAt:
                  "2026-09-24T00:00:00.000Z",

                contentType:
                  "audio/wav",

                hasStoredAudio:
                  true,
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
                asset(),
            };
          },
        },

        audioObjects: {
          async getObject() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "validation" as const,

                message:
                  "provider-specific range failure",
              },
            };
          },
        },
      });

    const result =
      await service
        .readProjectAudioBytes(
          projectId,
          audioAssetId,
          {
            offset:
              999,
          },
        );

    assert.equal(
      result.ok,
      false,
    );

    if (result.ok) {
      throw new Error(
        "Expected unsatisfiable range.",
      );
    }

    assert.equal(
      result.error.code,
      "range-not-satisfiable",
    );

    assert.equal(
      result.error.message.includes(
        "provider-specific",
      ),
      false,
    );
  },
);