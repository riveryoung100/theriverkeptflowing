import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import test from "node:test";

const page =
  readFileSync(
    new URL(
      "../../../pages/sesh/index.astro",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "public Sesh discovery page is server rendered and uses a fixed bounded discovery window",
  () => {
    assert.match(
      page,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      page,
      /const DISCOVERY_LIMIT\s*=\s*20/s,
    );

    assert.match(
      page,
      /listPublicProjects\(\s*DISCOVERY_LIMIT\s*\)/s,
    );

    assert.doesNotMatch(
      page,
      /Astro\.url\.searchParams/s,
    );
  },
);

test(
  "public Sesh discovery page reuses the locked anonymous SESH_DB-only discovery runtime",
  () => {
    assert.match(
      page,
      /createPublicSeshProjectDiscoveryAtRuntime/s,
    );

    assert.match(
      page,
      /PublicSeshProjectDiscoveryRuntimeEnvironment/s,
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
      /\bPrincipalId\b/s,
    );

    assert.doesNotMatch(
      page,
      /\bSeshCreatorId\b/s,
    );

    assert.doesNotMatch(
      page,
      /\/api\/sesh\//s,
    );
  },
);

test(
  "public Sesh discovery page uses no-store with 200 success and 503 fail-closed behavior",
  () => {
    assert.match(
      page,
      /"cache-control",\s*"no-store"/s,
    );

    assert.match(
      page,
      /200 \| 503/s,
    );

    assert.match(
      page,
      /Astro\.response\.status\s*=\s*pageStatus/s,
    );

    assert.match(
      page,
      /pageStatus\s*=\s*503/s,
    );

    assert.match(
      page,
      /const noindex\s*=\s*pageStatus !==\s*200/s,
    );

    assert.match(
      page,
      /noindex=\{noindex\}/s,
    );
  },
);

test(
  "public Sesh discovery page has one canonical /sesh/ URL independent of project data",
  () => {
    assert.match(
      page,
      /new URL\(\s*"\/sesh\/"/s,
    );

    assert.match(
      page,
      /canonical=\{canonical\}/s,
    );

    assert.match(
      page,
      /const canonical\s*=\s*new URL\(\s*"\/sesh\/",\s*Astro\.site \?\? Astro\.url\s*\)\.toString\(\);/s,
    );
  },
);

test(
  "public Sesh discovery page renders sanitized project presentation and human project links",
  () => {
    assert.match(
      page,
      /href=\{`\/sesh\/projects\/\$\{project\.id\}\/`\}/s,
    );

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

    for (
      const forbidden of [
        "project.ownerCreatorId",
        "project.createdAt",
        "project.updatedAt",
        "project.trackIds",
        "project.sessionIds",
        "project.audioAssetIds",
        "project.tempoMapId",
        "project.beatGridId",
        "revision",
        "schemaVersion",
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
  "public Sesh discovery page renders optional creator attribution using display name only",
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

    assert.doesNotMatch(
      page,
      /creator\.id/s,
    );

    assert.doesNotMatch(
      page,
      /creator\.creatorId/s,
    );

    assert.doesNotMatch(
      page,
      /ownerCreatorId/s,
    );
  },
);

test(
  "empty public discovery is a valid success state rather than an availability oracle",
  () => {
    assert.match(
      page,
      /projects\.length > 0/s,
    );

    assert.match(
      page,
      /No public Sesh projects have been shared yet\./s,
    );

    assert.doesNotMatch(
      page,
      /404/s,
    );
  },
);

test(
  "public Sesh discovery page introduces no mutation media delivery or rights behavior",
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

    assert.doesNotMatch(
      page,
      /\bmanagement\b/i,
    );
  },
);