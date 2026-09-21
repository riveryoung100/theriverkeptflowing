import {
  argon2id,
} from "@noble/hashes/argon2.js";

import {
  utf8ToBytes,
} from "@noble/hashes/utils.js";

import type {
  PasswordHasher,
  PasswordVerificationResult,
} from "./contracts";

const ALGORITHM =
  "argon2id";

const VERSION =
  19;

const MEMORY_KIB =
  19_456;

const ITERATIONS =
  2;

const PARALLELISM =
  1;

const SALT_BYTES =
  16;

const HASH_BYTES =
  32;

const MAX_MEMORY_KIB =
  131_072;

const MAX_ITERATIONS =
  10;

const MAX_PARALLELISM =
  4;

const MAX_PASSWORD_UTF8_BYTES =
  1_024;

const PHC_PATTERN =
  /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/u;

interface ParsedArgon2idHash {
  readonly version:
    number;

  readonly memoryKiB:
    number;

  readonly iterations:
    number;

  readonly parallelism:
    number;

  readonly salt:
    Uint8Array;

  readonly hash:
    Uint8Array;
}

function requirePassword(
  password: string,
): Uint8Array {
  if (
    typeof password !== "string"
  ) {
    throw new Error(
      "Password must be a string.",
    );
  }

  const encoded =
    utf8ToBytes(
      password,
    );

  if (
    encoded.length === 0
  ) {
    throw new Error(
      "Password must not be empty.",
    );
  }

  if (
    encoded.length >
    MAX_PASSWORD_UTF8_BYTES
  ) {
    throw new Error(
      "Password exceeds the maximum supported UTF-8 byte length.",
    );
  }

  return encoded;
}

function encodeBase64WithoutPadding(
  bytes: Uint8Array,
): string {
  let binary =
    "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary +=
      String.fromCharCode(
        bytes[index],
      );
  }

  return btoa(
    binary,
  ).replace(
    /=+$/u,
    "",
  );
}

function decodeBase64WithoutPadding(
  value: string,
): Uint8Array {
  if (
    value.length === 0 ||
    !/^[A-Za-z0-9+/]+$/u.test(
      value,
    )
  ) {
    throw new Error(
      "Encoded Argon2id component is not valid base64.",
    );
  }

  const paddingLength =
    (4 - value.length % 4) %
    4;

  const padded =
    value +
    "=".repeat(
      paddingLength,
    );

  const binary =
    atob(
      padded,
    );

  const output =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    output[index] =
      binary.charCodeAt(
        index,
      );
  }

  return output;
}

function parsePositiveInteger(
  value: string,
  label: string,
): number {
  if (
    !/^[1-9]\d*$/u.test(
      value,
    )
  ) {
    throw new Error(
      `${label} must be a positive integer.`,
    );
  }

  const parsed =
    Number(
      value,
    );

  if (
    !Number.isSafeInteger(
      parsed,
    )
  ) {
    throw new Error(
      `${label} exceeds the supported integer range.`,
    );
  }

  return parsed;
}

function parseEncodedHash(
  encodedHash: string,
): ParsedArgon2idHash {
  if (
    typeof encodedHash !==
      "string"
  ) {
    throw new Error(
      "Encoded password hash must be a string.",
    );
  }

  const match =
    PHC_PATTERN.exec(
      encodedHash,
    );

  if (
    match === null
  ) {
    throw new Error(
      "Encoded password hash is not a supported Argon2id PHC string.",
    );
  }

  const version =
    parsePositiveInteger(
      match[1],
      "Argon2id version",
    );

  const memoryKiB =
    parsePositiveInteger(
      match[2],
      "Argon2id memory",
    );

  const iterations =
    parsePositiveInteger(
      match[3],
      "Argon2id iterations",
    );

  const parallelism =
    parsePositiveInteger(
      match[4],
      "Argon2id parallelism",
    );

  if (
    version !== VERSION
  ) {
    throw new Error(
      "Unsupported Argon2id version.",
    );
  }

  if (
    memoryKiB >
      MAX_MEMORY_KIB ||
    iterations >
      MAX_ITERATIONS ||
    parallelism >
      MAX_PARALLELISM
  ) {
    throw new Error(
      "Stored Argon2id parameters exceed the verification safety envelope.",
    );
  }

  const salt =
    decodeBase64WithoutPadding(
      match[5],
    );

  const hash =
    decodeBase64WithoutPadding(
      match[6],
    );

  if (
    salt.length <
    8
  ) {
    throw new Error(
      "Stored Argon2id salt is too short.",
    );
  }

  if (
    hash.length === 0 ||
    hash.length > 64
  ) {
    throw new Error(
      "Stored Argon2id hash length is unsupported.",
    );
  }

  return {
    version,
    memoryKiB,
    iterations,
    parallelism,
    salt,
    hash,
  };
}

function equalBytesConstantTime(
  left: Uint8Array,
  right: Uint8Array,
): boolean {
  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  let difference =
    0;

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    difference |=
      left[index] ^
      right[index];
  }

  return difference ===
    0;
}

function derive(
  passwordBytes: Uint8Array,
  salt: Uint8Array,
  parameters: {
    readonly memoryKiB:
      number;

    readonly iterations:
      number;

    readonly parallelism:
      number;

    readonly hashBytes:
      number;
  },
): Uint8Array {
  return argon2id(
    passwordBytes,
    salt,
    {
      version:
        0x13,

      m:
        parameters.memoryKiB,

      t:
        parameters.iterations,

      p:
        parameters.parallelism,

      dkLen:
        parameters.hashBytes,

      maxmem:
        Math.max(
          32 * 1024 * 1024,
          parameters.memoryKiB *
            1024 *
            2,
        ),
    },
  );
}

function encodePhc(
  parsed: ParsedArgon2idHash,
): string {
  return [
    "",
    ALGORITHM,
    `v=${parsed.version}`,
    `m=${parsed.memoryKiB},t=${parsed.iterations},p=${parsed.parallelism}`,
    encodeBase64WithoutPadding(
      parsed.salt,
    ),
    encodeBase64WithoutPadding(
      parsed.hash,
    ),
  ].join(
    "$",
  );
}

export const ARGON2ID_PASSWORD_HASH_PARAMETERS =
  Object.freeze({
    algorithm:
      ALGORITHM,

    version:
      VERSION,

    memoryKiB:
      MEMORY_KIB,

    iterations:
      ITERATIONS,

    parallelism:
      PARALLELISM,

    saltBytes:
      SALT_BYTES,

    hashBytes:
      HASH_BYTES,
  });

export class Argon2idPasswordHasher
implements PasswordHasher {
  async hashPassword(
    password: string,
  ): Promise<string> {
    const passwordBytes =
      requirePassword(
        password,
      );

    const salt =
      new Uint8Array(
        SALT_BYTES,
      );

    globalThis.crypto.getRandomValues(
      salt,
    );

    const hash =
      derive(
        passwordBytes,
        salt,
        {
          memoryKiB:
            MEMORY_KIB,

          iterations:
            ITERATIONS,

          parallelism:
            PARALLELISM,

          hashBytes:
            HASH_BYTES,
        },
      );

    return encodePhc({
      version:
        VERSION,

      memoryKiB:
        MEMORY_KIB,

      iterations:
        ITERATIONS,

      parallelism:
        PARALLELISM,

      salt,
      hash,
    });
  }

  async verifyPassword(
    password: string,
    encodedHash: string,
  ): Promise<PasswordVerificationResult> {
    let passwordBytes:
      Uint8Array;

    try {
      passwordBytes =
        requirePassword(
          password,
        );
    }
    catch {
      return {
        verified:
          false,

        needsRehash:
          false,
      };
    }

    let parsed:
      ParsedArgon2idHash;

    try {
      parsed =
        parseEncodedHash(
          encodedHash,
        );
    }
    catch {
      return {
        verified:
          false,

        needsRehash:
          false,
      };
    }

    let derived:
      Uint8Array;

    try {
      derived =
        derive(
          passwordBytes,
          parsed.salt,
          {
            memoryKiB:
              parsed.memoryKiB,

            iterations:
              parsed.iterations,

            parallelism:
              parsed.parallelism,

            hashBytes:
              parsed.hash.length,
          },
        );
    }
    catch {
      return {
        verified:
          false,

        needsRehash:
          false,
      };
    }

    const verified =
      equalBytesConstantTime(
        derived,
        parsed.hash,
      );

    const needsRehash =
      verified &&
      (
        parsed.version !==
          VERSION ||
        parsed.memoryKiB !==
          MEMORY_KIB ||
        parsed.iterations !==
          ITERATIONS ||
        parsed.parallelism !==
          PARALLELISM ||
        parsed.salt.length !==
          SALT_BYTES ||
        parsed.hash.length !==
          HASH_BYTES
      );

    return {
      verified,
      needsRehash,
    };
  }
}
