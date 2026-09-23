import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import test from "node:test";

const page =
  readFileSync(
    new URL(
      "../../../pages/sesh/projects/[projectId].astro",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "public project page is server rendered and reads only the dynamic project id",
  () => {
    assert.match(
      page,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      page,
      /Astro\.params\.projectId/s,
    );

    assert.doesNotMatch(
      page,
      /Astro\.url\.searchParams/s,
    );
  },
);

test(
  "public project page reuses the locked SESH_DB-only public project resolver",
  () => {
    assert.match(
      page,
      /createPublicSeshProjectResolutionAtRuntime/s,
    );

    assert.match(
      page,
      /resolveByProjectId\(\s*requestedProjectId\s*\)/s,
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
  },
);

test(
  "public project page uses no-store and explicit 404 and 503 states",
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
      /result\.error\.code ===\s*"unavailable"/s,
    );
  },
);

test(
  "public project page canonicalizes from the resolved public project id",
  () => {
    assert.match(
      page,
      /`\/sesh\/projects\/\$\{project\.id\}\/`/s,
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
  "public project page renders only project title and optional description",
  () => {
    assert.match(
      page,
      /\{project\.title\}/s,
    );

    assert.match(
      page,
      /project\.description/s,
    );

    assert.doesNotMatch(
      page,
      />\s*\{project\.id\}\s*</s,
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
      /revision/s,
    );

    assert.doesNotMatch(
      page,
      /schemaVersion/s,
    );
  },
);

test(
  "public project page introduces no mutation media delivery or rights behavior",
  () => {
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

    assert.doesNotMatch(
      page,
      /\bSESH_AUDIO\b/s,
    );

    assert.doesNotMatch(
      page,
      /\bR2\b/s,
    );

    assert.doesNotMatch(
      page,
      /\bcopyright\b/i,
    );

    assert.doesNotMatch(
      page,
      /\blicensing\b/i,
    );

    assert.doesNotMatch(
      page,
      /\broyalty\b/i,
    );
  },
);