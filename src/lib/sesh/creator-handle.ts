import type {
  SeshCreatorId,
} from "./identifiers";

export const SESH_CREATOR_HANDLE_MIN_LENGTH =
  3 as const;

export const SESH_CREATOR_HANDLE_MAX_LENGTH =
  32 as const;

export type SeshCreatorHandle =
  string & {
    readonly __seshCreatorHandle:
      unique symbol;
  };

export interface SeshCreatorHandleReservation {
  readonly normalizedHandle:
    SeshCreatorHandle;

  readonly creatorId:
    SeshCreatorId;

  readonly createdAt:
    string;
}

function hasValidHandleGrammar(
  value:
    string,
): boolean {
  if (
    value.length <
      SESH_CREATOR_HANDLE_MIN_LENGTH ||
    value.length >
      SESH_CREATOR_HANDLE_MAX_LENGTH
  ) {
    return false;
  }

  if (
    !/^[a-z0-9]/.test(
      value,
    ) ||
    !/[a-z0-9]$/.test(
      value,
    )
  ) {
    return false;
  }

  if (
    !/^[a-z0-9_-]+$/.test(
      value,
    )
  ) {
    return false;
  }

  if (
    /[_-]{2}/.test(
      value,
    )
  ) {
    return false;
  }

  return true;
}

export function normalizeSeshCreatorHandle(
  value:
    unknown,
): SeshCreatorHandle {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      "Sesh creator handle must be a string.",
    );
  }

  const normalized =
    value
      .normalize(
        "NFKC",
      )
      .trim()
      .toLowerCase();

  if (
    !hasValidHandleGrammar(
      normalized,
    )
  ) {
    throw new TypeError(
      "Sesh creator handle must be 3-32 lowercase letters or numbers with only internal hyphen or underscore separators.",
    );
  }

  return normalized as
    SeshCreatorHandle;
}

export function validateSeshCreatorHandleReservation(
  value:
    unknown,
): SeshCreatorHandleReservation {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new TypeError(
      "Sesh creator handle reservation must be an object.",
    );
  }

  const record =
    value as
      Record<string, unknown>;

  const normalizedHandle =
    normalizeSeshCreatorHandle(
      record.normalizedHandle,
    );

  if (
    record.normalizedHandle !==
      normalizedHandle
  ) {
    throw new TypeError(
      "Sesh creator handle reservation must contain the canonical normalized handle.",
    );
  }

  if (
    typeof record.creatorId !==
      "string" ||
    !record.creatorId.startsWith(
      "sesh-creator:",
    )
  ) {
    throw new TypeError(
      "Sesh creator handle reservation requires a canonical SeshCreatorId.",
    );
  }

  if (
    typeof record.createdAt !==
      "string" ||
    Number.isNaN(
      Date.parse(
        record.createdAt,
      ),
    )
  ) {
    throw new TypeError(
      "Sesh creator handle reservation requires a valid createdAt timestamp.",
    );
  }

  return {
    normalizedHandle,

    creatorId:
      record.creatorId as
        SeshCreatorId,

    createdAt:
      record.createdAt,
  };
}