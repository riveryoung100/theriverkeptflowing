import type {
  AuthenticatedSeshProjectCollectionService,
  SeshProjectCollectionFailureCode,
  SeshProjectCollectionResult,
} from "../operations";

import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

export interface SeshProjectCollectionApiInput {
  readonly request:
    Request;

  readonly collection:
    AuthenticatedSeshProjectCollectionService;
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
    SeshProjectCollectionFailureCode,
): number {
  switch (
    code
  ) {
    case "invalid-input":
      return 400;

    case "unauthenticated":
      return 401;

    case "unmapped":
      return 403;

    case "conflict":
      return 409;

    case "unavailable":
      return 503;
  }
}

function operationResponse<T>(
  result:
    SeshProjectCollectionResult<T>,

  successStatus:
    number,
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
      successStatus,
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

export async function handleSeshProjectCollectionRead(
  input:
    SeshProjectCollectionApiInput,
): Promise<Response> {
  return operationResponse(
    await input.collection
      .listProjects(),
    200,
  );
}

export async function handleSeshProjectCreate(
  input:
    SeshProjectCollectionApiInput,
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
            "Sesh project write request was rejected.",
        },
      },
      403,
    );
  }

  let body:
    unknown;

  try {
    body =
      await input.request
        .json();
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
            "Sesh project creation requires a valid JSON body.",
        },
      },
      400,
    );
  }

  return operationResponse(
    await input.collection
      .createProject(
        body,
      ),
    201,
  );
}