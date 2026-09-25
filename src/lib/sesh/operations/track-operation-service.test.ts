import assert from "node:assert/strict";
import test from "node:test";

import type {
  SeshProjectOwnershipAuthorizer,
} from "../authorization/project-ownership-authorizer";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
  createSeshTrackId,
} from "../identifiers";

import type {
  SeshMusicProjectId,
} from "../identifiers";

import {
  InMemorySeshProjectRepository,
} from "../persistence/memory";

import {
  InMemorySeshTrackRepository,
} from "../persistence/track-repository";

import {
  DefaultAuthorizedSeshTrackOperationService,
} from "./track-operation-service";

const ownerCreatorId =
  createSeshCreatorId(
    "track-owner",
  );

const projectId =
  createSeshMusicProjectId(
    "track-project",
  );

const createdAt =
  "2026-09-25T13:00:00.000Z";

const updatedAt =
  "2026-09-25T13:01:00.000Z";

function ownerAuthorizer(
  actions:
    string[] =
      [],
): SeshProjectOwnershipAuthorizer {
  return {
    async authorize(
      requestedProjectId,
      action,
    ) {
      actions.push(
        action,
      );

      return {
        ok:
          true,

        value: {
          principalId:
            "principal:track-test" as never,

          seshCreatorId:
            ownerCreatorId,

          projectId:
            requestedProjectId,

          action,
        },
      };
    },
  };
}

function forbiddenAuthorizer():
  SeshProjectOwnershipAuthorizer {
  return {
    async authorize() {
      return {
        ok:
          false,

        error: {
          code:
            "forbidden",

          message:
            "forbidden",
        },
      };
    },
  };
}

async function setupProject(
  trackIds:
    readonly string[] =
      [],
) {
  const projects =
    new InMemorySeshProjectRepository();

  const saved =
    await projects.saveProject({
      id:
        projectId,

      ownerCreatorId,

      title:
        "Track Test Project",

      createdAt,

      updatedAt:
        createdAt,

      trackIds,

      sessionIds:
        [],

      audioAssetIds:
        [],
    });

  assert.equal(
    saved.ok,
    true,
  );

  return projects;
}

test(
  "creates a track only after write authorization and attaches it through project CAS",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    const actions:
      string[] =
        [];

    const trackId =
      createSeshTrackId(
        "created-track",
      );

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(
            actions,
          ),

        projects,

        tracks,

        createTrackId:
          () =>
            trackId,

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.createTrack(
        projectId,
        {
          name:
            "Lead Vocal",
        },
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

    assert.equal(
      result.value.id,
      trackId,
    );

    assert.equal(
      result.value.projectId,
      projectId,
    );

    assert.equal(
      result.value.name,
      "Lead Vocal",
    );

    assert.equal(
      result.value.order,
      0,
    );

    assert.deepEqual(
      result.value.audioAssetIds,
      [],
    );

    assert.deepEqual(
      actions,
      [
        "write",
      ],
    );

    const projectSnapshot =
      await projects.getProjectSnapshot(
        projectId,
      );

    assert.equal(
      projectSnapshot.ok,
      true,
    );

    if (
      !projectSnapshot.ok
    ) {
      return;
    }

    assert.deepEqual(
      projectSnapshot.value.project.trackIds,
      [
        trackId,
      ],
    );
  },
);

test(
  "read requires project membership and never treats project-scoped orphan metadata as attached",
  async () => {
    const attachedId =
      createSeshTrackId(
        "attached",
      );

    const orphanId =
      createSeshTrackId(
        "orphan",
      );

    const projects =
      await setupProject([
        attachedId,
      ]);

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        attachedId,

      projectId,

      name:
        "Attached",

      order:
        0,

      audioAssetIds:
        [],
    });

    await tracks.saveTrack({
      id:
        orphanId,

      projectId,

      name:
        "Orphan",

      order:
        1,

      audioAssetIds:
        [],
    });

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        createTrackId:
          () =>
            createSeshTrackId(
              "unused",
            ),

        now:
          () =>
            updatedAt,
      });

    const attached =
      await service.readTrack(
        projectId,
        attachedId,
      );

    assert.equal(
      attached.ok,
      true,
    );

    const orphan =
      await service.readTrack(
        projectId,
        orphanId,
      );

    assert.equal(
      orphan.ok,
      false,
    );

    if (
      orphan.ok
    ) {
      return;
    }

    assert.equal(
      orphan.error.code,
      "not-found",
    );
  },
);

test(
  "list returns only canonical project-attached tracks in track order",
  async () => {
    const firstId =
      createSeshTrackId(
        "first",
      );

    const secondId =
      createSeshTrackId(
        "second",
      );

    const orphanId =
      createSeshTrackId(
        "orphan-list",
      );

    const projects =
      await setupProject([
        firstId,
        secondId,
      ]);

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        firstId,

      projectId,

      name:
        "First",

      order:
        2,

      audioAssetIds:
        [],
    });

    await tracks.saveTrack({
      id:
        secondId,

      projectId,

      name:
        "Second",

      order:
        0,

      audioAssetIds:
        [],
    });

    await tracks.saveTrack({
      id:
        orphanId,

      projectId,

      name:
        "Orphan",

      order:
        1,

      audioAssetIds:
        [],
    });

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        createTrackId:
          () =>
            createSeshTrackId(
              "unused-list",
            ),

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.listTracks(
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
          track,
        ) =>
          track.id,
      ),
      [
        secondId,
        firstId,
      ],
    );
  },
);

test(
  "updates only permitted track metadata while preserving id projectId and audioAssetIds",
  async () => {
    const trackId =
      createSeshTrackId(
        "update-track",
      );

    const projects =
      await setupProject([
        trackId,
      ]);

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Original",

      order:
        0,

      audioAssetIds:
        [],
    });

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        createTrackId:
          () =>
            createSeshTrackId(
              "unused-update",
            ),

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.updateTrack(
        projectId,
        trackId,
        {
          name:
            "Lead",

          order:
            3,

          muted:
            true,

          solo:
            false,

          gain:
            0.75,
        },
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

    assert.equal(
      result.value.id,
      trackId,
    );

    assert.equal(
      result.value.projectId,
      projectId,
    );

    assert.deepEqual(
      result.value.audioAssetIds,
      [],
    );

    assert.equal(
      result.value.name,
      "Lead",
    );

    assert.equal(
      result.value.order,
      3,
    );

    assert.equal(
      result.value.muted,
      true,
    );

    assert.equal(
      result.value.solo,
      false,
    );

    assert.equal(
      result.value.gain,
      0.75,
    );
  },
);

test(
  "rejects immutable or unknown update fields before track persistence mutation",
  async () => {
    const trackId =
      createSeshTrackId(
        "immutable-track",
      );

    const projects =
      await setupProject([
        trackId,
      ]);

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Original",

      order:
        0,

      audioAssetIds:
        [],
    });

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        createTrackId:
          () =>
            createSeshTrackId(
              "unused-immutable",
            ),

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.updateTrack(
        projectId,
        trackId,
        {
          projectId:
            createSeshMusicProjectId(
              "other",
            ),
        },
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
      result.error.code,
      "invalid-input",
    );

    const stored =
      await tracks.getTrack(
        trackId,
      );

    assert.equal(
      stored.ok,
      true,
    );

    if (
      !stored.ok
    ) {
      return;
    }

    assert.equal(
      stored.value.projectId,
      projectId,
    );
  },
);

test(
  "authorization failure prevents track creation",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    const trackId =
      createSeshTrackId(
        "denied-track",
      );

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          forbiddenAuthorizer(),

        projects,

        tracks,

        createTrackId:
          () =>
            trackId,

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.createTrack(
        projectId,
        {
          name:
            "Denied",
        },
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
      result.error.code,
      "forbidden",
    );

    const stored =
      await tracks.getTrack(
        trackId,
      );

    assert.equal(
      stored.ok,
      false,
    );
  },
);

test(
  "project attachment conflict compensates newly created track metadata",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    const trackId =
      createSeshTrackId(
        "compensated-track",
      );

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(),

        projects: {
          getProjectSnapshot:
            projects.getProjectSnapshot.bind(
              projects,
            ),

          async updateProjectConditionally() {
            return {
              ok:
                false as const,

              error: {
                kind:
                  "conflict" as const,

                message:
                  "simulated project conflict",
              },
            };
          },
        },

        tracks,

        createTrackId:
          () =>
            trackId,

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.createTrack(
        projectId,
        {
          name:
            "Compensated",
        },
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
      result.error.code,
      "conflict",
    );

    const stored =
      await tracks.getTrack(
        trackId,
      );

    assert.equal(
      stored.ok,
      false,
    );
  },
);

test(
  "track deletion is intentionally absent until revision-gated delete exists",
  async () => {
    const projects =
      await setupProject();

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks:
          new InMemorySeshTrackRepository(),

        createTrackId:
          () =>
            createSeshTrackId(
              "delete-boundary",
            ),

        now:
          () =>
            updatedAt,
      });

    assert.equal(
      "deleteTrack" in service,
      false,
    );
  },
);

test(
  "invalid project input fails before authorization",
  async () => {
    const actions:
      string[] =
        [];

    const projects =
      await setupProject();

    const service =
      new DefaultAuthorizedSeshTrackOperationService({
        authorizer:
          ownerAuthorizer(
            actions,
          ),

        projects,

        tracks:
          new InMemorySeshTrackRepository(),

        createTrackId:
          () =>
            createSeshTrackId(
              "invalid-project",
            ),

        now:
          () =>
            updatedAt,
      });

    const result =
      await service.listTracks(
        "wrong:project" as unknown as SeshMusicProjectId,
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.deepEqual(
      actions,
      [],
    );
  },
);