import assert from "node:assert/strict";
import test from "node:test";

import {
  handleSeshTrackReorder,
} from "./track-reorder-api";

function request(
  body:
    unknown,

  origin =
    "https://theriverkeptflowing.com",
): Request {
  return new Request(
    "https://theriverkeptflowing.com/api/sesh/projects/sesh_project_test/tracks/reorder",
    {
      method:
        "POST",

      headers: {
        "content-type":
          "application/json",

        origin,
      },

      body:
        JSON.stringify(
          body,
        ),
    },
  );
}

test(
  "same-origin reorder passes route project id and JSON body only to canonical reorder operation",
  async () => {
    let capturedProjectId:
      unknown;

    let capturedBody:
      unknown;

    const body = {
      orderedTrackIds: [
        "sesh_track_b",
        "sesh_track_a",
      ],
    };

    const response =
      await handleSeshTrackReorder({
        request:
          request(
            body,
          ),

        projectId:
          "sesh_project_test",

        operations: {
          async reorderTracks(
            projectId,
            input,
          ) {
            capturedProjectId =
              projectId;

            capturedBody =
              input;

            return {
              ok:
                true as const,

              value:
                [],
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
      capturedProjectId,
      "sesh_project_test",
    );

    assert.deepEqual(
      capturedBody,
      body,
    );
  },
);

test(
  "cross-origin reorder is rejected before operation execution",
  async () => {
    let called =
      false;

    const response =
      await handleSeshTrackReorder({
        request:
          request(
            {
              orderedTrackIds:
                [],
            },
            "https://example.com",
          ),

        projectId:
          "sesh_project_test",

        operations: {
          async reorderTracks() {
            called =
              true;

            return {
              ok:
                true as const,

              value:
                [],
            };
          },
        },
      });

    assert.equal(
      response.status,
      403,
    );

    assert.equal(
      called,
      false,
    );
  },
);

test(
  "malformed reorder JSON is rejected before operation execution",
  async () => {
    let called =
      false;

    const malformed =
      new Request(
        "https://theriverkeptflowing.com/api/sesh/projects/sesh_project_test/tracks/reorder",
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",

            origin:
              "https://theriverkeptflowing.com",
          },

          body:
            "{",
        },
      );

    const response =
      await handleSeshTrackReorder({
        request:
          malformed,

        projectId:
          "sesh_project_test",

        operations: {
          async reorderTracks() {
            called =
              true;

            return {
              ok:
                true as const,

              value:
                [],
            };
          },
        },
      });

    assert.equal(
      response.status,
      400,
    );

    assert.equal(
      called,
      false,
    );
  },
);