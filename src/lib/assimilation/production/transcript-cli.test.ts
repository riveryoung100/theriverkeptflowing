import assert from "node:assert/strict";

import {
    access,
    mkdtemp,
    readFile,
    rm
} from "node:fs/promises";

import {
    join
} from "node:path";

import {
    tmpdir
} from "node:os";

import test from "node:test";

import {
    createContentTranscriptRecord
} from "../ingestion/content-transcript-record";

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    createFileSystemContentTranscriptPersistence
} from "../persistence/content-transcript-filesystem";

import {
    parseTranscriptAssimilationCliArguments,
    runTranscriptAssimilationCli
} from "./transcript-cli";


const SOURCE_ID =
    "source:youtube:dkBgPbiFTX0";


async function seedGovernedTranscript(
    root:
        string
) {

    const sourcePersistence =
        createFileSystemCanonicalContentSourcePersistence(
            root
        );

    const transcriptPersistence =
        createFileSystemContentTranscriptPersistence(
            root
        );

    const source =
        {
            sourceId:
                SOURCE_ID,

            platform:
                "youtube" as const,

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
                "transcript-pending" as const,

            tags:
                [],

            ingestedAt:
                "2026-09-08T18:16:28.680Z",

            updatedAt:
                "2026-09-08T18:40:00.000Z",

            originalSourcePreserved:
                true as const
        };

    await sourcePersistence.persist(
        source
    );

    const transcript =
        createContentTranscriptRecord(
            {
                sourceId:
                    SOURCE_ID,

                platform:
                    "youtube",

                transcript: {
                    text:
                        "God's grace is sufficient. Keep going and trust Him.",

                    provenance: {
                        type:
                            "platform",

                        provider:
                            "youtube",

                        language:
                            "en",

                        capturedAt:
                            "2026-09-08T18:40:00.000Z"
                    }
                }
            },
            {
                now:
                    "2026-09-08T18:40:00.000Z"
            }
        );

    await transcriptPersistence.persist(
        transcript
    );

}


test(
    "parses one persisted transcript Assimilation request",
    () => {

        assert.deepEqual(
            parseTranscriptAssimilationCliArguments(
                [
                    ".river-content",
                    SOURCE_ID
                ]
            ),
            {
                persistenceRoot:
                    ".river-content",

                sourceId:
                    SOURCE_ID
            }
        );

        assert.throws(
            () =>
                parseTranscriptAssimilationCliArguments(
                    [
                        ".river-content"
                    ]
                ),
            /Usage: assimilation:transcript/
        );

        assert.throws(
            () =>
                parseTranscriptAssimilationCliArguments(
                    [
                        ".river-content",
                        "not-a-source"
                    ]
                ),
            /valid River source identifier/
        );

    }
);


test(
    "assimilates a persisted governed transcript with conservative rights metadata",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-transcript-assimilation-"
                )
            );

        try {

            await seedGovernedTranscript(
                root
            );

            const result =
                await runTranscriptAssimilationCli(
                    [
                        root,
                        SOURCE_ID
                    ]
                );

            assert.equal(
                result.status,
                "completed"
            );

            assert.equal(
                result.failedStage,
                null
            );

            assert.equal(
                result.asset.assetType,
                "transcript"
            );

            assert.equal(
                result.asset.title,
                "Gods Grace is Sufficient (Word of Perseverance) Transcript"
            );

            assert.equal(
                result.asset.originalFilename,
                "dkBgPbiFTX0.transcript.txt"
            );

            assert.equal(
                result.asset.sourceUrl,
                undefined
            );

            assert.equal(
                result.asset.ownership.ownerType,
                "unknown"
            );

            assert.equal(
                result.asset.rightsStatus,
                "unknown"
            );

            assert.equal(
                result.asset.usagePermission.mayAnalyze,
                true
            );

            assert.equal(
                result.asset.usagePermission.mayTransform,
                true
            );

            assert.equal(
                result.asset.usagePermission.mayQuote,
                false
            );

            assert.equal(
                result.asset.usagePermission.mayPublish,
                false
            );

            assert.equal(
                result.asset.usagePermission.mayCommercialize,
                false
            );

            assert.equal(
                result.asset.usagePermission.mayTrainModels,
                false
            );

            assert.equal(
                result.asset.reviewStatus,
                "pending"
            );

            assert.equal(
                result.asset.provenance.originalSource,
                "https://www.youtube.com/watch?v=dkBgPbiFTX0"
            );

            assert.equal(
                result.asset.provenance.originalPlatformId,
                "dkBgPbiFTX0"
            );

            assert.equal(
                result.asset.provenance.intakeMethod,
                "connector"
            );

            assert.ok(
                result.extraction
            );

            assert.equal(
                result.extraction.text,
                "God's grace is sufficient. Keep going and trust Him."
            );

            assert.ok(
                result.segment
            );

            assert.ok(
                result.classification
            );

            assert.ok(
                result.transformation
            );

            assert.ok(
                result.derivedObject
            );

            const generatedRecordPath =
                join(
                    root,
                    "generated-records",
                    `${encodeURIComponent(result.asset.id)}.json`
                );

            await access(
                generatedRecordPath
            );

            const generated =
                JSON.parse(
                    await readFile(
                        generatedRecordPath,
                        "utf8"
                    )
                ) as {
                    asset:
                        {
                            id:
                                string;
                            rightsStatus:
                                string;
                            usagePermission:
                                {
                                    mayPublish:
                                        boolean;
                                };
                        };
                };

            assert.equal(
                generated.asset.id,
                result.asset.id
            );

            assert.equal(
                generated.asset.rightsStatus,
                "unknown"
            );

            assert.equal(
                generated.asset.usagePermission.mayPublish,
                false
            );

        } finally {

            await rm(
                root,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);


test(
    "fails closed when the persisted transcript does not exist",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-transcript-assimilation-missing-"
                )
            );

        try {

            const sourcePersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            await sourcePersistence.persist(
                {
                    sourceId:
                        SOURCE_ID,

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
                        "transcript-pending",

                    tags:
                        [],

                    ingestedAt:
                        "2026-09-08T18:16:28.680Z",

                    updatedAt:
                        "2026-09-08T18:16:28.680Z",

                    originalSourcePreserved:
                        true
                }
            );

            await assert.rejects(
                () =>
                    runTranscriptAssimilationCli(
                        [
                            root,
                            SOURCE_ID
                        ]
                    )
            );

            await assert.rejects(
                () =>
                    access(
                        join(
                            root,
                            "generated-records"
                        )
                    )
            );

        } finally {

            await rm(
                root,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);
