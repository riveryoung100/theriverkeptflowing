import assert from "node:assert/strict";
import test from "node:test";

import type {
  PublicSeshCreatorProjectCollectionResult,
  PublicSeshCreatorProjectCollectionService,
} from "../operations";

import {
  handlePublicSeshCreatorProjectsRead,
} from "./public-creator-projects-api";

function service(
  result:
    PublicSeshCreatorProjectCollectionResult,

  onList?:
    (handle: unknown) => void,
): PublicSeshCreatorProjectCollectionService {
  return {
    async listByHandle(
      handle:
        unknown,
    ) {
      onList?.(
        handle,
      );

      return result;
    },
  };
}

test(
  "returns canonical handle and minimal public projects as no-store JSON",
  async () => {
    let received:
      unknown;

    const response =
      await handlePublicSeshCreatorProjectsRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creators/RIVER/projects",
          ),

        handle:
          "RIVER",

        collection:
          service(
            {
              ok:
                true,

              value: {
                handle:
                  "river" as never,

                projects: [
                  {
                    id:
                      "sesh-project:one" as never,

                    title:
                      "One",

                    description:
                      "Public.",
                  },
                ],
              },
            },
            (handle) => {
              received =
                handle;
            },
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

    assert.equal(
      response.headers.get(
        "content-type",
      ),
      "application/json; charset=utf-8",
    );

    assert.equal(
      received,
      "RIVER",
    );

    assert.deepEqual(
      await response.json(),
      {
        ok:
          true,

        value: {
          handle:
            "river",

          projects: [
            {
              id:
                "sesh-project:one",

              title:
                "One",

              description:
                "Public.",
            },
          ],
        },
      },
    );
  },
);

for (
  const failure of [
    {
      code:
        "invalid-input" as const,
      status:
        400,
    },
    {
      code:
        "not-found" as const,
      status:
        404,
    },
    {
      code:
        "unavailable" as const,
      status:
        503,
    },
  ]
) {
  test(
    `maps ${failure.code} to HTTP ${failure.status}`,
    async () => {
      const response =
        await handlePublicSeshCreatorProjectsRead({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creators/river/projects",
            ),

          handle:
            "river",

          collection:
            service({
              ok:
                false,

              error: {
                code:
                  failure.code,

                message:
                  "failure",
              },
            }),
        });

      assert.equal(
        response.status,
        failure.status,
      );

      assert.equal(
        response.headers.get(
          "cache-control",
        ),
        "no-store",
      );
    },
  );
}

test(
  "missing dynamic handle reaches collection as invalid input",
  async () => {
    let received:
      unknown =
        Symbol(
          "unset",
        );

    const response =
      await handlePublicSeshCreatorProjectsRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creators//projects",
          ),

        handle:
          undefined,

        collection:
          service(
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
            (handle) => {
              received =
                handle;
            },
          ),
      });

    assert.equal(
      received,
      "",
    );

    assert.equal(
      response.status,
      400,
    );
  },
);