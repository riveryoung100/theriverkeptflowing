import type {
  CreatorPrivateAudioReadFailureCode,
  CreatorPrivateAudioReadService,
} from "../operations/creator-private-audio-read-service";

import type {
  SeshAudioObjectReadRange,
} from "../persistence";

export interface CreatorPrivateAudioReadApiInput {
  readonly projectId:
    string | undefined;

  readonly audioAssetId:
    string | undefined;

  readonly rangeHeader?:
    string | null;

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
    CreatorPrivateAudioReadFailureCode,
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

    case "range-not-satisfiable":
      return 416;

    case "unavailable":
    default:
      return 503;
  }
}

function failureResponse(
  code:
    CreatorPrivateAudioReadFailureCode,

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

function rangeFailure(
  message:
    string,
): Response {
  return new Response(
    JSON.stringify({
      ok:
        false,

      error: {
        code:
          "range-not-satisfiable",

        message,
      },
    }),
    {
      status:
        416,

      headers: {
        "accept-ranges":
          "bytes",

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

function safeInteger(
  value:
    string,
): number | null {
  if (
    !/^\d+$/u.test(
      value,
    )
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isSafeInteger(
    parsed,
  )
    ? parsed
    : null;
}

function parseRangeHeader(
  value:
    string | null | undefined,
):
| {
    readonly ok:
      true;

    readonly range:
      SeshAudioObjectReadRange | undefined;
  }
| {
    readonly ok:
      false;
  } {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value.trim() ===
      ""
  ) {
    return {
      ok:
        true,

      range:
        undefined,
    };
  }

  const normalized =
    value.trim();

  if (
    normalized.includes(
      ",",
    )
  ) {
    return {
      ok:
        false,
    };
  }

  const match =
    /^bytes=(\d*)-(\d*)$/iu.exec(
      normalized,
    );

  if (
    match ===
    null
  ) {
    return {
      ok:
        false,
    };
  }

  const startText =
    match[1];

  const endText =
    match[2];

  if (
    startText ===
      "" &&
    endText ===
      ""
  ) {
    return {
      ok:
        false,
    };
  }

  if (
    startText ===
    ""
  ) {
    const suffix =
      safeInteger(
        endText,
      );

    if (
      suffix ===
        null ||
      suffix <=
        0
    ) {
      return {
        ok:
          false,
      };
    }

    return {
      ok:
        true,

      range: {
        suffix,
      },
    };
  }

  const start =
    safeInteger(
      startText,
    );

  if (
    start ===
    null
  ) {
    return {
      ok:
        false,
    };
  }

  if (
    endText ===
    ""
  ) {
    return {
      ok:
        true,

      range: {
        offset:
          start,
      },
    };
  }

  const end =
    safeInteger(
      endText,
    );

  if (
    end ===
      null ||
    end <
      start
  ) {
    return {
      ok:
        false,
    };
  }

  const length =
    end -
    start +
    1;

  if (
    !Number.isSafeInteger(
      length,
    ) ||
    length <=
      0
  ) {
    return {
      ok:
        false,
    };
  }

  return {
    ok:
      true,

    range: {
      offset:
        start,

      length,
    },
  };
}

export async function handleCreatorPrivateAudioRead(
  input:
    CreatorPrivateAudioReadApiInput,
): Promise<Response> {
  const parsedRange =
    parseRangeHeader(
      input.rangeHeader,
    );

  if (
    !parsedRange.ok
  ) {
    return rangeFailure(
      "The requested private audio byte range is invalid or unsupported.",
    );
  }

  const result =
    await input.reads
      .readProjectAudioBytes(
        routeValue(
          input.projectId,
        ),
        routeValue(
          input.audioAssetId,
        ),
        parsedRange.range,
      );

  if (
    !result.ok
  ) {
    if (
      result.error.code ===
      "range-not-satisfiable"
    ) {
      return rangeFailure(
        result.error.message,
      );
    }

    return failureResponse(
      result.error.code,
      result.error.message,
    );
  }

  const headers =
    new Headers({
      "accept-ranges":
        "bytes",

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
    });

  if (
    result.value.range !==
    undefined
  ) {
    const start =
      result.value.range.offset;

    const end =
      start +
      result.value.range.length -
      1;

    headers.set(
      "content-range",
      `bytes ${start}-${end}/${result.value.totalSize}`,
    );

    return new Response(
      result.value.bytes,
      {
        status:
          206,

        headers,
      },
    );
  }

  return new Response(
    result.value.bytes,
    {
      status:
        200,

      headers,
    },
  );
}