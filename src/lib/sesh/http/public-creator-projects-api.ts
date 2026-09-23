import type {
  PublicSeshCreatorProjectCollectionFailureCode,
  PublicSeshCreatorProjectCollectionResult,
  PublicSeshCreatorProjectCollectionService,
} from "../operations";

export interface PublicSeshCreatorProjectsApiInput {
  readonly request:
    Request;

  readonly handle:
    string | undefined;

  readonly collection:
    PublicSeshCreatorProjectCollectionService;
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
    PublicSeshCreatorProjectCollectionFailureCode,
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

function collectionResponse(
  result:
    PublicSeshCreatorProjectCollectionResult,
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

export async function handlePublicSeshCreatorProjectsRead(
  input:
    PublicSeshCreatorProjectsApiInput,
): Promise<Response> {
  return collectionResponse(
    await input.collection
      .listByHandle(
        routeHandleOrInvalid(
          input.handle,
        ),
      ),
  );
}