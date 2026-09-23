import type {
  PasswordAuthenticationService,
} from "../authentication";

import type {
  PrincipalSessionStore,
} from "../session";

export interface PrincipalLoginApiInput {
  readonly request:
    Request;

  readonly authentication:
    PasswordAuthenticationService;

  readonly sessions:
    PrincipalSessionStore;
}

export interface PrincipalLogoutApiInput {
  readonly request:
    Request;

  readonly sessions:
    PrincipalSessionStore;
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

function errorResponse(
  code:
    string,
  message:
    string,
  status:
    number,
): Response {
  return jsonResponse(
    {
      ok:
        false,

      error: {
        code,
        message,
      },
    },
    status,
  );
}

export function isSameOriginIdentityWriteRequest(
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
    return (
      new URL(
        origin,
      ).origin ===
      new URL(
        request.url,
      ).origin
    );
  }
  catch {
    return false;
  }
}

function parseLoginBody(
  body:
    unknown,
):
  | {
      readonly ok:
        true;

      readonly value: {
        readonly email:
          string;

        readonly password:
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
    typeof body !==
      "object" ||
    body ===
      null ||
    Array.isArray(
      body,
    )
  ) {
    return {
      ok:
        false,

      response:
        errorResponse(
          "invalid-input",
          "Login requires a JSON object.",
          400,
        ),
    };
  }

  const record =
    body as
      Record<
        string,
        unknown
      >;

  const keys =
    Object.keys(
      record,
    ).sort();

  if (
    keys.length !==
      2 ||
    keys[0] !==
      "email" ||
    keys[1] !==
      "password"
  ) {
    return {
      ok:
        false,

      response:
        errorResponse(
          "invalid-input",
          "Login accepts only email and password.",
          400,
        ),
    };
  }

  if (
    typeof record.email !==
      "string" ||
    typeof record.password !==
      "string"
  ) {
    return {
      ok:
        false,

      response:
        errorResponse(
          "invalid-input",
          "Login email and password must be strings.",
          400,
        ),
    };
  }

  return {
    ok:
      true,

    value: {
      email:
        record.email,

      password:
        record.password,
    },
  };
}

export async function handlePrincipalLogin(
  input:
    PrincipalLoginApiInput,
): Promise<Response> {
  if (
    !isSameOriginIdentityWriteRequest(
      input.request,
    )
  ) {
    return errorResponse(
      "forbidden",
      "Login request was rejected.",
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
    return errorResponse(
      "invalid-input",
      "Login requires a valid JSON body.",
      400,
    );
  }

  const parsed =
    parseLoginBody(
      body,
    );

  if (
    !parsed.ok
  ) {
    return parsed.response;
  }

  const result =
    await input.authentication
      .authenticate(
        parsed.value,
      );

  if (
    !result.ok
  ) {
    if (
      result.error.code ===
        "invalid-credentials"
    ) {
      return errorResponse(
        "invalid-credentials",
        "Invalid email or password.",
        401,
      );
    }

    return errorResponse(
      "unavailable",
      "Authentication is temporarily unavailable.",
      503,
    );
  }

  try {
    await input.sessions
      .createSession(
        result.value.principalId,
      );
  }
  catch {
    return errorResponse(
      "unavailable",
      "Authentication is temporarily unavailable.",
      503,
    );
  }

  return jsonResponse(
    {
      ok:
        true,
    },
    200,
  );
}

export async function handlePrincipalLogout(
  input:
    PrincipalLogoutApiInput,
): Promise<Response> {
  if (
    !isSameOriginIdentityWriteRequest(
      input.request,
    )
  ) {
    return errorResponse(
      "forbidden",
      "Logout request was rejected.",
      403,
    );
  }

  try {
    await input.sessions
      .destroySession();
  }
  catch {
    return errorResponse(
      "unavailable",
      "Logout is temporarily unavailable.",
      503,
    );
  }

  return jsonResponse(
    {
      ok:
        true,
    },
    200,
  );
}
