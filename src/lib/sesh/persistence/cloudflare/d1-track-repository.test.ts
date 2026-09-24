import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshMusicProjectId,
  createSeshTrackId,
} from "../../identifiers";

import type {
  SeshTrack,
} from "../../model";

import type {
  SeshD1AllResultLike,
  SeshD1DatabaseLike,
  SeshD1PreparedStatementLike,
  SeshD1RunResultLike,
} from "./types";

import {
  D1SeshTrackRepository,
} from "./d1-track-repository";

interface StoredRow {
  track_id: string;
  project_id: string;
  schema_version: number;
  revision: number | null;
  stored_at: string;
  payload_json: string;
}

class FakeStatement
implements SeshD1PreparedStatementLike {
  readonly #database:
    FakeDatabase;

  readonly #sql:
    string;

  #values:
    readonly unknown[] =
      [];

  constructor(
    database:
      FakeDatabase,

    sql:
      string,
  ) {
    this.#database =
      database;

    this.#sql =
      sql;
  }

  bind(
    ...values:
      readonly unknown[]
  ): SeshD1PreparedStatementLike {
    this.#values =
      values;

    return this;
  }

  async first<T = Record<string, unknown>>():
    Promise<T | null> {
    return this.#database.first(
      this.#sql,
      this.#values,
    ) as Promise<T | null>;
  }

  async all<T = Record<string, unknown>>():
    Promise<SeshD1AllResultLike<T>> {
    return this.#database.all(
      this.#sql,
      this.#values,
    ) as Promise<
      SeshD1AllResultLike<T>
    >;
  }

  async run():
    Promise<SeshD1RunResultLike> {
    return this.#database.run(
      this.#sql,
      this.#values,
    );
  }
}

class FakeDatabase
implements SeshD1DatabaseLike {
  readonly rows =
    new Map<
      string,
      StoredRow
    >();

  fail =
    false;

  prepare(
    sql:
      string,
  ): SeshD1PreparedStatementLike {
    if (
      this.fail
    ) {
      throw new Error(
        "simulated D1 failure",
      );
    }

    return new FakeStatement(
      this,
      sql,
    );
  }

  async first(
    sql:
      string,

    values:
      readonly unknown[],
  ): Promise<
    StoredRow | null
  > {
    if (
      this.fail
    ) {
      throw new Error(
        "simulated D1 failure",
      );
    }

    if (
      sql.includes(
        "FROM sesh_tracks",
      ) &&
      sql.includes(
        "WHERE track_id = ?",
      )
    ) {
      const id =
        String(
          values[0],
        );

      return (
        this.rows.get(
          id,
        ) ??
        null
      );
    }

    throw new Error(
      `Unexpected fake first SQL: ${sql}`,
    );
  }

  async all(
    sql:
      string,

    values:
      readonly unknown[],
  ): Promise<
    SeshD1AllResultLike<
      StoredRow
    >
  > {
    if (
      this.fail
    ) {
      throw new Error(
        "simulated D1 failure",
      );
    }

    if (
      sql.includes(
        "FROM sesh_tracks",
      ) &&
      sql.includes(
        "WHERE project_id = ?",
      )
    ) {
      const projectId =
        String(
          values[0],
        );

      return {
        results:
          Array.from(
            this.rows.values(),
          )
            .filter(
              (
                row,
              ) =>
                row.project_id ===
                projectId,
            )
            .sort(
              (
                left,
                right,
              ) =>
                left.track_id.localeCompare(
                  right.track_id,
                ),
            ),
      };
    }

    throw new Error(
      `Unexpected fake all SQL: ${sql}`,
    );
  }

  async run(
    sql:
      string,

    values:
      readonly unknown[],
  ): Promise<
    SeshD1RunResultLike
  > {
    if (
      this.fail
    ) {
      throw new Error(
        "simulated D1 failure",
      );
    }

    if (
      sql.includes(
        "INSERT INTO sesh_tracks",
      )
    ) {
      const id =
        String(
          values[0],
        );

      if (
        this.rows.has(
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

      this.rows.set(
        id,
        {
          track_id:
            id,

          project_id:
            String(
              values[1],
            ),

          schema_version:
            Number(
              values[2],
            ),

          revision:
            values[3] ===
            null
              ? null
              : Number(
                  values[3],
                ),

          stored_at:
            String(
              values[4],
            ),

          payload_json:
            String(
              values[5],
            ),
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
        "UPDATE sesh_tracks",
      )
    ) {
      const id =
        String(
          values[4],
        );

      const projectId =
        String(
          values[5],
        );

      const expectedRevision =
        Number(
          values[6],
        );

      const current =
        this.rows.get(
          id,
        );

      const currentRevision =
        current?.revision ===
        null
          ? 0
          : current?.revision;

      if (
        current ===
          undefined ||
        current.project_id !==
          projectId ||
        currentRevision !==
          expectedRevision
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

      this.rows.set(
        id,
        {
          ...current,

          schema_version:
            Number(
              values[0],
            ),

          revision:
            Number(
              values[1],
            ),

          stored_at:
            String(
              values[2],
            ),

          payload_json:
            String(
              values[3],
            ),
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
        "DELETE FROM sesh_tracks",
      )
    ) {
      const id =
        String(
          values[0],
        );

      const changed =
        this.rows.delete(
          id,
        );

      return {
        success:
          true,

        meta: {
          changes:
            changed
              ? 1
              : 0,
        },
      };
    }

    throw new Error(
      `Unexpected fake run SQL: ${sql}`,
    );
  }
}

function canonicalTrack(
  overrides:
    Partial<SeshTrack> =
      {},
): SeshTrack {
  const projectId =
    overrides.projectId ??
    createSeshMusicProjectId(
      "d1-track-project",
    );

  return {
    id:
      overrides.id ??
      createSeshTrackId(
        "d1-track-one",
      ),

    projectId,

    name:
      overrides.name ??
      "Vocal",

    order:
      overrides.order ??
      0,

    audioAssetIds:
      overrides.audioAssetIds ??
      [
        createSeshAudioAssetId(
          "d1-take-one",
        ),
      ],

    muted:
      overrides.muted,

    solo:
      overrides.solo,

    gain:
      overrides.gain,
  };
}

test(
  "D1 track repository creates revision zero and reloads canonical snapshots",
  async () => {
    const database =
      new FakeDatabase();

    const repository =
      new D1SeshTrackRepository(
        database,
      );

    const track =
      canonicalTrack();

    const saved =
      await repository.saveTrack(
        track,
      );

    assert.equal(
      saved.ok,
      true,
    );

    const snapshot =
      await repository.getTrackSnapshot(
        track.id,
      );

    assert.equal(
      snapshot.ok,
      true,
    );

    if (
      !snapshot.ok
    ) {
      return;
    }

    assert.equal(
      snapshot.value.revision,
      0,
    );

    assert.deepEqual(
      snapshot.value.track,
      track,
    );
  },
);

test(
  "D1 track repository makes saveTrack create-only",
  async () => {
    const repository =
      new D1SeshTrackRepository(
        new FakeDatabase(),
      );

    const track =
      canonicalTrack();

    assert.equal(
      (
        await repository.saveTrack(
          track,
        )
      ).ok,
      true,
    );

    const duplicate =
      await repository.saveTrack(
        track,
      );

    assert.equal(
      duplicate.ok,
      false,
    );

    if (
      duplicate.ok
    ) {
      return;
    }

    assert.equal(
      duplicate.error.kind,
      "conflict",
    );
  },
);

test(
  "D1 track repository lists one project in canonical track order",
  async () => {
    const repository =
      new D1SeshTrackRepository(
        new FakeDatabase(),
      );

    const projectId =
      createSeshMusicProjectId(
        "list-project",
      );

    const second =
      canonicalTrack({
        id:
          createSeshTrackId(
            "list-b",
          ),

        projectId,

        order:
          2,

        name:
          "Second",

        audioAssetIds:
          [],
      });

    const first =
      canonicalTrack({
        id:
          createSeshTrackId(
            "list-a",
          ),

        projectId,

        order:
          0,

        name:
          "First",

        audioAssetIds:
          [],
      });

    const other =
      canonicalTrack({
        id:
          createSeshTrackId(
            "list-other",
          ),

        projectId:
          createSeshMusicProjectId(
            "other-project",
          ),

        order:
          0,

        audioAssetIds:
          [],
      });

    await repository.saveTrack(
      second,
    );

    await repository.saveTrack(
      first,
    );

    await repository.saveTrack(
      other,
    );

    const result =
      await repository.listTracksForProject(
        projectId,
      );

    assert.equal(
      result.ok,
      true,
    );

    if (
      !result.ok
    ) {
      return;
    }

    assert.deepEqual(
      result.value.map(
        (
          item,
        ) =>
          item.id,
      ),
      [
        first.id,
        second.id,
      ],
    );
  },
);

test(
  "D1 conditional track update increments revision and rejects stale writes",
  async () => {
    const repository =
      new D1SeshTrackRepository(
        new FakeDatabase(),
      );

    const track =
      canonicalTrack();

    await repository.saveTrack(
      track,
    );

    const updated =
      await repository.updateTrackConditionally(
        {
          ...track,

          name:
            "Lead Vocal",

          muted:
            true,

          gain:
            0.5,
        },
        0,
      );

    assert.equal(
      updated.ok,
      true,
    );

    if (
      !updated.ok
    ) {
      return;
    }

    assert.equal(
      updated.value.revision,
      1,
    );

    assert.equal(
      updated.value.track.name,
      "Lead Vocal",
    );

    const stale =
      await repository.updateTrackConditionally(
        {
          ...track,

          name:
            "Stale",
        },
        0,
      );

    assert.equal(
      stale.ok,
      false,
    );

    if (
      stale.ok
    ) {
      return;
    }

    assert.equal(
      stale.error.kind,
      "conflict",
    );
  },
);

test(
  "D1 conditional track update rejects project reassignment",
  async () => {
    const repository =
      new D1SeshTrackRepository(
        new FakeDatabase(),
      );

    const track =
      canonicalTrack();

    await repository.saveTrack(
      track,
    );

    const moved =
      await repository.updateTrackConditionally(
        {
          ...track,

          projectId:
            createSeshMusicProjectId(
              "wrong-project",
            ),
        },
        0,
      );

    assert.equal(
      moved.ok,
      false,
    );

    if (
      moved.ok
    ) {
      return;
    }

    assert.equal(
      moved.error.kind,
      "conflict",
    );
  },
);

test(
  "D1 track deletion is metadata-only",
  async () => {
    const repository =
      new D1SeshTrackRepository(
        new FakeDatabase(),
      );

    const track =
      canonicalTrack();

    await repository.saveTrack(
      track,
    );

    const deleted =
      await repository.deleteTrack(
        track.id,
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

    const missing =
      await repository.getTrack(
        track.id,
      );

    assert.equal(
      missing.ok,
      false,
    );

    if (
      missing.ok
    ) {
      return;
    }

    assert.equal(
      missing.error.kind,
      "not-found",
    );
  },
);

test(
  "D1 track repository maps provider failures to storage",
  async () => {
    const database =
      new FakeDatabase();

    database.fail =
      true;

    const repository =
      new D1SeshTrackRepository(
        database,
      );

    const result =
      await repository.getTrack(
        createSeshTrackId(
          "provider-failure",
        ),
      );

    assert.equal(
      result.ok,
      false,
    );

    if (
      result.ok
    ) {
      return;
    }

    assert.equal(
      result.error.kind,
      "storage",
    );
  },
);