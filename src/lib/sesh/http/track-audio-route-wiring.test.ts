import assert from "node:assert/strict";
import test from "node:test";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

function source(
  relative:
    string,
): string {
  return readFileSync(
    resolve(
      process.cwd(),
      relative,
    ),
    "utf8",
  );
}

test(
  "track audio assignment route exposes only PUT and DELETE through canonical HTTP and runtime boundaries",
  () => {
    const route =
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/[trackId]/audio/[audioAssetId].ts",
      );

    assert.match(
      route,
      /export const prerender = false;/,
    );

    assert.match(
      route,
      /export const PUT:/,
    );

    assert.match(
      route,
      /export const DELETE:/,
    );

    assert.doesNotMatch(
      route,
      /export const GET:/,
    );

    assert.doesNotMatch(
      route,
      /export const POST:/,
    );

    assert.doesNotMatch(
      route,
      /export const PATCH:/,
    );

    assert.match(
      route,
      /handleSeshTrackAudioAttach/,
    );

    assert.match(
      route,
      /handleSeshTrackAudioDetach/,
    );

    assert.match(
      route,
      /createAuthorizedSeshTrackAudioOperationsAtRuntime/,
    );
  },
);

test(
  "track audio assignment route passes project track and audio identifiers only from route params",
  () => {
    const route =
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/[trackId]/audio/[audioAssetId].ts",
      );

    assert.match(
      route,
      /projectId:\s*params\.projectId/s,
    );

    assert.match(
      route,
      /trackId:\s*params\.trackId/s,
    );

    assert.match(
      route,
      /audioAssetId:\s*params\.audioAssetId/s,
    );

    assert.doesNotMatch(
      route,
      /request\.json\(/,
    );

    assert.doesNotMatch(
      route,
      /revision/,
    );

    assert.doesNotMatch(
      route,
      /ownerCreatorId/,
    );

    assert.doesNotMatch(
      route,
      /seshCreatorId/,
    );
  },
);

test(
  "track audio assignment route adds no direct D1 R2 public collaborator or rights authority",
  () => {
    const route =
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/[trackId]/audio/[audioAssetId].ts",
      );

    for (
      const forbidden of [
        "D1SeshProjectRepository",
        "D1SeshTrackRepository",
        "D1SeshAudioAssetRepository",
        "SESH_DB",
        "SESH_AUDIO",
        "putObject(",
        "getObject(",
        "deleteObject(",
        "publicUrl",
        "signedUrl",
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
      );
    }
  },
);