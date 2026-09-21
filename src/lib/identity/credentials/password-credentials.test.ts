import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../identifiers";

import {
  ARGON2ID_PASSWORD_HASH_PARAMETERS,
  Argon2idPasswordHasher,
  normalizeCredentialEmail,
  validatePasswordCredential,
} from "./index";

test(
  "normalizes credential email deterministically",
  () => {
    assert.equal(
      normalizeCredentialEmail(
        "  River.Example@Example.COM  ",
      ),
      "river.example@example.com",
    );
  },
);

test(
  "rejects malformed credential email",
  () => {
    assert.throws(
      () =>
        normalizeCredentialEmail(
          "not-an-email",
        ),
    );

    assert.throws(
      () =>
        normalizeCredentialEmail(
          "two@@example.com",
        ),
    );

    assert.throws(
      () =>
        normalizeCredentialEmail(
          "river @example.com",
        ),
    );
  },
);

test(
  "validates canonical password credential metadata",
  () => {
    const principalId =
      createPrincipalId(
        "credential-test",
      );

    const credential =
      validatePasswordCredential({
        principalId,
        emailNormalized:
          "river@example.com",
        passwordHash:
          "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaA",
        createdAt:
          "2026-09-21T22:00:00.000Z",
        updatedAt:
          "2026-09-21T22:00:00.000Z",
      });

    assert.equal(
      credential.principalId,
      principalId,
    );

    assert.equal(
      credential.emailNormalized,
      "river@example.com",
    );
  },
);

test(
  "rejects non-canonical credential email metadata",
  () => {
    assert.throws(
      () =>
        validatePasswordCredential({
          principalId:
            createPrincipalId(
              "credential-email",
            ),
          emailNormalized:
            "River@Example.com",
          passwordHash:
            "encoded-hash",
          createdAt:
            "2026-09-21T22:00:00.000Z",
          updatedAt:
            "2026-09-21T22:00:00.000Z",
        }),
    );
  },
);

test(
  "locks the initial Argon2id work-factor envelope",
  () => {
    assert.deepEqual(
      ARGON2ID_PASSWORD_HASH_PARAMETERS,
      {
        algorithm:
          "argon2id",
        version:
          19,
        memoryKiB:
          19456,
        iterations:
          2,
        parallelism:
          1,
        saltBytes:
          16,
        hashBytes:
          32,
      },
    );
  },
);

test(
  "hashes passwords into a PHC-compatible Argon2id representation",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    const encoded =
      await hasher.hashPassword(
        "correct horse battery staple",
      );

    assert.match(
      encoded,
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/u,
    );

    assert.equal(
      encoded.includes(
        "correct horse battery staple",
      ),
      false,
    );
  },
);

test(
  "uses an independent salt for each password hash",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    const first =
      await hasher.hashPassword(
        "same-password",
      );

    const second =
      await hasher.hashPassword(
        "same-password",
      );

    assert.notEqual(
      first,
      second,
    );
  },
);

test(
  "verifies the correct password",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    const encoded =
      await hasher.hashPassword(
        "river-password",
      );

    assert.deepEqual(
      await hasher.verifyPassword(
        "river-password",
        encoded,
      ),
      {
        verified:
          true,
        needsRehash:
          false,
      },
    );
  },
);

test(
  "rejects an incorrect password",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    const encoded =
      await hasher.hashPassword(
        "correct-password",
      );

    assert.deepEqual(
      await hasher.verifyPassword(
        "wrong-password",
        encoded,
      ),
      {
        verified:
          false,
        needsRehash:
          false,
      },
    );
  },
);

test(
  "fails closed on malformed encoded hashes",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    assert.deepEqual(
      await hasher.verifyPassword(
        "password",
        "not-a-valid-password-hash",
      ),
      {
        verified:
          false,
        needsRehash:
          false,
      },
    );
  },
);

test(
  "refuses stored work factors outside the verification safety envelope",
  async () => {
    const hasher =
      new Argon2idPasswordHasher();

    const unsafe =
      "$argon2id$v=19$m=999999999,t=2,p=1$c2FsdHNhbHQ$aGFzaA";

    assert.deepEqual(
      await hasher.verifyPassword(
        "password",
        unsafe,
      ),
      {
        verified:
          false,
        needsRehash:
          false,
      },
    );
  },
);
