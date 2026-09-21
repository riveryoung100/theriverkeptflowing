import {
  parsePrincipalId,
} from "../identifiers";

import type {
  PasswordCredential,
} from "./model";

const MAX_NORMALIZED_EMAIL_LENGTH =
  320;

function requireCanonicalTimestamp(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${label} must be a non-empty timestamp string.`,
    );
  }

  const milliseconds =
    Date.parse(value);

  if (
    Number.isNaN(
      milliseconds,
    )
  ) {
    throw new Error(
      `${label} must be a valid timestamp.`,
    );
  }

  return value;
}

export function normalizeCredentialEmail(
  value: unknown,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      "Credential email must be a string.",
    );
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized.length === 0
  ) {
    throw new Error(
      "Credential email must not be empty.",
    );
  }

  if (
    normalized.length >
    MAX_NORMALIZED_EMAIL_LENGTH
  ) {
    throw new Error(
      "Credential email exceeds the maximum supported length.",
    );
  }

  if (
    /\s/u.test(
      normalized,
    )
  ) {
    throw new Error(
      "Credential email must not contain whitespace.",
    );
  }

  const atIndex =
    normalized.indexOf(
      "@",
    );

  if (
    atIndex <= 0 ||
    atIndex !==
      normalized.lastIndexOf(
        "@",
      ) ||
    atIndex ===
      normalized.length - 1
  ) {
    throw new Error(
      "Credential email must contain one non-terminal @ separator.",
    );
  }

  return normalized;
}

export function validatePasswordCredential(
  value: unknown,
): PasswordCredential {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "PasswordCredential must be an object.",
    );
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  const principalId =
    parsePrincipalId(
      candidate.principalId,
    );

  const emailNormalized =
    normalizeCredentialEmail(
      candidate.emailNormalized,
    );

  if (
    candidate.emailNormalized !==
    emailNormalized
  ) {
    throw new Error(
      "PasswordCredential.emailNormalized must already be canonical.",
    );
  }

  if (
    typeof candidate.passwordHash !==
      "string" ||
    candidate.passwordHash.length ===
      0
  ) {
    throw new Error(
      "PasswordCredential.passwordHash must be a non-empty encoded hash.",
    );
  }

  const createdAt =
    requireCanonicalTimestamp(
      candidate.createdAt,
      "PasswordCredential.createdAt",
    );

  const updatedAt =
    requireCanonicalTimestamp(
      candidate.updatedAt,
      "PasswordCredential.updatedAt",
    );

  if (
    Date.parse(
      updatedAt,
    ) <
    Date.parse(
      createdAt,
    )
  ) {
    throw new Error(
      "PasswordCredential.updatedAt cannot precede createdAt.",
    );
  }

  return {
    principalId,
    emailNormalized,
    passwordHash:
      candidate.passwordHash,
    createdAt,
    updatedAt,
  };
}
