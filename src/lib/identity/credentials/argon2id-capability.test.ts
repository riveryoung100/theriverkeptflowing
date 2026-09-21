import assert from "node:assert/strict";
import test from "node:test";

import {
  argon2id,
} from "@noble/hashes/argon2.js";

import {
  bytesToHex,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

const RFC_9106_ARGON2ID_TAG =
  "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659";

test(
  "matches the RFC 9106 Argon2id version 19 test vector",
  () => {
    const password =
      new Uint8Array(32).fill(0x01);

    const salt =
      new Uint8Array(16).fill(0x02);

    const secret =
      new Uint8Array(8).fill(0x03);

    const associatedData =
      new Uint8Array(12).fill(0x04);

    const derived =
      argon2id(
        password,
        salt,
        {
          t: 3,
          m: 32,
          p: 4,
          dkLen: 32,
          version: 0x13,
          key: secret,
          personalization:
            associatedData,
          maxmem:
            64 * 1024 * 1024,
        },
      );

    assert.equal(
      bytesToHex(derived),
      RFC_9106_ARGON2ID_TAG,
    );
  },
);

test(
  "different salts produce different Argon2id outputs",
  () => {
    const password =
      utf8ToBytes(
        "sesh-017-capability-password",
      );

    const firstSalt =
      new Uint8Array(16);

    const secondSalt =
      new Uint8Array(16);

    globalThis.crypto.getRandomValues(
      firstSalt,
    );

    globalThis.crypto.getRandomValues(
      secondSalt,
    );

    assert.notDeepEqual(
      firstSalt,
      secondSalt,
    );

    const options = {
      t: 1,
      m: 1024,
      p: 1,
      dkLen: 32,
      maxmem:
        16 * 1024 * 1024,
    } as const;

    const first =
      argon2id(
        password,
        firstSalt,
        options,
      );

    const second =
      argon2id(
        password,
        secondSalt,
        options,
      );

    assert.notEqual(
      bytesToHex(first),
      bytesToHex(second),
    );
  },
);

test(
  "different passwords produce different outputs under the same salt",
  () => {
    const salt =
      new Uint8Array(16).fill(
        0x5a,
      );

    const options = {
      t: 1,
      m: 1024,
      p: 1,
      dkLen: 32,
      maxmem:
        16 * 1024 * 1024,
    } as const;

    const first =
      argon2id(
        utf8ToBytes(
          "first-password",
        ),
        salt,
        options,
      );

    const second =
      argon2id(
        utf8ToBytes(
          "second-password",
        ),
        salt,
        options,
      );

    assert.notEqual(
      bytesToHex(first),
      bytesToHex(second),
    );
  },
);

test(
  "rejects an undersized salt",
  () => {
    assert.throws(
      () =>
        argon2id(
          utf8ToBytes(
            "password",
          ),
          new Uint8Array(4),
          {
            t: 1,
            m: 1024,
            p: 1,
            dkLen: 32,
            maxmem:
              16 * 1024 * 1024,
          },
        ),
    );
  },
);
