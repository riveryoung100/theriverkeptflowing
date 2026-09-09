import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import type {
    RiverContentCatalogEntry
} from "./content-catalog";
import {
    createRiverRepurposePlan
} from "./content-repurpose-planner";

function entry(
    transcriptState:
        RiverContentCatalogEntry["transcriptState"]
): RiverContentCatalogEntry {

    return {
        sourceId:
            "source:youtube:dkBgPbiFTX0",
        platform:
            "youtube",
        canonicalUrl:
            "https://www.youtube.com/watch?v=dkBgPbiFTX0",
        externalPlatformId:
            "dkBgPbiFTX0",
        title:
            "Gods Grace is Sufficient (Word of Perseverance)",
        publishedAt:
            "2025-06-26T16:27:59.000Z",
        sourceStatus:
            transcriptState === "available"
                ? "ready"
                : "transcript-pending",
        transcriptState,
        ingestedAt:
            "2026-09-08T18:16:28.680Z",
        updatedAt:
            "2026-09-08T18:16:28.680Z",
        originalSourcePreserved:
            true
    };

}

describe(
    "SITE-001H River OS repurpose planner",
    () => {

        it(
            "keeps every transformation target waiting until transcript evidence is available",
            () => {

                const plan =
                    createRiverRepurposePlan(
                        entry(
                            "pending"
                        )
                    );

                assert.equal(
                    plan.targets.length,
                    8
                );

                assert.ok(
                    plan.targets.every(
                        (target) =>
                            target.state ===
                            "waiting"
                    )
                );

            }
        );

        it(
            "maps transcript-ready sources to the site's real public collections",
            () => {

                const plan =
                    createRiverRepurposePlan(
                        entry(
                            "available"
                        )
                    );

                const collections =
                    plan.targets.filter(
                        (target) =>
                            target.kind ===
                            "site-collection"
                    );

                assert.deepEqual(
                    collections.map(
                        (target) =>
                            target.destination
                    ),
                    [
                        "src/content/essays",
                        "src/content/guides",
                        "src/content/letters",
                        "src/content/journal",
                        "src/content/films"
                    ]
                );

                assert.ok(
                    collections.every(
                        (target) =>
                            target.state ===
                            "ready"
                    )
                );

            }
        );

        it(
            "preserves canonical source identity and keeps downstream outputs as plans only",
            () => {

                const plan =
                    createRiverRepurposePlan(
                        entry(
                            "available"
                        )
                    );

                assert.equal(
                    plan.sourceId,
                    "source:youtube:dkBgPbiFTX0"
                );

                assert.deepEqual(
                    plan.targets
                        .filter(
                            (target) =>
                                target.kind ===
                                "downstream-plan"
                        )
                        .map(
                            (target) =>
                                target.id
                        ),
                    [
                        "clips",
                        "newsletter",
                        "platform"
                    ]
                );

            }
        );

    }
);
