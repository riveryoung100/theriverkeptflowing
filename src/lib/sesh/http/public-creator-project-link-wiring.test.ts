import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import test from "node:test";

const page =
  readFileSync(
    new URL(
      "../../../pages/sesh/[handle].astro",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "creator vanity links only an already-resolved public project id to the public detail route",
  () => {
    assert.match(
      page,
      /href=\{`\/sesh\/projects\/\$\{project\.id\}\/`\}/s,
    );

    assert.match(
      page,
      /<a\s+href=\{`\/sesh\/projects\/\$\{project\.id\}\/`\}>\s*\{project\.title\}\s*<\/a>/s,
    );
  },
);

test(
  "project id remains route-only and is not rendered as visible creator-page text",
  () => {
    assert.doesNotMatch(
      page,
      />\s*\{project\.id\}\s*</s,
    );

    assert.doesNotMatch(
      page,
      /aria-label=\{[^}]*project\.id/s,
    );

    assert.doesNotMatch(
      page,
      /title=\{[^}]*project\.id/s,
    );
  },
);

test(
  "creator project link does not expand the public presentation metadata surface",
  () => {
    assert.match(
      page,
      /\{project\.title\}/s,
    );

    assert.match(
      page,
      /project\.description/s,
    );

    for (
      const forbidden of [
        "project.ownerCreatorId",
        "project.creatorId",
        "project.createdAt",
        "project.updatedAt",
        "project.trackIds",
        "project.sessionIds",
        "project.audioAssetIds",
        "project.tempoMapId",
        "project.beatGridId",
        "project.revision",
        "project.schemaVersion",
      ]
    ) {
      assert.equal(
        page.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);

test(
  "creator project linking preserves anonymous SESH_DB-only read boundaries",
  () => {
    assert.match(
      page,
      /createPublicSeshCreatorProjectCollectionAtRuntime/s,
    );

    assert.doesNotMatch(
      page,
      /RIVER_IDENTITY_DB/s,
    );

    assert.doesNotMatch(
      page,
      /\bsession\b/s,
    );

    assert.doesNotMatch(
      page,
      /SESH_AUDIO/s,
    );

    assert.doesNotMatch(
      page,
      /PrincipalId/s,
    );

    assert.doesNotMatch(
      page,
      /SeshCreatorId/s,
    );

    assert.doesNotMatch(
      page,
      /\bPATCH\b/s,
    );

    assert.doesNotMatch(
      page,
      /\bPOST\b/s,
    );

    assert.doesNotMatch(
      page,
      /\bDELETE\b/s,
    );
  },
);

test(
  "creator project linking preserves existing creator-page failure and indexing contracts",
  () => {
    assert.match(
      page,
      /"cache-control",\s*"no-store"/s,
    );

    assert.match(
      page,
      /200 \| 404 \| 503/s,
    );

    assert.match(
      page,
      /collectionResult\.value\.handle ===\s*profile\.handle/s,
    );

    assert.match(
      page,
      /canonical=\{canonical\}/s,
    );

    assert.match(
      page,
      /noindex=\{noindex\}/s,
    );
  },
);

test(
  "creator project links target the human public page rather than the JSON API",
  () => {
    assert.doesNotMatch(
      page,
      /href=\{`\/api\/sesh\/projects\/public\//s,
    );
  },
);