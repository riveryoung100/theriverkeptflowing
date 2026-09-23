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
  "public project page consumes the SESH-052 presentation resolver rather than the older project-only resolver",
  () => {
    assert.match(
      page,
      /createPublicSeshProjectPresentationAtRuntime/s,
    );

    assert.match(
      page,
      /PublicSeshProjectPresentationRuntimeEnvironment/s,
    );

    assert.match(
      page,
      /result\.value\.project/s,
    );

    assert.match(
      page,
      /result\.value\.creator/s,
    );

    assert.doesNotMatch(
      page,
      /createPublicSeshProjectResolutionAtRuntime/s,
    );

    assert.doesNotMatch(
      page,
      /public-project-api/s,
    );
  },
);

test(
  "creator attribution is optional and links displayName to the canonical public vanity route",
  () => {
    assert.match(
      page,
      /creator\s*&&\s*\(/s,
    );

    assert.match(
      page,
      /href=\{`\/sesh\/\$\{creator\.handle\}\/`\}/s,
    );

    assert.match(
      page,
      /\{creator\.displayName\}/s,
    );

    assert.doesNotMatch(
      page,
      />\s*\{creator\.handle\}\s*</s,
    );
  },
);

test(
  "creator attribution does not expose internal creator or owner identity",
  () => {
    assert.doesNotMatch(
      page,
      /ownerCreatorId/s,
    );

    assert.doesNotMatch(
      page,
      /\bSeshCreatorId\b/s,
    );

    assert.doesNotMatch(
      page,
      /\bPrincipalId\b/s,
    );

    assert.doesNotMatch(
      page,
      /creator\.id/s,
    );

    assert.doesNotMatch(
      page,
      /creator\.creatorId/s,
    );
  },
);

test(
  "creator attribution preserves anonymous SESH_DB-only human-page boundaries",
  () => {
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
      /\bR2\b/s,
    );

    assert.doesNotMatch(
      page,
      /\/api\/sesh\//s,
    );
  },
);

test(
  "creator attribution preserves project page status canonical indexing and cache behavior",
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
      /result\.error\.code ===\s*"unavailable"/s,
    );

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
  "creator attribution introduces no mutation media delivery or rights behavior",
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

    assert.doesNotMatch(
      page,
      /\bmanagement\b/i,
    );
  },
);