import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

import type {
  AuthorizedSeshTrackAudioOperationService,
  SeshTrackAudioOperationFailureCode,
  SeshTrackAudioOperationResult,
} from "../operations";

export interface SeshTrackAudioApiInput {
  readonly request:
    Request;

  readonly projectId:
    unknown;

  readonly trackId:
    unknown;

  readonly audioAssetId:
    unknown;

  readonly operations:
    AuthorizedSeshTrackAudioOperationService;
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
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "no-store",
      },
    },
  );
}

function failureStatus(
  code:
    SeshTrackAudioOperationFailureCode,
): number {
  switch (
    code
  ) {
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

function operationResponse(
  result:
    SeshTrackAudioOperationResult,
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

function sameOriginFailure():
Response {
  return jsonResponse(
    {
      ok:
        false,

      error: {
        code:
          "forbidden",

        message:
          "Cross-origin Sesh writes are forbidden.",
      },
    },
    403,
  );
}

export async function handleSeshTrackAudioAttach(
  input:
    SeshTrackAudioApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return sameOriginFailure();
  }

  return operationResponse(
    await input.operations
      .attachAudioAsset(
        input.projectId,
        input.trackId,
        input.audioAssetId,
      ),
  );
}

export async function handleSeshTrackAudioDetach(
  input:
    SeshTrackAudioApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return sameOriginFailure();
  }

  return operationResponse(
    await input.operations
      .detachAudioAsset(
        input.projectId,
        input.trackId,
        input.audioAssetId,
      ),
  );
}