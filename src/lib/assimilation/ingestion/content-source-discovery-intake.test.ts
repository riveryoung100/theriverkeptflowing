import assert from "node:assert/strict";

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

import test from "node:test";

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    type ContentSourceDiscoveryProvider
} from "./content-source-discovery-provider";

import {
    createGovernedContentSourceDiscoveryIntake
} from "./content-source-discovery-intake";

import {
    createGovernedPublishedContentSourceIntake
} from "./published-content-source-intake";


function createProvider():
ContentSourceDiscoveryProvider {

    return {

        platform:
            "youtube",

        async discover() {

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
                                "First Published River Video",
                            publishedAt:
                                "2026-09-07T12:00:00.000Z",
                            durationSeconds:
                                420
                        }
                    },
                    {
                        providerRecordId:
                            "youtube:def456",
                        discoveredAt:
                            "2026-09-07T18:00:00.000Z",
                        source: {
                            platform:
                                "youtube",
                            url:
                                "https://www.youtube.com/watch?v=def456",
                            externalPlatformId:
                                "def456",
                            title:
                                "Second Published River Video",
                            publishedAt:
                                "2026-09-07T13:00:00.000Z",
                            durationSeconds:
                                360
                        }
                    }
                ],
                nextCursor:
                    "page-two"
            };

        }

    };

}


test(
    "discovers validates normalizes and persists provider sources through one governed path",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-intake-"
                )
            );

        try {

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const intake =
                createGovernedPublishedContentSourceIntake(
                    persistence
                );

            const orchestration =
                createGovernedContentSourceDiscoveryIntake(
                    createProvider(),
                    intake
                );

            const result =
                await orchestration.execute(
                    {
                        platform:
                            "youtube",
                        publisherId:
                            "river-channel",
                        limit:
                            25
                    },
                    {
                        now:
                            "2026-09-07T19:00:00.000Z"
                    }
                );

            assert.equal(
                result.discovery.sources.length,
                2
            );

            assert.equal(
                result.ingested.length,
                2
            );

            assert.equal(
                result.ingested[0]!
                    .record
                    .sourceId,
                "source:youtube:abc123"
            );

            assert.equal(
                result.ingested[1]!
                    .record
                    .sourceId,
                "source:youtube:def456"
            );

            assert.equal(
                result.discovery.nextCursor,
                "page-two"
            );

            const first =
                await persistence.retrieve(
                    "source:youtube:abc123"
                );

            const second =
                await persistence.retrieve(
                    "source:youtube:def456"
                );

            assert.equal(
                first.title,
                "First Published River Video"
            );

            assert.equal(
                second.title,
                "Second Published River Video"
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
    "does not invoke intake when provider discovery fails validation",
    async () => {

        let intakeCalls =
            0;

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

        const orchestration =
            createGovernedContentSourceDiscoveryIntake(
                provider,
                {
                    async ingest() {

                        intakeCalls +=
                            1;

                        throw new Error(
                            "Intake must not execute."
                        );

                    }
                }
            );

        await assert.rejects(
            () =>
                orchestration.execute(
                    {
                        platform:
                            "youtube",
                        publisherId:
                            "river-channel"
                    }
                ),
            /source platform does not match/
        );

        assert.equal(
            intakeCalls,
            0
        );

    }
);


test(
    "fails closed when a discovered source collides with an existing durable River identity",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-intake-"
                )
            );

        try {

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const intake =
                createGovernedPublishedContentSourceIntake(
                    persistence
                );

            const orchestration =
                createGovernedContentSourceDiscoveryIntake(
                    createProvider(),
                    intake
                );

            const options = {
                now:
                    "2026-09-07T19:00:00.000Z"
            };

            await orchestration.execute(
                {
                    platform:
                        "youtube",
                    publisherId:
                        "river-channel"
                },
                options
            );

            await assert.rejects(
                () =>
                    orchestration.execute(
                        {
                            platform:
                                "youtube",
                            publisherId:
                                "river-channel"
                        },
                        options
                    )
            );

            const first =
                await persistence.retrieve(
                    "source:youtube:abc123"
                );

            assert.equal(
                first.title,
                "First Published River Video"
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
    "preserves provider pagination metadata without allowing it into canonical records",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-intake-"
                )
            );

        try {

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const result =
                await createGovernedContentSourceDiscoveryIntake(
                    createProvider(),
                    createGovernedPublishedContentSourceIntake(
                        persistence
                    )
                )
                    .execute(
                        {
                            platform:
                                "youtube",
                            publisherId:
                                "river-channel"
                        },
                        {
                            now:
                                "2026-09-07T19:00:00.000Z"
                        }
                    );

            assert.equal(
                result.discovery.nextCursor,
                "page-two"
            );

            for (
                const item of
                result.ingested
            ) {

                assert.equal(
                    "nextCursor" in
                    item.record,
                    false
                );

                assert.equal(
                    "providerRecordId" in
                    item.record,
                    false
                );

            }

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
