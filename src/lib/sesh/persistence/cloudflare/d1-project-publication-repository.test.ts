import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
} from "../../identifiers";

import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
  SeshD1RunResultLike,
} from "./types";

import {
  D1SeshProjectPublicationRepository,
} from "./d1-project-publication-repository";

class FakePublicationD1
implements SeshD1DatabaseLike {
  readonly rows =
    new Map<
      string,
      {
        project_id: string;
        owner_creator_id: string;
        state: string;
        updated_at: string;
      }
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
        readonly unknown[] =
          [];

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

        const projectId =
          String(
            this.values[0],
          );

        return (
          rows.get(
            projectId,
          ) ??
          null
        ) as T | null;
      }

      async all<T>():
      Promise<
        SeshD1AllResultLike<T>
      > {
        return {
          results: [],
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
            "INSERT INTO sesh_project_publication",
          )
        ) {
          const [
            projectId,
            ownerCreatorId,
            state,
            updatedAt,
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
              success: true,
              meta: {
                changes: 0,
              },
            };
          }

          rows.set(
            id,
            {
              project_id:
                id,
              owner_creator_id:
                String(
                  ownerCreatorId,
                ),
              state:
                String(
                  state,
                ),
              updated_at:
                String(
                  updatedAt,
                ),
            },
          );

          return {
            success: true,
            meta: {
              changes: 1,
            },
          };
        }

        if (
          sql.includes(
            "UPDATE sesh_project_publication",
          )
        ) {
          const [
            state,
            updatedAt,
            projectId,
            ownerCreatorId,
          ] =
            this.values;

          const id =
            String(
              projectId,
            );

          const existing =
            rows.get(
              id,
            );

          if (
            existing ===
              undefined ||
            existing.owner_creator_id !==
              String(
                ownerCreatorId,
              )
          ) {
            return {
              success: true,
              meta: {
                changes: 0,
              },
            };
          }

          rows.set(
            id,
            {
              ...existing,
              state:
                String(
                  state,
                ),
              updated_at:
                String(
                  updatedAt,
                ),
            },
          );

          return {
            success: true,
            meta: {
              changes: 1,
            },
          };
        }

        return {
          success: true,
          meta: {
            changes: 0,
          },
        };
      }
    }();
  }
}

const projectId =
  createSeshMusicProjectId(
    "publication-persistence-project",
  );

const ownerCreatorId =
  createSeshCreatorId(
    "publication-persistence-owner",
  );

const createdAt =
  "2026-09-23T13:00:00.000Z";

const updatedAt =
  "2026-09-23T13:05:00.000Z";

test(
  "creates and reloads an explicit private project publication record",
  async () => {
    const database =
      new FakePublicationD1();

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const saved =
      await repository.saveProjectPublication({
        projectId,
        ownerCreatorId,
        state:
          "private",
        updatedAt:
          createdAt,
      });

    assert.equal(
      saved.ok,
      true,
    );

    const loaded =
      await repository.getProjectPublication(
        projectId,
      );

    assert.equal(
      loaded.ok,
      true,
    );

    if (
      !loaded.ok
    ) {
      throw new Error(
        "Expected publication record.",
      );
    }

    assert.equal(
      loaded.value.state,
      "private",
    );

    assert.equal(
      loaded.value.ownerCreatorId,
      ownerCreatorId,
    );
  },
);

test(
  "absence returns explicit not-found and never implies public",
  async () => {
    const repository =
      new D1SeshProjectPublicationRepository(
        new FakePublicationD1(),
      );

    const result =
      await repository.getProjectPublication(
        projectId,
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
  "duplicate creation conflicts instead of silently changing state",
  async () => {
    const repository =
      new D1SeshProjectPublicationRepository(
        new FakePublicationD1(),
      );

    await repository.saveProjectPublication({
      projectId,
      ownerCreatorId,
      state:
        "private",
      updatedAt:
        createdAt,
    });

    const second =
      await repository.saveProjectPublication({
        projectId,
        ownerCreatorId,
        state:
          "public",
      updatedAt,
    });

    assert.equal(
      second.ok,
      false,
    );

    if (
      second.ok
    ) {
      throw new Error(
        "Expected conflict.",
      );
    }

    assert.equal(
      second.error.kind,
      "conflict",
    );
  },
);

test(
  "updates private to public without changing owner identity",
  async () => {
    const repository =
      new D1SeshProjectPublicationRepository(
        new FakePublicationD1(),
      );

    await repository.saveProjectPublication({
      projectId,
      ownerCreatorId,
      state:
        "private",
      updatedAt:
        createdAt,
    });

    const updated =
      await repository.updateProjectPublication({
        projectId,
        ownerCreatorId,
        state:
          "public",
        updatedAt,
      });

    assert.equal(
      updated.ok,
      true,
    );

    if (
      !updated.ok
    ) {
      throw new Error(
        "Expected update.",
      );
    }

    assert.equal(
      updated.value.state,
      "public",
    );

    assert.equal(
      updated.value.ownerCreatorId,
      ownerCreatorId,
    );
  },
);

test(
  "rejects owner reassignment during publication update",
  async () => {
    const database =
      new FakePublicationD1();

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    await repository.saveProjectPublication({
      projectId,
      ownerCreatorId,
      state:
        "private",
      updatedAt:
        createdAt,
    });

    const otherCreatorId =
      createSeshCreatorId(
        "other-publication-owner",
      );

    const result =
      await repository.updateProjectPublication({
        projectId,
        ownerCreatorId:
          otherCreatorId,
        state:
          "public",
        updatedAt,
      });

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected conflict.",
      );
    }

    assert.equal(
      result.error.kind,
      "conflict",
    );

    assert.equal(
      database.rows.get(
        projectId,
      )?.owner_creator_id,
      ownerCreatorId,
    );
  },
);

test(
  "rejects unsupported publication state before persistence",
  async () => {
    const database =
      new FakePublicationD1();

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const result =
      await repository.saveProjectPublication({
        projectId,
        ownerCreatorId,
        state:
          "published",
        updatedAt:
          createdAt,
      });

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected validation failure.",
      );
    }

    assert.equal(
      result.error.kind,
      "validation",
    );

    assert.equal(
      database.rows.size,
      0,
    );
  },
);

test(
  "rejects malformed persisted publication rows",
  async () => {
    const database =
      new FakePublicationD1();

    database.rows.set(
      projectId,
      {
        project_id:
          projectId,
        owner_creator_id:
          ownerCreatorId,
        state:
          "published",
        updated_at:
          createdAt,
      },
    );

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const result =
      await repository.getProjectPublication(
        projectId,
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected validation failure.",
      );
    }

    assert.equal(
      result.error.kind,
      "validation",
    );
  },
);

test(
  "maps D1 failures to storage",
  async () => {
    const database =
      new FakePublicationD1();

    database.fail =
      true;

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const result =
      await repository.getProjectPublication(
        projectId,
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