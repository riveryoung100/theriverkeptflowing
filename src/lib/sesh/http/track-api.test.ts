import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthorizedSeshTrackOperationService,
} from "../operations";

import {
  handleSeshTrackCollectionRead,
  handleSeshTrackCreate,
  handleSeshTrackDelete,
  handleSeshTrackRead,
  handleSeshTrackUpdate,
} from "./track-api";

function service(
  overrides:
    Partial<
      AuthorizedSeshTrackOperationService
    > =
      {},
): AuthorizedSeshTrackOperationService {
  return {
    async createTrack() {
      return {
        ok:
          true as const,

        value: {
          id:
            "sesh-track:created" as never,

          projectId:
            "sesh-project:one" as never,

          name:
            "Created",

          order:
            0,

          audioAssetIds:
            [],
        },
      };
    },

    async readTrack() {
      return {
        ok:
          true as const,

        value: {
          id:
            "sesh-track:one" as never,

          projectId:
            "sesh-project:one" as never,

          name:
            "One",

          order:
            0,

          audioAssetIds:
            [],
        },
      };
    },

    async listTracks() {
      return {
        ok:
          true as const,

        value:
          [],
      };
    },

    async updateTrack() {
      return {
        ok:
          true as const,

        value: {
          id:
            "sesh-track:one" as never,

          projectId:
            "sesh-project:one" as never,

          name:
            "Updated",

          order:
            0,

          audioAssetIds:
            [],
        },
      };
    },

    async deleteTrack() {
      return {
        ok:
          true as const,

        value:
          true,
      };
    },

    ...overrides,
  };
}

test(
  "returns an owner-authorized track collection as no-store JSON",
  async () => {
    let receivedProject:
      unknown;

    const response =
      await handleSeshTrackCollectionRead({
        request:
          new Request(
            "https://example.test/api/sesh/projects/sesh-project%3Aone/tracks",
          ),

        projectId:
          "sesh-project:one",

        operations:
          service({
            async listTracks(
              projectId,
            ) {
              receivedProject =
                projectId;

              return {
                ok:
                  true as const,

                value:
                  [],
              };
            },
          }),
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
      receivedProject,
      "sesh-project:one",
    );
  },
);

test(
  "same-origin POST passes only project route identity and JSON create input",
  async () => {
    let receivedProject:
      unknown;

    let receivedInput:
      unknown;

    const request =
      new Request(
        "https://example.test/api/sesh/projects/sesh-project%3Aone/tracks",
        {
          method:
            "POST",

          headers: {
            origin:
              "https://example.test",

            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              name:
                "Lead Vocal",
            }),
        },
      );

    const response =
      await handleSeshTrackCreate({
        request,

        projectId:
          "sesh-project:one",

        operations:
          service({
            async createTrack(
              projectId,
              input,
            ) {
              receivedProject =
                projectId;

              receivedInput =
                input;

              return {
                ok:
                  true as const,

                value: {
                  id:
                    "sesh-track:new" as never,

                  projectId:
                    "sesh-project:one" as never,

                  name:
                    "Lead Vocal",

                  order:
                    0,

                  audioAssetIds:
                    [],
                },
              };
            },
          }),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      receivedProject,
      "sesh-project:one",
    );

    assert.deepEqual(
      receivedInput,
      {
        name:
          "Lead Vocal",
      },
    );
  },
);

test(
  "cross-origin POST is rejected before track creation",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshTrackCreate({
        request:
          new Request(
            "https://example.test/api/sesh/projects/sesh-project%3Aone/tracks",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://evil.test",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    "Nope",
                }),
            },
          ),

        projectId:
          "sesh-project:one",

        operations:
          service({
            async createTrack() {
              calls +=
                1;

              throw new Error(
                "must not execute",
              );
            },
          }),
      });

    assert.equal(
      response.status,
      403,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  "item GET passes only project and track route identifiers",
  async () => {
    let received:
      readonly unknown[] =
        [];

    const response =
      await handleSeshTrackRead({
        request:
          new Request(
            "https://example.test/api/sesh/projects/one/tracks/two",
          ),

        projectId:
          "sesh-project:one",

        trackId:
          "sesh-track:two",

        operations:
          service({
            async readTrack(
              projectId,
              trackId,
            ) {
              received =
                [
                  projectId,
                  trackId,
                ];

              return {
                ok:
                  true as const,

                value: {
                  id:
                    "sesh-track:two" as never,

                  projectId:
                    "sesh-project:one" as never,

                  name:
                    "Two",

                  order:
                    0,

                  audioAssetIds:
                    [],
                },
              };
            },
          }),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.deepEqual(
      received,
      [
        "sesh-project:one",
        "sesh-track:two",
      ],
    );
  },
);

test(
  "same-origin PATCH passes JSON only to canonical track update",
  async () => {
    let received:
      readonly unknown[] =
        [];

    const response =
      await handleSeshTrackUpdate({
        request:
          new Request(
            "https://example.test/api/sesh/projects/one/tracks/two",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://example.test",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    "Renamed",
                  gain:
                    0.8,
                }),
            },
          ),

        projectId:
          "sesh-project:one",

        trackId:
          "sesh-track:two",

        operations:
          service({
            async updateTrack(
              projectId,
              trackId,
              update,
            ) {
              received =
                [
                  projectId,
                  trackId,
                  update,
                ];

              return {
                ok:
                  true as const,

                value: {
                  id:
                    "sesh-track:two" as never,

                  projectId:
                    "sesh-project:one" as never,

                  name:
                    "Renamed",

                  order:
                    0,

                  audioAssetIds:
                    [],

                  gain:
                    0.8,
                },
              };
            },
          }),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.deepEqual(
      received,
      [
        "sesh-project:one",
        "sesh-track:two",
        {
          name:
            "Renamed",
          gain:
            0.8,
        },
      ],
    );
  },
);

test(
  "malformed PATCH JSON is rejected before track update",
  async () => {
    let calls =
      0;

    const response =
      await handleSeshTrackUpdate({
        request:
          new Request(
            "https://example.test/api/sesh/projects/one/tracks/two",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://example.test",

                "content-type":
                  "application/json",
              },

              body:
                "{",
            },
          ),

        projectId:
          "sesh-project:one",

        trackId:
          "sesh-track:two",

        operations:
          service({
            async updateTrack() {
              calls +=
                1;

              throw new Error(
                "must not execute",
              );
            },
          }),
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
  "same-origin DELETE reaches only canonical owner-authorized track deletion",
  async () => {
    let received:
      readonly unknown[] =
        [];

    const response =
      await handleSeshTrackDelete({
        request:
          new Request(
            "https://example.test/api/sesh/projects/one/tracks/two",
            {
              method:
                "DELETE",

              headers: {
                origin:
                  "https://example.test",
              },
            },
          ),

        projectId:
          "sesh-project:one",

        trackId:
          "sesh-track:two",

        operations:
          service({
            async deleteTrack(
              projectId,
              trackId,
            ) {
              received =
                [
                  projectId,
                  trackId,
                ];

              return {
                ok:
                  true as const,

                value:
                  true,
              };
            },
          }),
      });

    assert.equal(
      response.status,
      200,
    );

    assert.deepEqual(
      received,
      [
        "sesh-project:one",
        "sesh-track:two",
      ],
    );
  },
);

test(
  "maps canonical track operation failures to established HTTP statuses",
  async () => {
    const cases =
      [
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
      ] as const;

    for (
      const [
        code,
        status,
      ] of cases
    ) {
      const response =
        await handleSeshTrackRead({
          request:
            new Request(
              "https://example.test/api/sesh/projects/one/tracks/two",
            ),

          projectId:
            "sesh-project:one",

          trackId:
            "sesh-track:two",

          operations:
            service({
              async readTrack() {
                return {
                  ok:
                    false as const,

                  error: {
                    code,

                    message:
                      "simulated",
                  },
                };
              },
            }),
        });

      assert.equal(
        response.status,
        status,
      );
    }
  },
);