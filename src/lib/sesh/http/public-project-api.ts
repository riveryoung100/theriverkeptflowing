import type {
  PublicSeshProjectResolutionFailureCode,
  PublicSeshProjectResolutionResult,
  PublicSeshProjectResolutionService,
} from "../operations";

export interface PublicSeshProjectApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly resolution:
    PublicSeshProjectResolutionService;
}

function jsonResponse(
  body:
    unknown,
  status:
    number,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,

      headers: {
        "cache-control":
          "no-store",

        "content-type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function failureStatus(
  code:
    PublicSeshProjectResolutionFailureCode,
): number {
  switch (
    code
  ) {
    case "invalid-input":
      return 400;

    case "not-found":
      return 404;

    case "unavailable":
      return 503;
  }
}

function resolutionResponse(
  result:
    PublicSeshProjectResolutionResult,
): Response {
  if (
    result.ok
  ) {
    return jsonResponse(
      {
        ok:
          true,

        value:
          result.value,
      },
      200,
    );
  }

  return jsonResponse(
    {
      ok:
        false,

      error: {
        code:
          result.error.code,

        message:
          result.error.message,
      },
    },
    failureStatus(
      result.error.code,
    ),
  );
}

function routeProjectIdOrInvalid(
  projectId:
    string | undefined,
): string {
  return typeof projectId ===
    "string"
    ? projectId
    : "";
}

export async function handlePublicSeshProjectRead(
  input:
    PublicSeshProjectApiInput,
): Promise<Response> {
  return resolutionResponse(
    await input.resolution
      .resolveByProjectId(
        routeProjectIdOrInvalid(
          input.projectId,
        ),
      ),
  );
}