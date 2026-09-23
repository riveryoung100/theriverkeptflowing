import type {
  AuthorizedSeshProjectPublicationOperationService,
  SeshProjectPublicationOperationFailureCode,
  SeshProjectPublicationOperationResult,
} from "../operations/project-publication-operation-service";

import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

export interface SeshProjectPublicationApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly operations:
    AuthorizedSeshProjectPublicationOperationService;
}

function jsonResponse(
  body:
    unknown,
  status:
    number,
): Response {
  return new Response(
    JSON.stringify(body),
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
    SeshProjectPublicationOperationFailureCode,
): number {
  switch (code) {
    case "invalid-input":
      return 400;

    case "unauthenticated":
      return 401;

    case "unmapped":
    case "forbidden":
      return 403;

    case "not-found":
      return 404;

    case "conflict":
      return 409;

    case "unavailable":
      return 503;
  }
}

function operationResponse<T>(
  result:
    SeshProjectPublicationOperationResult<T>,
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

export async function handleSeshProjectPublicationUpdate(
  input:
    SeshProjectPublicationApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return jsonResponse(
      {
        ok:
          false,

        error: {
          code:
            "forbidden",

          message:
            "Sesh project publication write request was rejected.",
        },
      },
      403,
    );
  }

  let body:
    unknown;

  try {
    body =
      await input.request.json();
  }
  catch {
    return jsonResponse(
      {
        ok:
          false,

        error: {
          code:
            "invalid-input",

          message:
            "Sesh project publication update requires a valid JSON body.",
        },
      },
      400,
    );
  }

  return operationResponse(
    await input.operations
      .updatePublication(
        typeof input.projectId ===
          "string"
          ? input.projectId
          : "",
        body,
      ),
  );
}