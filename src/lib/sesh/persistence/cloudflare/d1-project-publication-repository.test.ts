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
        if (
          shouldFail()
        ) {
          throw new Error(
            "fake D1 failure",
          );
        }

        if (
          sql.includes(
            "FROM sesh_project_publication",
          ) &&
          sql.includes(
            "state = 'public'",
          ) &&
          sql.includes(
            "LIMIT ?",
          ) &&
          !sql.includes(
            "owner_creator_id = ?",
          )
        ) {
          const limit =
            Number(
              this.values[0],
            );

          const matching =
            Array.from(
              rows.values(),
            )
              .filter(
                (row) =>
                  row.state ===
                    "public",
              )
              .sort(
                (left, right) => {
                  const updated =
                    right.updated_at.localeCompare(
                      left.updated_at,
                    );

                  if (
                    updated !==
                      0
                  ) {
                    return updated;
                  }

                  return left.project_id.localeCompare(
                    right.project_id,
                  );
                },
              )
              .slice(
                0,
                limit,
              );

          return {
            results:
              matching as T[],
          };
        }

        if (
          sql.includes(
            "FROM sesh_project_publication",
          ) &&
          sql.includes(
            "owner_creator_id = ?",
          ) &&
          sql.includes(
            "state = 'public'",
          )
        ) {
          const ownerCreatorId =
            String(
              this.values[0],
            );

          const matching =
            Array.from(
              rows.values(),
            )
              .filter(
                (row) =>
                  row.owner_creator_id ===
                    ownerCreatorId &&
                  row.state ===
                    "public",
              )
              .sort(
                (left, right) => {
                  const updated =
                    right.updated_at.localeCompare(
                      left.updated_at,
                    );

                  if (
                    updated !==
                      0
                  ) {
                    return updated;
                  }

                  return left.project_id.localeCompare(
                    right.project_id,
                  );
                },
              );

          return {
            results:
              matching as T[],
          };
        }

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
test(
  "lists only explicit-public publication records for one canonical owner",
  async () => {
    const database =
      new FakePublicationD1();

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const secondProjectId =
      createSeshMusicProjectId(
        "publication-second-project",
      );

    const otherOwner =
      createSeshCreatorId(
        "publication-other-owner",
      );

    await repository.saveProjectPublication({
      projectId,
      ownerCreatorId,
      state:
        "public",
      updatedAt:
        "2026-09-23T13:05:00.000Z",
    });

    await repository.saveProjectPublication({
      projectId:
        secondProjectId,
      ownerCreatorId,
      state:
        "private",
      updatedAt:
        "2026-09-23T13:10:00.000Z",
    });

    await repository.saveProjectPublication({
      projectId:
        createSeshMusicProjectId(
          "publication-other-project",
        ),
      ownerCreatorId:
        otherOwner,
      state:
        "public",
      updatedAt:
        "2026-09-23T13:15:00.000Z",
    });

    const result =
      await repository
        .listPublicProjectPublicationsForOwner(
          ownerCreatorId,
        );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected public publication collection.",
      );
    }

    assert.deepEqual(
      result.value.map(
        (record) =>
          record.projectId,
      ),
      [
        projectId,
      ],
    );

    assert.equal(
      result.value[0]?.state,
      "public",
    );

    assert.equal(
      result.value[0]?.ownerCreatorId,
      ownerCreatorId,
    );
  },
);

test(
  "orders public publication collection by publication update descending then project id ascending",
  async () => {
    const database =
      new FakePublicationD1();

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const earlier =
      createSeshMusicProjectId(
        "publication-earlier",
      );

    const laterB =
      createSeshMusicProjectId(
        "publication-later-b",
      );

    const laterA =
      createSeshMusicProjectId(
        "publication-later-a",
      );

    for (
      const record of [
        {
          projectId:
            earlier,
          ownerCreatorId,
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T13:00:00.000Z",
        },
        {
          projectId:
            laterB,
          ownerCreatorId,
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T14:00:00.000Z",
        },
        {
          projectId:
            laterA,
          ownerCreatorId,
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T14:00:00.000Z",
        },
      ]
    ) {
      await repository
        .saveProjectPublication(
          record,
        );
    }

    const result =
      await repository
        .listPublicProjectPublicationsForOwner(
          ownerCreatorId,
        );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected ordered public collection.",
      );
    }

    assert.deepEqual(
      result.value.map(
        (record) =>
          record.projectId,
      ),
      [
        laterA,
        laterB,
        earlier,
      ],
    );
  },
);

test(
  "public publication collection maps D1 failure to storage",
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
      await repository
        .listPublicProjectPublicationsForOwner(
          ownerCreatorId,
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
test(
  "lists only globally explicit-public publications with deterministic ordering and a hard result bound",
  async () => {
    const database =
      new FakePublicationD1();

    const repository =
      new D1SeshProjectPublicationRepository(
        database,
      );

    const firstOwner =
      createSeshCreatorId(
        "global-public-owner-a",
      );

    const secondOwner =
      createSeshCreatorId(
        "global-public-owner-b",
      );

    const privateProject =
      createSeshMusicProjectId(
        "global-private-project",
      );

    const earlier =
      createSeshMusicProjectId(
        "global-public-earlier",
      );

    const laterB =
      createSeshMusicProjectId(
        "global-public-later-b",
      );

    const laterA =
      createSeshMusicProjectId(
        "global-public-later-a",
      );

    for (
      const record of [
        {
          projectId:
            privateProject,
          ownerCreatorId:
            firstOwner,
          state:
            "private" as const,
          updatedAt:
            "2026-09-23T15:00:00.000Z",
        },
        {
          projectId:
            earlier,
          ownerCreatorId:
            firstOwner,
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T13:00:00.000Z",
        },
        {
          projectId:
            laterB,
          ownerCreatorId:
            secondOwner,
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T14:00:00.000Z",
        },
        {
          projectId:
            laterA,
          ownerCreatorId:
            firstOwner,
          state:
            "public" as const,
          updatedAt:
            "2026-09-23T14:00:00.000Z",
        },
      ]
    ) {
      const saved =
        await repository
          .saveProjectPublication(
            record,
          );

      assert.equal(
        saved.ok,
        true,
      );
    }

    const result =
      await repository
        .listPublicProjectPublications(
          2,
        );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      throw new Error(
        "Expected bounded global public publication collection.",
      );
    }

    assert.deepEqual(
      result.value.map(
        (record) =>
          record.projectId,
      ),
      [
        laterA,
        laterB,
      ],
    );

    assert.equal(
      result.value.length,
      2,
    );

    for (
      const record of result.value
    ) {
      assert.equal(
        record.state,
        "public",
      );
    }

    assert.equal(
      result.value.some(
        (record) =>
          record.projectId ===
            privateProject,
      ),
      false,
    );

    assert.deepEqual(
      new Set(
        result.value.map(
          (record) =>
            record.ownerCreatorId,
        ),
      ),
      new Set([
        firstOwner,
        secondOwner,
      ]),
    );
  },
);

test(
  "global public publication read rejects invalid limits before D1 execution",
  async () => {
    for (
      const limit of [
        0,
        -1,
        1.5,
        51,
        Number.NaN,
        Number.POSITIVE_INFINITY,
      ]
    ) {
      const database =
        new FakePublicationD1();

      database.fail =
        true;

      const repository =
        new D1SeshProjectPublicationRepository(
          database,
        );

      const result =
        await repository
          .listPublicProjectPublications(
            limit,
          );

      assert.equal(
        result.ok,
        false,
      );

      if (
        result.ok
      ) {
        throw new Error(
          "Expected global discovery limit validation failure.",
        );
      }

      assert.equal(
        result.error.kind,
        "validation",
      );
    }
  },
);

test(
  "global public publication read maps D1 failure to storage",
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
      await repository
        .listPublicProjectPublications(
          20,
        );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      throw new Error(
        "Expected global public publication storage failure.",
      );
    }

    assert.equal(
      result.error.kind,
      "storage",
    );
  },
);