import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

import type {
  CreatorAudioRenameFailureCode,
  CreatorAudioRenameResult,
  CreatorAudioRenameService,
} from "../operations/creator-audio-rename-service";

export interface CreatorAudioRenameApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly audioAssetId:
    string | undefined;

  readonly renames:
    CreatorAudioRenameService;
}

function routeValue(
  value:
    string | undefined,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

function failureStatus(
  code:
    CreatorAudioRenameFailureCode,
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
    default:
      return 503;
  }
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

        "x-content-type-options":
          "nosniff",
      },
    },
  );
}

function operationResponse(
  result:
    CreatorAudioRenameResult,
): Response {
  if (result.ok) {
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

export async function handleCreatorAudioRename(
  input:
    CreatorAudioRenameApiInput,
): Promise<Response> {
  if (
    input.request.method.toUpperCase() !==
      "PATCH"
  ) {
    return jsonResponse(
      {
        ok:
          false,

        error: {
          code:
            "invalid-input",

          message:
            "Sesh private audio rename requires PATCH.",
        },
      },
      400,
    );
  }

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
            "Sesh private audio rename request was rejected.",
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
            "Sesh private audio rename requires a valid JSON body.",
        },
      },
      400,
    );
  }

  return operationResponse(
    await input.renames
      .renameProjectAudio(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.audioAssetId,
        ),
        body,
      ),
  );
}