import assert from "node:assert/strict";
import test from "node:test";

import {
    createYouTubeChannelHandleResolver
} from "./youtube-channel-handle-resolver";


test(
    "resolves the River YouTube handle to a stable channel ID",
    async () => {

        let calls =
            0;

        const resolver =
            createYouTubeChannelHandleResolver(
                {
                    apiKey:
                        "youtube-test-key",

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
                                "/youtube/v3/channels"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "part"
                                ),
                                "id"
                            );

                            assert.equal(
                                url.searchParams.get(
                                    "forHandle"
                                ),
                                "@TheRiverKeptFlowing"
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
                                                    "UC_RIVER_CHANNEL_ID"
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
            await resolver.resolve(
                "@TheRiverKeptFlowing"
            );

        assert.equal(
            calls,
            1
        );

        assert.deepEqual(
            result,
            {
                handle:
                    "@TheRiverKeptFlowing",

                channelId:
                    "UC_RIVER_CHANNEL_ID"
            }
        );

    }
);


test(
    "normalizes a handle supplied without the at sign",
    async () => {

        const resolver =
            createYouTubeChannelHandleResolver(
                {
                    apiKey:
                        "youtube-test-key",

                    fetcher:
                        async (
                            input
                        ) => {

                            const url =
                                new URL(
                                    input
                                );

                            assert.equal(
                                url.searchParams.get(
                                    "forHandle"
                                ),
                                "@TheRiverKeptFlowing"
                            );

                            return new Response(
                                JSON.stringify(
                                    {
                                        items: [
                                            {
                                                id:
                                                    "UC_RIVER_CHANNEL_ID"
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
            await resolver.resolve(
                "TheRiverKeptFlowing"
            );

        assert.equal(
            result.handle,
            "@TheRiverKeptFlowing"
        );

    }
);


test(
    "fails closed when the handle does not resolve to exactly one channel",
    async () => {

        const none =
            createYouTubeChannelHandleResolver(
                {
                    apiKey:
                        "youtube-test-key",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify(
                                    {
                                        items:
                                            []
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
                none.resolve(
                    "@TheRiverKeptFlowing"
                ),
            /exactly one channel/
        );


        const multiple =
            createYouTubeChannelHandleResolver(
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
                                                id:
                                                    "UC_FIRST"
                                            },
                                            {
                                                id:
                                                    "UC_SECOND"
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
                multiple.resolve(
                    "@TheRiverKeptFlowing"
                ),
            /exactly one channel/
        );

    }
);


test(
    "fails closed on insecure configuration before network execution",
    () => {

        let calls =
            0;

        assert.throws(
            () =>
                createYouTubeChannelHandleResolver(
                    {
                        apiKey:
                            "youtube-test-key",

                        endpoint:
                            "http://www.googleapis.com/youtube/v3/channels",

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

    }
);


test(
    "fails closed without exposing the YouTube API key",
    async () => {

        const apiKey =
            "YOUTUBE_HANDLE_SECRET_SENTINEL";

        const resolver =
            createYouTubeChannelHandleResolver(
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

            await resolver.resolve(
                "@TheRiverKeptFlowing"
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
    "fails closed on malformed successful channel responses",
    async () => {

        const malformedJson =
            createYouTubeChannelHandleResolver(
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
                malformedJson.resolve(
                    "@TheRiverKeptFlowing"
                ),
            /malformed JSON/
        );


        const missingId =
            createYouTubeChannelHandleResolver(
                {
                    apiKey:
                        "youtube-test-key",

                    fetcher:
                        async () =>
                            new Response(
                                JSON.stringify(
                                    {
                                        items: [
                                            {}
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
                missingId.resolve(
                    "@TheRiverKeptFlowing"
                ),
            /invalid channel ID/
        );

    }
);
