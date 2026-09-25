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
  "track collection route exposes private GET and same-origin POST through canonical runtime composition",
  () => {
    const route =
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/index.ts",
      );

    assert.match(
      route,
      /export const GET:/,
    );

    assert.match(
      route,
      /export const POST:/,
    );

    assert.match(
      route,
      /handleSeshTrackCollectionRead/,
    );

    assert.match(
      route,
      /handleSeshTrackCreate/,
    );

    assert.match(
      route,
      /createAuthorizedSeshTrackOperationsAtRuntime/,
    );

    assert.doesNotMatch(
      route,
      /SESH_AUDIO/,
    );
  },
);

test(
  "track item route exposes GET PATCH DELETE only through canonical track handlers",
  () => {
    const route =
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/[trackId].ts",
      );

    assert.match(
      route,
      /export const GET:/,
    );

    assert.match(
      route,
      /export const PATCH:/,
    );

    assert.match(
      route,
      /export const DELETE:/,
    );

    assert.match(
      route,
      /handleSeshTrackRead/,
    );

    assert.match(
      route,
      /handleSeshTrackUpdate/,
    );

    assert.match(
      route,
      /handleSeshTrackDelete/,
    );

    assert.doesNotMatch(
      route,
      /SESH_AUDIO/,
    );
  },
);

test(
  "track HTTP routes add no direct persistence public media or rights authority",
  () => {
    const combined =
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/index.ts",
      ) +
      source(
        "src/pages/api/sesh/projects/[projectId]/tracks/[trackId].ts",
      );

    for (
      const forbidden of [
        "D1SeshTrackRepository",
        "D1SeshProjectRepository",
        "SESH_AUDIO",
        "putObject(",
        "getObject(",
        "deleteObject(",
        "publicUrl",
        "signedUrl",
        "publishingRights",
        "managementRights",
        "masterRights",
        "royaltyShare",
        "ownershipTransfer",
      ]
    ) {
      assert.equal(
        combined.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);