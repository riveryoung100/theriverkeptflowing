import type {
  CreatorAudioAssetOperationFailureCode,
} from "../operations/creator-audio-asset-operation-service";

import type {
  CreatorPrivateAudioReadService,
} from "../operations/creator-private-audio-read-service";

export interface CreatorPrivateAudioReadApiInput {
  readonly projectId:
    string | undefined;

  readonly audioAssetId:
    string | undefined;

  readonly reads:
    CreatorPrivateAudioReadService;
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
    CreatorAudioAssetOperationFailureCode,
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

function failureResponse(
  code:
    CreatorAudioAssetOperationFailureCode,

  message:
    string,
): Response {
  return new Response(
    JSON.stringify({
      ok:
        false,

      error: {
        code,
        message,
      },
    }),
    {
      status:
        failureStatus(
          code,
        ),

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

export async function handleCreatorPrivateAudioRead(
  input:
    CreatorPrivateAudioReadApiInput,
): Promise<Response> {
  const result =
    await input.reads
      .readProjectAudioBytes(
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
    return failureResponse(
      result.error.code,
      result.error.message,
    );
  }

  return new Response(
    result.value.bytes,
    {
      status:
        200,

      headers: {
        "cache-control":
          "no-store",

        "content-type":
          result.value.contentType,

        "content-length":
          String(
            result.value.bytes.byteLength,
          ),

        "content-disposition":
          "inline",

        "x-content-type-options":
          "nosniff",
      },
    },
  );
}