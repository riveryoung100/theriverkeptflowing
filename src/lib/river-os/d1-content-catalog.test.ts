import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import {
    createRiverContentCatalogEntry
} from "./content-catalog";

import {
    D1RiverContentCatalogPersistence
} from "./d1-content-catalog";

import type {
    CanonicalContentSourceRecord
} from "../assimilation/ingestion/canonical-content-source";

import type {
    ContentTranscriptRecord
} from "../assimilation/ingestion/content-transcript-record";


function createSource(
    overrides:
        Partial<CanonicalContentSourceRecord> = {}
): CanonicalContentSourceRecord {

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

        description:
            "If you want to keep going, just watch the video.",

        publishedAt:
            "2025-06-26T16:27:59.000Z",

        sourceStatus:
            "transcript-pending",

        tags:
            [],

        ingestedAt:
            "2026-09-08T18:16:28.680Z",

        updatedAt:
            "2026-09-08T18:16:28.680Z",

        originalSourcePreserved:
            true,

        ...overrides
    };

}


function createTranscript(
    overrides:
        Partial<ContentTranscriptRecord> = {}
): ContentTranscriptRecord {

    return {
        transcriptId:
            "transcript:source:youtube:dkBgPbiFTX0",

        sourceId:
            "source:youtube:dkBgPbiFTX0",

        platform:
            "youtube",

        transcript: {
            text:
                "Published transcript.",

            provenance: {
                type:
                    "platform",

                provider:
                    "youtube",

                language:
                    "en",

                capturedAt:
                    "2026-09-09T14:00:00.000Z"
            }
        },

        persistedAt:
            "2026-09-09T14:00:00.000Z",

        originalSourcePreserved:
            true,

        ...overrides
    };

}


interface StoredRow {
    [key: string]:
        unknown;
}


function createFakeD1Database():
D1Database {

    const rows =
        new Map<
            string,
            StoredRow
        >();

    const database = {

        prepare(
            sql:
                string
        ) {

            return {

                bind(
                    ...values:
                        unknown[]
                ) {

                    return {

                        async run() {

                            if (
                                !sql.includes(
                                    "INSERT INTO river_content_catalog"
                                )
                            ) {

                                throw new Error(
                                    "Unexpected fake D1 mutation."
                                );

                            }

                            rows.set(
                                String(
                                    values[0]
                                ),
                                {
                                    source_id:
                                        values[0],
                                    platform:
                                        values[1],
                                    canonical_url:
                                        values[2],
                                    external_platform_id:
                                        values[3],
                                    title:
                                        values[4],
                                    description:
                                        values[5],
                                    published_at:
                                        values[6],
                                    source_status:
                                        values[7],
                                    transcript_state:
                                        values[8],
                                    transcript_id:
                                        values[9],
                                    transcript_persisted_at:
                                        values[10],
                                    transcript_provider:
                                        values[11],
                                    transcript_language:
                                        values[12],
                                    ingested_at:
                                        values[13],
                                    updated_at:
                                        values[14],
                                    original_source_preserved:
                                        values[15]
                                }
                            );

                            return {
                                success:
                                    true
                            };

                        },

                        async first() {

                            const row =
                                rows.get(
                                    String(
                                        values[0]
                                    )
                                );

                            return row ===
                                undefined
                                ? null
                                : {
                                    ...row
                                };

                        },

                        async all() {

                            const limit =
                                Number(
                                    values[0]
                                );

                            const results =
                                Array.from(
                                    rows.values()
                                )
                                    .sort(
                                        (
                                            left,
                                            right
                                        ) => {
                                            return (
                                                String(
                                                    right.published_at
                                                ).localeCompare(
                                                    String(
                                                        left.published_at
                                                    )
                                                ) ||
                                                String(
                                                    left.source_id
                                                ).localeCompare(
                                                    String(
                                                        right.source_id
                                                    )
                                                )
                                            );
                                        }
                                    )
                                    .slice(
                                        0,
                                        limit
                                    )
                                    .map(
                                        row => ({
                                            ...row
                                        })
                                    );

                            return {
                                success:
                                    true,
                                results,
                                meta:
                                    {}
                            };

                        }

                    };

                }

            };

        }

    };

    return database as unknown as
        D1Database;

}


describe(
    "SITE-001A River OS content catalog",
    () => {

        it(
            "derives pending transcript state from canonical source authority",
            () => {

                const entry =
                    createRiverContentCatalogEntry(
                        createSource()
                    );

                assert.equal(
                    entry.transcriptState,
                    "pending"
                );

                assert.equal(
                    entry.sourceId,
                    "source:youtube:dkBgPbiFTX0"
                );

                assert.equal(
                    entry.originalSourcePreserved,
                    true
                );

            }
        );


        it(
            "derives available transcript metadata without replacing canonical source authority",
            () => {

                const entry =
                    createRiverContentCatalogEntry(
                        createSource(),
                        createTranscript()
                    );

                assert.equal(
                    entry.transcriptState,
                    "available"
                );

                assert.equal(
                    entry.transcriptId,
                    "transcript:source:youtube:dkBgPbiFTX0"
                );

                assert.equal(
                    entry.transcriptProvider,
                    "youtube"
                );

                assert.equal(
                    entry.transcriptLanguage,
                    "en"
                );

            }
        );


        it(
            "rejects transcript identity drift",
            () => {

                assert.throws(
                    () => {
                        createRiverContentCatalogEntry(
                            createSource(),
                            createTranscript({
                                transcriptId:
                                    "transcript:source:youtube:different",

                                sourceId:
                                    "source:youtube:different"
                            })
                        );
                    },
                    /source identity must match/
                );

            }
        );


        it(
            "persists, retrieves, updates, and lists the River OS read model",
            async () => {

                const persistence =
                    new D1RiverContentCatalogPersistence(
                        createFakeD1Database()
                    );

                const pending =
                    createRiverContentCatalogEntry(
                        createSource()
                    );

                await persistence.upsert(
                    pending
                );

                assert.deepEqual(
                    await persistence.get(
                        pending.sourceId
                    ),
                    pending
                );

                const available =
                    createRiverContentCatalogEntry(
                        createSource(),
                        createTranscript()
                    );

                await persistence.upsert(
                    available
                );

                assert.deepEqual(
                    await persistence.get(
                        available.sourceId
                    ),
                    available
                );

                assert.deepEqual(
                    await persistence.list(),
                    [
                        available
                    ]
                );

            }
        );


        it(
            "rejects invalid list bounds before querying D1",
            async () => {

                const persistence =
                    new D1RiverContentCatalogPersistence(
                        createFakeD1Database()
                    );

                await assert.rejects(
                    () =>
                        persistence.list(
                            101
                        ),
                    /1 through 100/
                );

            }
        );

    }
);
