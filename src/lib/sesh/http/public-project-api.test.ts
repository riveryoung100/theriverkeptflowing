import assert from "node:assert/strict";
import test from "node:test";

import type {
  PublicSeshProjectResolutionResult,
  PublicSeshProjectResolutionService,
} from "../operations";

import {
  handlePublicSeshProjectRead,
} from "./public-project-api";

function service(
  result:
    PublicSeshProjectResolutionResult,

  onResolve?:
    (projectId: unknown) => void,
): PublicSeshProjectResolutionService {
  return {
    async resolveByProjectId(
      projectId:
        unknown,
    ) {
      onResolve?.(
        projectId,
      );

      return result;
    },
  };
}

test(
  "returns minimal public project as no-store JSON",
  async () => {
    let received:
      unknown;

    const response =
      await handlePublicSeshProjectRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects/public/sesh-project:one",
          ),

        projectId:
          "sesh-project:one",

        resolution:
          service(
            {
              ok:
                true,

              value: {
                id:
                  "sesh-project:one" as never,

                title:
                  "One",

                description:
                  "Public project.",
              },
            },
            (projectId) => {
              received =
                projectId;
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
      "sesh-project:one",
    );

    assert.deepEqual(
      await response.json(),
      {
        ok:
          true,

        value: {
          id:
            "sesh-project:one",

          title:
            "One",

          description:
            "Public project.",
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
        await handlePublicSeshProjectRead({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/projects/public/sesh-project:one",
            ),

          projectId:
            "sesh-project:one",

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
    },
  );
}

test(
  "missing dynamic project id reaches resolver as invalid input without inventing identity",
  async () => {
    let received:
      unknown =
        Symbol(
          "unset",
        );

    const response =
      await handlePublicSeshProjectRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects/public/",
          ),

        projectId:
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
            (projectId) => {
              received =
                projectId;
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