import assert from "node:assert/strict";
import test from "node:test";

import type {
    CanonicalContentSourceRecord
} from "./canonical-content-source";

import {
    createYouTubeTranscriptProvider
} from "./youtube-transcript-provider";


function createSource(): CanonicalContentSourceRecord {

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

        tags: [],

        ingestedAt:
            "2026-09-08T18:16:28.680Z",

        updatedAt:
            "2026-09-08T18:16:28.680Z",

        originalSourcePreserved:
            true
    };

}


test(
    "CIF-020 acquires published YouTube caption text through injected boundaries",
    async () => {

        const requests:
            string[] =
            [];

        const provider =
            createYouTubeTranscriptProvider(
                {
                    now:
                        () =>
                            "2026-09-08T18:30:00.000Z",

                    fetcher:
                        async (
                            input
                        ) => {

                            const url =
                                input.toString();

                            requests.push(
                                url
                            );

                            if (
                                url.startsWith(
                                    "https://www.youtube.com/watch"
                                )
                            ) {

                                assert.equal(
                                    new URL(
                                        url
                                    ).searchParams.get(
                                        "v"
                                    ),
                                    "dkBgPbiFTX0"
                                );

                                return new Response(
                                    '<html><script>var data={"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=dkBgPbiFTX0&lang=en","languageCode":"en"}]};</script></html>',
                                    {
                                        status:
                                            200
                                    }
                                );

                            }

                            assert.equal(
                                url,
                                "https://www.youtube.com/api/timedtext?v=dkBgPbiFTX0&lang=en&fmt=json3"
                            );

                            return new Response(
                                JSON.stringify(
                                    {
                                        events: [
                                            {
                                                segs: [
                                                    {
                                                        utf8:
                                                            "God's grace is sufficient."
                                                    }
                                                ]
                                            },
                                            {
                                                segs: [
                                                    {
                                                        utf8:
                                                            "Keep going & trust Him."
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ),
                                {
                                    status:
                                        200
                                }
                            );

                        }
                }
            );

        const result =
            await provider.acquire(
                {
                    source:
                        createSource(),

                    preferredLanguage:
                        "en"
                }
            );

        assert.equal(
            requests.length,
            2
        );

        assert.equal(
            result.sourceId,
            "source:youtube:dkBgPbiFTX0"
        );

        assert.equal(
            result.platform,
            "youtube"
        );

        assert.equal(
            result.transcript.text,
            "God's grace is sufficient. Keep going & trust Him."
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
                    "2026-09-08T18:30:00.000Z"
            }
        );

    }
);


test(
    "CIF-020 prefers a manual caption track when no language preference is supplied",
    async () => {

        let calls =
            0;

        const provider =
            createYouTubeTranscriptProvider(
                {
                    fetcher:
                        async () => {

                            calls +=
                                1;

                            if (
                                calls ===
                                1
                            ) {

                                return new Response(
                                    '<html>"captionTracks":[{"baseUrl":"https://www.youtube.com/asr","languageCode":"en","kind":"asr"},{"baseUrl":"https://www.youtube.com/manual","languageCode":"en"}]</html>',
                                    {
                                        status:
                                            200
                                    }
                                );

                            }

                            assert.equal(
                                calls,
                                2
                            );

                            return new Response(
                                "<transcript><text>Manual transcript.</text></transcript>",
                                {
                                    status:
                                        200
                                }
                            );

                        }
                }
            );

        const result =
            await provider.acquire(
                {
                    source:
                        createSource()
                }
            );

        assert.equal(
            result.transcript.text,
            "Manual transcript."
        );

    }
);


test(
    "CIF-020 fails closed when YouTube exposes no captions",
    async () => {

        const provider =
            createYouTubeTranscriptProvider(
                {
                    fetcher:
                        async () =>
                            new Response(
                                "<html>No caption metadata.</html>",
                                {
                                    status:
                                        200
                                }
                            )
                }
            );

        await assert.rejects(
            () =>
                provider.acquire(
                    {
                        source:
                            createSource()
                    }
                ),
            /captions are unavailable/
        );

    }
);


test(
    "CIF-020 rejects non-YouTube canonical sources before network execution",
    async () => {

        let fetchCalls =
            0;

        const provider =
            createYouTubeTranscriptProvider(
                {
                    fetcher:
                        async () => {

                            fetchCalls +=
                                1;

                            throw new Error(
                                "must not execute"
                            );

                        }
                }
            );

        await assert.rejects(
            () =>
                provider.acquire(
                    {
                        source: {
                            ...createSource(),

                            platform:
                                "facebook"
                        }
                    }
                ),
            /only accepts YouTube canonical sources/
        );

        assert.equal(
            fetchCalls,
            0
        );

    }
);
