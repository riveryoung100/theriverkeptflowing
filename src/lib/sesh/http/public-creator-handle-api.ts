import type {
  PublicSeshCreatorHandleResolutionFailureCode,
  PublicSeshCreatorHandleResolutionResult,
  PublicSeshCreatorHandleResolutionService,
} from "../operations";

export interface PublicSeshCreatorHandleApiInput {
  readonly request:
    Request;

  readonly handle:
    string | undefined;

  readonly resolution:
    PublicSeshCreatorHandleResolutionService;
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
    PublicSeshCreatorHandleResolutionFailureCode,
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
    PublicSeshCreatorHandleResolutionResult,
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

function routeHandleOrInvalid(
  handle:
    string | undefined,
): string {
  return typeof handle ===
    "string"
    ? handle
    : "";
}

export async function handlePublicSeshCreatorHandleRead(
  input:
    PublicSeshCreatorHandleApiInput,
): Promise<Response> {
  return resolutionResponse(
    await input.resolution
      .resolveByHandle(
        routeHandleOrInvalid(
          input.handle,
        ),
      ),
  );
}