import assert from "node:assert/strict";
import test from "node:test";

import {
    createContentSourceDiscoveryProvenanceRecord,
    validateContentSourceDiscoveryProvenanceRecord
} from "./content-source-discovery-provenance";


test(
    "creates deterministic immutable discovery provenance for a canonical source",
    () => {

        const record =
            createContentSourceDiscoveryProvenanceRecord(
                {
                    sourceId:
                        "source:youtube:abc123",

                    platform:
                        "youtube",

                    providerRecordId:
                        "youtube:abc123",

                    discoveredAt:
                        "2026-09-07T18:00:00.000Z",

                    providerMetadata: {
                        id: {
                            kind:
                                "youtube#video",

                            videoId:
                                "abc123"
                        },

                        snippet: {
                            title:
                                "Published River Video"
                        }
                    }
                },
                {
                    now:
                        "2026-09-07T19:00:00.000Z"
                }
            );

        assert.equal(
            record.provenanceId,
            "discovery-provenance:source:youtube:abc123:youtube:abc123"
        );

        assert.equal(
            record.sourceId,
            "source:youtube:abc123"
        );

        assert.equal(
            record.providerRecordId,
            "youtube:abc123"
        );

        assert.equal(
            record.originalSourcePreserved,
            true
        );

        assert.deepEqual(
            record.providerMetadata,
            {
                id: {
                    kind:
                        "youtube#video",

                    videoId:
                        "abc123"
                },

                snippet: {
                    title:
                        "Published River Video"
                }
            }
        );

    }
);


test(
    "allows discovery provenance without optional provider metadata",
    () => {

        const record =
            createContentSourceDiscoveryProvenanceRecord(
                {
                    sourceId:
                        "source:youtube:abc123",

                    platform:
                        "youtube",

                    providerRecordId:
                        "youtube:abc123",

                    discoveredAt:
                        "2026-09-07T18:00:00.000Z"
                },
                {
                    now:
                        "2026-09-07T19:00:00.000Z"
                }
            );

        assert.equal(
            "providerMetadata" in record,
            false
        );

    }
);


test(
    "rejects provenance identities that do not match their source and provider record",
    () => {

        const validation =
            validateContentSourceDiscoveryProvenanceRecord(
                {
                    provenanceId:
                        "discovery-provenance:source:youtube:wrong:youtube:wrong",

                    sourceId:
                        "source:youtube:abc123",

                    platform:
                        "youtube",

                    providerRecordId:
                        "youtube:abc123",

                    discoveredAt:
                        "2026-09-07T18:00:00.000Z",

                    capturedAt:
                        "2026-09-07T19:00:00.000Z",

                    originalSourcePreserved:
                        true
                }
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.issues.some(
                (issue) =>
                    issue.includes(
                        "deterministically match"
                    )
            )
        );

    }
);


test(
    "rejects non-json-compatible raw provider metadata",
    () => {

        assert.throws(
            () =>
                createContentSourceDiscoveryProvenanceRecord(
                    {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        providerRecordId:
                            "youtube:abc123",

                        discoveredAt:
                            "2026-09-07T18:00:00.000Z",

                        providerMetadata: {
                            invalid:
                                undefined
                        }
                    },
                    {
                        now:
                            "2026-09-07T19:00:00.000Z"
                    }
                ),
            /JSON-compatible/
        );

    }
);
