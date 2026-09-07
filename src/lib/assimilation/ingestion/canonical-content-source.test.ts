import assert from "node:assert/strict";
import test from "node:test";

import {
    assertCanonicalContentSourceRecord,
    validateCanonicalContentSourceRecord,
    type CanonicalContentSourceRecord
} from "./canonical-content-source";


function createValidRecord():
CanonicalContentSourceRecord {

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
            "A Source Video",
        description:
            "Original published source.",
        publishedAt:
            "2026-09-07T12:00:00.000Z",
        durationSeconds:
            420,
        transcript: {
            text:
                "Canonical transcript text.",
            provenance: {
                type:
                    "platform",
                provider:
                    "youtube",
                language:
                    "en",
                capturedAt:
                    "2026-09-07T13:00:00.000Z"
            }
        },
        sourceStatus:
            "ingested",
        pillar:
            "faith",
        tags: [
            "faith",
            "purpose"
        ],
        ingestedAt:
            "2026-09-07T13:00:00.000Z",
        updatedAt:
            "2026-09-07T13:00:00.000Z",
        originalSourcePreserved:
            true
    };

}


test(
    "accepts a complete canonical content source record",
    () => {

        const record =
            createValidRecord();

        const validation =
            validateCanonicalContentSourceRecord(
                record
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.issues,
            []
        );

        assert.doesNotThrow(
            () =>
                assertCanonicalContentSourceRecord(
                    record
                )
        );

    }
);


test(
    "allows transcript acquisition to remain pending",
    () => {

        const record = {
            ...createValidRecord(),
            transcript:
                undefined,
            sourceStatus:
                "transcript-pending" as const
        };

        const validation =
            validateCanonicalContentSourceRecord(
                record
            );

        assert.equal(
            validation.valid,
            true
        );

    }
);


test(
    "rejects a non-canonical source URL",
    () => {

        const record = {
            ...createValidRecord(),
            canonicalUrl:
                "not-a-url"
        };

        const validation =
            validateCanonicalContentSourceRecord(
                record
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.issues.some(
                (issue) =>
                    issue.includes(
                        "canonicalUrl"
                    )
            )
        );

    }
);


test(
    "requires preservation of the original published source",
    () => {

        const record = {
            ...createValidRecord(),
            originalSourcePreserved:
                false
        };

        const validation =
            validateCanonicalContentSourceRecord(
                record
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.issues.some(
                (issue) =>
                    issue.includes(
                        "originalSourcePreserved"
                    )
            )
        );

    }
);


test(
    "rejects unsupported platform identities",
    () => {

        const record = {
            ...createValidRecord(),
            platform:
                "unknown-network"
        };

        const validation =
            validateCanonicalContentSourceRecord(
                record
            );

        assert.equal(
            validation.valid,
            false
        );

    }
);
