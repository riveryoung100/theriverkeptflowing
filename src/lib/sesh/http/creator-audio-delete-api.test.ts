import assert from "node:assert/strict";
import test from "node:test";

import {
  handleCreatorAudioDelete,
} from "./creator-audio-delete-api";

function request(
  origin:
    string | null =
      "https://theriverkeptflowing.com",
): Request {
  const headers =
    new Headers();

  if (
    origin !==
    null
  ) {
    headers.set(
      "origin",
      origin,
    );
  }

  return new Request(
    "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:one/audio/sesh-audio:one",
    {
      method:
        "DELETE",

      headers,
    },
  );
}

test(
  "same-origin DELETE reaches only the private audio delete service",
  async () => {
    let receivedProject:
      unknown;

    let receivedAudio:
      unknown;

    const response =
      await handleCreatorAudioDelete({
        request:
          request(),

        projectId:
          "sesh-project:one",

        audioAssetId:
          "sesh-audio:one",

        deletes: {
          async deleteProjectAudio(
            projectId,
            audioAssetId,
          ) {
            receivedProject =
              projectId;

            receivedAudio =
              audioAssetId;

            return {
              ok:
                true as const,

              value: {
                id:
                  "sesh-audio:one",

                deleted:
                  true as const,
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
      receivedProject,
      "sesh-project:one",
    );

    assert.equal(
      receivedAudio,
      "sesh-audio:one",
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );
  },
);

test(
  "rejects missing or cross-origin DELETE before delete execution",
  async () => {
    for (
      const origin of [
        null,
        "https://attacker.example",
      ]
    ) {
      let called =
        false;

      const response =
        await handleCreatorAudioDelete({
          request:
            request(
              origin,
            ),

          projectId:
            "sesh-project:one",

          audioAssetId:
            "sesh-audio:one",

          deletes: {
            async deleteProjectAudio() {
              called =
                true;

              throw new Error(
                "must not execute",
              );
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
    }
  },
);

test(
  "maps delete failures to established Sesh HTTP statuses",
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
        await handleCreatorAudioDelete({
          request:
            request(),

          projectId:
            "sesh-project:one",

          audioAssetId:
            "sesh-audio:one",

          deletes: {
            async deleteProjectAudio() {
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
    }
  },
);