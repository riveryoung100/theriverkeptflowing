import assert from "node:assert/strict";
import test from "node:test";

import {
    createYouTubeContentSourceDiscoveryProvider
} from "./youtube-content-source-discovery-provider";


test(
    "discovers published YouTube videos through the provider-agnostic contract",
    async () => {

        let calls =
            0;

        const provider =
            createYouTubeContentSourceDiscoveryProvider(
                {
                    apiKey:
                        "youtube-test-key",

                    now:
                        () =>
                            "2026-09-07T20:00:00.000Z",

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
                                url.origin,
                                "https://www.googleapis.com"
                            );

                            assert.equal(
                                url.pathname,
                                "/youtube/v3/search"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "part"
                                ),
                                "snippet"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "type"
                                ),
                                "video"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "order"
                                ),
                                "date"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "channelId"
                                ),
                                "river-channel"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "maxResults"
                                ),
                                "25"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "pageToken"
                                ),
                                "page-one"
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
                                        nextPageToken:
                                            "page-two",

                                        items: [
                                            {
                                                id: {
                                                    kind:
                                                        "youtube#video",

                                                    videoId:
                                                        "abc123"
                                                },

                                                snippet: {
                                                    publishedAt:
                                                        "2026-09-07T12:00:00.000Z",

                                                    channelId:
                                                        "river-channel",

                                                    title:
                                                        "Published River Video",

                                                    description:
                                                        "Already-posted River source."
                                                }
                                            }
                                        ]
                                    }
                                ),
                                {
                                    status:
                                        200,

                                    headers: {
                                        "content-type":
                                            "application/json"
                                    }
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
                        "river-channel",

                    cursor:
                        "page-one",

                    limit:
                        25
                }
            );

        assert.equal(
            calls,
            1
        );

        assert.equal(
            result.platform,
            "youtube"
        );

        assert.equal(
            result.nextCursor,
            "page-two"
        );

        assert.equal(
            result.sources.length,
            1
        );

        const discovered =
            result.sources[0]!;

        assert.equal(
            discovered.providerRecordId,
            "youtube:abc123"
        );

        assert.equal(
            discovered.discoveredAt,
            "2026-09-07T20:00:00.000Z"
        );

        assert.deepEqual(
            discovered.source,
            {
                platform:
                    "youtube",

                url:
                    "https://www.youtube.com/watch?v=abc123",

                externalPlatformId:
                    "abc123",

                title:
                    "Published River Video",

                description:
                    "Already-posted River source.",

                publishedAt:
                    "2026-09-07T12:00:00.000Z"
            }
        );

    }
);


test(
    "keeps provider-native metadata outside the canonical published-source input",
    async () => {

        const provider =
            createYouTubeContentSourceDiscoveryProvider(
                {
                    apiKey:
                        "youtube-test-key",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify(
                                    {
                                        items: [
                                            {
                                                id: {
                                                    kind:
                                                        "youtube#video",

                                                    videoId:
                                                        "abc123"
                                                },

                                                snippet: {
                                                    publishedAt:
                                                        "2026-09-07T12:00:00.000Z",

                                                    channelId:
                                                        "river-channel",

                                                    title:
                                                        "Published River Video"
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

        const result =
            await provider.discover(
                {
                    platform:
                        "youtube",

                    publisherId:
                        "river-channel"
                }
            );

        const discovered =
            result.sources[0]!;

        assert.equal(
            "id" in
            discovered.source,
            false
        );

        assert.equal(
            "snippet" in
            discovered.source,
            false
        );

        assert.ok(
            discovered.providerMetadata
        );

    }
);


test(
    "fails closed on insecure or malformed adapter configuration before network execution",
    () => {

        let calls =
            0;

        assert.throws(
            () =>
                createYouTubeContentSourceDiscoveryProvider(
                    {
                        apiKey:
                            "youtube-test-key",

                        endpoint:
                            "http://www.googleapis.com/youtube/v3/search",

                        fetcher:
                            async () => {

                                calls +=
                                    1;

                                return new Response();

                            }
                    }
                ),
            /must use HTTPS/
        );

        assert.equal(
            calls,
            0
        );

        assert.throws(
            () =>
                createYouTubeContentSourceDiscoveryProvider(
                    {
                        apiKey:
                            " youtube-test-key "
                    }
                ),
            /normalized non-empty/
        );

    }
);


test(
    "fails closed without exposing the YouTube API key in transport errors",
    async () => {

        const apiKey =
            "YOUTUBE_SECRET_SENTINEL";

        const provider =
            createYouTubeContentSourceDiscoveryProvider(
                {
                    apiKey,

                    fetcher:
                        async () =>
                            new Response(
                                "denied",
                                {
                                    status:
                                        403
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

        assert.equal(
            message.includes(
                apiKey
            ),
            false
        );

        assert.match(
            message,
            /HTTP 403/
        );

    }
);


test(
    "fails closed on malformed successful YouTube responses",
    async () => {

        const malformedJson =
            createYouTubeContentSourceDiscoveryProvider(
                {
                    apiKey:
                        "youtube-test-key",

                    fetcher:
                        async () =>
                            new Response(
                                "{bad-json",
                                {
                                    status:
                                        200
                                }
                            )
                }
            );

        await assert.rejects(
            () =>
                malformedJson.discover(
                    {
                        platform:
                            "youtube",

                        publisherId:
                            "river-channel"
                    }
                ),
            /malformed JSON/
        );


        const missingVideoId =
            createYouTubeContentSourceDiscoveryProvider(
                {
                    apiKey:
                        "youtube-test-key",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify(
                                    {
                                        items: [
                                            {
                                                id: {
                                                    kind:
                                                        "youtube#video"
                                                },

                                                snippet: {
                                                    publishedAt:
                                                        "2026-09-07T12:00:00.000Z",

                                                    title:
                                                        "Missing ID"
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
                missingVideoId.discover(
                    {
                        platform:
                            "youtube",

                        publisherId:
                            "river-channel"
                    }
                ),
            /missing a video identifier/
        );

    }
);
