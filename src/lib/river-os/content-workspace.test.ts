import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import type {
    RiverContentCatalogEntry
} from "./content-catalog";

import {
    buildRiverContentSourceDetailPath,
    formatRiverContentDate,
    formatRiverContentPlatform,
    summarizeRiverContentWorkspace
} from "./content-workspace";


function entry(
    overrides:
        Partial<RiverContentCatalogEntry> = {}
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
            "Published source",

        publishedAt:
            "2025-06-26T16:27:59.000Z",

        sourceStatus:
            "transcript-pending",

        transcriptState:
            "pending",

        ingestedAt:
            "2026-09-08T18:16:28.680Z",

        updatedAt:
            "2026-09-08T18:16:28.680Z",

        originalSourcePreserved:
            true,

        ...overrides
    };

}


describe(
    "SITE-001C River OS content workspace",
    () => {

        it(
            "summarizes catalog operational state",
            () => {

                const summary =
                    summarizeRiverContentWorkspace([
                        entry(),
                        entry({
                            sourceId:
                                "source:youtube:two",

                            externalPlatformId:
                                "two",

                            transcriptState:
                                "available",

                            transcriptId:
                                "transcript:source:youtube:two",

                            transcriptPersistedAt:
                                "2026-09-09T14:00:00.000Z"
                        }),
                        entry({
                            sourceId:
                                "source:instagram:three",

                            platform:
                                "instagram",

                            externalPlatformId:
                                "three"
                        })
                    ]);

                assert.deepEqual(
                    summary,
                    {
                        totalSources:
                            3,

                        transcriptPending:
                            2,

                        transcriptAvailable:
                            1,

                        platforms:
                            2
                    }
                );

            }
        );


        it(
            "formats valid dates for workspace display",
            () => {

                assert.equal(
                    formatRiverContentDate(
                        "2025-06-26T16:27:59.000Z"
                    ),
                    "Jun 26, 2025"
                );

            }
        );


        it(
            "preserves malformed date values rather than inventing a date",
            () => {

                assert.equal(
                    formatRiverContentDate(
                        "unknown-date"
                    ),
                    "unknown-date"
                );

            }
        );


        it(
            "formats platform labels without changing identity",
            () => {

                assert.equal(
                    formatRiverContentPlatform(
                        "youtube"
                    ),
                    "Youtube"
                );

            }
        );


        it(
            "builds a private detail path without changing source identity",
            () => {

                assert.equal(
                    buildRiverContentSourceDetailPath(
                        "source:youtube:one"
                    ),
                    "/river-os/source?sourceId=source%3Ayoutube%3Aone"
                );

            }
        );

        it(
            "rejects invalid source identities for detail navigation",
            () => {

                assert.throws(
                    () =>
                        buildRiverContentSourceDetailPath(
                            " youtube:one "
                        ),
                    /valid source identity/
                );

            }
        );
    }
);
