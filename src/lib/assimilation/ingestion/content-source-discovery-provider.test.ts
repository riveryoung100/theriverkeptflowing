import assert from "node:assert/strict";
import test from "node:test";

import {
    discoverPublishedContentSources,
    type ContentSourceDiscoveryProvider
} from "./content-source-discovery-provider";


function createProvider():
ContentSourceDiscoveryProvider {

    return {

        platform:
            "youtube",

        async discover(
            query
        ) {

            assert.equal(
                query.publisherId,
                "river-channel"
            );

            return {
                platform:
                    "youtube",
                sources: [
                    {
                        providerRecordId:
                            "youtube:abc123",
                        discoveredAt:
                            "2026-09-07T18:00:00.000Z",
                        source: {
                            platform:
                                "youtube",
                            url:
                                "https://www.youtube.com/watch?v=abc123",
                            externalPlatformId:
                                "abc123",
                            title:
                                "Published River Video",
                            description:
                                "Already-posted source metadata.",
                            publishedAt:
                                "2026-09-07T12:00:00.000Z",
                            durationSeconds:
                                420
                        },
                        providerMetadata: {
                            channelId:
                                "river-channel"
                        }
                    }
                ],
                nextCursor:
                    "next-page"
            };

        }

    };

}


test(
    "discovers published source metadata through a bounded provider contract",
    async () => {

        const result =
            await discoverPublishedContentSources(
                createProvider(),
                {
                    platform:
                        "youtube",
                    publisherId:
                        "river-channel",
                    limit:
                        25
                }
            );

        assert.equal(
            result.platform,
            "youtube"
        );

        assert.equal(
            result.sources.length,
            1
        );

        assert.equal(
            result.sources[0]!
                .source
                .externalPlatformId,
            "abc123"
        );

        assert.equal(
            result.nextCursor,
            "next-page"
        );

    }
);


test(
    "provider discovery returns metadata without performing persistence or canonicalization",
    async () => {

        const result =
            await discoverPublishedContentSources(
                createProvider(),
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
            "sourceId" in
            discovered.source,
            false
        );

        assert.equal(
            "ingestedAt" in
            discovered.source,
            false
        );

        assert.equal(
            "sourceStatus" in
            discovered.source,
            false
        );

        assert.equal(
            "originalSourcePreserved" in
            discovered.source,
            false
        );

    }
);


test(
    "fails closed when query platform differs from provider platform",
    async () => {

        await assert.rejects(
            () =>
                discoverPublishedContentSources(
                    createProvider(),
                    {
                        platform:
                            "tiktok",
                        publisherId:
                            "river-channel"
                    }
                ),
            {
                name:
                    "TypeError",
                message:
                    "Content source discovery query platform does not match the provider."
            }
        );

    }
);


test(
    "fails closed when provider returns a mismatched platform",
    async () => {

        const provider:
            ContentSourceDiscoveryProvider = {

            platform:
                "youtube",

            async discover() {

                return {
                    platform:
                        "tiktok",
                    sources:
                        []
                } as never;

            }

        };

        await assert.rejects(
            () =>
                discoverPublishedContentSources(
                    provider,
                    {
                        platform:
                            "youtube",
                        publisherId:
                            "river-channel"
                    }
                ),
            /result platform does not match/
        );

    }
);


test(
    "fails closed when provider source metadata crosses platform boundaries",
    async () => {

        const provider:
            ContentSourceDiscoveryProvider = {

            platform:
                "youtube",

            async discover() {

                return {
                    platform:
                        "youtube",
                    sources: [
                        {
                            providerRecordId:
                                "bad-source",
                            discoveredAt:
                                "2026-09-07T18:00:00.000Z",
                            source: {
                                platform:
                                    "instagram",
                                url:
                                    "https://www.instagram.com/reel/example/",
                                title:
                                    "Wrong Platform",
                                publishedAt:
                                    "2026-09-07T12:00:00.000Z"
                            }
                        }
                    ]
                };

            }

        };

        await assert.rejects(
            () =>
                discoverPublishedContentSources(
                    provider,
                    {
                        platform:
                            "youtube",
                        publisherId:
                            "river-channel"
                    }
                ),
            /source platform does not match/
        );

    }
);


test(
    "rejects malformed discovery queries before provider execution",
    async () => {

        let calls =
            0;

        const provider:
            ContentSourceDiscoveryProvider = {

            platform:
                "youtube",

            async discover() {

                calls +=
                    1;

                return {
                    platform:
                        "youtube",
                    sources:
                        []
                };

            }

        };

        await assert.rejects(
            () =>
                discoverPublishedContentSources(
                    provider,
                    {
                        platform:
                            "youtube",
                        publisherId:
                            "",
                        limit:
                            0
                    }
                )
        );

        assert.equal(
            calls,
            0
        );

    }
);
