import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const route =
  readFileSync(
    new URL(
      "../../../pages/api/sesh/creator/provision.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "creator provisioning route is server-rendered and POST-only",
  () => {
    assert.match(
      route,
      /export const prerender\s*=\s*false/s,
    );

    assert.match(
      route,
      /export const POST\s*:\s*APIRoute/s,
    );

    assert.doesNotMatch(
      route,
      /export const GET\s*:/s,
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
  "creator provisioning route composes from Astro session and Cloudflare runtime bindings",
  () => {
    assert.match(
      route,
      /createSeshCreatorProfileProvisioningAtRuntime/s,
    );

    assert.match(
      route,
      /session as AstroSessionLike/s,
    );

    assert.match(
      route,
      /env as unknown as\s*SeshCreatorProfileApiRuntimeEnvironment/s,
    );

    assert.match(
      route,
      /handleSeshCreatorProfileProvisioning/s,
    );
  },
);

test(
  "creator provisioning route does not accept client creator identity parameters",
  () => {
    assert.doesNotMatch(
      route,
      /params\./s,
    );

    assert.doesNotMatch(
      route,
      /principalId/s,
    );

    assert.doesNotMatch(
      route,
      /seshCreatorId/s,
    );
  },
);