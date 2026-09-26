import type {
  DefaultAuthorizedSeshTrackReorderOperationService,
} from "../operations";

import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

const noStoreHeaders = {
  "cache-control":
    "no-store",

  "content-type":
    "application/json; charset=utf-8",
};

function jsonResponse(
  status:
    number,

  body:
    unknown,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,
      headers:
        noStoreHeaders,
    },
  );
}

type ReorderOperations =
  Pick<
    DefaultAuthorizedSeshTrackReorderOperationService,
    "reorderTracks"
  >;

export interface SeshTrackReorderApiInput {
  readonly request:
    Request;

  readonly projectId:
    unknown;

  readonly operations:
    ReorderOperations;
}

function failureStatus(
  code:
    string,
): number {
  const statuses:
    Readonly<Record<string, number>> =
      {
        "invalid-input":
          400,

        "unauthenticated":
          401,

        "unmapped":
          403,

        "forbidden":
          403,

        "not-found":
          404,

        "conflict":
          409,

        "unavailable":
          503,
      };

  return (
    statuses[
      code
    ] ??
    503
  );
}

export async function handleSeshTrackReorder(
  input:
    SeshTrackReorderApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return jsonResponse(
      403,
      {
        error:
          "Sesh track reorder request was rejected.",
      },
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
      400,
      {
        error:
          "Sesh track reorder requires a valid JSON body.",
      },
    );
  }

  const result =
    await input.operations.reorderTracks(
      input.projectId,
      body,
    );

  if (
    !result.ok
  ) {
    return jsonResponse(
      failureStatus(
        result.error.code,
      ),
      {
        error:
          result.error.message,

        code:
          result.error.code,
      },
    );
  }

  return jsonResponse(
    200,
    {
      tracks:
        result.value,
    },
  );
}