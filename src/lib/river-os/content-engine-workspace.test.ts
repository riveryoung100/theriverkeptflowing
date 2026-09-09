import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import type {
    RiverContentCatalogEntry
} from "./content-catalog";

import {
    createRiverContentEngineWorkspace
} from "./content-engine-workspace";

function createEntry(
    transcriptState:
        RiverContentCatalogEntry["transcriptState"]
): RiverContentCatalogEntry {

    return {
        sourceId:
            "source:youtube:one",
        platform:
            "youtube",
        canonicalUrl:
            "https://www.youtube.com/watch?v=one",
        externalPlatformId:
            "one",
        title:
            "Source one",
        publishedAt:
            "2026-01-01T00:00:00.000Z",
        sourceStatus:
            transcriptState === "available"
                ? "transcript-available"
                : "transcript-pending",
        transcriptState,
        ingestedAt:
            "2026-01-02T00:00:00.000Z",
        updatedAt:
            "2026-01-02T00:00:00.000Z",
        originalSourcePreserved:
            true
    };

}

describe(
    "SITE-001F River OS content engine workspace",
    () => {

        it(
            "keeps downstream workflow waiting while transcript acquisition is pending",
            () => {

                const workspace =
                    createRiverContentEngineWorkspace(
                        createEntry(
                            "pending"
                        )
                    );

                assert.equal(
                    workspace.transcriptAvailable,
                    false
                );

                assert.deepEqual(
                    workspace.stages.map(
                        (stage) =>
                            [
                                stage.id,
                                stage.state,
                                stage.stateLabel
                            ]
                    ),
                    [
                        [
                            "transcript",
                            "waiting",
                            "Pending"
                        ],
                        [
                            "transform",
                            "waiting",
                            "Waiting for transcript"
                        ],
                        [
                            "repurpose",
                            "waiting",
                            "Waiting for transcript"
                        ],
                        [
                            "publish",
                            "waiting",
                            "Not connected"
                        ]
                    ]
                );

            }
        );

        it(
            "marks transcript-dependent planning ready when transcript evidence is available",
            () => {

                const workspace =
                    createRiverContentEngineWorkspace(
                        createEntry(
                            "available"
                        )
                    );

                assert.equal(
                    workspace.transcriptAvailable,
                    true
                );

                assert.deepEqual(
                    workspace.stages.map(
                        (stage) =>
                            [
                                stage.id,
                                stage.state
                            ]
                    ),
                    [
                        [
                            "transcript",
                            "ready"
                        ],
                        [
                            "transform",
                            "ready"
                        ],
                        [
                            "repurpose",
                            "ready"
                        ],
                        [
                            "publish",
                            "waiting"
                        ]
                    ]
                );

            }
        );

        it(
            "preserves canonical source identity in the workspace projection",
            () => {

                const workspace =
                    createRiverContentEngineWorkspace(
                        createEntry(
                            "pending"
                        )
                    );

                assert.equal(
                    workspace.sourceId,
                    "source:youtube:one"
                );

            }
        );

    }
);
