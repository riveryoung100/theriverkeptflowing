import type {
  APIRoute,
} from "astro";

import {
  env,
} from "cloudflare:workers";

import type {
  AstroSessionLike,
} from "../../../../lib/identity/session";

import {
  handleSeshCreatorProfileProvisioning,
} from "../../../../lib/sesh/http";

import {
  createSeshCreatorProfileProvisioningAtRuntime,
} from "../../../../lib/sesh/runtime/creator-profile-api";

import type {
  SeshCreatorProfileApiRuntimeEnvironment,
} from "../../../../lib/sesh/runtime/creator-profile-api";

export const prerender =
  false;

function infrastructureFailure():
Response {
  return new Response(
    JSON.stringify({
      ok:
        false,

      error: {
        code:
          "unavailable",

        message:
          "Sesh creator provisioning API is temporarily unavailable.",
      },
    }),
    {
      status:
        503,

      headers: {
        "cache-control":
          "no-store",

        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function provisioningForSession(
  session:
    unknown,
) {
  if (
    typeof session !==
      "object" ||
    session ===
      null
  ) {
    throw new TypeError(
      "Astro session support is unavailable.",
    );
  }

  return createSeshCreatorProfileProvisioningAtRuntime(
    session as AstroSessionLike,
    env as unknown as
      SeshCreatorProfileApiRuntimeEnvironment,
  );
}

export const POST:
  APIRoute =
async ({
  request,
  session,
}) => {
  try {
    return await handleSeshCreatorProfileProvisioning({
      request,

      provisioning:
        provisioningForSession(
          session,
        ),
    });
  }
  catch {
    return infrastructureFailure();
  }
};