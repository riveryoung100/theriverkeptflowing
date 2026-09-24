import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreatorAudioUploadService,
} from "../operations/creator-audio-upload-service";

import {
  handleCreatorAudioUpload,
} from "./creator-audio-upload-api";

function uploadService(
  execute:
    CreatorAudioUploadService["uploadProjectAudio"],
): CreatorAudioUploadService {
  return {
    uploadProjectAudio:
      execute,
  };
}

function request(
  body:
    Uint8Array,

  headers:
    Record<string, string> = {},
): Request {
  return new Request(
    "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-upload/audio/",
    {
      method:
        "POST",

      headers: {
        origin:
          "https://theriverkeptflowing.com",

        "content-type":
          "audio/wav",

        "x-sesh-audio-name":
          "Take One",

        ...headers,
      },

      body,
    },
  );
}

test(
  "accepts same-origin bounded WAV bytes and delegates sanitized upload input",
  async () => {
    let capturedProject:
      unknown;

    let capturedInput:
      unknown;

    const response =
      await handleCreatorAudioUpload({
        request:
          request(
            Uint8Array.from([
              1,
              2,
              3,
              4,
            ]),
            {
              "x-sesh-duration-seconds":
                "1.25",

              "x-sesh-sample-rate-hz":
                "48000",

              "x-sesh-channel-count":
                "2",
            },
          ),

        projectId:
          "sesh-project:http-upload",

        uploads:
          uploadService(
            async (
              projectId,
              input,
            ) => {
              capturedProject =
                projectId;

              capturedInput =
                input;

              return {
                ok:
                  true,

                value: {
                  id:
                    "sesh-audio:server-generated",

                  kind:
                    "recording",

                  name:
                    "Take One",

                  contentType:
                    "audio/wav",

                  durationSeconds:
                    1.25,

                  sampleRateHz:
                    48000,

                  channelCount:
                    2,

                  hasStoredAudio:
                    true,
                },
              };
            },
          ),
      });

    assert.equal(
      response.status,
      201,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    assert.equal(
      capturedProject,
      "sesh-project:http-upload",
    );

    assert.deepEqual(
      capturedInput,
      {
        kind:
          "recording",

        name:
          "Take One",

        contentType:
          "audio/wav",

        bytes:
          Uint8Array.from([
            1,
            2,
            3,
            4,
          ]),

        durationSeconds:
          1.25,

        sampleRateHz:
          48000,

        channelCount:
          2,
      },
    );

    const body =
      await response.json() as
        Record<string, unknown>;

    const serialized =
      JSON.stringify(
        body,
      );

    for (
      const forbidden of [
        "storageReference",
        "storage_reference",
        "r2",
        "bucket",
        "key",
        "revision",
        "ownerCreatorId",
      ]
    ) {
      assert.equal(
        serialized.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);

test(
  "rejects missing or cross-origin write requests before upload execution",
  async () => {
    let calls =
      0;

    const uploads =
      uploadService(
        async () => {
          calls +=
            1;

          throw new Error(
            "must not execute",
          );
        },
      );

    for (
      const origin of [
        null,
        "https://attacker.example",
      ]
    ) {
      const headers:
        Record<string, string> = {
          "content-type":
            "audio/wav",

          "x-sesh-audio-name":
            "Take One",
        };

      if (
        origin !==
        null
      ) {
        headers.origin =
          origin;
      }

      const response =
        await handleCreatorAudioUpload({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-upload/audio/",
              {
                method:
                  "POST",

                headers,

                body:
                  Uint8Array.from([
                    1,
                  ]),
              },
            ),

          projectId:
            "sesh-project:http-upload",

          uploads,
        });

      assert.equal(
        response.status,
        403,
      );
    }

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "rejects non-WAV content before upload execution",
  async () => {
    let calls =
      0;

    const response =
      await handleCreatorAudioUpload({
        request:
          request(
            Uint8Array.from([
              1,
            ]),
            {
              "content-type":
                "audio/mpeg",
            },
          ),

        projectId:
          "sesh-project:http-upload",

        uploads:
          uploadService(
            async () => {
              calls +=
                1;

              throw new Error(
                "must not execute",
              );
            },
          ),
      });

    assert.equal(
      response.status,
      400,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "rejects an oversized declared Content-Length before reading or executing",
  async () => {
    let calls =
      0;

    const response =
      await handleCreatorAudioUpload({
        request:
          request(
            Uint8Array.from([
              1,
            ]),
            {
              "content-length":
                "26214401",
            },
          ),

        projectId:
          "sesh-project:http-upload",

        uploads:
          uploadService(
            async () => {
              calls +=
                1;

              throw new Error(
                "must not execute",
              );
            },
          ),
      });

    assert.equal(
      response.status,
      400,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "maps upload operation failures to established Sesh HTTP statuses",
  async () => {
    const cases = [
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
      ] of
      cases
    ) {
      const response =
        await handleCreatorAudioUpload({
          request:
            request(
              Uint8Array.from([
                1,
              ]),
            ),

          projectId:
            "sesh-project:http-upload",

          uploads:
            uploadService(
              async () => ({
                ok:
                  false,

                error: {
                  code,

                  message:
                    code,
                },
              }),
            ),
        });

      assert.equal(
        response.status,
        status,
      );
    }
  },
);