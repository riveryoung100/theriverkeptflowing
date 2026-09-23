import assert from "node:assert/strict";
import test from "node:test";

import type {
  PasswordAuthenticationService,
  PasswordAuthenticationResult,
} from "../authentication";

import {
  createPrincipalId,
} from "../identifiers";

import type {
  AuthenticatedPrincipalSession,
  PrincipalSessionStore,
} from "../session";

import {
  handlePrincipalLogin,
  handlePrincipalLogout,
  isSameOriginIdentityWriteRequest,
} from "./principal-login-api";

const principalId =
  createPrincipalId(
    "principal_01JTESTLOGINHTTPBOUNDARY000001",
  );

class FakeAuthentication
implements PasswordAuthenticationService {
  result:
    PasswordAuthenticationResult = {
      ok:
        true,

      value: {
        principalId,

        needsPasswordRehash:
          false,
      },
    };

  requests:
    unknown[] = [];

  async authenticate(
    request:
      Parameters<
        PasswordAuthenticationService[
          "authenticate"
        ]
      >[0],
  ): Promise<PasswordAuthenticationResult> {
    this.requests.push(
      request,
    );

    return this.result;
  }
}

class FakeSessions
implements PrincipalSessionStore {
  createdFor:
    string[] = [];

  destroyed =
    0;

  failCreate =
    false;

  failDestroy =
    false;

  async createSession(
    value:
      typeof principalId,
  ): Promise<AuthenticatedPrincipalSession> {
    if (
      this.failCreate
    ) {
      throw new Error(
        "simulated session creation failure",
      );
    }

    this.createdFor.push(
      value,
    );

    return {
      version:
        1,

      principalId:
        value,

      authenticatedAt:
        "2026-09-23T21:00:00.000Z",

      expiresAt:
        "2026-09-24T09:00:00.000Z",
    };
  }

  async getSession():
  Promise<AuthenticatedPrincipalSession | null> {
    return null;
  }

  async destroySession():
  Promise<void> {
    if (
      this.failDestroy
    ) {
      throw new Error(
        "simulated session destruction failure",
      );
    }

    this.destroyed +=
      1;
  }
}

function loginRequest(
  body:
    unknown,
  origin =
    "https://theriverkeptflowing.com",
): Request {
  return new Request(
    "https://theriverkeptflowing.com/api/identity/login",
    {
      method:
        "POST",

      headers: {
        "content-type":
          "application/json",

        origin,
      },

      body:
        JSON.stringify(
          body,
        ),
    },
  );
}

function logoutRequest(
  origin =
    "https://theriverkeptflowing.com",
): Request {
  return new Request(
    "https://theriverkeptflowing.com/api/identity/logout",
    {
      method:
        "POST",

      headers: {
        origin,
      },
    },
  );
}

test(
  "same-origin identity writes reject missing and cross-origin requests",
  () => {
    assert.equal(
      isSameOriginIdentityWriteRequest(
        new Request(
          "https://theriverkeptflowing.com/api/identity/login",
          {
            method:
              "POST",
          },
        ),
      ),
      false,
    );

    assert.equal(
      isSameOriginIdentityWriteRequest(
        loginRequest(
          {
            email:
              "creator@example.com",

            password:
              "secret",
          },
          "https://example.com",
        ),
      ),
      false,
    );

    assert.equal(
      isSameOriginIdentityWriteRequest(
        loginRequest({
          email:
            "creator@example.com",

          password:
            "secret",
        }),
      ),
      true,
    );
  },
);

test(
  "successful login creates Principal session without exposing PrincipalId",
  async () => {
    const authentication =
      new FakeAuthentication();

    const sessions =
      new FakeSessions();

    const response =
      await handlePrincipalLogin({
        request:
          loginRequest({
            email:
              "creator@example.com",

            password:
              "secret",
          }),

        authentication,

        sessions,
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    assert.deepEqual(
      await response.json(),
      {
        ok:
          true,
      },
    );

    assert.deepEqual(
      sessions.createdFor,
      [
        principalId,
      ],
    );
  },
);

test(
  "invalid credentials return generic 401 without creating session",
  async () => {
    const authentication =
      new FakeAuthentication();

    authentication.result = {
      ok:
        false,

      error: {
        code:
          "invalid-credentials",

        message:
          "Invalid email or password.",
      },
    };

    const sessions =
      new FakeSessions();

    const response =
      await handlePrincipalLogin({
        request:
          loginRequest({
            email:
              "unknown@example.com",

            password:
              "wrong",
          }),

        authentication,

        sessions,
      });

    assert.equal(
      response.status,
      401,
    );

    assert.equal(
      sessions.createdFor.length,
      0,
    );
  },
);

test(
  "authentication infrastructure failure maps to 503",
  async () => {
    const authentication =
      new FakeAuthentication();

    authentication.result = {
      ok:
        false,

      error: {
        code:
          "unavailable",

        message:
          "provider detail",
      },
    };

    const response =
      await handlePrincipalLogin({
        request:
          loginRequest({
            email:
              "creator@example.com",

            password:
              "secret",
          }),

        authentication,

        sessions:
          new FakeSessions(),
      });

    assert.equal(
      response.status,
      503,
    );

    assert.equal(
      (
        await response.text()
      ).includes(
        "provider detail",
      ),
      false,
    );
  },
);

test(
  "session creation failure fails closed",
  async () => {
    const sessions =
      new FakeSessions();

    sessions.failCreate =
      true;

    const response =
      await handlePrincipalLogin({
        request:
          loginRequest({
            email:
              "creator@example.com",

            password:
              "secret",
          }),

        authentication:
          new FakeAuthentication(),

        sessions,
      });

    assert.equal(
      response.status,
      503,
    );
  },
);

test(
  "login rejects authority hints and extra fields",
  async () => {
    const response =
      await handlePrincipalLogin({
        request:
          loginRequest({
            email:
              "creator@example.com",

            password:
              "secret",

            seshCreatorId:
              "forbidden",

            publishingRights:
              true,
          }),

        authentication:
          new FakeAuthentication(),

        sessions:
          new FakeSessions(),
      });

    assert.equal(
      response.status,
      400,
    );
  },
);

test(
  "logout destroys Principal session",
  async () => {
    const sessions =
      new FakeSessions();

    const response =
      await handlePrincipalLogout({
        request:
          logoutRequest(),

        sessions,
      });

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "no-store",
    );

    assert.equal(
      sessions.destroyed,
      1,
    );
  },
);

test(
  "cross-origin logout is rejected",
  async () => {
    const sessions =
      new FakeSessions();

    const response =
      await handlePrincipalLogout({
        request:
          logoutRequest(
            "https://example.com",
          ),

        sessions,
      });

    assert.equal(
      response.status,
      403,
    );

    assert.equal(
      sessions.destroyed,
      0,
    );
  },
);

test(
  "logout destruction failure maps to 503",
  async () => {
    const sessions =
      new FakeSessions();

    sessions.failDestroy =
      true;

    const response =
      await handlePrincipalLogout({
        request:
          logoutRequest(),

        sessions,
      });

    assert.equal(
      response.status,
      503,
    );
  },
);
