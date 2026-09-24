import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreatorAudioRenameService,
} from "../operations/creator-audio-rename-service";

import {
  handleCreatorAudioRename,
} from "./creator-audio-rename-api";

function request(
  body:
    unknown,

  origin =
    "https://example.com",
): Request {
  return new Request(
    "https://example.com/api/sesh/projects/sesh-project:one/audio/sesh-audio:one",
    {
      method:
        "PATCH",

      headers: {
        origin,

        "content-type":
          "application/json",
      },

      body:
        JSON.stringify(
          body,
        ),
    },
  );
}

function service(
  implementation:
    CreatorAudioRenameService["renameProjectAudio"],
): CreatorAudioRenameService {
  return {
    renameProjectAudio:
      implementation,
  };
}

test(
  "same-origin PATCH delegates route ids and JSON only to rename service",
  async () => {
    let received:
      readonly unknown[] |
      undefined;

    const response =
      await handleCreatorAudioRename({
        request:
          request({
            name:
              "Renamed",
          }),

        projectId:
          "sesh-project:one",

        audioAssetId:
          "sesh-audio:one",

        renames:
          service(
            async (
              projectId,
              audioAssetId,
              body,
            ) => {
              received = [
                projectId,
                audioAssetId,
                body,
              ];

              return {
                ok:
                  true,

                value: {
                  id:
                    "sesh-audio:one",

                  kind:
                    "recording",

                  name:
                    "Renamed",

                  contentType:
                    "audio/wav",

                  hasStoredAudio:
                    true,
                },
              };
            },
          ),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.deepEqual(
      received,
      [
        "sesh-project:one",
        "sesh-audio:one",
        {
          name:
            "Renamed",
        },
      ],
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    assert.equal(
      response.headers.get(
        "x-content-type-options",
      ),
      "nosniff",
    );

    const payload =
      await response.json() as {
        value:
          Record<string, unknown>;
      };

    assert.equal(
      "storageReference" in
        payload.value,
      false,
    );

    assert.equal(
      "revision" in
        payload.value,
      false,
    );
  },
);

test(
  "rename HTTP rejects cross-origin and malformed JSON before service execution",
  async () => {
    let calls =
      0;

    const crossOrigin =
      await handleCreatorAudioRename({
        request:
          request(
            {
              name:
                "Renamed",
            },
            "https://evil.example",
          ),

        projectId:
          "sesh-project:one",

        audioAssetId:
          "sesh-audio:one",

        renames:
          service(
            async () => {
              calls++;

              throw new Error(
                "must not execute",
              );
            },
          ),
      });

    assert.equal(
      crossOrigin.status,
      403,
    );

    const malformed =
      await handleCreatorAudioRename({
        request:
          new Request(
            "https://example.com/api/sesh/projects/one/audio/one",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://example.com",

                "content-type":
                  "application/json",
              },

              body:
                "{",
            },
          ),

        projectId:
          "sesh-project:one",

        audioAssetId:
          "sesh-audio:one",

        renames:
          service(
            async () => {
              calls++;

              throw new Error(
                "must not execute",
              );
            },
          ),
      });

    assert.equal(
      malformed.status,
      400,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "rename HTTP maps established operation failure statuses",
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
      ] of cases
    ) {
      const response =
        await handleCreatorAudioRename({
          request:
            request({
              name:
                "Renamed",
            }),

          projectId:
            "sesh-project:one",

          audioAssetId:
            "sesh-audio:one",

          renames:
            service(
              async () => ({
                ok:
                  false,

                error: {
                  code,

                  message:
                    "Rejected.",
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