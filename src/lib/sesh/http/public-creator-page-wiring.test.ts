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
  "public creator vanity page is server rendered and reads only the dynamic handle",
  () => {
    assert.match(
      page,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      page,
      /Astro\.params\.handle/s,
    );

    assert.doesNotMatch(
      page,
      /Astro\.url\.searchParams/s,
    );
  },
);

test(
  "public creator vanity page reuses the locked SESH_DB-only resolver runtime",
  () => {
    assert.match(
      page,
      /createPublicSeshCreatorHandleResolutionAtRuntime/s,
    );

    assert.match(
      page,
      /resolveByHandle/s,
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
      /PrincipalId/s,
    );

    assert.doesNotMatch(
      page,
      /SeshCreatorId/s,
    );
  },
);

test(
  "public creator vanity page uses no-store and explicit 404 and 503 states",
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
  "public creator vanity page canonicalizes from resolved canonical handle",
  () => {
    assert.match(
      page,
      /`\/sesh\/\$\{profile\.handle\}\/`/s,
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
  "public creator vanity page renders only public creator presentation fields",
  () => {
    assert.match(
      page,
      /profile\.displayName/s,
    );

    assert.match(
      page,
      /profile\.handle/s,
    );

    assert.match(
      page,
      /profile\.bio/s,
    );

    assert.doesNotMatch(
      page,
      /profile\.id\b/s,
    );

    assert.doesNotMatch(
      page,
      /profile\.createdAt/s,
    );

    assert.doesNotMatch(
      page,
      /revision/s,
    );
  },
);

test(
  "public creator vanity page introduces no mutation or handle availability behavior",
  () => {
    assert.doesNotMatch(
      page,
      /reserveHandle/s,
    );

    assert.doesNotMatch(
      page,
      /releaseHandle/s,
    );

    assert.doesNotMatch(
      page,
      /\brename\b/i,
    );

    assert.doesNotMatch(
      page,
      /\bavailability\b/i,
    );

    assert.doesNotMatch(
      page,
      /\bisAvailable\b/i,
    );

    assert.doesNotMatch(
      page,
      /\bcheckAvailability\b/i,
    );
  },
);