import type {
  SeshCreatorProfileProvisioningFailureCode,
  SeshCreatorProfileProvisioningResult,
  SeshCreatorProfileProvisioningService,
} from "../operations";

import {
  isSameOriginSeshWriteRequest,
} from "./project-api";

export interface SeshCreatorProfileProvisioningApiInput {
  readonly request:
    Request;

  readonly provisioning:
    SeshCreatorProfileProvisioningService;
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
    SeshCreatorProfileProvisioningFailureCode,
): number {
  switch (
    code
  ) {
    case "invalid-input":
      return 400;

    case "unauthenticated":
      return 401;

    case "conflict":
      return 409;

    case "unavailable":
      return 503;
  }
}

function provisioningResponse(
  result:
    SeshCreatorProfileProvisioningResult,
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

function parseProvisioningInput(
  value:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value: {
        readonly displayName:
          string;
      };
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
          "Sesh creator provisioning requires a JSON object.",
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
      "displayName"
  ) {
    return {
      ok:
        false,

      response:
        invalidInput(
          "Sesh creator provisioning accepts only displayName.",
        ),
    };
  }

  if (
    typeof record.displayName !==
      "string"
  ) {
    return {
      ok:
        false,

      response:
        invalidInput(
          "Sesh creator displayName must be a string.",
        ),
    };
  }

  return {
    ok:
      true,

    value: {
      displayName:
        record.displayName,
    },
  };
}

export async function handleSeshCreatorProfileProvisioning(
  input:
    SeshCreatorProfileProvisioningApiInput,
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
            "Sesh creator provisioning request was rejected.",
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
      "Sesh creator provisioning requires a valid JSON body.",
    );
  }

  const parsed =
    parseProvisioningInput(
      body,
    );

  if (
    !parsed.ok
  ) {
    return parsed.response;
  }

  return provisioningResponse(
    await input.provisioning
      .provision(
        parsed.value,
      ),
  );
}