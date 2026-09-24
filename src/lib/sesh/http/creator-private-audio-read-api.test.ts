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

                totalSize:
                  4,
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
test(
  "returns a valid single private byte range as 206 partial content",
  async () => {
    let receivedRange:
      unknown;

    const response =
      await handleCreatorPrivateAudioRead({
        projectId:
          "sesh-project:http-range",

        audioAssetId:
          "sesh-audio:http-range",

        rangeHeader:
          "bytes=2-4",

        reads: {
          async readProjectAudioBytes(
            _projectId,
            _audioAssetId,
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
                    50,
                  ]),

                contentType:
                  "audio/wav" as const,

                totalSize:
                  10,

                range: {
                  offset:
                    2,

                  length:
                    3,
                },
              },
            };
          },
        },
      });

    assert.deepEqual(
      receivedRange,
      {
        offset:
          2,

        length:
          3,
      },
    );

    assert.equal(
      response.status,
      206,
    );

    assert.equal(
      response.headers.get(
        "accept-ranges",
      ),
      "bytes",
    );

    assert.equal(
      response.headers.get(
        "content-range",
      ),
      "bytes 2-4/10",
    );

    assert.equal(
      response.headers.get(
        "content-length",
      ),
      "3",
    );

    assert.deepEqual(
      Array.from(
        new Uint8Array(
          await response.arrayBuffer(),
        ),
      ),
      [
        30,
        40,
        50,
      ],
    );
  },
);

test(
  "supports open-ended and suffix byte range syntax",
  async () => {
    const received:
      unknown[] =
      [];

    for (
      const header of [
        "bytes=7-",
        "bytes=-4",
      ]
    ) {
      await handleCreatorPrivateAudioRead({
        projectId:
          "sesh-project:http-range",

        audioAssetId:
          "sesh-audio:http-range",

        rangeHeader:
          header,

        reads: {
          async readProjectAudioBytes(
            _projectId,
            _audioAssetId,
            range,
          ) {
            received.push(
              range,
            );

            return {
              ok:
                false as const,

              error: {
                code:
                  "range-not-satisfiable" as const,

                message:
                  "Range test.",
              },
            };
          },
        },
      });
    }

    assert.deepEqual(
      received,
      [
        {
          offset:
            7,
        },
        {
          suffix:
            4,
        },
      ],
    );
  },
);

test(
  "rejects malformed and multi-range headers before private storage execution",
  async () => {
    for (
      const header of [
        "bytes=",
        "bytes=5-2",
        "bytes=1-2,4-5",
        "items=1-2",
        "bytes=-0",
      ]
    ) {
      let called =
        false;

      const response =
        await handleCreatorPrivateAudioRead({
          projectId:
            "sesh-project:http-range",

          audioAssetId:
            "sesh-audio:http-range",

          rangeHeader:
            header,

          reads: {
            async readProjectAudioBytes() {
              called =
                true;

              throw new Error(
                "Malformed range must not execute private read.",
              );
            },
          },
        });

      assert.equal(
        response.status,
        416,
      );

      assert.equal(
        response.headers.get(
          "accept-ranges",
        ),
        "bytes",
      );

      assert.equal(
        called,
        false,
      );
    }
  },
);

test(
  "maps an owner-authorized unsatisfiable storage range to 416",
  async () => {
    const response =
      await handleCreatorPrivateAudioRead({
        projectId:
          "sesh-project:http-range",

        audioAssetId:
          "sesh-audio:http-range",

        rangeHeader:
          "bytes=999-",

        reads: {
          async readProjectAudioBytes() {
            return {
              ok:
                false as const,

              error: {
                code:
                  "range-not-satisfiable" as const,

                message:
                  "The requested private audio byte range is not satisfiable.",
              },
            };
          },
        },
      });

    assert.equal(
      response.status,
      416,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );
  },
);