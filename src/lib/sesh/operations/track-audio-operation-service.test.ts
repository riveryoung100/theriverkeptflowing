import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeshAudioAssetId,
  createSeshCreatorId,
  createSeshMusicProjectId,
  createSeshTrackId,
} from "../identifiers";

import type {
  SeshAudioAsset,
} from "../model";

import {
  InMemorySeshProjectRepository,
} from "../persistence";

import {
  InMemorySeshTrackRepository,
} from "../persistence/track-repository";

import {
  DefaultAuthorizedSeshTrackAudioOperationService,
} from "./track-audio-operation-service";

const projectId =
  createSeshMusicProjectId(
    "track-audio-project",
  );

const creatorId =
  createSeshCreatorId(
    "track-audio-owner",
  );

const trackId =
  createSeshTrackId(
    "track-audio-track",
  );

const audioAssetId =
  createSeshAudioAssetId(
    "track-audio-asset",
  );

const otherAudioAssetId =
  createSeshAudioAssetId(
    "other-track-audio-asset",
  );

function ownerAuthorizer(
  actions:
    string[] = [],
) {
  return {
    async authorize(
      requestedProjectId:
        unknown,

      access:
        unknown,
    ) {
      assert.equal(
        requestedProjectId,
        projectId,
      );

      assert.equal(
        access,
        "write",
      );

      actions.push(
        "write",
      );

      return {
        ok:
          true as const,

        value: {
          seshCreatorId:
            creatorId,
        },
      };
    },
  };
}

function forbiddenAuthorizer() {
  return {
    async authorize() {
      return {
        ok:
          false as const,

        error: {
          code:
            "forbidden" as const,

          message:
            "Forbidden.",
        },
      };
    },
  };
}

async function setupProject(
  trackIds = [
    trackId,
  ],

  audioIds = [
    audioAssetId,
  ],
) {
  const projects =
    new InMemorySeshProjectRepository();

  const saved =
    await projects.saveProject({
      id:
        projectId,

      ownerCreatorId:
        creatorId,

      title:
        "Track Audio Project",

      createdAt:
        "2026-09-25T18:00:00.000Z",

      updatedAt:
        "2026-09-25T18:00:00.000Z",

      trackIds,

      sessionIds:
        [],

      audioAssetIds:
        audioIds,
    });

  assert.equal(
    saved.ok,
    true,
  );

  return projects;
}

function audioAsset(
  id =
    audioAssetId,

  targetProjectId =
    projectId,
): SeshAudioAsset {
  return {
    id,

    projectId:
      targetProjectId,

    kind:
      "recording",

    name:
      "Take",

    createdAt:
      "2026-09-25T18:00:00.000Z",

    contentType:
      "audio/wav",
  };
}

function audioRepository(
  asset:
    SeshAudioAsset = audioAsset(),
) {
  return {
    async getAudioAsset(
      requestedId:
        unknown,
    ) {
      assert.equal(
        requestedId,
        asset.id,
      );

      return {
        ok:
          true as const,

        value:
          asset,
      };
    },
  };
}

test(
  "attaches project-owned audio to an attached track through track CAS only",
  async () => {
    const actions:
      string[] =
        [];

    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      muted:
        true,

      solo:
        false,

      gain:
        0.75,

      audioAssetIds:
        [],
    });

    const projectBefore =
      await projects.getProjectSnapshot(
        projectId,
      );

    assert.equal(
      projectBefore.ok,
      true,
    );

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(
            actions,
          ),

        projects,

        tracks,

        audioAssets:
          audioRepository(),
      });

    const result =
      await service.attachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
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
      result.value.audioAssetIds,
      [
        audioAssetId,
      ],
    );

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
      "Lead",
    );

    assert.equal(
      result.value.order,
      0,
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

    assert.deepEqual(
      actions,
      [
        "write",
      ],
    );

    const projectAfter =
      await projects.getProjectSnapshot(
        projectId,
      );

    assert.deepEqual(
      projectAfter,
      projectBefore,
    );
  },
);

test(
  "duplicate attach is idempotent and performs no conditional track write",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      audioAssetIds: [
        audioAssetId,
      ],
    });

    let writes =
      0;

    const originalUpdate =
      tracks.updateTrackConditionally.bind(
        tracks,
      );

    tracks.updateTrackConditionally =
      async (
        track,
        revision,
      ) => {
        writes +=
          1;

        return originalUpdate(
          track,
          revision,
        );
      };

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        audioAssets:
          audioRepository(),
      });

    const result =
      await service.attachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      writes,
      0,
    );
  },
);

test(
  "attach rejects audio that is absent from the canonical project inventory before audio metadata read",
  async () => {
    const projects =
      await setupProject(
        [
          trackId,
        ],
        [],
      );

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      audioAssetIds:
        [],
    });

    let audioRead =
      false;

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        audioAssets: {
          async getAudioAsset() {
            audioRead =
              true;

            throw new Error(
              "audio metadata must not be read",
            );
          },
        },
      });

    const result =
      await service.attachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
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
      "not-found",
    );

    assert.equal(
      audioRead,
      false,
    );
  },
);

test(
  "attach fails closed when canonical audio metadata belongs to another project",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      audioAssetIds:
        [],
    });

    const otherProjectId =
      createSeshMusicProjectId(
        "other-audio-project",
      );

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        audioAssets:
          audioRepository(
            audioAsset(
              audioAssetId,
              otherProjectId,
            ),
          ),
      });

    const result =
      await service.attachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
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
      "unavailable",
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

    assert.deepEqual(
      stored.value.audioAssetIds,
      [],
    );
  },
);

test(
  "detach removes only the requested track audio reference through track CAS",
  async () => {
    const projects =
      await setupProject(
        [
          trackId,
        ],
        [
          audioAssetId,
          otherAudioAssetId,
        ],
      );

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      muted:
        false,

      solo:
        true,

      gain:
        0.5,

      audioAssetIds: [
        audioAssetId,
        otherAudioAssetId,
      ],
    });

    let audioReads =
      0;

    const projectBefore =
      await projects.getProjectSnapshot(
        projectId,
      );

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        audioAssets: {
          async getAudioAsset() {
            audioReads +=
              1;

            throw new Error(
              "detach must not require audio metadata",
            );
          },
        },
      });

    const result =
      await service.detachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
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
      result.value.audioAssetIds,
      [
        otherAudioAssetId,
      ],
    );

    assert.equal(
      result.value.name,
      "Lead",
    );

    assert.equal(
      result.value.muted,
      false,
    );

    assert.equal(
      result.value.solo,
      true,
    );

    assert.equal(
      result.value.gain,
      0.5,
    );

    assert.equal(
      audioReads,
      0,
    );

    const projectAfter =
      await projects.getProjectSnapshot(
        projectId,
      );

    assert.deepEqual(
      projectAfter,
      projectBefore,
    );
  },
);

test(
  "absent detach is idempotent and performs no conditional track write",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      audioAssetIds:
        [],
    });

    let writes =
      0;

    const originalUpdate =
      tracks.updateTrackConditionally.bind(
        tracks,
      );

    tracks.updateTrackConditionally =
      async (
        track,
        revision,
      ) => {
        writes +=
          1;

        return originalUpdate(
          track,
          revision,
        );
      };

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        audioAssets:
          audioRepository(),
      });

    const result =
      await service.detachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      writes,
      0,
    );
  },
);

test(
  "track CAS conflict is surfaced as conflict without mutating project state",
  async () => {
    const projects =
      await setupProject();

    const tracks =
      new InMemorySeshTrackRepository();

    await tracks.saveTrack({
      id:
        trackId,

      projectId,

      name:
        "Lead",

      order:
        0,

      audioAssetIds:
        [],
    });

    const projectBefore =
      await projects.getProjectSnapshot(
        projectId,
      );

    tracks.updateTrackConditionally =
      async () => ({
        ok:
          false as const,

        error: {
          kind:
            "conflict" as const,

          message:
            "simulated track CAS conflict",
        },
      });

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          ownerAuthorizer(),

        projects,

        tracks,

        audioAssets:
          audioRepository(),
      });

    const result =
      await service.attachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
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

    const projectAfter =
      await projects.getProjectSnapshot(
        projectId,
      );

    assert.deepEqual(
      projectAfter,
      projectBefore,
    );
  },
);

test(
  "authorization failure prevents project audio and track persistence reads",
  async () => {
    let projectRead =
      false;

    let trackRead =
      false;

    let audioRead =
      false;

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer:
          forbiddenAuthorizer(),

        projects: {
          async getProjectSnapshot() {
            projectRead =
              true;

            throw new Error(
              "project read must not occur",
            );
          },
        },

        tracks: {
          async getTrackSnapshot() {
            trackRead =
              true;

            throw new Error(
              "track read must not occur",
            );
          },

          async updateTrackConditionally() {
            throw new Error(
              "track write must not occur",
            );
          },
        },

        audioAssets: {
          async getAudioAsset() {
            audioRead =
              true;

            throw new Error(
              "audio read must not occur",
            );
          },
        },
      });

    const result =
      await service.attachAudioAsset(
        projectId,
        trackId,
        audioAssetId,
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

    assert.equal(
      projectRead,
      false,
    );

    assert.equal(
      trackRead,
      false,
    );

    assert.equal(
      audioRead,
      false,
    );
  },
);

test(
  "invalid identifiers fail before authorization",
  async () => {
    let authorized =
      false;

    const service =
      new DefaultAuthorizedSeshTrackAudioOperationService({
        authorizer: {
          async authorize() {
            authorized =
              true;

            throw new Error(
              "authorization must not occur",
            );
          },
        },

        projects: {
          async getProjectSnapshot() {
            throw new Error(
              "project read must not occur",
            );
          },
        },

        tracks: {
          async getTrackSnapshot() {
            throw new Error(
              "track read must not occur",
            );
          },

          async updateTrackConditionally() {
            throw new Error(
              "track write must not occur",
            );
          },
        },

        audioAssets: {
          async getAudioAsset() {
            throw new Error(
              "audio read must not occur",
            );
          },
        },
      });

    const result =
      await service.attachAudioAsset(
        "wrong:project",
        trackId,
        audioAssetId,
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

    assert.equal(
      authorized,
      false,
    );
  },
);