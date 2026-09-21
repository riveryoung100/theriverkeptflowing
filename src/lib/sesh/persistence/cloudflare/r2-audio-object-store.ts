import type {
  SeshStorageReference,
} from "../../model";
import type {
  SeshPersistenceResult,
  SeshStoredAudioObject,
} from "../model";
import type {
  SeshAudioObjectStore,
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
  ): Promise<SeshPersistenceResult<SeshStoredAudioObject>> {
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
      const object = await this.bucket.get(validated.key);

      if (object === null) {
        return failure(
          "not-found",
          `Sesh audio object not found: ${validated.key}`,
        );
      }

      const buffer = await object.arrayBuffer();

      return success({
        reference: { ...validated },
        bytes: new Uint8Array(buffer.slice(0)),
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
