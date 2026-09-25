import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

import type {
  AuthorizedSeshTrackOperationService,
  SeshTrackOperationFailureCode,
  SeshTrackOperationResult,
} from "../operations";

type TrackCreateInput =
  Parameters<
    AuthorizedSeshTrackOperationService["createTrack"]
  >[1];

type TrackUpdateInput =
  Parameters<
    AuthorizedSeshTrackOperationService["updateTrack"]
  >[2];

export interface SeshTrackCollectionApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly operations:
    AuthorizedSeshTrackOperationService;
}

export interface SeshTrackItemApiInput
extends SeshTrackCollectionApiInput {
  readonly trackId:
    string | undefined;
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
    SeshTrackOperationFailureCode,
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

function operationResponse<T>(
  result:
    SeshTrackOperationResult<T>,
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

function rejectedWrite(): Response {
  return jsonResponse(
    {
      ok:
        false,

      error: {
        code:
          "forbidden",

        message:
          "Sesh track write request was rejected.",
      },
    },
    403,
  );
}

async function requestJson(
  request:
    Request,

  message:
    string,
): Promise<
  | {
      readonly ok: true;
      readonly value: unknown;
    }
  | {
      readonly ok: false;
      readonly response: Response;
    }
> {
  try {
    return {
      ok:
        true,

      value:
        await request.json(),
    };
  }
  catch {
    return {
      ok:
        false,

      response:
        jsonResponse(
          {
            ok:
              false,

            error: {
              code:
                "invalid-input",

              message,
            },
          },
          400,
        ),
    };
  }
}

export async function handleSeshTrackCollectionRead(
  input:
    SeshTrackCollectionApiInput,
): Promise<Response> {
  return operationResponse(
    await input.operations
      .listTracks(
        routeValue(
          input.projectId,
        ),
      ),
  );
}

export async function handleSeshTrackCreate(
  input:
    SeshTrackCollectionApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return rejectedWrite();
  }

  const body =
    await requestJson(
      input.request,
      "Sesh track creation requires a valid JSON body.",
    );

  if (
    !body.ok
  ) {
    return body.response;
  }

  return operationResponse(
    await input.operations
      .createTrack(
        routeValue(
          input.projectId,
        ),
        body.value as
          TrackCreateInput,
      ),
  );
}

export async function handleSeshTrackRead(
  input:
    SeshTrackItemApiInput,
): Promise<Response> {
  return operationResponse(
    await input.operations
      .readTrack(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.trackId,
        ),
      ),
  );
}

export async function handleSeshTrackUpdate(
  input:
    SeshTrackItemApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return rejectedWrite();
  }

  const body =
    await requestJson(
      input.request,
      "Sesh track update requires a valid JSON body.",
    );

  if (
    !body.ok
  ) {
    return body.response;
  }

  return operationResponse(
    await input.operations
      .updateTrack(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.trackId,
        ),
        body.value as
          TrackUpdateInput,
      ),
  );
}

export async function handleSeshTrackDelete(
  input:
    SeshTrackItemApiInput,
): Promise<Response> {
  if (
    !isSameOriginSeshWriteRequest(
      input.request,
    )
  ) {
    return rejectedWrite();
  }

  return operationResponse(
    await input.operations
      .deleteTrack(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.trackId,
        ),
      ),
  );
}