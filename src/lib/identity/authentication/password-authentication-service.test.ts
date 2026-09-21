import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import type {
  AuthenticatedPrincipal,
} from "../model";

import type {
  PrincipalRepository,
  PrincipalRepositoryResult,
} from "../repository";

import type {
  PasswordHasher,
  PasswordVerificationResult,
} from "../credentials/contracts";

import type {
  PasswordCredential,
} from "../credentials/model";

import type {
  PasswordCredentialRepository,
  PasswordCredentialRepositoryResult,
} from "../credentials/repository";

import {
  DefaultPasswordAuthenticationService,
} from "./password-authentication-service";

class FakePrincipalRepository
implements PrincipalRepository {
  readonly principals =
    new Map<
      string,
      AuthenticatedPrincipal
    >();

  failReads =
    false;

  async savePrincipal(
    principal:
      AuthenticatedPrincipal,
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    this.principals.set(
      principal.principalId,
      principal,
    );

    return {
      ok:
        true,

      value:
        principal,
    };
  }

  async getPrincipal(
    principalId:
      AuthenticatedPrincipal["principalId"],
  ): Promise<
    PrincipalRepositoryResult<AuthenticatedPrincipal>
  > {
    if (
      this.failReads
    ) {
      return {
        ok:
          false,

        error: {
          code:
            "storage",

          message:
            "simulated principal read failure",
        },
      };
    }

    const principal =
      this.principals.get(
        principalId,
      );

    if (
      principal ===
      undefined
    ) {
      return {
        ok:
          false,

        error: {
          code:
            "not-found",

          message:
            "principal not found",
        },
      };
    }

    return {
      ok:
        true,

      value:
        principal,
    };
  }

  async principalExists(
    principalId:
      AuthenticatedPrincipal["principalId"],
  ): Promise<
    PrincipalRepositoryResult<boolean>
  > {
    return {
      ok:
        true,

      value:
        this.principals.has(
          principalId,
        ),
    };
  }
}

class FakeCredentialRepository
implements PasswordCredentialRepository {
  readonly credentials =
    new Map<
      string,
      PasswordCredential
    >();

  failureKind:
    "not-found" |
    "validation" |
    "conflict" |
    "storage" |
    null =
      null;

  async saveCredential(
    credential:
      PasswordCredential,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  > {
    this.credentials.set(
      credential.emailNormalized,
      credential,
    );

    return {
      ok:
        true,

      value:
        credential,
    };
  }

  async getCredentialByPrincipalId(
    principalId:
      PasswordCredential["principalId"],
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  > {
    for (
      const credential of
      this.credentials.values()
    ) {
      if (
        credential.principalId ===
        principalId
      ) {
        return {
          ok:
            true,

          value:
            credential,
        };
      }
    }

    return {
      ok:
        false,

      error: {
        kind:
          "not-found",

        message:
          "credential not found",
      },
    };
  }

  async getCredentialByNormalizedEmail(
    emailNormalized:
      string,
  ): Promise<
    PasswordCredentialRepositoryResult<PasswordCredential>
  > {
    if (
      this.failureKind !==
      null
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            this.failureKind,

          message:
            "simulated credential repository failure",
        },
      };
    }

    const credential =
      this.credentials.get(
        emailNormalized,
      );

    if (
      credential ===
      undefined
    ) {
      return {
        ok:
          false,

        error: {
          kind:
            "not-found",

        message:
          "credential not found",
        },
      };
    }

    return {
      ok:
        true,

      value:
        credential,
    };
  }

  async credentialExistsForPrincipal(
    principalId:
      PasswordCredential["principalId"],
  ): Promise<
    PasswordCredentialRepositoryResult<boolean>
  > {
    for (
      const credential of
      this.credentials.values()
    ) {
      if (
        credential.principalId ===
        principalId
      ) {
        return {
          ok:
            true,

          value:
            true,
        };
      }
    }

    return {
      ok:
        true,

      value:
        false,
    };
  }
}

class FakePasswordHasher
implements PasswordHasher {
  readonly expectedHash =
    "stored-password-hash";

  readonly dummyHash =
    "dummy-password-hash";

  readonly correctPassword =
    "correct-password";

  verifyCount =
    0;

  dummyVerifyCount =
    0;

  needsRehash =
    false;

  throwOnVerify =
    false;

  async hashPassword(
    _password:
      string,
  ): Promise<string> {
    return this.expectedHash;
  }

  async verifyPassword(
    password:
      string,
    encodedHash:
      string,
  ): Promise<
    PasswordVerificationResult
  > {
    this.verifyCount +=
      1;

    if (
      encodedHash ===
      this.dummyHash
    ) {
      this.dummyVerifyCount +=
        1;
    }

    if (
      this.throwOnVerify
    ) {
      throw new Error(
        "simulated hash failure",
      );
    }

    return {
      verified:
        encodedHash ===
          this.expectedHash &&
        password ===
          this.correctPassword,

      needsRehash:
        encodedHash ===
          this.expectedHash &&
        password ===
          this.correctPassword &&
        this.needsRehash,
    };
  }
}

function principal(
  status:
    "active" |
    "disabled" =
      "active",
): AuthenticatedPrincipal {
  return {
    principalId:
      createPrincipalId(
        "authentication-test",
      ),

    status,

    displayName:
      "River",

    createdAt:
      "2026-09-21T22:00:00.000Z",

    updatedAt:
      "2026-09-21T22:00:00.000Z",
  };
}

function credential(
  principalId:
    AuthenticatedPrincipal["principalId"],
): PasswordCredential {
  return {
    principalId,

    emailNormalized:
      "river@example.com",

    passwordHash:
      "stored-password-hash",

    createdAt:
      "2026-09-21T22:00:00.000Z",

    updatedAt:
      "2026-09-21T22:00:00.000Z",
  };
}

function fixture(
  status:
    "active" |
    "disabled" =
      "active",
) {
  const principals =
    new FakePrincipalRepository();

  const credentials =
    new FakeCredentialRepository();

  const passwordHasher =
    new FakePasswordHasher();

  const canonicalPrincipal =
    principal(
      status,
    );

  principals.principals.set(
    canonicalPrincipal.principalId,
    canonicalPrincipal,
  );

  credentials.credentials.set(
    "river@example.com",
    credential(
      canonicalPrincipal.principalId,
    ),
  );

  const service =
    new DefaultPasswordAuthenticationService({
      principals,
      credentials,
      passwordHasher,
      dummyPasswordHash:
        passwordHasher.dummyHash,
    });

  return {
    principals,
    credentials,
    passwordHasher,
    canonicalPrincipal,
    service,
  };
}

test(
  "authenticates valid credentials to canonical PrincipalId",
  async () => {
    const {
      service,
      canonicalPrincipal,
    } =
      fixture();

    const result =
      await service.authenticate({
        email:
          " River@Example.com ",
        password:
          "correct-password",
      });

    assert.deepEqual(
      result,
      {
        ok:
          true,

        value: {
          principalId:
            canonicalPrincipal.principalId,

          needsPasswordRehash:
            false,
        },
      },
    );
  },
);

test(
  "returns generic invalid-credentials for a wrong password",
  async () => {
    const {
      service,
    } =
      fixture();

    const result =
      await service.authenticate({
        email:
          "river@example.com",

        password:
          "wrong-password",
      });

    assert.deepEqual(
      result,
      {
        ok:
          false,

        error: {
          code:
            "invalid-credentials",

          message:
            "Invalid email or password.",
        },
      },
    );
  },
);

test(
  "burns dummy password verification for an unknown email",
  async () => {
    const {
      service,
      passwordHasher,
    } =
      fixture();

    const result =
      await service.authenticate({
        email:
          "unknown@example.com",

        password:
          "wrong-password",
      });

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      passwordHasher.dummyVerifyCount,
      1,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "invalid-credentials",
      );
    }
  },
);

test(
  "burns dummy password verification for malformed email input",
  async () => {
    const {
      service,
      passwordHasher,
    } =
      fixture();

    const result =
      await service.authenticate({
        email:
          "not-an-email",

        password:
          "wrong-password",
      });

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      passwordHasher.dummyVerifyCount,
      1,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "invalid-credentials",
      );
    }
  },
);

test(
  "rejects disabled principals without revealing account status",
  async () => {
    const {
      service,
    } =
      fixture(
        "disabled",
      );

    const result =
      await service.authenticate({
        email:
          "river@example.com",

        password:
          "correct-password",
      });

    assert.deepEqual(
      result,
      {
        ok:
          false,

        error: {
          code:
            "invalid-credentials",

          message:
            "Invalid email or password.",
        },
      },
    );
  },
);

test(
  "returns unavailable for credential repository failures",
  async () => {
    const {
      service,
      credentials,
    } =
      fixture();

    credentials.failureKind =
      "storage";

    const result =
      await service.authenticate({
        email:
          "river@example.com",

        password:
          "correct-password",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "returns unavailable when the credential points to a missing principal",
  async () => {
    const {
      service,
      principals,
    } =
      fixture();

    principals.principals.clear();

    const result =
      await service.authenticate({
        email:
          "river@example.com",

        password:
          "correct-password",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "returns unavailable when password verification fails operationally",
  async () => {
    const {
      service,
      passwordHasher,
    } =
      fixture();

    passwordHasher.throwOnVerify =
      true;

    const result =
      await service.authenticate({
        email:
          "river@example.com",

        password:
          "correct-password",
      });

    assert.equal(
      result.ok,
      false,
    );

    if (
      !result.ok
    ) {
      assert.equal(
        result.error.code,
        "unavailable",
      );
    }
  },
);

test(
  "surfaces successful needs-rehash state without mutating credentials",
  async () => {
    const {
      service,
      passwordHasher,
      canonicalPrincipal,
    } =
      fixture();

    passwordHasher.needsRehash =
      true;

    const result =
      await service.authenticate({
        email:
          "river@example.com",

        password:
          "correct-password",
      });

    assert.deepEqual(
      result,
      {
        ok:
          true,

        value: {
          principalId:
            canonicalPrincipal.principalId,

          needsPasswordRehash:
            true,
        },
      },
    );
  },
);

test(
  "requires a non-empty dummy password hash",
  () => {
    const principals =
      new FakePrincipalRepository();

    const credentials =
      new FakeCredentialRepository();

    const passwordHasher =
      new FakePasswordHasher();

    assert.throws(
      () =>
        new DefaultPasswordAuthenticationService({
          principals,
          credentials,
          passwordHasher,
          dummyPasswordHash:
            "",
        }),
    );
  },
);
