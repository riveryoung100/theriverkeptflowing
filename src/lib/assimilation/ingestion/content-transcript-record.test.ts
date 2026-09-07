import assert from "node:assert/strict";
import test from "node:test";

import {
    assertContentTranscriptRecord,
    createContentTranscriptRecord,
    validateContentTranscriptRecord
} from "./content-transcript-record";


test(
    "creates a deterministic immutable transcript record from acquisition",
    () => {

        const record =
            createContentTranscriptRecord(
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

        assert.equal(
            record.transcriptId,
            "transcript:source:youtube:abc123"
        );

        assert.equal(
            record.sourceId,
            "source:youtube:abc123"
        );

        assert.equal(
            record.platform,
            "youtube"
        );

        assert.equal(
            record.transcript.text,
            "Published River transcript."
        );

        assert.equal(
            record.persistedAt,
            "2026-09-07T20:05:00.000Z"
        );

        assert.equal(
            record.originalSourcePreserved,
            true
        );

        assertContentTranscriptRecord(
            record
        );

    }
);


test(
    "rejects transcript identity that does not match the source",
    () => {

        const validation =
            validateContentTranscriptRecord(
                {
                    transcriptId:
                        "transcript:source:youtube:different",

                    sourceId:
                        "source:youtube:abc123",

                    platform:
                        "youtube",

                    transcript: {
                        text:
                            "Transcript.",

                        provenance: {
                            type:
                                "platform"
                        }
                    },

                    persistedAt:
                        "2026-09-07T20:05:00.000Z",

                    originalSourcePreserved:
                        true
                }
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.match(
            validation.issues.join(
                " "
            ),
            /deterministically match/
        );

    }
);


test(
    "rejects unavailable provenance when transcript text exists",
    () => {

        const validation =
            validateContentTranscriptRecord(
                {
                    transcriptId:
                        "transcript:source:youtube:abc123",

                    sourceId:
                        "source:youtube:abc123",

                    platform:
                        "youtube",

                    transcript: {
                        text:
                            "Transcript.",

                        provenance: {
                            type:
                                "unavailable"
                        }
                    },

                    persistedAt:
                        "2026-09-07T20:05:00.000Z",

                    originalSourcePreserved:
                        true
                }
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.match(
            validation.issues.join(
                " "
            ),
            /cannot be unavailable/
        );

    }
);


test(
    "requires preservation of the original published source",
    () => {

        const validation =
            validateContentTranscriptRecord(
                {
                    transcriptId:
                        "transcript:source:youtube:abc123",

                    sourceId:
                        "source:youtube:abc123",

                    platform:
                        "youtube",

                    transcript: {
                        text:
                            "Transcript.",

                        provenance: {
                            type:
                                "generated"
                        }
                    },

                    persistedAt:
                        "2026-09-07T20:05:00.000Z",

                    originalSourcePreserved:
                        false
                }
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.match(
            validation.issues.join(
                " "
            ),
            /originalSourcePreserved/
        );

    }
);
