import type {
  AuthenticatedSeshCreatorHandleClaimService,
  SeshCreatorHandleClaimFailureCode,
  SeshCreatorHandleClaimResult,
} from "../operations";

import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

export interface SeshCreatorHandleClaimApiInput {
  readonly request:
    Request;

  readonly claims:
    AuthenticatedSeshCreatorHandleClaimService;
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

function failureStatus(
  code:
    SeshCreatorHandleClaimFailureCode,
): number {
  switch (
    code
  ) {
    case "invalid-input":
      return 400;

    case "unauthenticated":
      return 401;

    case "unmapped":
      return 403;

    case "conflict":
      return 409;

    case "unavailable":
      return 503;
  }
}

function claimResponse(
  result:
    SeshCreatorHandleClaimResult,
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

function parseClaimInput(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly handle:
        string;
    }
  | {
      readonly ok:
        false;

      readonly response:
        Response;
    } {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return {
      ok:
        false,

      response:
        invalidInput(
          "Sesh creator handle claim requires a JSON object.",
        ),
    };
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  const keys =
    Object.keys(
      record,
    );

  if (
    keys.length !==
      1 ||
    keys[0] !==
      "handle"
  ) {
    return {
      ok:
        false,

      response:
        invalidInput(
          "Sesh creator handle claim accepts only handle.",
        ),
    };
  }

  if (
    typeof record.handle !==
      "string"
  ) {
    return {
      ok:
        false,

      response:
        invalidInput(
          "Sesh creator handle must be a string.",
        ),
    };
  }

  return {
    ok:
      true,

    handle:
      record.handle,
  };
}

export async function handleSeshCreatorHandleClaim(
  input:
    SeshCreatorHandleClaimApiInput,
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
            "Sesh creator handle claim request was rejected.",
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
    return invalidInput(
      "Sesh creator handle claim requires a valid JSON body.",
    );
  }

  const parsed =
    parseClaimInput(
      body,
    );

  if (
    !parsed.ok
  ) {
    return parsed.response;
  }

  return claimResponse(
    await input.claims
      .claimHandle(
        parsed.handle,
      ),
  );
}