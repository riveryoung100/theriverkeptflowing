import {
  SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES,
  type CreatorAudioUploadFailureCode,
  type CreatorAudioUploadResult,
  type CreatorAudioUploadService,
} from "../operations/creator-audio-upload-service";

import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

export interface CreatorAudioUploadApiInput {
  readonly request:
    Request;

  readonly projectId:
    string | undefined;

  readonly uploads:
    CreatorAudioUploadService;
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
    CreatorAudioUploadFailureCode,
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
    CreatorAudioUploadResult,
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
      201,
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

function invalidInput(
  message:
    string,
): Response {
  return jsonResponse(
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
  );
}

function optionalFiniteHeader(
  request:
    Request,

  name:
    string,
): number | undefined | null {
  const raw =
    request.headers.get(
      name,
    );

  if (
    raw ===
    null
  ) {
    return undefined;
  }

  const normalized =
    raw.trim();

  if (
    normalized.length ===
    0
  ) {
    return null;
  }

  const value =
    Number(
      normalized,
    );

  return Number.isFinite(
    value,
  )
    ? value
    : null;
}

function optionalPositiveIntegerHeader(
  request:
    Request,

  name:
    string,
): number | undefined | null {
  const value =
    optionalFiniteHeader(
      request,
      name,
    );

  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    value ===
      null ||
    !Number.isInteger(
      value,
    ) ||
    value <=
      0
  ) {
    return null;
  }

  return value;
}

async function readBoundedRequestBytes(
  request:
    Request,
): Promise<
  Uint8Array | null
> {
  const declaredLength =
    request.headers.get(
      "content-length",
    );

  if (
    declaredLength !==
    null
  ) {
    const parsed =
      Number(
        declaredLength,
      );

    if (
      !Number.isSafeInteger(
        parsed,
      ) ||
      parsed <=
        0 ||
      parsed >
        SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES
    ) {
      return null;
    }
  }

  if (
    request.body ===
    null
  ) {
    return null;
  }

  const reader =
    request.body.getReader();

  const chunks:
    Uint8Array[] =
      [];

  let total =
    0;

  try {
    while (
      true
    ) {
      const {
        done,
        value,
      } =
        await reader.read();

      if (
        done
      ) {
        break;
      }

      if (
        !(value instanceof Uint8Array)
      ) {
        await reader.cancel();

        return null;
      }

      total +=
        value.byteLength;

      if (
        total >
        SESH_PRIVATE_AUDIO_UPLOAD_MAX_BYTES
      ) {
        await reader.cancel();

        return null;
      }

      chunks.push(
        value,
      );
    }
  }
  catch {
    try {
      await reader.cancel();
    }
    catch {
      // Request-body cancellation is best-effort.
    }

    return null;
  }

  if (
    total ===
    0
  ) {
    return null;
  }

  const bytes =
    new Uint8Array(
      total,
    );

  let offset =
    0;

  for (
    const chunk of
    chunks
  ) {
    bytes.set(
      chunk,
      offset,
    );

    offset +=
      chunk.byteLength;
  }

  return bytes;
}

export async function handleCreatorAudioUpload(
  input:
    CreatorAudioUploadApiInput,
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
            "Sesh private audio upload request was rejected.",
        },
      },
      403,
    );
  }

  const contentType =
    input.request.headers.get(
      "content-type",
    );

  if (
    contentType !==
    "audio/wav"
  ) {
    return invalidInput(
      "Sesh private audio upload requires Content-Type audio/wav.",
    );
  }

  const name =
    input.request.headers.get(
      "x-sesh-audio-name",
    );

  if (
    name ===
      null ||
    name.trim().length ===
      0
  ) {
    return invalidInput(
      "Sesh private audio upload requires x-sesh-audio-name.",
    );
  }

  const durationSeconds =
    optionalFiniteHeader(
      input.request,
      "x-sesh-duration-seconds",
    );

  if (
    durationSeconds ===
      null ||
    (
      durationSeconds !==
        undefined &&
      durationSeconds <
        0
    )
  ) {
    return invalidInput(
      "x-sesh-duration-seconds must be a finite non-negative number.",
    );
  }

  const sampleRateHz =
    optionalFiniteHeader(
      input.request,
      "x-sesh-sample-rate-hz",
    );

  if (
    sampleRateHz ===
      null ||
    (
      sampleRateHz !==
        undefined &&
      sampleRateHz <=
        0
    )
  ) {
    return invalidInput(
      "x-sesh-sample-rate-hz must be a finite positive number.",
    );
  }

  const channelCount =
    optionalPositiveIntegerHeader(
      input.request,
      "x-sesh-channel-count",
    );

  if (
    channelCount ===
    null
  ) {
    return invalidInput(
      "x-sesh-channel-count must be a positive integer.",
    );
  }

  const bytes =
    await readBoundedRequestBytes(
      input.request,
    );

  if (
    bytes ===
    null
  ) {
    return invalidInput(
      "Sesh private audio upload body must be non-empty and no larger than the phase-one upload maximum.",
    );
  }

  return operationResponse(
    await input.uploads
      .uploadProjectAudio(
        typeof input.projectId ===
          "string"
          ? input.projectId
          : "",
        {
          kind:
            "recording",

          name:
            name.trim(),

          contentType:
            "audio/wav",

          bytes,

          durationSeconds,

          sampleRateHz,

          channelCount,
        },
      ),
  );
}