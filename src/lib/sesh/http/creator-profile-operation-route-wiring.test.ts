import assert from "node:assert/strict";

import {
  readFileSync,
} from "node:fs";

import test from "node:test";

const profileRoute =
  readFileSync(
    new URL(
      "../../../pages/api/sesh/creator/profile.ts",
      import.meta.url,
    ),
    "utf8",
  );

const provisionRoute =
  readFileSync(
    new URL(
      "../../../pages/api/sesh/creator/provision.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "creator profile route is server-rendered GET and PATCH only",
  () => {
    assert.match(
      profileRoute,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      profileRoute,
      /export const GET\s*:\s*APIRoute/s,
    );

    assert.match(
      profileRoute,
      /export const PATCH\s*:\s*APIRoute/s,
    );

    assert.doesNotMatch(
      profileRoute,
      /export const POST\s*:/s,
    );

    assert.doesNotMatch(
      profileRoute,
      /export const DELETE\s*:/s,
    );
  },
);

test(
  "creator profile route composes authenticated operations from session and Cloudflare bindings",
  () => {
    assert.match(
      profileRoute,
      /createAuthenticatedSeshCreatorProfileOperationsAtRuntime/s,
    );

    assert.match(
      profileRoute,
      /session as AstroSessionLike/s,
    );

    assert.match(
      profileRoute,
      /env as unknown as\s*SeshCreatorProfileApiRuntimeEnvironment/s,
    );

    assert.match(
      profileRoute,
      /handleSeshCreatorProfileRead/s,
    );

    assert.match(
      profileRoute,
      /handleSeshCreatorProfileUpdate/s,
    );
  },
);

test(
  "creator profile route accepts no client identity path parameters",
  () => {
    assert.doesNotMatch(
      profileRoute,
      /params\./s,
    );

    assert.doesNotMatch(
      profileRoute,
      /principalId/s,
    );

    assert.doesNotMatch(
      profileRoute,
      /seshCreatorId/s,
    );
  },
);

test(
  "creator provisioning remains on its dedicated POST-only route",
  () => {
    assert.match(
      provisionRoute,
      /export const POST\s*:\s*APIRoute/s,
    );

    assert.doesNotMatch(
      provisionRoute,
      /export const GET\s*:/s,
    );

    assert.doesNotMatch(
      provisionRoute,
      /export const PATCH\s*:/s,
    );

    assert.doesNotMatch(
      provisionRoute,
      /export const DELETE\s*:/s,
    );
  },
);