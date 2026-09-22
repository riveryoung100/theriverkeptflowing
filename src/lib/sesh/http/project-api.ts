import type {
  AuthorizedSeshProjectOperationService,
  SeshProjectOperationFailureCode,
  SeshProjectOperationResult,
} from "../operations/project-operation-service";

export interface SeshProjectApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly operations:
    AuthorizedSeshProjectOperationService;
}

function jsonResponse(
  body: unknown,
  status: number,
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

function operationFailureStatus(
  code:
    SeshProjectOperationFailureCode,
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
    SeshProjectOperationResult<T>,
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
    operationFailureStatus(
      result.error.code,
    ),
  );
}

function projectIdOrInvalid(
  projectId:
    string | undefined,
): string {
  return typeof projectId ===
    "string"
    ? projectId
    : "";
}

export function isSameOriginSeshWriteRequest(
  request:
    Request,
): boolean {
  const origin =
    request.headers.get(
      "origin",
    );

  if (
    origin ===
    null
  ) {
    return false;
  }

  try {
    return (
      new URL(
        origin,
      ).origin ===
      new URL(
        request.url,
      ).origin
    );
  }
  catch {
    return false;
  }
}

export async function handleSeshProjectRead(
  input:
    SeshProjectApiInput,
): Promise<Response> {
  const result =
    await input.operations
      .readProject(
        projectIdOrInvalid(
          input.projectId,
        ),
      );

  return operationResponse(
    result,
  );
}

export async function handleSeshProjectUpdate(
  input:
    SeshProjectApiInput,
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
            "Sesh project update requires a valid JSON body.",
        },
      },
      400,
    );
  }

  const result =
    await input.operations
      .updateProject(
        projectIdOrInvalid(
          input.projectId,
        ),
        body,
      );

  return operationResponse(
    result,
  );
}

export async function handleSeshProjectDelete(
  input:
    SeshProjectApiInput,
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

  const result =
    await input.operations
      .deleteProject(
        projectIdOrInvalid(
          input.projectId,
        ),
      );

  return operationResponse(
    result,
  );
}