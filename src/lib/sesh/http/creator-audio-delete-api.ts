import type {
  CreatorAudioDeleteFailureCode,
  CreatorAudioDeleteService,
} from "../operations/creator-audio-delete-service";

export interface CreatorAudioDeleteApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly audioAssetId:
    string | undefined;

  readonly deletes:
    CreatorAudioDeleteService;
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
    CreatorAudioDeleteFailureCode,
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

function sameOrigin(
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
    return new URL(
      origin,
    ).origin ===
      new URL(
        request.url,
      ).origin;
  }
  catch {
    return false;
  }
}

export async function handleCreatorAudioDelete(
  input:
    CreatorAudioDeleteApiInput,
): Promise<Response> {
  if (
    input.request.method.toUpperCase() !==
      "DELETE"
  ) {
    return jsonResponse(
      {
        ok:
          false,

        error: {
          code:
            "invalid-input",

          message:
            "Sesh private audio delete requires DELETE.",
        },
      },
      400,
    );
  }

  if (
    !sameOrigin(
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
            "Cross-origin private audio deletion is not allowed.",
        },
      },
      403,
    );
  }

  const result =
    await input.deletes
      .deleteProjectAudio(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.audioAssetId,
        ),
      );

  if (
    !result.ok
  ) {
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