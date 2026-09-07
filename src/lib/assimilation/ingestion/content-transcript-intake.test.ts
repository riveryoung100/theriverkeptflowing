import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
    rm
} from "node:fs/promises";

import {
    join
} from "node:path";

import {
    tmpdir
} from "node:os";

import type {
    CanonicalContentSourceRecord
} from "./canonical-content-source";

import type {
    ContentTranscriptAcquisitionProvider
} from "./content-transcript-acquisition-provider";

import {
    createGovernedContentTranscriptIntake
} from "./content-transcript-intake";

import {
    createFileSystemContentTranscriptPersistence
} from "../persistence/content-transcript-filesystem";


function createSource(): CanonicalContentSourceRecord {

    return {
        sourceId:
            "source:youtube:abc123",

        platform:
            "youtube",

        canonicalUrl:
            "https://www.youtube.com/watch?v=abc123",

        externalPlatformId:
            "abc123",

        title:
            "Published River Video",

        publishedAt:
            "2026-09-07T12:00:00.000Z",

        sourceStatus:
            "transcript-pending",

        tags:
            [],

        ingestedAt:
            "2026-09-07T19:00:00.000Z",

        updatedAt:
            "2026-09-07T19:00:00.000Z",

        originalSourcePreserved:
            true
    };

}


function createProvider():
ContentTranscriptAcquisitionProvider {

    return {
        platform:
            "youtube",

        async acquire(
            request
        ) {

            return {
                sourceId:
                    request.source.sourceId,

                platform:
                    "youtube",

                transcript: {
                    text:
                        "Published River transcript.",

                    provenance: {
                        type:
                            "platform",

                        provider:
                            "youtube",

                        language:
                            "en",

                        capturedAt:
                            "2026-09-07T20:00:00.000Z"
                    }
                }
            };

        }
    };

}


test(
    "acquires validates records and durably persists a transcript through one governed path",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-intake-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const intake =
                createGovernedContentTranscriptIntake(
                    createProvider(),
                    persistence
                );

            const result =
                await intake.ingest(
                    {
                        source:
                            createSource(),

                        preferredLanguage:
                            "en"
                    },
                    {
                        now:
                            "2026-09-07T20:05:00.000Z"
                    }
                );

            assert.equal(
                result.acquisition.sourceId,
                "source:youtube:abc123"
            );

            assert.equal(
                result.record.transcriptId,
                "transcript:source:youtube:abc123"
            );

            assert.equal(
                result.record.transcript.text,
                "Published River transcript."
            );

            assert.equal(
                result.record.persistedAt,
                "2026-09-07T20:05:00.000Z"
            );

            const retrieved =
                await persistence.retrieve(
                    result.record.transcriptId
                );

            assert.deepEqual(
                retrieved,
                result.record
            );

            assert.match(
                result.storedPath,
                /content-transcripts/
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
    "does not persist when transcript acquisition fails validation",
    async () => {

        let persisted =
            false;

        const provider:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "instagram",

                async acquire() {

                    throw new Error(
                        "should not execute"
                    );

                }
            };

        const intake =
            createGovernedContentTranscriptIntake(
                provider,
                {
                    async persist() {

                        persisted =
                            true;

                        return "should-not-store";

                    },

                    async retrieve() {

                        throw new Error(
                            "not required"
                        );

                    }
                }
            );

        await assert.rejects(
            () =>
                intake.ingest(
                    {
                        source:
                            createSource()
                    }
                ),
            /provider platform does not match/
        );

        assert.equal(
            persisted,
            false
        );

    }
);


test(
    "does not persist when provider returns another River source identity",
    async () => {

        let persisted =
            false;

        const provider:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "youtube",

                async acquire() {

                    return {
                        sourceId:
                            "source:youtube:different",

                        platform:
                            "youtube",

                        transcript: {
                            text:
                                "Wrong transcript.",

                            provenance: {
                                type:
                                    "platform"
                            }
                        }
                    };

                }
            };

        const intake =
            createGovernedContentTranscriptIntake(
                provider,
                {
                    async persist() {

                        persisted =
                            true;

                        return "should-not-store";

                    },

                    async retrieve() {

                        throw new Error(
                            "not required"
                        );

                    }
                }
            );

        await assert.rejects(
            () =>
                intake.ingest(
                    {
                        source:
                            createSource()
                    }
                ),
            /source identity does not match/
        );

        assert.equal(
            persisted,
            false
        );

    }
);


test(
    "fails closed rather than overwriting an existing immutable transcript",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-intake-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const intake =
                createGovernedContentTranscriptIntake(
                    createProvider(),
                    persistence
                );

            const request = {
                source:
                    createSource()
            };

            const options = {
                now:
                    "2026-09-07T20:05:00.000Z"
            };

            const first =
                await intake.ingest(
                    request,
                    options
                );

            await assert.rejects(
                () =>
                    intake.ingest(
                        request,
                        options
                    )
            );

            const retrieved =
                await persistence.retrieve(
                    first.record.transcriptId
                );

            assert.deepEqual(
                retrieved,
                first.record
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
    "keeps canonical source input unchanged during transcript intake",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-intake-"
                )
            );

        try {

            const source =
                createSource();

            const original =
                JSON.stringify(
                    source
                );

            const intake =
                createGovernedContentTranscriptIntake(
                    createProvider(),
                    createFileSystemContentTranscriptPersistence(
                        root
                    )
                );

            await intake.ingest(
                {
                    source
                },
                {
                    now:
                        "2026-09-07T20:05:00.000Z"
                }
            );

            assert.equal(
                JSON.stringify(
                    source
                ),
                original
            );

            assert.equal(
                source.transcript,
                undefined
            );

            assert.equal(
                source.sourceStatus,
                "transcript-pending"
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
