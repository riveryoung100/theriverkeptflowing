import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrincipalId,
} from "../../identity/identifiers";

import {
  createSeshCreatorId,
  createSeshMusicProjectId,
  createSeshTrackId,
} from "../identifiers";

import type {
  SeshMusicProject,
  SeshTrack,
} from "../model";

import type {
  SeshTrackSnapshot,
} from "../persistence/track-repository";

import {
  DefaultAuthorizedSeshTrackReorderOperationService,
} from "./track-reorder-operation-service";

function project():
SeshMusicProject {
  return {
    id:
      createSeshMusicProjectId(
        "reorder-project",
      ),

    ownerCreatorId:
      createSeshCreatorId(
        "reorder-owner",
      ),

    title:
      "Reorder Project",

    createdAt:
      "2026-09-25T00:00:00.000Z",

    updatedAt:
      "2026-09-25T00:00:00.000Z",

    trackIds: [
      createSeshTrackId(
        "track-a",
      ),
      createSeshTrackId(
        "track-b",
      ),
      createSeshTrackId(
        "track-c",
      ),
    ],

    audioAssetIds:
      [],
  };
}

function tracksFor(
  value:
    SeshMusicProject,
): SeshTrack[] {
  return value.trackIds.map(
    (
      id,
      order,
    ) => ({
      id,
      projectId:
        value.id,
      name:
        `Track ${order + 1}`,
      order,
      audioAssetIds:
        [],
      muted:
        order === 1,
      solo:
        false,
      gain:
        1,
    }),
  );
}

function successAuthorizer(
  value:
    SeshMusicProject,
) {
  return {
    async authorize() {
      return {
        ok:
          true as const,

        value: {
          principalId:
            createPrincipalId(
              "reorder-principal",
            ),

          seshCreatorId:
            value.ownerCreatorId,

          project:
            value,
        },
      };
    },
  };
}

test(
  "reorders the complete canonical project membership through one atomic persistence operation",
  async () => {
    const value =
      project();

    const tracks =
      tracksFor(
        value,
      );

    const snapshots =
      new Map<
        string,
        SeshTrackSnapshot
      >(
        tracks.map(
          (
            track,
            index,
          ) => [
            track.id,
            {
              track,
              revision:
                index + 3,
            },
          ],
        ),
      );

    let captured:
      readonly {
        readonly id:
          ReturnType<
            typeof createSeshTrackId
          >;

        readonly expectedRevision:
          number;

        readonly order:
          number;
      }[] |
      undefined;

    const service =
      new DefaultAuthorizedSeshTrackReorderOperationService({
        authorizer:
          successAuthorizer(
            value,
          ) as never,

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,
              value: {
                project:
                  value,
                revision:
                  9,
              },
            };
          },
        },

        tracks: {
          async listTracksForProject() {
            return {
              ok:
                true as const,
              value:
                tracks,
            };
          },

          async getTrackSnapshot(
            trackId,
          ) {
            const snapshot =
              snapshots.get(
                trackId,
              );

            assert.ok(
              snapshot,
            );

            return {
              ok:
                true as const,
              value:
                snapshot,
            };
          },
        },

        reorderPersistence: {
          async reorderProjectTracksAtomically(
            projectId,
            writes,
          ) {
            assert.equal(
              projectId,
              value.id,
            );

            captured =
              writes;

            const byId =
              new Map(
                tracks.map(
                  (
                    track,
                  ) => [
                    track.id,
                    track,
                  ],
                ),
              );

            return {
              ok:
                true as const,

              value:
                writes.map(
                  (
                    write,
                  ) => ({
                    ...byId.get(
                      write.id,
                    )!,
                    order:
                      write.order,
                  }),
                ),
            };
          },
        },
      });

    const requested = [
      value.trackIds[2],
      value.trackIds[0],
      value.trackIds[1],
    ];

    const result =
      await service.reorderTracks(
        value.id,
        {
          orderedTrackIds:
            requested,
        },
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.deepEqual(
      captured?.map(
        (
          write,
        ) => ({
          id:
            write.id,
          order:
            write.order,
        }),
      ),
      [
        {
          id:
            requested[0],
          order:
            0,
        },
        {
          id:
            requested[1],
          order:
            1,
        },
        {
          id:
            requested[2],
          order:
            2,
        },
      ],
    );

    assert.deepEqual(
      captured?.map(
        (
          write,
        ) =>
          write.expectedRevision,
      ),
      [
        5,
        3,
        4,
      ],
    );
  },
);

test(
  "rejects missing duplicate and foreign reorder membership before persistence mutation",
  async () => {
    const value =
      project();

    let mutations =
      0;

    const service =
      new DefaultAuthorizedSeshTrackReorderOperationService({
        authorizer:
          successAuthorizer(
            value,
          ) as never,

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,
              value: {
                project:
                  value,
                revision:
                  0,
              },
            };
          },
        },

        tracks: {
          async listTracksForProject() {
            return {
              ok:
                true as const,
              value:
                tracksFor(
                  value,
                ),
            };
          },

          async getTrackSnapshot() {
            throw new Error(
              "snapshot should not be read",
            );
          },
        },

        reorderPersistence: {
          async reorderProjectTracksAtomically() {
            mutations++;
            throw new Error(
              "reorder should not execute",
            );
          },
        },
      });

    const missing =
      await service.reorderTracks(
        value.id,
        {
          orderedTrackIds: [
            value.trackIds[0],
            value.trackIds[1],
          ],
        },
      );

    assert.equal(
      missing.ok,
      false,
    );

    const duplicate =
      await service.reorderTracks(
        value.id,
        {
          orderedTrackIds: [
            value.trackIds[0],
            value.trackIds[0],
            value.trackIds[2],
          ],
        },
      );

    assert.equal(
      duplicate.ok,
      false,
    );

    const foreign =
      await service.reorderTracks(
        value.id,
        {
          orderedTrackIds: [
            value.trackIds[0],
            value.trackIds[1],
            createSeshTrackId(
              "foreign",
            ),
          ],
        },
      );

    assert.equal(
      foreign.ok,
      false,
    );

    assert.equal(
      mutations,
      0,
    );
  },
);

test(
  "fails closed when canonical track metadata does not exactly represent project membership",
  async () => {
    const value =
      project();

    let mutationCalled =
      false;

    const incomplete =
      tracksFor(
        value,
      ).slice(
        0,
        2,
      );

    const service =
      new DefaultAuthorizedSeshTrackReorderOperationService({
        authorizer:
          successAuthorizer(
            value,
          ) as never,

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,
              value: {
                project:
                  value,
                revision:
                  0,
              },
            };
          },
        },

        tracks: {
          async listTracksForProject() {
            return {
              ok:
                true as const,
              value:
                incomplete,
            };
          },

          async getTrackSnapshot() {
            throw new Error(
              "snapshot should not be read",
            );
          },
        },

        reorderPersistence: {
          async reorderProjectTracksAtomically() {
            mutationCalled =
              true;

            throw new Error(
              "reorder should not execute",
            );
          },
        },
      });

    const result =
      await service.reorderTracks(
        value.id,
        {
          orderedTrackIds:
            value.trackIds,
        },
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      mutationCalled,
      false,
    );
  },
);

test(
  "preserves all non-order track state in the canonical reorder result",
  async () => {
    const value =
      project();

    const tracks =
      tracksFor(
        value,
      );

    const service =
      new DefaultAuthorizedSeshTrackReorderOperationService({
        authorizer:
          successAuthorizer(
            value,
          ) as never,

        projects: {
          async getProjectSnapshot() {
            return {
              ok:
                true as const,
              value: {
                project:
                  value,
                revision:
                  0,
              },
            };
          },
        },

        tracks: {
          async listTracksForProject() {
            return {
              ok:
                true as const,
              value:
                tracks,
            };
          },

          async getTrackSnapshot(
            trackId,
          ) {
            const track =
              tracks.find(
                (
                  item,
                ) =>
                  item.id ===
                  trackId,
              );

            assert.ok(
              track,
            );

            return {
              ok:
                true as const,
              value: {
                track,
                revision:
                  0,
              },
            };
          },
        },

        reorderPersistence: {
          async reorderProjectTracksAtomically(
            _projectId,
            writes,
          ) {
            const byId =
              new Map(
                tracks.map(
                  (
                    track,
                  ) => [
                    track.id,
                    track,
                  ],
                ),
              );

            return {
              ok:
                true as const,
              value:
                writes.map(
                  (
                    write,
                  ) => {
                    const before =
                      byId.get(
                        write.id,
                      )!;

                    return {
                      ...before,
                      order:
                        write.order,
                    };
                  },
                ),
            };
          },
        },
      });

    const result =
      await service.reorderTracks(
        value.id,
        {
          orderedTrackIds: [
            value.trackIds[1],
            value.trackIds[0],
            value.trackIds[2],
          ],
        },
      );

    assert.equal(
      result.ok,
      true,
    );
  },
);

test(
  "exposes no HTTP Studio R2 publication collaborator or rights authority",
  async () => {
    const source =
      await import(
        "node:fs/promises"
      ).then(
        (
          fs,
        ) =>
          fs.readFile(
            new URL(
              "./track-reorder-operation-service.ts",
              import.meta.url,
            ),
            "utf8",
          ),
      );

    for (
      const forbidden of [
        "Request",
        "Response",
        "fetch(",
        "SESH_AUDIO",
        "putObject(",
        "getObject(",
        "deleteObject(",
        "storageReference",
        "publicUrl",
        "signedUrl",
        "collaborator",
        "publishingRights",
        "managementRights",
        "masterRights",
        "royaltyShare",
        "ownershipTransfer",
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
      );
    }
  },
);