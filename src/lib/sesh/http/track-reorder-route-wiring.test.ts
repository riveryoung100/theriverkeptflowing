import assert from "node:assert/strict";
import test from "node:test";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

const route =
  readFileSync(
    resolve(
      process.cwd(),
      "src/pages/api/sesh/projects/[projectId]/tracks/reorder.ts",
    ),
    "utf8",
  );

test(
  "track reorder route exposes POST only through canonical reorder HTTP and runtime boundaries",
  () => {
    assert.match(
      route,
      /export const POST:/,
    );

    assert.doesNotMatch(
      route,
      /export const GET:/,
    );

    assert.doesNotMatch(
      route,
      /export const PATCH:/,
    );

    assert.doesNotMatch(
      route,
      /export const DELETE:/,
    );

    assert.match(
      route,
      /handleSeshTrackReorder/,
    );

    assert.match(
      route,
      /createAuthorizedSeshTrackReorderAtRuntime/,
    );
  },
);

test(
  "track reorder route contains no direct persistence audio identity or rights authority",
  () => {
    for (
      const forbidden of [
        "D1SeshTrackRepository",
        "D1SeshProjectRepository",
        "D1PrincipalRepository",
        "SESH_AUDIO",
        "putObject(",
        "getObject(",
        "deleteObject(",
        "publicUrl",
        "signedUrl",
        "revision:",
        "expectedRevision",
        "ownerCreatorId",
        "principalId",
        "collaborator",
        "publishingRights",
        "managementRights",
        "masterRights",
        "royaltyShare",
        "ownershipTransfer",
      ]
    ) {
      assert.equal(
        route.includes(
          forbidden,
        ),
        false,
        `forbidden route authority: ${forbidden}`,
      );
    }
  },
);