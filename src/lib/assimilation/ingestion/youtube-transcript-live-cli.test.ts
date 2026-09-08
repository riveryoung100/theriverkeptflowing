import assert from "node:assert/strict";
import {
    mkdtemp,
    rm
} from "node:fs/promises";
import {
    join
} from "node:path";
import {
    tmpdir
} from "node:os";
import test from "node:test";

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG,
    parseYouTubeTranscriptLiveCliArguments,
    runYouTubeTranscriptLiveCli
} from "./youtube-transcript-live-cli";


test(
    "CIF-020 parses one authorized YouTube transcript source with optional language",
    () => {

        const parsed =
            parseYouTubeTranscriptLiveCliArguments(
                [
                    ".river-content",
                    "source:youtube:dkBgPbiFTX0",
                    YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG,
                    "--language",
                    "en"
                ]
            );

        assert.deepEqual(
            parsed,
            {
                persistenceRoot:
                    ".river-content",

                sourceId:
                    "source:youtube:dkBgPbiFTX0",

                preferredLanguage:
                    "en"
            }
        );

    }
);


test(
    "CIF-020 rejects duplicate transcript authorization flags",
    () => {

        assert.throws(
            () =>
                parseYouTubeTranscriptLiveCliArguments(
                    [
                        ".river-content",
                        "source:youtube:dkBgPbiFTX0",
                        YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG,
                        YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG
                    ]
                ),
            /authorization may be specified only once/
        );

    }
);


test(
    "CIF-020 rejects missing transcript authorization before execution",
    () => {

        assert.throws(
            () =>
                parseYouTubeTranscriptLiveCliArguments(
                    [
                        ".river-content",
                        "source:youtube:dkBgPbiFTX0"
                    ]
                ),
            /Explicit live YouTube transcript acquisition authorization is required/
        );

    }
);


test(
    "CIF-020 CLI executes the governed transcript intake through injected fetch only",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-cif020-cli-"
                )
            );

        try {

            const canonicalPersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            await canonicalPersistence.persist(
                {
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
                }
            );

            let calls =
                0;

            const result =
                await runYouTubeTranscriptLiveCli(
                    {
                        arguments:
                            [
                                root,
                                "source:youtube:dkBgPbiFTX0",
                                YOUTUBE_TRANSCRIPT_LIVE_CLI_AUTHORIZATION_FLAG,
                                "--language",
                                "en"
                            ],

                        now:
                            () =>
                                "2026-09-08T19:00:00.000Z",

                        fetcher:
                            async (
                                input
                            ) => {

                                calls +=
                                    1;

                                const url =
                                    input.toString();

                                if (
                                    calls ===
                                    1
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
                                        '<html>"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=dkBgPbiFTX0&lang=en","languageCode":"en"}]</html>',
                                        {
                                            status:
                                                200
                                        }
                                    );

                                }

                                return new Response(
                                    "<transcript><text>Published transcript.</text></transcript>",
                                    {
                                        status:
                                            200
                                    }
                                );

                            }
                    }
                );

            assert.equal(
                calls,
                2
            );

            assert.equal(
                result.sourceId,
                "source:youtube:dkBgPbiFTX0"
            );

            assert.equal(
                result.intake.record.transcript.text,
                "Published transcript."
            );

            assert.equal(
                result.intake.record.transcript.provenance.provider,
                "youtube"
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
