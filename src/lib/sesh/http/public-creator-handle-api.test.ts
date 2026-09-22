import assert from "node:assert/strict";
import test from "node:test";

import type {
  PublicSeshCreatorHandleResolutionResult,
  PublicSeshCreatorHandleResolutionService,
} from "../operations";

import {
  handlePublicSeshCreatorHandleRead,
} from "./public-creator-handle-api";

function service(
  result:
    PublicSeshCreatorHandleResolutionResult,

  onResolve?:
    (handle: unknown) => void,
): PublicSeshCreatorHandleResolutionService {
  return {
    async resolveByHandle(
      handle:
        unknown,
    ) {
      onResolve?.(
        handle,
      );

      return result;
    },
  };
}

async function payload(
  response:
    Response,
): Promise<
  Record<string, unknown>
> {
  return await response.json() as
    Record<string, unknown>;
}

test(
  "returns minimal public creator profile as no-store JSON",
  async () => {
    let received:
      unknown;

    const response =
      await handlePublicSeshCreatorHandleRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creators/RIVER",
          ),

        handle:
          "RIVER",

        resolution:
          service(
            {
              ok:
                true,

              value: {
                handle:
                  "river" as never,

                displayName:
                  "River",

                bio:
                  "Makes music.",
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
      await payload(
        response,
      ),
      {
        ok:
          true,

        value: {
          handle:
            "river",

          displayName:
            "River",

          bio:
            "Makes music.",
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
        await handlePublicSeshCreatorHandleRead({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/creators/river",
            ),

          handle:
            "river",

          resolution:
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

      assert.deepEqual(
        await payload(
          response,
        ),
        {
          ok:
            false,

          error: {
            code:
              failure.code,

            message:
              "failure",
          },
        },
      );
    },
  );
}

test(
  "missing dynamic handle reaches resolver as invalid input rather than inventing identity",
  async () => {
    let received:
      unknown =
        Symbol(
          "unset",
        );

    const response =
      await handlePublicSeshCreatorHandleRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/creators/",
          ),

        handle:
          undefined,

        resolution:
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