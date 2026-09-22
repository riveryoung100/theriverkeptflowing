import {
  parseSeshAudioAssetId,
  parseSeshMusicProjectId,
  type SeshAudioAssetId,
  type SeshMusicProjectId,
} from "../identifiers";
import type {
  SeshAudioAsset,
  SeshMusicProject,
  SeshStorageReference,
} from "../model";
import {
  validateSeshAudioAsset,
  validateSeshMusicProject,
} from "../validation";
import type {
  SeshPersistenceResult,
  SeshProjectPersistenceSnapshot,
  SeshStoredAudioObject,
} from "./model";
import type {
  SeshAudioAssetRepository,
  SeshAudioObjectStore,
  SeshProjectRepository,
} from "./repositories";

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

function cloneProject(
  project: SeshMusicProject,
): SeshMusicProject {
  return validateSeshMusicProject(
    JSON.parse(JSON.stringify(project)),
  );
}

function cloneAudioAsset(
  asset: SeshAudioAsset,
): SeshAudioAsset {
  return validateSeshAudioAsset(
    JSON.parse(JSON.stringify(asset)),
  );
}

function storageReferenceKey(
  reference: SeshStorageReference,
): string {
  return [
    reference.provider,
    reference.bucket ?? "",
    reference.key,
    reference.versionId ?? "",
  ].join("::");
}

function validateStorageReference(
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

  if (
    reference.bucket !== undefined &&
    (
      typeof reference.bucket !== "string" ||
      reference.bucket.trim().length === 0
    )
  ) {
    throw new TypeError(
      "SeshStorageReference.bucket must be non-empty when provided.",
    );
  }

  if (
    reference.versionId !== undefined &&
    (
      typeof reference.versionId !== "string" ||
      reference.versionId.trim().length === 0
    )
  ) {
    throw new TypeError(
      "SeshStorageReference.versionId must be non-empty when provided.",
    );
  }

  return {
    provider: reference.provider,
    key: reference.key,
    bucket: reference.bucket,
    versionId: reference.versionId,
  };
}

export class InMemorySeshProjectRepository
implements SeshProjectRepository {
  private readonly projects =
    new Map<
      SeshMusicProjectId,
      {
        readonly project:
          SeshMusicProject;
        readonly revision:
          number;
      }
    >();

  async saveProject(
    project: unknown,
  ): Promise<SeshPersistenceResult<SeshMusicProject>> {
    try {
      const validated =
        validateSeshMusicProject(
          project,
        );

      if (
        this.projects.has(
          validated.id,
        )
      ) {
        return failure(
          "conflict",
          "Sesh project already exists.",
        );
      }

      const cloned =
        cloneProject(
          validated,
        );

      this.projects.set(
        cloned.id,
        {
          project:
            cloned,
          revision:
            0,
        },
      );

      return success(
        cloneProject(
          cloned,
        ),
      );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Project validation failed.",
      );
    }
  }

  async getProjectSnapshot(
    projectId: SeshMusicProjectId,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPersistenceSnapshot
    >
  > {
    try {
      const canonicalId =
        parseSeshMusicProjectId(
          projectId,
        );

      const stored =
        this.projects.get(
          canonicalId,
        );

      if (
        stored ===
        undefined
      ) {
        return failure(
          "not-found",
          `Sesh project not found: ${canonicalId}`,
        );
      }

      return success({
        project:
          cloneProject(
            stored.project,
          ),

        revision:
          stored.revision,
      });
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Project identifier validation failed.",
      );
    }
  }

  async getProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<SeshMusicProject>> {
    const snapshot =
      await this.getProjectSnapshot(
        projectId,
      );

    if (
      !snapshot.ok
    ) {
      return snapshot;
    }

    return success(
      snapshot.value.project,
    );
  }

  async updateProjectConditionally(
    project: unknown,
    expectedRevision: number,
    expectedOwnerCreatorId: string,
  ): Promise<
    SeshPersistenceResult<
      SeshProjectPersistenceSnapshot
    >
  > {
    try {
      const validated =
        validateSeshMusicProject(
          project,
        );

      if (
        !Number.isInteger(
          expectedRevision,
        ) ||
        expectedRevision < 0
      ) {
        return failure(
          "validation",
          "Expected Sesh project revision must be a non-negative integer.",
        );
      }

      const current =
        this.projects.get(
          validated.id,
        );

      if (
        current ===
        undefined
      ) {
        return failure(
          "not-found",
          `Sesh project not found: ${validated.id}`,
        );
      }

      if (
        current.revision !==
          expectedRevision ||
        current.project.ownerCreatorId !==
          expectedOwnerCreatorId
      ) {
        return failure(
          "conflict",
          "Sesh project changed before conditional update.",
        );
      }

      if (
        validated.ownerCreatorId !==
          expectedOwnerCreatorId
      ) {
        return failure(
          "conflict",
          "Ordinary Sesh project updates cannot reassign ownerCreatorId.",
        );
      }

      const cloned =
        cloneProject(
          validated,
        );

      const revision =
        expectedRevision +
        1;

      this.projects.set(
        cloned.id,
        {
          project:
            cloned,
          revision,
        },
      );

      return success({
        project:
          cloneProject(
            cloned,
          ),

        revision,
      });
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Conditional project update validation failed.",
      );
    }
  }

  async deleteProjectConditionally(
    projectId: SeshMusicProjectId,
    expectedRevision: number,
    expectedOwnerCreatorId: string,
  ): Promise<SeshPersistenceResult<boolean>> {
    try {
      const canonicalId =
        parseSeshMusicProjectId(
          projectId,
        );

      if (
        !Number.isInteger(
          expectedRevision,
        ) ||
        expectedRevision < 0
      ) {
        return failure(
          "validation",
          "Expected Sesh project revision must be a non-negative integer.",
        );
      }

      const current =
        this.projects.get(
          canonicalId,
        );

      if (
        current ===
        undefined
      ) {
        return failure(
          "not-found",
          `Sesh project not found: ${canonicalId}`,
        );
      }

      if (
        current.revision !==
          expectedRevision ||
        current.project.ownerCreatorId !==
          expectedOwnerCreatorId
      ) {
        return failure(
          "conflict",
          "Sesh project changed before conditional deletion.",
        );
      }

      return success(
        this.projects.delete(
          canonicalId,
        ),
      );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Conditional project deletion validation failed.",
      );
    }
  }

  async deleteProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<boolean>> {
    const snapshot =
      await this.getProjectSnapshot(
        projectId,
      );

    if (
      !snapshot.ok
    ) {
      if (
        snapshot.error.kind ===
        "not-found"
      ) {
        return success(
          false,
        );
      }

      return snapshot;
    }

    return this.deleteProjectConditionally(
      projectId,
      snapshot.value.revision,
      snapshot.value.project.ownerCreatorId,
    );
  }

  async projectExists(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<boolean>> {
    try {
      const canonicalId =
        parseSeshMusicProjectId(
          projectId,
        );

      return success(
        this.projects.has(
          canonicalId,
        ),
      );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Project identifier validation failed.",
      );
    }
  }
}

export class InMemorySeshAudioAssetRepository
implements SeshAudioAssetRepository {
  private readonly assets =
    new Map<SeshAudioAssetId, SeshAudioAsset>();

  async saveAudioAsset(
    asset: unknown,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>> {
    try {
      const validated = validateSeshAudioAsset(asset);
      const cloned = cloneAudioAsset(validated);

      this.assets.set(cloned.id, cloned);

      return success(cloneAudioAsset(cloned));
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Audio asset validation failed.",
      );
    }
  }

  async getAudioAsset(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<SeshAudioAsset>> {
    try {
      const canonicalId = parseSeshAudioAssetId(assetId);
      const asset = this.assets.get(canonicalId);

      if (asset === undefined) {
        return failure(
          "not-found",
          `Sesh audio asset not found: ${canonicalId}`,
        );
      }

      return success(cloneAudioAsset(asset));
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Audio asset identifier validation failed.",
      );
    }
  }

  async listAudioAssetsForProject(
    projectId: SeshMusicProjectId,
  ): Promise<SeshPersistenceResult<readonly SeshAudioAsset[]>> {
    try {
      const canonicalProjectId =
        parseSeshMusicProjectId(projectId);

      const matching = Array.from(this.assets.values())
        .filter(
          (asset) => asset.projectId === canonicalProjectId,
        )
        .map(cloneAudioAsset);

      return success(matching);
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Project identifier validation failed.",
      );
    }
  }

  async deleteAudioAssetMetadata(
    assetId: SeshAudioAssetId,
  ): Promise<SeshPersistenceResult<boolean>> {
    try {
      const canonicalId = parseSeshAudioAssetId(assetId);

      return success(this.assets.delete(canonicalId));
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Audio asset identifier validation failed.",
      );
    }
  }
}

export class InMemorySeshAudioObjectStore
implements SeshAudioObjectStore {
  private readonly objects =
    new Map<string, SeshStoredAudioObject>();

  async putObject(
    reference: SeshStorageReference,
    bytes: Uint8Array,
  ): Promise<SeshPersistenceResult<SeshStorageReference>> {
    try {
      const validatedReference =
        validateStorageReference(reference);

      if (!(bytes instanceof Uint8Array)) {
        return failure(
          "validation",
          "Sesh audio object bytes must be a Uint8Array.",
        );
      }

      const stored: SeshStoredAudioObject = {
        reference: { ...validatedReference },
        bytes: new Uint8Array(bytes),
      };

      this.objects.set(
        storageReferenceKey(validatedReference),
        stored,
      );

      return success({ ...validatedReference });
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Storage reference validation failed.",
      );
    }
  }

  async getObject(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<SeshStoredAudioObject>> {
    try {
      const validatedReference =
        validateStorageReference(reference);

      const stored = this.objects.get(
        storageReferenceKey(validatedReference),
      );

      if (stored === undefined) {
        return failure(
          "not-found",
          `Sesh audio object not found: ${validatedReference.key}`,
        );
      }

      return success({
        reference: { ...stored.reference },
        bytes: new Uint8Array(stored.bytes),
      });
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Storage reference validation failed.",
      );
    }
  }

  async deleteObject(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>> {
    try {
      const validatedReference =
        validateStorageReference(reference);

      return success(
        this.objects.delete(
          storageReferenceKey(validatedReference),
        ),
      );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Storage reference validation failed.",
      );
    }
  }

  async objectExists(
    reference: SeshStorageReference,
  ): Promise<SeshPersistenceResult<boolean>> {
    try {
      const validatedReference =
        validateStorageReference(reference);

      return success(
        this.objects.has(
          storageReferenceKey(validatedReference),
        ),
      );
    }
    catch (error) {
      return failure(
        "validation",
        error instanceof Error
          ? error.message
          : "Storage reference validation failed.",
      );
    }
  }
}
