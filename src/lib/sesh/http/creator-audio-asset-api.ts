import type {
  CreatorAudioAssetOperationFailureCode,
  CreatorAudioAssetOperationResult,
  CreatorAudioAssetOperationService,
} from "../operations/creator-audio-asset-operation-service";

export interface CreatorAudioAssetCollectionApiInput {
  readonly projectId:
    string | undefined;

  readonly operations:
    CreatorAudioAssetOperationService;
}

export interface CreatorAudioAssetItemApiInput
extends CreatorAudioAssetCollectionApiInput {
  readonly audioAssetId:
    string | undefined;
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
    CreatorAudioAssetOperationFailureCode,
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
    CreatorAudioAssetOperationResult<T>,
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

function routeValue(
  value:
    string | undefined,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

export async function handleCreatorAudioAssetCollectionRead(
  input:
    CreatorAudioAssetCollectionApiInput,
): Promise<Response> {
  return operationResponse(
    await input.operations
      .listProjectAudioAssets(
        routeValue(
          input.projectId,
        ),
      ),
  );
}

export async function handleCreatorAudioAssetRead(
  input:
    CreatorAudioAssetItemApiInput,
): Promise<Response> {
  return operationResponse(
    await input.operations
      .readProjectAudioAsset(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.audioAssetId,
        ),
      ),
  );
}
