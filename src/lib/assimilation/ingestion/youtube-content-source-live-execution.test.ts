import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    rm
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    test
} from "node:test";

import {
    YOUTUBE_CONTENT_SOURCE_LIVE_EXECUTION_AUTHORIZATION,
    executeYouTubeContentSourceLiveDiscovery
} from "./youtube-content-source-live-execution";


function createOptions(
    persistenceRoot:
        string,
    overrides:
        Record<string, unknown> = {}
): any {

    return {
        persistenceRoot,
        handle:
            "@TheRiverKeptFlowing",
        authorization:
            YOUTUBE_CONTENT_SOURCE_LIVE_EXECUTION_AUTHORIZATION,
        readCredential:
            async () =>
                "test-youtube-credential",
        now:
            "2026-09-07T20:00:00.000Z",
        ...overrides
    };

}


test(
    "CIF-015 fails closed before credential consumption without explicit authorization",
    async () => {

        let credentialReads =
            0;

        await assert.rejects(
            () =>
                executeYouTubeContentSourceLiveDiscovery(
                    createOptions(
                        "/repo",
                        {
                            authorization:
                                "not-authorized",

                            readCredential:
                                async () => {

                                    credentialReads +=
                                        1;

                                    return "must-not-be-read";

                                }
                        }
                    )
                ),
            /Explicit live YouTube discovery authorization is required/
        );

        assert.equal(
            credentialReads,
            0
        );

    }
);


test(
    "CIF-015 validates non-secret execution inputs before credential consumption",
    async () => {

        for (
            const [
                override,
                message
            ] of
            [
                [
                    {
                        persistenceRoot:
                            "   "
                    },
                    /Persistence root is required/
                ],
                [
                    {
                        handle:
                            "   "
                    },
                    /YouTube handle is required/
                ],
                [
                    {
                        now:
                            "not-a-timestamp"
                    },
                    /Execution timestamp must be valid/
                ],
                [
                    {
                        limit:
                            0
                    },
                    /Discovery limit must be a positive integer/
                ],
                [
                    {
                        cursor:
                            "   "
                    },
                    /Discovery cursor is required/
                ]
            ] as const
        ) {

            let credentialReads =
                0;

            await assert.rejects(
                () =>
                    executeYouTubeContentSourceLiveDiscovery(
                        createOptions(
                            "/repo",
                            {
                                ...override,

                                readCredential:
                                    async () => {

                                        credentialReads +=
                                            1;

                                        return "must-not-be-read";

                                    }
                            }
                        )
                    ),
                message
            );

            assert.equal(
                credentialReads,
                0
            );

        }

    }
);


test(
    "CIF-015 rejects an empty runtime credential without exposing it",
    async () => {

        await assert.rejects(
            () =>
                executeYouTubeContentSourceLiveDiscovery(
                    createOptions(
                        "/repo",
                        {
                            readCredential:
                                async () =>
                                    "   "
                        }
                    )
                ),
            /YouTube API credential is required through the authorized runtime credential reader/
        );

    }
);


test(
    "CIF-015 resolves the handle then performs one governed discovery into immutable persistence",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "youtube-live-execution-"
                )
            );

        try {

            let credentialReads =
                0;

            const requestedUrls:
                string[] = [];

            const fetcher:
                typeof fetch =
                async (
                    input
                ) => {

                    const url =
                        new URL(
                            input.toString()
                        );

                    requestedUrls.push(
                        url.toString()
                    );

                    assert.equal(
                        url.searchParams.get(
                            "key"
                        ),
                        "test-youtube-credential"
                    );

                    if (
                        url.searchParams.has(
                            "forHandle"
                        )
                    ) {

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
                                                "UC_RIVER_CHANNEL"
                                        }
                                    ]
                                }
                            ),
                            {
                                status:
                                    200,

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                }
                            }
                        );

                    }

                    assert.equal(
                        url.searchParams.get(
                            "channelId"
                        ),
                        "UC_RIVER_CHANNEL"
                    );

                    return new Response(
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
                                            title:
                                                "Published River Video",

                                            description:
                                                "Already-posted source content.",

                                            publishedAt:
                                                "2026-09-01T15:00:00.000Z",

                                            channelId:
                                                "UC_RIVER_CHANNEL"
                                        }
                                    }
                                ]
                            }
                        ),
                        {
                            status:
                                200,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );

                };

            const result =
                await executeYouTubeContentSourceLiveDiscovery(
                    createOptions(
                        root,
                        {
                            readCredential:
                                async () => {

                                    credentialReads +=
                                        1;

                                    return "test-youtube-credential";

                                },

                            fetcher,

                            limit:
                                5
                        }
                    )
                );

            assert.equal(
                credentialReads,
                1
            );

            assert.equal(
                requestedUrls.length,
                2
            );

            assert.deepEqual(
                result.channel,
                {
                    handle:
                        "@TheRiverKeptFlowing",

                    channelId:
                        "UC_RIVER_CHANNEL"
                }
            );

            assert.equal(
                result.intake.ingested.length,
                1
            );

            assert.equal(
                result.intake.provenance.length,
                1
            );

            assert.equal(
                result.intake.reconciled.length,
                0
            );

            assert.equal(
                result.intake.ingested[0]?.record.sourceId,
                "source:youtube:abc123"
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
