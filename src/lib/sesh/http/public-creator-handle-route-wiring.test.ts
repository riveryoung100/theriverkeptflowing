import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import test from "node:test";

const route =
  readFileSync(
    new URL(
      "../../../pages/api/sesh/creators/[handle].ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "public creator handle route is server-rendered GET only",
  () => {
    assert.match(
      route,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      route,
      /export const GET\s*:\s*APIRoute/s,
    );

    assert.doesNotMatch(
      route,
      /export const POST\s*:/s,
    );

    assert.doesNotMatch(
      route,
      /export const PATCH\s*:/s,
    );

    assert.doesNotMatch(
      route,
      /export const DELETE\s*:/s,
    );
  },
);

test(
  "public creator handle route passes only the dynamic handle to the public resolver boundary",
  () => {
    assert.match(
      route,
      /params\.handle/s,
    );

    assert.match(
      route,
      /handlePublicSeshCreatorHandleRead/s,
    );

    assert.match(
      route,
      /createPublicSeshCreatorHandleResolutionAtRuntime/s,
    );
  },
);

test(
  "public creator handle route uses Sesh runtime without session or identity composition",
  () => {
    assert.doesNotMatch(
      route,
      /\bsession\b/s,
    );

    assert.doesNotMatch(
      route,
      /RIVER_IDENTITY_DB/s,
    );

    assert.doesNotMatch(
      route,
      /PrincipalId/s,
    );

    assert.doesNotMatch(
      route,
      /SeshCreatorId/s,
    );
  },
);

test(
  "public creator handle route has no mutation or availability behavior",
  () => {
    assert.doesNotMatch(
      route,
      /reserveHandle/s,
    );

    assert.doesNotMatch(
      route,
      /releaseHandle/s,
    );

    assert.doesNotMatch(
      route,
      /rename/s,
    );

    assert.doesNotMatch(
      route,
      /\bavailability\b/i,
    );

    assert.doesNotMatch(
      route,
      /\bisAvailable\b/i,
    );

    assert.doesNotMatch(
      route,
      /\bcheckAvailability\b/i,
    );
  },
);