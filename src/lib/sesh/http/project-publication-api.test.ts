import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthorizedSeshProjectPublicationOperationService,
} from "../operations/project-publication-operation-service";

import {
  handleSeshProjectPublicationUpdate,
} from "./project-publication-api";

function service():
AuthorizedSeshProjectPublicationOperationService {
  return {
    async updatePublication(
      projectId,
      input,
    ) {
      return {
        ok: true,
        value: {
          projectId:
            projectId as never,
          ownerCreatorId:
            "sesh-creator:test" as never,
          state:
            (
              input as {
                state: "private" | "public";
              }
            ).state,
          updatedAt:
            "2026-09-23T14:00:00.000Z" as never,
        },
      };
    },
  };
}

test(
  "same-origin PATCH reaches only the publication operation",
  async () => {
    const response =
      await handleSeshProjectPublicationUpdate({
        request:
          new Request(
            "https://example.com/api/sesh/projects/sesh-project:test/publication",
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
                JSON.stringify({
                  state:
                    "public",
                }),
            },
          ),

        projectId:
          "sesh-project:test",

        operations:
          service(),
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
  },
);

test(
  "cross-origin PATCH is rejected before operation execution",
  async () => {
    let called =
      false;

    const operations:
      AuthorizedSeshProjectPublicationOperationService = {
        async updatePublication() {
          called =
            true;

          throw new Error(
            "must not run",
          );
        },
      };

    const response =
      await handleSeshProjectPublicationUpdate({
        request:
          new Request(
            "https://example.com/api/sesh/projects/sesh-project:test/publication",
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
                  state:
                    "public",
                }),
            },
          ),

        projectId:
          "sesh-project:test",

        operations,
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
  "malformed JSON is rejected before operation execution",
  async () => {
    let called =
      false;

    const operations:
      AuthorizedSeshProjectPublicationOperationService = {
        async updatePublication() {
          called =
            true;

          throw new Error(
            "must not run",
          );
        },
      };

    const response =
      await handleSeshProjectPublicationUpdate({
        request:
          new Request(
            "https://example.com/api/sesh/projects/sesh-project:test/publication",
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
          "sesh-project:test",

        operations,
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

test(
  "maps publication operation failures to HTTP status",
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

    for (const [
      code,
      status,
    ] of cases) {
      const operations:
        AuthorizedSeshProjectPublicationOperationService = {
          async updatePublication() {
            return {
              ok:
                false,

              error: {
                code,
                message:
                  code,
              },
            };
          },
        };

      const response =
        await handleSeshProjectPublicationUpdate({
          request:
            new Request(
              "https://example.com/api/sesh/projects/sesh-project:test/publication",
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
                  JSON.stringify({
                    state:
                      "public",
                  }),
              },
            ),

          projectId:
            "sesh-project:test",

          operations,
        });

      assert.equal(
        response.status,
        status,
      );
    }
  },
);