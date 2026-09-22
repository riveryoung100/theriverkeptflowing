import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthorizedSeshProjectOperationService,
  SeshProjectOperationResult,
} from "../operations/project-operation-service";

import type {
  SeshMusicProject,
} from "../model";

import {
  handleSeshProjectDelete,
  handleSeshProjectRead,
  handleSeshProjectUpdate,
  isSameOriginSeshWriteRequest,
} from "./project-api";

const project:
  SeshMusicProject = {
    id:
      "sesh-project:http-test",

    ownerCreatorId:
      "sesh-creator:http-test",

    title:
      "HTTP Test",

    trackIds:
      [],

    sessionIds:
      [],

    audioAssetIds:
      [],

    createdAt:
      "2026-09-22T00:00:00.000Z",

    updatedAt:
      "2026-09-22T00:00:00.000Z",
  };

function service(
  result:
    SeshProjectOperationResult<
      SeshMusicProject
    >,
): AuthorizedSeshProjectOperationService {
  return {
    async readProject() {
      return result;
    },

    async updateProject() {
      return result;
    },

    async deleteProject() {
      return result.ok
        ? {
            ok:
              true,

            value:
              true,
          }
        : result;
    },
  };
}

async function body(
  response:
    Response,
): Promise<
  Record<string, unknown>
> {
  return await response.json() as
    Record<string, unknown>;
}

test(
  "accepts only exact same-origin Sesh write requests",
  () => {
    assert.equal(
      isSameOriginSeshWriteRequest(
        new Request(
          "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:test",
          {
            headers: {
              origin:
                "https://theriverkeptflowing.com",
            },
          },
        ),
      ),
      true,
    );

    assert.equal(
      isSameOriginSeshWriteRequest(
        new Request(
          "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:test",
          {
            headers: {
              origin:
                "https://attacker.example",
            },
          },
        ),
      ),
      false,
    );

    assert.equal(
      isSameOriginSeshWriteRequest(
        new Request(
          "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:test",
        ),
      ),
      false,
    );
  },
);

test(
  "returns an authorized project read as no-store JSON",
  async () => {
    const response =
      await handleSeshProjectRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-test",
          ),

        projectId:
          project.id,

        operations:
          service({
            ok:
              true,

            value:
              project,
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

    const payload =
      await body(
        response,
      );

    assert.equal(
      payload.ok,
      true,
    );
  },
);

test(
  "rejects cross-origin update before invoking project operations",
  async () => {
    let calls =
      0;

    const operations:
      AuthorizedSeshProjectOperationService = {
        async readProject() {
          throw new Error(
            "Unexpected read.",
          );
        },

        async updateProject() {
          calls +=
            1;

          throw new Error(
            "Unexpected update.",
          );
        },

        async deleteProject() {
          throw new Error(
            "Unexpected delete.",
          );
        },
      };

    const response =
      await handleSeshProjectUpdate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-test",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://attacker.example",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    "Changed",
                }),
            },
          ),

        projectId:
          project.id,

        operations,
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
  "rejects malformed JSON updates",
  async () => {
    const response =
      await handleSeshProjectUpdate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-test",
            {
              method:
                "PATCH",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",

                "content-type":
                  "application/json",
              },

              body:
                "{",
            },
          ),

        projectId:
          project.id,

        operations:
          service({
            ok:
              true,

            value:
              project,
          }),
      });

    assert.equal(
      response.status,
      400,
    );
  },
);

for (
  const failure of [
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
  test(
    `maps ${failure[0]} to HTTP ${failure[1]}`,
    async () => {
      const response =
        await handleSeshProjectRead({
          request:
            new Request(
              "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-test",
            ),

          projectId:
            project.id,

          operations:
            service({
              ok:
                false,

              error: {
                code:
                  failure[0],

                message:
                  "failure",
              },
            }),
        });

      assert.equal(
        response.status,
        failure[1],
      );
    },
  );
}

test(
  "same-origin delete reaches only the canonical delete operation",
  async () => {
    let deletes =
      0;

    const operations:
      AuthorizedSeshProjectOperationService = {
        async readProject() {
          throw new Error(
            "Unexpected read.",
          );
        },

        async updateProject() {
          throw new Error(
            "Unexpected update.",
          );
        },

        async deleteProject() {
          deletes +=
            1;

          return {
            ok:
              true,

            value:
              true,
          };
        },
      };

    const response =
      await handleSeshProjectDelete({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects/sesh-project:http-test",
            {
              method:
                "DELETE",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",
              },
            },
          ),

        projectId:
          project.id,

        operations,
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      deletes,
      1,
    );
  },
);