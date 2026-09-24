import type {
  SeshStorageReference,
} from "../../model";
import type {
  SeshPersistenceResult,
} from "../model";
import type {
  SeshAudioObjectReadRange,
  SeshAudioObjectStore,
  SeshResolvedAudioObjectRange,
  SeshStoredAudioObjectRead,
} from "../repositories";
import type {
  SeshR2BucketLike,
} from "./types";

function success<T>(
  value: T,
): SeshPersistenceResult<T> {
  return {
    ok: true,
    value,
  };
}

function failure<T>(
  kind: "not-found" | "validation" | "storage",
  message: string,
): SeshPersistenceResult<T> {
  return {
    ok: false,
    error: {
      kind,
      message,
    },
  };
}

function validateReference(
  reference: SeshStorageReference,
): SeshStorageReference {
  if (
    typeof reference !== "object" ||
    reference === null ||
    typeof reference.provider !== "string" ||
    reference.provider.trim().length === 0 ||
    typeof reference.key !== "string" ||
    reference.key.trim().length === 0
  ) {
    throw new TypeError(
      "SeshStorageReference requires non-empty provider and key values.",
    );
  }

  return {
    provider: reference.provider,
    key: reference.key,
    bucket: reference.bucket,
    versionId: reference.versionId,
  };
}

function validateRange(
  range:
    SeshAudioObjectReadRange | undefined,
): SeshAudioObjectReadRange | undefined {
  if (
    range ===
    undefined
  ) {
    return undefined;
  }

  const hasOffset =
    range.offset !==
    undefined;

  const hasLength =
    range.length !==
    undefined;

  const hasSuffix =
    range.suffix !==
    undefined;

  if (
    hasSuffix &&
    (
      hasOffset ||
      hasLength
    )
  ) {
    throw new RangeError(
      "Sesh audio range suffix cannot be combined with offset or length.",
    );
  }

  if (
    !hasSuffix &&
    !hasOffset
  ) {
    throw new RangeError(
      "Sesh audio range requires an offset or suffix.",
    );
  }

  if (
    hasOffset &&
    (
      !Number.isSafeInteger(
        range.offset,
      ) ||
      range.offset! <
        0
    )
  ) {
    throw new RangeError(
      "Sesh audio range offset must be a non-negative safe integer.",
    );
  }

  if (
    hasLength &&
    (
      !Number.isSafeInteger(
        range.length,
      ) ||
      range.length! <=
        0
    )
  ) {
    throw new RangeError(
      "Sesh audio range length must be a positive safe integer.",
    );
  }

  if (
    hasSuffix &&
    (
      !Number.isSafeInteger(
        range.suffix,
      ) ||
      range.suffix! <=
        0
    )
  ) {
    throw new RangeError(
      "Sesh audio range suffix must be a positive safe integer.",
    );
  }

  if (
    hasOffset &&
    hasLength &&
    !Number.isSafeInteger(
      range.offset! +
      range.length!,
    )
  ) {
    throw new RangeError(
      "Sesh audio range exceeds the supported integer range.",
    );
  }

  return {
    offset:
      range.offset,

    length:
      range.length,

    suffix:
      range.suffix,
  };
}

function resolveRange(
  range:
    SeshAudioObjectReadRange,

  totalSize:
    number,
): SeshResolvedAudioObjectRange {
  if (
    !Number.isSafeInteger(
      totalSize,
    ) ||
    totalSize <=
      0
  ) {
    throw new RangeError(
      "Sesh audio object size is unavailable for ranged reads.",
    );
  }

  if (
    range.suffix !==
    undefined
  ) {
    const length =
      Math.min(
        range.suffix,
        totalSize,
      );

    return {
      offset:
        totalSize -
        length,

      length,
    };
  }

  const offset =
    range.offset!;

  if (
    offset >=
    totalSize
  ) {
    throw new RangeError(
      "Sesh audio range starts beyond the stored object.",
    );
  }

  const remaining =
    totalSize -
    offset;

  return {
    offset,

    length:
      range.length ===
      undefined
        ? remaining
        : Math.min(
            range.length,
            remaining,
          ),
  };
}

export class R2SeshAudioObjectStore
implements SeshAudioObjectStore {
  constructor(
    private readonly bucket: SeshR2BucketLike,
  ) {}

  async putObject(
    reference: SeshStorageReference,
    bytes: Uint8Array,
  ): Promise<SeshPersistenceResult<SeshStorageReference>> {
    let validated: SeshStorageReference;

    try {
      validated = validateReference(reference);

      if (!(bytes instanceof Uint8Array)) {
        return failure(
          "validation",
          "Sesh audio object bytes must be a Uint8Array.",
        );
      }
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh R2 storage-reference validation failed.",
      );
    }

    try {
      await this.bucket.put(
        validated.key,
        new Uint8Array(bytes),
      );

      return success({ ...validated });
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh R2 object write failed.",
      );
    }
  }

  async getObject(
    reference: SeshStorageReference,
    range?: SeshAudioObjectReadRange,
  ): Promise<SeshPersistenceResult<SeshStoredAudioObjectRead>> {
    let validated:
      SeshStorageReference;

    let validatedRange:
      SeshAudioObjectReadRange | undefined;

    try {
      validated =
        validateReference(
          reference,
        );

      validatedRange =
        validateRange(
          range,
        );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh R2 read validation failed.",
      );
    }

    try {
      let resolvedRange:
        SeshResolvedAudioObjectRange | undefined;

      let totalSize:
        number | undefined;

      if (
        validatedRange !==
        undefined
      ) {
        const metadata =
          await this.bucket.head(
            validated.key,
          );

        if (
          metadata ===
          null
        ) {
          return failure(
            "not-found",
            `Sesh audio object not found: ${validated.key}`,
          );
        }

        if (
          !Number.isSafeInteger(
            metadata.size,
          ) ||
          metadata.size! <=
            0
        ) {
          return failure(
            "storage",
            "Sesh R2 object size is unavailable for ranged reads.",
          );
        }

        totalSize =
          metadata.size;

        try {
          resolvedRange =
            resolveRange(
              validatedRange,
              totalSize,
            );
        }
        catch (error) {
          return failure(
            "validation",
            error instanceof Error
              ? error.message
              : "Sesh R2 range validation failed.",
          );
        }
      }

      const object =
        await this.bucket.get(
          validated.key,
          resolvedRange ===
            undefined
            ? undefined
            : {
                range: {
                  offset:
                    resolvedRange.offset,

                  length:
                    resolvedRange.length,
                },
              },
        );

      if (
        object ===
        null
      ) {
        return failure(
          "not-found",
          `Sesh audio object not found: ${validated.key}`,
        );
      }

      const buffer =
        await object.arrayBuffer();

      const bytes =
        new Uint8Array(
          buffer.slice(0),
        );

      if (
        totalSize ===
        undefined
      ) {
        totalSize =
          Number.isSafeInteger(
            object.size,
          ) &&
          object.size! >=
            bytes.byteLength
            ? object.size
            : bytes.byteLength;
      }

      return success({
        reference:
          { ...validated },

        bytes,

        totalSize,

        range:
          resolvedRange ===
          undefined
            ? undefined
            : {
                ...resolvedRange,
              },
      });
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh R2 object read failed.",
      );
    }
  }
  async deleteObject(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>> {
    let validated: SeshStorageReference;

    try {
      validated = validateReference(reference);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh R2 storage-reference validation failed.",
      );
    }

    try {
      const existed = await this.objectExists(validated);

      if (!existed.ok) {
        return existed;
      }

      if (!existed.value) {
        return success(false);
      }

      await this.bucket.delete(validated.key);

      return success(true);
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh R2 object deletion failed.",
      );
    }
  }

  async objectExists(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>> {
    let validated: SeshStorageReference;

    try {
      validated = validateReference(reference);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Sesh R2 storage-reference validation failed.",
      );
    }

    try {
      const object = await this.bucket.head(validated.key);

      return success(object !== null);
    }
    catch (error) {
      return failure(
        "storage",
        error instanceof Error
          ? error.message
          : "Sesh R2 existence check failed.",
      );
    }
  }
}
