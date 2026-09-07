import assert from "node:assert/strict";
import test from "node:test";

import {
    acquireContentTranscript,
    type ContentTranscriptAcquisitionProvider
} from "./content-transcript-acquisition-provider";

import type {
    CanonicalContentSourceRecord
} from "./canonical-content-source";


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


test(
    "acquires a transcript through a provider-agnostic contract",
    async () => {

        let calls =
            0;

        const provider:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "youtube",

                async acquire(
                    request
                ) {

                    calls +=
                        1;

                    assert.equal(
                        request.source.externalPlatformId,
                        "abc123"
                    );

                    assert.equal(
                        request.preferredLanguage,
                        "en"
                    );

                    return {
                        sourceId:
                            request.source.sourceId,

                        platform:
                            "youtube",

                        transcript: {
                            text:
                                "This is the published River video transcript.",

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

        const result =
            await acquireContentTranscript(
                provider,
                {
                    source:
                        createSource(),

                    preferredLanguage:
                        "en"
                }
            );

        assert.equal(
            calls,
            1
        );

        assert.equal(
            result.sourceId,
            "source:youtube:abc123"
        );

        assert.equal(
            result.transcript.text,
            "This is the published River video transcript."
        );

        assert.deepEqual(
            result.transcript.provenance,
            {
                type:
                    "platform",

                provider:
                    "youtube",

                language:
                    "en",

                capturedAt:
                    "2026-09-07T20:00:00.000Z"
            }
        );

    }
);


test(
    "rejects provider platform mismatch before acquisition",
    async () => {

        let calls =
            0;

        const provider:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "instagram",

                async acquire() {

                    calls +=
                        1;

                    throw new Error(
                        "should not execute"
                    );

                }
            };

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    provider,
                    {
                        source:
                            createSource()
                    }
                ),
            /provider platform does not match/
        );

        assert.equal(
            calls,
            0
        );

    }
);


test(
    "fails closed when provider returns another River source identity",
    async () => {

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
                                "Wrong source transcript.",

                            provenance: {
                                type:
                                    "platform"
                            }
                        }
                    };

                }
            };

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    provider,
                    {
                        source:
                            createSource()
                    }
                ),
            /source identity does not match/
        );

    }
);


test(
    "fails closed when provider returns another platform",
    async () => {

        const provider =
            {
                platform:
                    "youtube",

                async acquire() {

                    return {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "instagram",

                        transcript: {
                            text:
                                "Wrong platform transcript.",

                            provenance: {
                                type:
                                    "platform"
                            }
                        }
                    };

                }
            } as unknown as
                ContentTranscriptAcquisitionProvider;

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    provider,
                    {
                        source:
                            createSource()
                    }
                ),
            /result platform does not match/
        );

    }
);


test(
    "rejects malformed transcript text and provenance",
    async () => {

        const emptyText:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "youtube",

                async acquire() {

                    return {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        transcript: {
                            text:
                                "   ",

                            provenance: {
                                type:
                                    "platform"
                            }
                        }
                    };

                }
            };

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    emptyText,
                    {
                        source:
                            createSource()
                    }
                ),
            /text must be a non-empty string/
        );

        const badProvenance =
            {
                platform:
                    "youtube",

                async acquire() {

                    return {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        transcript: {
                            text:
                                "Transcript.",

                            provenance: {
                                type:
                                    "unknown"
                            }
                        }
                    };

                }
            } as unknown as
                ContentTranscriptAcquisitionProvider;

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    badProvenance,
                    {
                        source:
                            createSource()
                    }
                ),
            /provenance type is unsupported/
        );

    }
);


test(
    "rejects invalid preferred language before provider execution",
    async () => {

        let calls =
            0;

        const provider:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "youtube",

                async acquire() {

                    calls +=
                        1;

                    throw new Error(
                        "should not execute"
                    );

                }
            };

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    provider,
                    {
                        source:
                            createSource(),

                        preferredLanguage:
                            "   "
                    }
                ),
            /preferredLanguage/
        );

        assert.equal(
            calls,
            0
        );

    }
);


test(
    "does not allow unavailable provenance to masquerade as acquired transcript text",
    async () => {

        const provider:
            ContentTranscriptAcquisitionProvider =
            {
                platform:
                    "youtube",

                async acquire() {

                    return {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        transcript: {
                            text:
                                "This should not be accepted.",

                            provenance: {
                                type:
                                    "unavailable"
                            }
                        }
                    };

                }
            };

        await assert.rejects(
            () =>
                acquireContentTranscript(
                    provider,
                    {
                        source:
                            createSource()
                    }
                ),
            /Unavailable transcript provenance/
        );

    }
);
