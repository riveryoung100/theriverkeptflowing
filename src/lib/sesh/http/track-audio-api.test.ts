import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthorizedSeshTrackAudioOperationService,
  SeshTrackAudioOperationResult,
} from "../operations";

import {
  handleSeshTrackAudioAttach,
  handleSeshTrackAudioDetach,
} from "./track-audio-api";

const projectId =
  "sesh-project:http-track-audio";

const trackId =
  "sesh-track:http-track-audio";

const audioAssetId =
  "sesh-audio:http-track-audio";

function sameOriginRequest(
  method:
    string,
): Request {
  return new Request(
    "https://example.com/api/sesh/projects/x/tracks/y/audio/z",
    {
      method,

      headers: {
        origin:
          "https://example.com",
      },
    },
  );
}

function operations(
  attach:
    SeshTrackAudioOperationResult,

  detach:
    SeshTrackAudioOperationResult = attach,
): AuthorizedSeshTrackAudioOperationService {
  return {
    async attachAudioAsset(
      requestedProjectId,
      requestedTrackId,
      requestedAudioAssetId,
    ) {
      assert.equal(
        requestedProjectId,
        projectId,
      );

      assert.equal(
        requestedTrackId,
        trackId,
      );

      assert.equal(
        requestedAudioAssetId,
        audioAssetId,
      );

      return attach;
    },

    async detachAudioAsset(
      requestedProjectId,
      requestedTrackId,
      requestedAudioAssetId,
    ) {
      assert.equal(
        requestedProjectId,
        projectId,
      );

      assert.equal(
        requestedTrackId,
        trackId,
      );

      assert.equal(
        requestedAudioAssetId,
        audioAssetId,
      );

      return detach;
    },
  };
}

const successfulResult:
SeshTrackAudioOperationResult = {
  ok:
    true,

  value: {
    id:
      trackId,

    projectId,

    name:
      "Lead",

    order:
      0,

    audioAssetIds: [
      audioAssetId,
    ],
  },
};

test(
  "PUT-style attach delegates route identifiers to the owner-authorized operation without request-body authority",
  async () => {
    const response =
      await handleSeshTrackAudioAttach({
        request:
          sameOriginRequest(
            "PUT",
          ),

        projectId,
        trackId,
        audioAssetId,

        operations:
          operations(
            successfulResult,
          ),
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

    const body =
      await response.json();

    assert.equal(
      body.ok,
      true,
    );

    assert.deepEqual(
      body.value.audioAssetIds,
      [
        audioAssetId,
      ],
    );
  },
);

test(
  "DELETE-style detach delegates route identifiers to the owner-authorized operation",
  async () => {
    const detached:
      SeshTrackAudioOperationResult = {
        ok:
          true,

        value: {
          id:
            trackId,

          projectId,

          name:
            "Lead",

          order:
            0,

          audioAssetIds:
            [],
        },
      };

    const response =
      await handleSeshTrackAudioDetach({
        request:
          sameOriginRequest(
            "DELETE",
          ),

        projectId,
        trackId,
        audioAssetId,

        operations:
          operations(
            successfulResult,
            detached,
          ),
      });

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.ok,
      true,
    );

    assert.deepEqual(
      body.value.audioAssetIds,
      [],
    );
  },
);

test(
  "track audio mutation rejects missing or cross-origin origin before operation execution",
  async () => {
    let calls =
      0;

    const service:
      AuthorizedSeshTrackAudioOperationService = {
        async attachAudioAsset() {
          calls +=
            1;

          return successfulResult;
        },

        async detachAudioAsset() {
          calls +=
            1;

          return successfulResult;
        },
      };

    for (
      const request of
      [
        new Request(
          "https://example.com/api/sesh/projects/x/tracks/y/audio/z",
          {
            method:
              "PUT",
          },
        ),
        new Request(
          "https://example.com/api/sesh/projects/x/tracks/y/audio/z",
          {
            method:
              "DELETE",

            headers: {
              origin:
                "https://evil.example",
            },
          },
        ),
      ]
    ) {
      const response =
        request.method ===
          "PUT"
          ? await handleSeshTrackAudioAttach({
              request,
              projectId,
              trackId,
              audioAssetId,
              operations:
                service,
            })
          : await handleSeshTrackAudioDetach({
              request,
              projectId,
              trackId,
              audioAssetId,
              operations:
                service,
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
  "operation failures map to established authenticated Sesh HTTP status codes",
  async () => {
    const cases:
      readonly [
        SeshTrackAudioOperationResult,
        number,
      ][] = [
        [
          {
            ok:
              false,

            error: {
              code:
                "invalid-input",

              message:
                "invalid",
            },
          },
          400,
        ],
        [
          {
            ok:
              false,

            error: {
              code:
                "unauthenticated",

              message:
                "auth",
            },
          },
          401,
        ],
        [
          {
            ok:
              false,

            error: {
              code:
                "unmapped",

              message:
                "unmapped",
            },
          },
          403,
        ],
        [
          {
            ok:
              false,

            error: {
              code:
                "forbidden",

              message:
                "forbidden",
            },
          },
          403,
        ],
        [
          {
            ok:
              false,

            error: {
              code:
                "not-found",

              message:
                "missing",
            },
          },
          404,
        ],
        [
          {
            ok:
              false,

            error: {
              code:
                "conflict",

              message:
                "conflict",
            },
          },
          409,
        ],
        [
          {
            ok:
              false,

            error: {
              code:
                "unavailable",

              message:
                "unavailable",
            },
          },
          503,
        ],
      ];

    for (
      const [
        result,
        expectedStatus,
      ] of
      cases
    ) {
      const response =
        await handleSeshTrackAudioAttach({
          request:
            sameOriginRequest(
              "PUT",
            ),

          projectId,
          trackId,
          audioAssetId,

          operations:
            operations(
              result,
            ),
        });

      assert.equal(
        response.status,
        expectedStatus,
      );
    }
  },
);