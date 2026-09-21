import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshMusicProjectId,
} from "../../identifiers";
import {
  D1SeshProjectRepository,
} from "./d1-project-repository";
import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
} from "./types";

class FakeProjectD1
implements SeshD1DatabaseLike {
  readonly rows = new Map<string, Record<string, unknown>>();
  fail = false;

  prepare(sql: string): SeshD1PreparedStatementLike {
    const database = this;

    return new class implements SeshD1PreparedStatementLike {
      private values: readonly unknown[] = [];

      bind(...values: readonly unknown[]): SeshD1PreparedStatementLike {
        this.values = values;
        return this;
      }

      async first<T>(): Promise<T | null> {
        if (database.fail) {
          throw new Error("fake D1 failure");
        }

        const id = String(this.values[0]);

        if (sql.includes("SELECT project_id FROM")) {
          const row = database.rows.get(id);

          return (
            row === undefined
              ? null
              : { project_id: id }
          ) as T | null;
        }

        return (
          database.rows.get(id) ?? null
        ) as T | null;
      }

      async all<T>(): Promise<SeshD1AllResultLike<T>> {
        return { results: [] };
      }

      async run(): Promise<{ readonly success: boolean }> {
        if (database.fail) {
          throw new Error("fake D1 failure");
        }

        if (sql.includes("INSERT INTO sesh_projects")) {
          const [
            projectId,
            schemaVersion,
            revision,
            storedAt,
            payloadJson,
          ] = this.values;

          database.rows.set(String(projectId), {
            project_id: projectId,
            schema_version: schemaVersion,
            revision,
            stored_at: storedAt,
            payload_json: payloadJson,
          });
        }
        else if (sql.includes("DELETE FROM sesh_projects")) {
          database.rows.delete(String(this.values[0]));
        }

        return { success: true };
      }
    }();
  }
}

const timestamp = "2026-09-21T20:00:00.000Z";

test("D1 project adapter validates, stores, and reloads canonical projects", async () => {
  const database = new FakeProjectD1();
  const repository =
    new D1SeshProjectRepository(database);

  const invalid = await repository.saveProject({
    id: "sesh-project:bad",
    ownerCreatorId: "wrong:creator",
    title: "Bad",
    createdAt: timestamp,
    updatedAt: timestamp,
    trackIds: [],
    sessionIds: [],
    audioAssetIds: [],
  });

  assert.equal(invalid.ok, false);

  if (!invalid.ok) {
    assert.equal(invalid.error.kind, "validation");
  }

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
    throw new Error("Expected project.");
  }

  assert.equal(loaded.value.id, "sesh-project:one");
  assert.equal(loaded.value.ownerCreatorId, "sesh-creator:river");
});

test("D1 project adapter maps missing rows to not-found", async () => {
  const repository =
    new D1SeshProjectRepository(new FakeProjectD1());

  const result = await repository.getProject(
    createSeshMusicProjectId("missing"),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected not-found.");
  }

  assert.equal(result.error.kind, "not-found");
});

test("D1 project adapter maps provider failures to storage failures", async () => {
  const database = new FakeProjectD1();
  database.fail = true;

  const repository =
    new D1SeshProjectRepository(database);

  const result = await repository.getProject(
    createSeshMusicProjectId("one"),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected storage failure.");
  }

  assert.equal(result.error.kind, "storage");
});
