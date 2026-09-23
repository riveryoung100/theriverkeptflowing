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
  "creator vanity page resolves projects only after the public creator profile resolves",
  () => {
    const profileResolution =
      page.indexOf(
        "await resolution.resolveByHandle",
      );

    const collectionComposition =
      page.indexOf(
        "createPublicSeshCreatorProjectCollectionAtRuntime",
      );

    const collectionResolution =
      page.indexOf(
        "await collection.listByHandle",
      );

    assert.notEqual(
      profileResolution,
      -1,
    );

    assert.notEqual(
      collectionComposition,
      -1,
    );

    assert.notEqual(
      collectionResolution,
      -1,
    );

    assert.ok(
      profileResolution <
        collectionResolution,
    );

    assert.match(
      page,
      /collection\.listByHandle\(\s*profile\.handle\s*\)/s,
    );
  },
);

test(
  "creator vanity page requires canonical collection handle agreement",
  () => {
    assert.match(
      page,
      /collectionResult\.value\.handle ===\s*profile\.handle/s,
    );

    assert.match(
      page,
      /pageStatus\s*=\s*503/s,
    );
  },
);

test(
  "creator vanity page renders only public project presentation text",
  () => {
    assert.match(
      page,
      /projects\.map\(\(project\)\s*=>/s,
    );

    assert.match(
      page,
      /project\.title/s,
    );

    assert.match(
      page,
      /project\.description/s,
    );

    assert.doesNotMatch(
      page,
      /project\.ownerCreatorId/s,
    );

    assert.doesNotMatch(
      page,
      /project\.createdAt/s,
    );

    assert.doesNotMatch(
      page,
      /project\.updatedAt/s,
    );

    assert.doesNotMatch(
      page,
      /project\.trackIds/s,
    );

    assert.doesNotMatch(
      page,
      /project\.sessionIds/s,
    );

    assert.doesNotMatch(
      page,
      /project\.audioAssetIds/s,
    );

    assert.doesNotMatch(
      page,
      /project\.tempoMapId/s,
    );

    assert.doesNotMatch(
      page,
      /project\.beatGridId/s,
    );

    assert.doesNotMatch(
      page,
      />\s*\{project\.id\}\s*</s,
    );
  },
);

test(
  "creator vanity page links public projects only to the human public detail route",
  () => {
    assert.match(
      page,
      /href=\{`\/sesh\/projects\/\$\{project\.id\}\/`\}/s,
    );

    assert.doesNotMatch(
      page,
      /href=\{`\/api\/sesh\/projects\/public\//s,
    );
  },
);

test(
  "creator vanity project presentation remains SESH_DB-only and read-only",
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
  "creator vanity project presentation preserves no-store canonical noindex and explicit failure status handling",
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
      /Astro\.response\.status/s,
    );

    assert.match(
      page,
      /canonical=\{canonical\}/s,
    );

    assert.match(
      page,
      /noindex=\{noindex\}/s,
    );

    assert.match(
      page,
      /`\/sesh\/\$\{profile\.handle\}\/`/s,
    );
  },
);