import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthenticatedSeshProjectCollectionService,
} from "../operations";

import {
  handleSeshProjectCollectionRead,
  handleSeshProjectCreate,
} from "./project-collection-api";

function collection():
AuthenticatedSeshProjectCollectionService {
  return {
    async listProjects() {
      return {
        ok:
          true,

        value:
          [],
      };
    },

    async createProject() {
      return {
        ok:
          true,

        value: {
          id:
            "sesh-project:http-created",

          ownerCreatorId:
            "sesh-creator:http-owner",

          title:
            "HTTP Created",

          createdAt:
            "2026-09-22T17:00:00.000Z",

          updatedAt:
            "2026-09-22T17:00:00.000Z",

          trackIds:
            [],

          sessionIds:
            [],

          audioAssetIds:
            [],
        },
      };
    },
  };
}

test(
  "reads the authenticated creator project collection",
  async () => {
    const response =
      await handleSeshProjectCollectionRead({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects",
          ),

        collection:
          collection(),
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
  "creates a project only through a same-origin POST",
  async () => {
    const response =
      await handleSeshProjectCreate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://theriverkeptflowing.com",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    "HTTP Created",
                }),
            },
          ),

        collection:
          collection(),
      });

    assert.equal(
      response.status,
      201,
    );
  },
);

test(
  "rejects cross-origin project creation before collection service execution",
  async () => {
    let calls =
      0;

    const service:
      AuthenticatedSeshProjectCollectionService = {
        async listProjects() {
          return {
            ok:
              true,

            value:
              [],
          };
        },

        async createProject() {
          calls +=
            1;

          throw new Error(
            "Unexpected creation.",
          );
        },
      };

    const response =
      await handleSeshProjectCreate({
        request:
          new Request(
            "https://theriverkeptflowing.com/api/sesh/projects",
            {
              method:
                "POST",

              headers: {
                origin:
                  "https://attacker.example",

                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  title:
                    "Attack",
                }),
            },
          ),

        collection:
          service,
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