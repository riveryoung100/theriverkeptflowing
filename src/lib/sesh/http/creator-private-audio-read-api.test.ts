import assert from "node:assert/strict";
import test from "node:test";

import {
  handleCreatorPrivateAudioRead,
} from "./creator-private-audio-read-api";

test(
  "returns private WAV bytes as no-store inline content",
  async () => {
    const response =
      await handleCreatorPrivateAudioRead({
        projectId:
          "sesh-project:http-binary",

        audioAssetId:
          "sesh-audio:http-binary",

        reads: {
          async readProjectAudioBytes() {
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

                contentType:
                  "audio/wav" as const,
              },
            };
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

    assert.equal(
      response.headers.get(
        "content-type",
      ),
      "audio/wav",
    );

    assert.equal(
      response.headers.get(
        "content-disposition",
      ),
      "inline",
    );

    assert.equal(
      response.headers.get(
        "x-content-type-options",
      ),
      "nosniff",
    );

    assert.deepEqual(
      new Uint8Array(
        await response.arrayBuffer(),
      ),
      Uint8Array.from([
        82,
        73,
        70,
        70,
      ]),
    );
  },
);

test(
  "maps private audio authorization failures without leaking storage metadata",
  async () => {
    for (
      const [
        code,
        status,
      ] of [
        [
          "invalid-input",
          400,
        ],
        [
          "unauthenticated",
          401,
        ],
        [
          "unmapped",
          403,
        ],
        [
          "forbidden",
          403,
        ],
        [
          "not-found",
          404,
        ],
        [
          "conflict",
          409,
        ],
        [
          "unavailable",
          503,
        ],
      ] as const
    ) {
      const response =
        await handleCreatorPrivateAudioRead({
          projectId:
            "sesh-project:http-binary",

          audioAssetId:
            "sesh-audio:http-binary",

          reads: {
            async readProjectAudioBytes() {
              return {
                ok:
                  false as const,

                error: {
                  code,

                  message:
                    "Sanitized failure.",
                },
              };
            },
          },
        });

      assert.equal(
        response.status,
        status,
      );

      const body =
        await response.json() as {
          error?: {
            code?: string;
            message?: string;
          };
        };

      assert.equal(
        body.error?.code,
        code,
      );

      assert.equal(
        JSON.stringify(
          body,
        ).includes(
          "storageReference",
        ),
        false,
      );

      assert.equal(
        JSON.stringify(
          body,
        ).includes(
          "bucket",
        ),
        false,
      );

      assert.equal(
        JSON.stringify(
          body,
        ).includes(
          "r2",
        ),
        false,
      );
    }
  },
);

test(
  "passes only route resource identifiers into the binary read service",
  async () => {
    let project:
      unknown;

    let audio:
      unknown;

    await handleCreatorPrivateAudioRead({
      projectId:
        "sesh-project:route-one",

      audioAssetId:
        "sesh-audio:route-one",

      reads: {
        async readProjectAudioBytes(
          projectId,
          audioAssetId,
        ) {
          project =
            projectId;

          audio =
            audioAssetId;

          return {
            ok:
              false as const,

            error: {
              code:
                "not-found" as const,

              message:
                "Not found.",
            },
          };
        },
      },
    });

    assert.equal(
      project,
      "sesh-project:route-one",
    );

    assert.equal(
      audio,
      "sesh-audio:route-one",
    );
  },
);