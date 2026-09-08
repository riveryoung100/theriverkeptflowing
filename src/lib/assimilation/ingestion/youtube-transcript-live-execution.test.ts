import assert from "node:assert/strict";
import {
    mkdtemp,
    readFile,
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
    YOUTUBE_TRANSCRIPT_LIVE_EXECUTION_AUTHORIZATION,
    executeYouTubeTranscriptLiveAcquisition
} from "./youtube-transcript-live-execution";


test(
    "CIF-020 governed live execution retrieves the canonical source, acquires injected captions, and persists the transcript",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-cif020-"
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
                await executeYouTubeTranscriptLiveAcquisition(
                    {
                        persistenceRoot:
                            root,

                        sourceId:
                            "source:youtube:dkBgPbiFTX0",

                        authorization:
                            YOUTUBE_TRANSCRIPT_LIVE_EXECUTION_AUTHORIZATION,

                        now:
                            "2026-09-08T18:40:00.000Z",

                        preferredLanguage:
                            "en",

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

                                assert.equal(
                                    url,
                                    "https://www.youtube.com/api/timedtext?v=dkBgPbiFTX0&lang=en"
                                );

                                return new Response(
                                    '<transcript><text>God&apos;s grace is sufficient.</text><text>Keep going and trust Him.</text></transcript>',
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
                result.intake.record.sourceId,
                "source:youtube:dkBgPbiFTX0"
            );

            assert.equal(
                result.intake.record.transcript.text,
                "God's grace is sufficient. Keep going and trust Him."
            );

            assert.equal(
                result.intake.record.transcript.provenance.type,
                "platform"
            );

            assert.equal(
                result.intake.record.transcript.provenance.provider,
                "youtube"
            );

            assert.equal(
                result.intake.record.transcript.provenance.language,
                "en"
            );

            const persisted =
                JSON.parse(
                    await readFile(
                        result.intake.storedPath,
                        "utf8"
                    )
                ) as {
                    sourceId:
                        string;
                    transcript:
                        {
                            text:
                                string;
                        };
                };

            assert.equal(
                persisted.sourceId,
                "source:youtube:dkBgPbiFTX0"
            );

            assert.equal(
                persisted.transcript.text,
                "God's grace is sufficient. Keep going and trust Him."
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


test(
    "CIF-020 rejects missing live authorization before any external request",
    async () => {

        let calls =
            0;

        await assert.rejects(
            () =>
                executeYouTubeTranscriptLiveAcquisition(
                    {
                        persistenceRoot:
                            ".river-content",

                        sourceId:
                            "source:youtube:dkBgPbiFTX0",

                        authorization:
                            "NOT_AUTHORIZED",

                        now:
                            "2026-09-08T18:40:00.000Z",

                        fetcher:
                            async () => {

                                calls +=
                                    1;

                                throw new Error(
                                    "must not execute"
                                );

                            }
                    }
                ),
            /Explicit live YouTube transcript acquisition authorization is required/
        );

        assert.equal(
            calls,
            0
        );

    }
);
