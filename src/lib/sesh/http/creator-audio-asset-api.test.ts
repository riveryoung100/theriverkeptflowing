import assert from "node:assert/strict";
import test from "node:test";

import {
  handleCreatorAudioAssetCollectionRead,
  handleCreatorAudioAssetRead,
} from "./creator-audio-asset-api";

test(
  "returns sanitized owner-authorized audio collection as no-store JSON",
  async () => {
    const response =
      await handleCreatorAudioAssetCollectionRead({
        projectId:
          "sesh-project:one",

        operations: {
          async listProjectAudioAssets() {
            return {
              ok:
                true as const,

              value: [
                {
                  id:
                    "sesh-audio:one",

                  kind:
                    "recording" as const,

                  name:
                    "One",

                  hasStoredAudio:
                    true,
                },
              ],
            };
          },

          async readProjectAudioAsset() {
            throw new Error(
              "Unexpected item read.",
            );
          },
        },
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    assert.deepEqual(
      await response.json(),
      {
        ok:
          true,

        value: [
          {
            id:
              "sesh-audio:one",

            kind:
              "recording",

            name:
              "One",

            hasStoredAudio:
              true,
          },
        ],
      },
    );
  },
);

test(
  "maps private audio authorization failures to HTTP status",
  async () => {
    const cases =
      [
        ["invalid-input", 400],
        ["unauthenticated", 401],
        ["unmapped", 403],
        ["forbidden", 403],
        ["not-found", 404],
        ["conflict", 409],
        ["unavailable", 503],
      ] as const;

    for (
      const [
        code,
        status,
      ] of cases
    ) {
      const response =
        await handleCreatorAudioAssetRead({
          projectId:
            "sesh-project:one",

          audioAssetId:
            "sesh-audio:one",

          operations: {
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
                  code,

                  message:
                    "Rejected.",
                },
              };
            },
          },
        });

      assert.equal(
        response.status,
        status,
      );

      assert.equal(
        response.headers.get(
          "cache-control",
        ),
        "no-store",
      );
    }
  },
);

test(
  "passes only route resource identifiers into the audio operation service",
  async () => {
    let receivedProject:
      unknown;

    let receivedAsset:
      unknown;

    await handleCreatorAudioAssetRead({
      projectId:
        "sesh-project:one",

      audioAssetId:
        "sesh-audio:one",

      operations: {
        async listProjectAudioAssets() {
          throw new Error(
            "Unexpected collection read.",
          );
        },

        async readProjectAudioAsset(
          projectId,
          audioAssetId,
        ) {
          receivedProject =
            projectId;

          receivedAsset =
            audioAssetId;

          return {
            ok:
              true as const,

            value: {
              id:
                "sesh-audio:one",

              kind:
                "recording" as const,

              name:
                "One",

              hasStoredAudio:
                false,
            },
          };
        },
      },
    });

    assert.equal(
      receivedProject,
      "sesh-project:one",
    );

    assert.equal(
      receivedAsset,
      "sesh-audio:one",
    );
  },
);
