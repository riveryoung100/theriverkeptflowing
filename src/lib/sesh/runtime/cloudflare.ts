import {
  createSeshCloudflarePersistence,
  type SeshCloudflarePersistenceComposition,
} from "../persistence/cloudflare/composition";
import type {
  SeshD1DatabaseLike,
  SeshR2BucketLike,
} from "../persistence/cloudflare/types";

export interface SeshRuntimeEnvironment {
  readonly SESH_DB?: unknown;
  readonly SESH_AUDIO?: unknown;
}

function requireSeshD1Database(
  value: unknown,
): SeshD1DatabaseLike {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { prepare?: unknown }).prepare !== "function"
  ) {
    throw new TypeError(
      "SESH_DB is unavailable or does not satisfy the Sesh D1 database contract.",
    );
  }

  return value as SeshD1DatabaseLike;
}

function requireSeshR2Bucket(
  value: unknown,
): SeshR2BucketLike {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { put?: unknown }).put !== "function" ||
    typeof (value as { get?: unknown }).get !== "function" ||
    typeof (value as { delete?: unknown }).delete !== "function" ||
    typeof (value as { head?: unknown }).head !== "function"
  ) {
    throw new TypeError(
      "SESH_AUDIO is unavailable or does not satisfy the Sesh R2 bucket contract.",
    );
  }

  return value as SeshR2BucketLike;
}

export function createSeshRuntimePersistence(
  runtimeEnvironment: SeshRuntimeEnvironment,
): SeshCloudflarePersistenceComposition {
  if (
    typeof runtimeEnvironment !== "object" ||
    runtimeEnvironment === null
  ) {
    throw new TypeError(
      "Sesh runtime environment is required.",
    );
  }

  const database =
    requireSeshD1Database(
      runtimeEnvironment.SESH_DB,
    );

  const audioBucket =
    requireSeshR2Bucket(
      runtimeEnvironment.SESH_AUDIO,
    );

  return createSeshCloudflarePersistence({
    SESH_DB:
      database,

    SESH_AUDIO:
      audioBucket,
  });
}
