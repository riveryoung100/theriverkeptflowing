import assert from "node:assert/strict";
import test from "node:test";

import {
  readFileSync,
} from "node:fs";

const route =
  readFileSync(
    new URL(
      "../../../pages/api/sesh/creator/handle.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "creator handle claim route is server-rendered POST only",
  () => {
    assert.match(
      route,
      /export const prerender\s*=\s*false/,
    );

    assert.match(
      route,
      /export const POST/,
    );

    assert.doesNotMatch(
      route,
      /export const GET/,
    );

    assert.doesNotMatch(
      route,
      /export const PATCH/,
    );

    assert.doesNotMatch(
      route,
      /export const PUT/,
    );

    assert.doesNotMatch(
      route,
      /export const DELETE/,
    );
  },
);

test(
  "creator handle claim route composes authenticated claim service from session and Cloudflare bindings",
  () => {
    assert.match(
      route,
      /createAuthenticatedSeshCreatorHandleClaimAtRuntime/,
    );

    assert.match(
      route,
      /session as AstroSessionLike/,
    );

    assert.match(
      route,
      /env as unknown as/,
    );

    assert.match(
      route,
      /handleSeshCreatorHandleClaim/,
    );
  },
);

test(
  "creator handle claim route accepts no client creator identity path parameters",
  () => {
    assert.doesNotMatch(
      route,
      /\[.*creator.*\]/i,
    );

    assert.doesNotMatch(
      route,
      /params\./,
    );
  },
);