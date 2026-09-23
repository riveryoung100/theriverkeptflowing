import assert from "node:assert/strict";
import test from "node:test";

import {
  Argon2idPasswordHasher,
} from "../credentials";

import {
  createPrincipalLoginRuntime,
  createPrincipalLogoutRuntime,
} from "./principal-login-api";

class FakeStatement {
  bind() {
    return this;
  }

  async first() {
    return null;
  }

  async run() {
    return {
      success:
        true,
    };
  }
}

class FakeDatabase {
  prepare() {
    return new FakeStatement();
  }
}

class FakeSession {
  values =
    new Map<string, unknown>();

  regenerateCalls =
    0;

  destroyCalls =
    0;

  async regenerate() {
    this.regenerateCalls +=
      1;
  }

  get(
    key:
      string,
  ) {
    return this.values.get(
      key,
    );
  }

  set(
    key:
      string,
    value:
      unknown,
  ) {
    this.values.set(
      key,
      value,
    );
  }

  delete(
    key:
      string,
  ) {
    this.values.delete(
      key,
    );
  }

  async destroy() {
    this.destroyCalls +=
      1;

    this.values.clear();
  }
}

test(
  "composes password authentication and Principal session storage",
  () => {
    const runtime =
      createPrincipalLoginRuntime(
        new FakeSession(),
        {
          RIVER_IDENTITY_DB:
            new FakeDatabase(),
        },
      );

    assert.equal(
      typeof runtime.authentication
        .authenticate,
      "function",
    );

    assert.equal(
      typeof runtime.sessions
        .createSession,
      "function",
    );
  },
);

test(
  "login runtime fails closed without identity D1",
  () => {
    assert.throws(
      () =>
        createPrincipalLoginRuntime(
          new FakeSession(),
          {},
        ),
      /RIVER_IDENTITY_DB/,
    );
  },
);

test(
  "dummy verification hash is syntactically consumable by canonical Argon2id verifier",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    const result =
      await hasher.verifyPassword(
        "anything",
        "$argon2id$v=19$m=19456,t=2,p=1$cml2ZXItc2VzaC1kdW1teTE$xWTll6aNp7bolxNvnHFw+2qfqWgKz9BEDQAb2Qf5eNw",
      );

    assert.equal(
      typeof result.verified,
      "boolean",
    );

    assert.equal(
      typeof result.needsRehash,
      "boolean",
    );
  },
);

test(
  "logout runtime composes canonical Principal session store",
  () => {
    const store =
      createPrincipalLogoutRuntime(
        new FakeSession(),
      );

    assert.equal(
      typeof store.destroySession,
      "function",
    );
  },
);
