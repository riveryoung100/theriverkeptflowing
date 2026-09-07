import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
    rm,
    writeFile,
    mkdir
} from "node:fs/promises";

import {
    dirname,
    join
} from "node:path";

import {
    tmpdir
} from "node:os";

import {
    createContentTranscriptRecord
} from "../ingestion/content-transcript-record";

import {
    createFileSystemContentTranscriptPersistence
} from "./content-transcript-filesystem";


function createRecord() {

    return createContentTranscriptRecord(
        {
            sourceId:
                "source:youtube:abc123",

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
        },
        {
            now:
                "2026-09-07T20:05:00.000Z"
        }
    );

}


test(
    "persists and retrieves a transcript with exact round-trip data",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-persistence-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const record =
                createRecord();

            const storedPath =
                await persistence.persist(
                    record
                );

            const retrieved =
                await persistence.retrieve(
                    record.transcriptId
                );

            assert.deepEqual(
                retrieved,
                record
            );

            assert.match(
                storedPath,
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
    "keeps transcripts physically separate from canonical source and discovery provenance storage",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-persistence-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const storedPath =
                await persistence.persist(
                    createRecord()
                );

            assert.equal(
                storedPath.includes(
                    "canonical-content-sources"
                ),
                false
            );

            assert.equal(
                storedPath.includes(
                    "content-source-discovery-provenance"
                ),
                false
            );

            assert.equal(
                storedPath.includes(
                    "content-transcripts"
                ),
                true
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
    "fails closed rather than overwriting immutable transcript identity",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-persistence-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const record =
                createRecord();

            await persistence.persist(
                record
            );

            await assert.rejects(
                () =>
                    persistence.persist(
                        record
                    )
            );

            const retrieved =
                await persistence.retrieve(
                    record.transcriptId
                );

            assert.deepEqual(
                retrieved,
                record
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
    "fails closed on malformed persisted transcript JSON",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-persistence-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const record =
                createRecord();

            const storedPath =
                await persistence.persist(
                    record
                );

            await writeFile(
                storedPath,
                "{not-json",
                "utf8"
            );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        record.transcriptId
                    ),
                /malformed JSON/
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
    "fails closed when persisted transcript identity differs from requested identity",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "transcript-persistence-"
                )
            );

        try {

            const persistence =
                createFileSystemContentTranscriptPersistence(
                    root
                );

            const requestedId =
                "transcript:source:youtube:requested";

            const mismatchedRecord =
                createContentTranscriptRecord(
                    {
                        sourceId:
                            "source:youtube:different",

                        platform:
                            "youtube",

                        transcript: {
                            text:
                                "Different transcript.",

                            provenance: {
                                type:
                                    "platform"
                            }
                        }
                    },
                    {
                        now:
                            "2026-09-07T20:05:00.000Z"
                    }
                );

            const target =
                join(
                    root,
                    "content-transcripts",
                    `${encodeURIComponent(
                        requestedId
                    )}.json`
                );

            await mkdir(
                dirname(
                    target
                ),
                {
                    recursive:
                        true
                }
            );

            await writeFile(
                target,
                JSON.stringify(
                    mismatchedRecord,
                    null,
                    2
                ) + "\n",
                "utf8"
            );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        requestedId
                    ),
                /identity does not match/
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

