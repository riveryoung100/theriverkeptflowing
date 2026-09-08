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
    Readable
} from "node:stream";

import {
    test
} from "node:test";

import {
    parseYouTubeContentSourceLiveCliArguments,
    readYouTubeApiCredentialFromStdin,
    runYouTubeContentSourceLiveCli
} from "./youtube-content-source-live-cli";


test(
    "CIF-016 requires explicit CLI authorization before credential consumption",
    async () => {

        let credentialReads =
            0;

        await assert.rejects(
            () =>
                runYouTubeContentSourceLiveCli(
                    {
                        arguments: [
                            ".river-content",
                            "@TheRiverKeptFlowing"
                        ],

                        readCredential:
                            async () => {

                                credentialReads +=
                                    1;

                                return "must-not-be-read";

                            }
                    }
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
    "CIF-016 validates CLI shape before credential consumption",
    async () => {

        let credentialReads =
            0;

        await assert.rejects(
            () =>
                runYouTubeContentSourceLiveCli(
                    {
                        arguments: [
                            ".river-content",
                            "@TheRiverKeptFlowing",
                            "--authorize-live-youtube-discovery",
                            "--limit",
                            "0"
                        ],

                        readCredential:
                            async () => {

                                credentialReads +=
                                    1;

                                return "must-not-be-read";

                            }
                    }
                ),
            /YouTube discovery limit must be a positive integer/
        );

        assert.equal(
            credentialReads,
            0
        );

    }
);


test(
    "CIF-016 parses bounded live discovery arguments without ambient configuration",
    () => {

        assert.deepEqual(
            parseYouTubeContentSourceLiveCliArguments(
                [
                    ".river-content",
                    "@TheRiverKeptFlowing",
                    "--authorize-live-youtube-discovery",
                    "--limit",
                    "10",
                    "--cursor",
                    "NEXT_PAGE"
                ]
            ),
            {
                persistenceRoot:
                    ".river-content",

                handle:
                    "@TheRiverKeptFlowing",

                limit:
                    10,

                cursor:
                    "NEXT_PAGE"
            }
        );

    }
);


test(
    "CIF-016 reads a credential from an injected stdin stream",
    async () => {

        const input =
            Readable.from(
                [
                    "test-youtube-credential",
                    "\n"
                ]
            );

        assert.equal(
            await readYouTubeApiCredentialFromStdin(
                input
            ),
            "test-youtube-credential"
        );

    }
);


test(
    "CIF-016 CLI reaches governed durable discovery only through injected credential and fetch boundaries",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "youtube-live-cli-"
                )
            );

        try {

            let credentialReads =
                0;

            let fetchCalls =
                0;

            const fetcher:
                typeof fetch =
                async (
                    input
                ) => {

                    fetchCalls +=
                        1;

                    const url =
                        new URL(
                            input.toString()
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

                    assert.equal(
                        url.searchParams.get(
                            "maxResults"
                        ),
                        "3"
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
                                                "cif016video"
                                        },

                                        snippet: {
                                            title:
                                                "CIF-016 Published Video",

                                            description:
                                                "Published provider source.",

                                            publishedAt:
                                                "2026-09-07T18:00:00.000Z",

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
                await runYouTubeContentSourceLiveCli(
                    {
                        arguments: [
                            root,
                            "@TheRiverKeptFlowing",
                            "--authorize-live-youtube-discovery",
                            "--limit",
                            "3"
                        ],

                        readCredential:
                            async () => {

                                credentialReads +=
                                    1;

                                return "test-youtube-credential";

                            },

                        now:
                            () =>
                                "2026-09-07T19:30:00.000Z",

                        fetcher
                    }
                );

            assert.equal(
                credentialReads,
                1
            );

            assert.equal(
                fetchCalls,
                2
            );

            assert.equal(
                result.channel.channelId,
                "UC_RIVER_CHANNEL"
            );

            assert.equal(
                result.intake.ingested.length,
                1
            );

            assert.equal(
                result.intake.ingested[0]?.record.sourceId,
                "source:youtube:cif016video"
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
