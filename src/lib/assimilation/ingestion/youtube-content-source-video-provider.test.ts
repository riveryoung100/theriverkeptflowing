import assert from "node:assert/strict";
import test from "node:test";

import {
    createYouTubeContentSourceVideoProvider
} from "./youtube-content-source-video-provider";

test(
    "looks up exactly one published YouTube video by identifier",
    async () => {

        let calls =
            0;

        const provider =
            createYouTubeContentSourceVideoProvider(
                {
                    apiKey:
                        "youtube-test-key",

                    videoId:
                        "dkBgPbiFTX0",

                    now:
                        () =>
                            "2026-09-08T18:00:00.000Z",

                    fetcher:
                        async (
                            input,
                            init
                        ) => {

                            calls +=
                                1;

                            const url =
                                new URL(
                                    input
                                );

                            assert.equal(
                                url.pathname,
                                "/youtube/v3/videos"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "part"
                                ),
                                "snippet"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "id"
                                ),
                                "dkBgPbiFTX0"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "key"
                                ),
                                "youtube-test-key"
                            );

                            assert.equal(
                                init?.method,
                                "GET"
                            );

                            return new Response(
                                JSON.stringify(
                                    {
                                        items: [
                                            {
                                                id:
                                                    "dkBgPbiFTX0",

                                                snippet: {
                                                    publishedAt:
                                                        "2025-09-01T12:00:00.000Z",

                                                    channelId:
                                                        "river-channel",

                                                    title:
                                                        "Gods Grace is Sufficient (Word of Perseverance)",

                                                    description:
                                                        "Published River source."
                                                }
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
            await provider.discover(
                {
                    platform:
                        "youtube",

                    publisherId:
                        "river-channel"
                }
            );

        assert.equal(
            calls,
            1
        );

        assert.equal(
            result.sources.length,
            1
        );

        const discovered =
            result.sources[0]!;

        assert.equal(
            discovered.providerRecordId,
            "youtube:dkBgPbiFTX0"
        );

        assert.equal(
            discovered.source.externalPlatformId,
            "dkBgPbiFTX0"
        );

        assert.equal(
            discovered.source.url,
            "https://www.youtube.com/watch?v=dkBgPbiFTX0"
        );

        assert.equal(
            discovered.source.title,
            "Gods Grace is Sufficient (Word of Perseverance)"
        );

    }
);

test(
    "fails closed when the requested video does not belong to the resolved channel",
    async () => {

        const provider =
            createYouTubeContentSourceVideoProvider(
                {
                    apiKey:
                        "youtube-test-key",

                    videoId:
                        "dkBgPbiFTX0",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify(
                                    {
                                        items: [
                                            {
                                                id:
                                                    "dkBgPbiFTX0",

                                                snippet: {
                                                    publishedAt:
                                                        "2025-09-01T12:00:00.000Z",

                                                    channelId:
                                                        "different-channel",

                                                    title:
                                                        "Wrong Channel"
                                                }
                                            }
                                        ]
                                    }
                                ),
                                {
                                    status:
                                        200
                                }
                            )

                }
            );

        await assert.rejects(
            () =>
                provider.discover(
                    {
                        platform:
                            "youtube",

                        publisherId:
                            "river-channel"
                    }
                ),
            /does not belong to the resolved channel/
        );

    }
);

test(
    "fails closed on missing videos and does not expose the API key in errors",
    async () => {

        const apiKey =
            "YOUTUBE_SECRET_SENTINEL";

        const provider =
            createYouTubeContentSourceVideoProvider(
                {
                    apiKey,

                    videoId:
                        "dkBgPbiFTX0",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify(
                                    {
                                        items: []
                                    }
                                ),
                                {
                                    status:
                                        200
                                }
                            )

                }
            );

        let message =
            "";

        try {

            await provider.discover(
                {
                    platform:
                        "youtube",

                    publisherId:
                        "river-channel"
                }
            );

        } catch (error) {

            message =
                String(
                    error
                );

        }

        assert.match(
            message,
            /not found/
        );

        assert.equal(
            message.includes(
                apiKey
            ),
            false
        );

    }
);
