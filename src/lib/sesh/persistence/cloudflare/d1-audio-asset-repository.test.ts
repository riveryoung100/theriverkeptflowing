import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshMusicProjectId,
} from "../../identifiers";
import {
  D1SeshAudioAssetRepository,
} from "./d1-audio-asset-repository";
import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
} from "./types";

class FakeAudioD1
implements SeshD1DatabaseLike {
  readonly rows = new Map<string, Record<string, unknown>>();
  fail = false;

  prepare(sql: string): SeshD1PreparedStatementLike {
    const rows =
      this.rows;

    const shouldFail =
      () => this.fail;

    return new class implements SeshD1PreparedStatementLike {
      private values: readonly unknown[] = [];

      bind(...values: readonly unknown[]): SeshD1PreparedStatementLike {
        this.values = values;
        return this;
      }

      async first<T>(): Promise<T | null> {
        if (shouldFail()) {
          throw new Error("fake audio D1 failure");
        }

        return (
          rows.get(String(this.values[0])) ?? null
        ) as T | null;
      }

      async all<T>(): Promise<SeshD1AllResultLike<T>> {
        if (shouldFail()) {
          throw new Error("fake audio D1 failure");
        }

        const projectId = String(this.values[0]);

        const results = Array.from(rows.values())
          .filter(
            (row) => row.project_id === projectId,
          )
          .sort(
            (left, right) =>
              String(left.audio_asset_id).localeCompare(
                String(right.audio_asset_id),
              ),
          ) as T[];

        return { results };
      }

      async run(): Promise<{ readonly success: boolean }> {
        if (shouldFail()) {
          throw new Error("fake audio D1 failure");
        }

        if (sql.includes("INSERT INTO sesh_audio_assets")) {
          const [
            audioAssetId,
            projectId,
            schemaVersion,
            revision,
            storedAt,
            payloadJson,
          ] = this.values;

          rows.set(String(audioAssetId), {
            audio_asset_id: audioAssetId,
            project_id: projectId,
            schema_version: schemaVersion,
            revision,
            stored_at: storedAt,
            payload_json: payloadJson,
          });
        }
        else if (sql.includes("DELETE FROM sesh_audio_assets")) {
          rows.delete(String(this.values[0]));
        }

        return { success: true };
      }
    }();
  }
}

const timestamp = "2026-09-21T20:00:00.000Z";

test("D1 audio adapter stores, retrieves, and lists canonical metadata", async () => {
  const database = new FakeAudioD1();
  const repository =
    new D1SeshAudioAssetRepository(database);

  await repository.saveAudioAsset({
    id: "sesh-audio:one",
    projectId: "sesh-project:alpha",
    kind: "recording",
    name: "One",
    createdAt: timestamp,
  });

  await repository.saveAudioAsset({
    id: "sesh-audio:two",
    projectId: "sesh-project:alpha",
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

  const loaded = await repository.getAudioAsset(
    createSeshAudioAssetId("one"),
  );

  assert.equal(loaded.ok, true);

  if (!loaded.ok) {
    throw new Error("Expected audio asset.");
  }

  assert.equal(loaded.value.id, "sesh-audio:one");

  const listed = await repository.listAudioAssetsForProject(
    createSeshMusicProjectId("alpha"),
  );

  assert.equal(listed.ok, true);

  if (!listed.ok) {
    throw new Error("Expected audio listing.");
  }

  assert.deepEqual(
    listed.value.map((asset) => asset.id),
    ["sesh-audio:one", "sesh-audio:two"],
  );
});

test("D1 audio metadata deletion is metadata-only", async () => {
  const database = new FakeAudioD1();
  const repository =
    new D1SeshAudioAssetRepository(database);

  await repository.saveAudioAsset({
    id: "sesh-audio:one",
    projectId: "sesh-project:alpha",
    kind: "recording",
    name: "One",
    createdAt: timestamp,
    storageReference: {
      provider: "r2",
      key: "sesh/projects/alpha/audio/one/take.wav",
    },
  });

  const deleted =
    await repository.deleteAudioAssetMetadata(
      createSeshAudioAssetId("one"),
    );

  assert.deepEqual(deleted, {
    ok: true,
    value: true,
  });

  assert.equal(database.rows.size, 0);
});

test("D1 audio adapter maps provider failure to storage", async () => {
  const database = new FakeAudioD1();
  database.fail = true;

  const repository =
    new D1SeshAudioAssetRepository(database);

  const result = await repository.getAudioAsset(
    createSeshAudioAssetId("one"),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected storage failure.");
  }

  assert.equal(result.error.kind, "storage");
});

test("D1 audio adapter exposes revision-gated metadata update semantics", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      ({ readFile }) =>
        readFile(
          new URL(
            "./d1-audio-asset-repository.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /getAudioAssetSnapshot\s*\(/s,
  );

  assert.match(
    source,
    /updateAudioAssetConditionally\s*\(/s,
  );

  assert.match(
    source,
    /expectedRevision\s*\+\s*1/s,
  );

  assert.match(
    source,
    /WHERE[\s\S]*audio_asset_id\s*=\s*\?[\s\S]*project_id\s*=\s*\?[\s\S]*revision\s*=\s*\?/s,
  );

  assert.match(
    source,
    /Ordinary Sesh audio metadata updates cannot change immutable audio fields\./s,
  );

  assert.doesNotMatch(
    source,
    /\.putObject\s*\(/s,
  );

  assert.doesNotMatch(
    source,
    /\.deleteObject\s*\(/s,
  );
});