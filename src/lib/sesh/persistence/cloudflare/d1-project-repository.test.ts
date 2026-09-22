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
  SeshD1RunResultLike,
} from "./types";

class FakeProjectD1
implements SeshD1DatabaseLike {
  readonly rows =
    new Map<
      string,
      Record<string, unknown>
    >();

  fail =
    false;

  prepare(
    sql: string,
  ): SeshD1PreparedStatementLike {
    const rows =
      this.rows;

    const shouldFail =
      () => this.fail;

    return new class
    implements SeshD1PreparedStatementLike {
      private values:
        readonly unknown[] = [];

      bind(
        ...values:
          readonly unknown[]
      ): SeshD1PreparedStatementLike {
        this.values =
          values;

        return this;
      }

      async first<T>():
      Promise<T | null> {
        if (
          shouldFail()
        ) {
          throw new Error(
            "fake D1 failure",
          );
        }

        const id =
          String(
            this.values[0],
          );

        if (
          sql.includes(
            "SELECT project_id FROM",
          )
        ) {
          const row =
            rows.get(
              id,
            );

          return (
            row ===
            undefined
              ? null
              : {
                  project_id:
                    id,
                }
          ) as T | null;
        }

        return (
          rows.get(
            id,
          ) ??
          null
        ) as T | null;
      }

      async all<T>():
      Promise<
        SeshD1AllResultLike<T>
      > {
        return {
          results:
            [],
        };
      }

      async run():
      Promise<SeshD1RunResultLike> {
        if (
          shouldFail()
        ) {
          throw new Error(
            "fake D1 failure",
          );
        }

        if (
          sql.includes(
            "INSERT INTO sesh_projects",
          )
        ) {
          const [
            projectId,
            schemaVersion,
            revision,
            storedAt,
            payloadJson,
          ] =
            this.values;

          const id =
            String(
              projectId,
            );

          if (
            rows.has(
              id,
            )
          ) {
            return {
              success:
                true,

              meta: {
                changes:
                  0,
              },
            };
          }

          rows.set(
            id,
            {
              project_id:
                projectId,
              schema_version:
                schemaVersion,
              revision,
              stored_at:
                storedAt,
              payload_json:
                payloadJson,
            },
          );

          return {
            success:
              true,

            meta: {
              changes:
                1,
            },
          };
        }

        if (
          sql.includes(
            "UPDATE sesh_projects",
          )
        ) {
          const [
            schemaVersion,
            nextRevision,
            storedAt,
            payloadJson,
            projectId,
            expectedRevision,
          ] =
            this.values;

          const id =
            String(
              projectId,
            );

          const current =
            rows.get(
              id,
            );

          const currentRevision =
            current?.revision ===
              null ||
            current?.revision ===
              undefined
              ? 0
              : Number(
                  current.revision,
                );

          if (
            current ===
              undefined ||
            currentRevision !==
              Number(
                expectedRevision,
              )
          ) {
            return {
              success:
                true,

              meta: {
                changes:
                  0,
              },
            };
          }

          rows.set(
            id,
            {
              project_id:
                projectId,
              schema_version:
                schemaVersion,
              revision:
                nextRevision,
              stored_at:
                storedAt,
              payload_json:
                payloadJson,
            },
          );

          return {
            success:
              true,

            meta: {
              changes:
                1,
            },
          };
        }

        if (
          sql.includes(
            "DELETE FROM sesh_projects",
          )
        ) {
          const [
            projectId,
            expectedRevision,
          ] =
            this.values;

          const id =
            String(
              projectId,
            );

          const current =
            rows.get(
              id,
            );

          const currentRevision =
            current?.revision ===
              null ||
            current?.revision ===
              undefined
              ? 0
              : Number(
                  current.revision,
                );

          if (
            current ===
              undefined ||
            currentRevision !==
              Number(
                expectedRevision,
              )
          ) {
            return {
              success:
                true,

              meta: {
                changes:
                  0,
              },
            };
          }

          rows.delete(
            id,
          );

          return {
            success:
              true,

            meta: {
              changes:
                1,
            },
          };
        }

        return {
          success:
            true,

          meta: {
            changes:
              0,
          },
        };
      }
    }();
  }
}

const timestamp =
  "2026-09-21T20:00:00.000Z";

test(
  "D1 project adapter creates revision zero and reloads canonical snapshots",
  async () => {
    const database =
      new FakeProjectD1();

    const repository =
      new D1SeshProjectRepository(
        database,
      );

    const saved =
      await repository.saveProject({
        id:
          "sesh-project:one",
        ownerCreatorId:
          "sesh-creator:river",
        title:
          "One",
        createdAt:
          timestamp,
        updatedAt:
          timestamp,
        trackIds:
          [],
        sessionIds:
          [],
        audioAssetIds:
          [],
      });

    assert.equal(
      saved.ok,
      true,
    );

    const snapshot =
      await repository.getProjectSnapshot(
        createSeshMusicProjectId(
          "one",
        ),
      );

    assert.equal(
      snapshot.ok,
      true,
    );

    if (
      !snapshot.ok
    ) {
      throw new Error(
        "Expected project snapshot.",
      );
    }

    assert.equal(
      snapshot.value.revision,
      0,
    );

    assert.equal(
      snapshot.value.project.ownerCreatorId,
      "sesh-creator:river",
    );
  },
);

test(
  "D1 project adapter makes saveProject create-only",
  async () => {
    const repository =
      new D1SeshProjectRepository(
        new FakeProjectD1(),
      );

    const project = {
      id:
        "sesh-project:duplicate",
      ownerCreatorId:
        "sesh-creator:river",
      title:
        "One",
      createdAt:
        timestamp,
      updatedAt:
        timestamp,
      trackIds:
        [],
      sessionIds:
        [],
      audioAssetIds:
        [],
    };

    const first =
      await repository.saveProject(
        project,
      );

    const second =
      await repository.saveProject({
        ...project,
        ownerCreatorId:
          "sesh-creator:other",
      });

    assert.equal(
      first.ok,
      true,
    );

    assert.equal(
      second.ok,
      false,
    );

    if (
      !second.ok
    ) {
      assert.equal(
        second.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "D1 conditional update increments revision and rejects stale writes and owner reassignment",
  async () => {
    const repository =
      new D1SeshProjectRepository(
        new FakeProjectD1(),
      );

    await repository.saveProject({
      id:
        "sesh-project:cas",
      ownerCreatorId:
        "sesh-creator:river",
      title:
        "Original",
      createdAt:
        timestamp,
      updatedAt:
        timestamp,
      trackIds:
        [],
      sessionIds:
        [],
      audioAssetIds:
        [],
    });

    const updated =
      await repository.updateProjectConditionally(
        {
          id:
            "sesh-project:cas",
          ownerCreatorId:
            "sesh-creator:river",
          title:
            "Updated",
          createdAt:
            timestamp,
          updatedAt:
            timestamp,
          trackIds:
            [],
          sessionIds:
            [],
          audioAssetIds:
            [],
        },
        0,
        "sesh-creator:river",
      );

    assert.equal(
      updated.ok,
      true,
    );

    if (
      !updated.ok
    ) {
      throw new Error(
        "Expected conditional update.",
      );
    }

    assert.equal(
      updated.value.revision,
      1,
    );

    const stale =
      await repository.updateProjectConditionally(
        updated.value.project,
        0,
        "sesh-creator:river",
      );

    assert.equal(
      stale.ok,
      false,
    );

    if (
      !stale.ok
    ) {
      assert.equal(
        stale.error.kind,
        "conflict",
      );
    }

    const reassigned =
      await repository.updateProjectConditionally(
        {
          ...updated.value.project,
          ownerCreatorId:
            "sesh-creator:other",
        },
        1,
        "sesh-creator:river",
      );

    assert.equal(
      reassigned.ok,
      false,
    );

    if (
      !reassigned.ok
    ) {
      assert.equal(
        reassigned.error.kind,
        "conflict",
      );
    }
  },
);

test(
  "D1 conditional deletion rejects stale revision",
  async () => {
    const repository =
      new D1SeshProjectRepository(
        new FakeProjectD1(),
      );

    await repository.saveProject({
      id:
        "sesh-project:delete",
      ownerCreatorId:
        "sesh-creator:river",
      title:
        "Delete",
      createdAt:
        timestamp,
      updatedAt:
        timestamp,
      trackIds:
        [],
      sessionIds:
        [],
      audioAssetIds:
        [],
    });

    const stale =
      await repository.deleteProjectConditionally(
        createSeshMusicProjectId(
          "delete",
        ),
        1,
        "sesh-creator:river",
      );

    assert.equal(
      stale.ok,
      false,
    );

    if (
      !stale.ok
    ) {
      assert.equal(
        stale.error.kind,
        "conflict",
      );
    }

    const deleted =
      await repository.deleteProjectConditionally(
        createSeshMusicProjectId(
          "delete",
        ),
        0,
        "sesh-creator:river",
      );

    assert.deepEqual(
      deleted,
      {
        ok:
          true,
        value:
          true,
      },
    );
  },
);

test(
  "D1 project adapter maps missing rows to not-found",
  async () => {
    const repository =
      new D1SeshProjectRepository(
        new FakeProjectD1(),
      );

    const result =
      await repository.getProject(
        createSeshMusicProjectId(
          "missing",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected not-found.",
      );
    }

    assert.equal(
      result.error.kind,
      "not-found",
    );
  },
);

test(
  "D1 project adapter maps provider failures to storage failures",
  async () => {
    const database =
      new FakeProjectD1();

    database.fail =
      true;

    const repository =
      new D1SeshProjectRepository(
        database,
      );

    const result =
      await repository.getProject(
        createSeshMusicProjectId(
          "one",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected storage failure.",
      );
    }

    assert.equal(
      result.error.kind,
      "storage",
    );
  },
);
