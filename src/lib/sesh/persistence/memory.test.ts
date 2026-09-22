import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshMusicProjectId,
} from "../identifiers";
import {
  InMemorySeshAudioAssetRepository,
  InMemorySeshAudioObjectStore,
  InMemorySeshProjectRepository,
} from "./memory";

const timestamp = "2026-09-21T20:00:00.000Z";

test("stores and retrieves a project", async () => {
  const repository =
    new InMemorySeshProjectRepository();

  const saved = await repository.saveProject({
    id: "sesh-project:one",
    ownerCreatorId: "sesh-creator:river",
    title: "One",
    createdAt: timestamp,
    updatedAt: timestamp,
    trackIds: [],
    sessionIds: [],
    audioAssetIds: [],
  });

  assert.equal(saved.ok, true);

  const loaded = await repository.getProject(
    createSeshMusicProjectId("one"),
  );

  assert.equal(loaded.ok, true);

  if (!loaded.ok) {
    throw new Error("Expected project to exist.");
  }

  assert.equal(loaded.value.title, "One");
});

test("returns explicit not-found behavior for missing projects", async () => {
  const repository =
    new InMemorySeshProjectRepository();

  const result = await repository.getProject(
    createSeshMusicProjectId("missing"),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected not-found result.");
  }

  assert.equal(result.error.kind, "not-found");
});

test("distinguishes validation failure from not-found", async () => {
  const repository =
    new InMemorySeshProjectRepository();

  const invalidSave = await repository.saveProject({
    id: "sesh-project:bad",
    ownerCreatorId: "wrong:creator",
    title: "Bad",
    createdAt: timestamp,
    updatedAt: timestamp,
    trackIds: [],
    sessionIds: [],
    audioAssetIds: [],
  });

  assert.equal(invalidSave.ok, false);

  if (invalidSave.ok) {
    throw new Error("Expected validation failure.");
  }

  assert.equal(invalidSave.error.kind, "validation");

  const missing = await repository.getProject(
    createSeshMusicProjectId("missing"),
  );

  assert.equal(missing.ok, false);

  if (missing.ok) {
    throw new Error("Expected not-found failure.");
  }

  assert.equal(missing.error.kind, "not-found");
});

test("stores and retrieves audio metadata", async () => {
  const repository =
    new InMemorySeshAudioAssetRepository();

  const saved = await repository.saveAudioAsset({
    id: "sesh-audio:one",
    projectId: "sesh-project:one",
    kind: "recording",
    name: "One",
    createdAt: timestamp,
  });

  assert.equal(saved.ok, true);

  const loaded = await repository.getAudioAsset(
    createSeshAudioAssetId("one"),
  );

  assert.equal(loaded.ok, true);

  if (!loaded.ok) {
    throw new Error("Expected audio asset.");
  }

  assert.equal(loaded.value.projectId, "sesh-project:one");
});

test("lists audio assets by project", async () => {
  const repository =
    new InMemorySeshAudioAssetRepository();

  await repository.saveAudioAsset({
    id: "sesh-audio:one",
    projectId: "sesh-project:one",
    kind: "recording",
    name: "One",
    createdAt: timestamp,
  });

  await repository.saveAudioAsset({
    id: "sesh-audio:two",
    projectId: "sesh-project:one",
    kind: "stem",
    name: "Two",
    createdAt: timestamp,
  });

  await repository.saveAudioAsset({
    id: "sesh-audio:other",
    projectId: "sesh-project:other",
    kind: "sample",
    name: "Other",
    createdAt: timestamp,
  });

  const result = await repository.listAudioAssetsForProject(
    createSeshMusicProjectId("one"),
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected audio listing.");
  }

  assert.deepEqual(
    result.value.map((asset) => asset.id).sort(),
    ["sesh-audio:one", "sesh-audio:two"],
  );
});

test("metadata deletion remains separate from binary-object deletion", async () => {
  const metadataRepository =
    new InMemorySeshAudioAssetRepository();
  const objectStore =
    new InMemorySeshAudioObjectStore();

  const reference = {
    provider: "memory",
    key: "take-one.wav",
  };

  await metadataRepository.saveAudioAsset({
    id: "sesh-audio:one",
    projectId: "sesh-project:one",
    kind: "recording",
    name: "One",
    createdAt: timestamp,
    storageReference: reference,
  });

  await objectStore.putObject(
    reference,
    new Uint8Array([1, 2, 3]),
  );

  const deletedMetadata =
    await metadataRepository.deleteAudioAssetMetadata(
      createSeshAudioAssetId("one"),
    );

  assert.equal(deletedMetadata.ok, true);

  const objectStillExists =
    await objectStore.objectExists(reference);

  assert.deepEqual(objectStillExists, {
    ok: true,
    value: true,
  });
});

test("stores and retrieves binary audio bytes", async () => {
  const store = new InMemorySeshAudioObjectStore();

  const reference = {
    provider: "memory",
    key: "audio.wav",
  };

  const sourceBytes = new Uint8Array([10, 20, 30]);

  const saved = await store.putObject(
    reference,
    sourceBytes,
  );

  assert.equal(saved.ok, true);

  sourceBytes[0] = 99;

  const loaded = await store.getObject(reference);

  assert.equal(loaded.ok, true);

  if (!loaded.ok) {
    throw new Error("Expected audio object.");
  }

  assert.deepEqual(
    Array.from(loaded.value.bytes),
    [10, 20, 30],
  );

  loaded.value.bytes[1] = 88;

  const loadedAgain = await store.getObject(reference);

  assert.equal(loadedAgain.ok, true);

  if (!loadedAgain.ok) {
    throw new Error("Expected audio object.");
  }

  assert.deepEqual(
    Array.from(loadedAgain.value.bytes),
    [10, 20, 30],
  );
});

test("conditional project updates enforce revision and immutable ownership", async () => {
  const repository =
    new InMemorySeshProjectRepository();

  const created =
    await repository.saveProject({
      id: "sesh-project:conditional",
      ownerCreatorId: "sesh-creator:river",
      title: "Original",
      createdAt: timestamp,
      updatedAt: timestamp,
      trackIds: [],
      sessionIds: [],
      audioAssetIds: [],
    });

  assert.equal(created.ok, true);

  const snapshot =
    await repository.getProjectSnapshot(
      createSeshMusicProjectId("conditional"),
    );

  assert.equal(snapshot.ok, true);

  if (!snapshot.ok) {
    throw new Error("Expected project snapshot.");
  }

  assert.equal(snapshot.value.revision, 0);

  const updated =
    await repository.updateProjectConditionally(
      {
        ...snapshot.value.project,
        title: "Updated",
      },
      snapshot.value.revision,
      "sesh-creator:river",
    );

  assert.equal(updated.ok, true);

  if (!updated.ok) {
    throw new Error("Expected conditional update.");
  }

  assert.equal(updated.value.revision, 1);
  assert.equal(updated.value.project.title, "Updated");

  const stale =
    await repository.updateProjectConditionally(
      {
        ...updated.value.project,
        title: "Stale",
      },
      0,
      "sesh-creator:river",
    );

  assert.equal(stale.ok, false);

  if (!stale.ok) {
    assert.equal(stale.error.kind, "conflict");
  }

  const reassignment =
    await repository.updateProjectConditionally(
      {
        ...updated.value.project,
        ownerCreatorId: "sesh-creator:other",
      },
      1,
      "sesh-creator:river",
    );

  assert.equal(reassignment.ok, false);

  if (!reassignment.ok) {
    assert.equal(reassignment.error.kind, "conflict");
  }
});

test("project save is create-only and rejects duplicate ids", async () => {
  const repository =
    new InMemorySeshProjectRepository();

  const first =
    await repository.saveProject({
      id: "sesh-project:create-only",
      ownerCreatorId: "sesh-creator:river",
      title: "One",
      createdAt: timestamp,
      updatedAt: timestamp,
      trackIds: [],
      sessionIds: [],
      audioAssetIds: [],
    });

  assert.equal(first.ok, true);

  const second =
    await repository.saveProject({
      id: "sesh-project:create-only",
      ownerCreatorId: "sesh-creator:other",
      title: "Two",
      createdAt: timestamp,
      updatedAt: timestamp,
      trackIds: [],
      sessionIds: [],
      audioAssetIds: [],
    });

  assert.equal(second.ok, false);

  if (!second.ok) {
    assert.equal(second.error.kind, "conflict");
  }
});

test("conditional project deletion rejects stale revision", async () => {
  const repository =
    new InMemorySeshProjectRepository();

  await repository.saveProject({
    id: "sesh-project:delete-cas",
    ownerCreatorId: "sesh-creator:river",
    title: "Delete",
    createdAt: timestamp,
    updatedAt: timestamp,
    trackIds: [],
    sessionIds: [],
    audioAssetIds: [],
  });

  const stale =
    await repository.deleteProjectConditionally(
      createSeshMusicProjectId("delete-cas"),
      1,
      "sesh-creator:river",
    );

  assert.equal(stale.ok, false);

  if (!stale.ok) {
    assert.equal(stale.error.kind, "conflict");
  }

  const deleted =
    await repository.deleteProjectConditionally(
      createSeshMusicProjectId("delete-cas"),
      0,
      "sesh-creator:river",
    );

  assert.deepEqual(deleted, {
    ok: true,
    value: true,
  });
});
