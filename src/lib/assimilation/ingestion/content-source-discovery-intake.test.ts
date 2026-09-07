import assert from "node:assert/strict";
import test from "node:test";

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

import {
    createFileSystemCanonicalContentSourcePersistence
} from "../persistence/canonical-content-source-filesystem";

import {
    createFileSystemContentSourceDiscoveryProvenancePersistence
} from "../persistence/content-source-discovery-provenance-filesystem";

import {
    createGovernedPublishedContentSourceIntake
} from "./published-content-source-intake";

import {
    createGovernedContentSourceDiscoveryIntake
} from "./content-source-discovery-intake";

import type {
    ContentSourceDiscoveryProvider
} from "./content-source-discovery-provider";


function createProvider(): ContentSourceDiscoveryProvider {

    return {
        platform:
            "youtube",

        async discover() {

            return {
                platform:
                    "youtube",

                nextCursor:
                    "page-two",

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
                                "Already-posted River source.",

                            publishedAt:
                                "2026-09-07T12:00:00.000Z"
                        },

                        providerMetadata: {
                            id: {
                                kind:
                                    "youtube#video",

                                videoId:
                                    "abc123"
                            },

                            snippet: {
                                title:
                                    "Published River Video"
                            }
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
                                "2026-09-06T12:00:00.000Z"
                        }
                    }
                ]
            };

        }
    };

}


test(
    "discovers validates preserves provenance normalizes and persists provider sources through one governed path",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-intake-"
                )
            );

        try {

            const canonicalPersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const provenancePersistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const intake =
                createGovernedPublishedContentSourceIntake(
                    canonicalPersistence
                );

            const orchestrator =
                createGovernedContentSourceDiscoveryIntake(
                    createProvider(),
                    intake,
                    provenancePersistence
                );

            const result =
                await orchestrator.execute(
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

            assert.equal(
                result.ingested.length,
                2
            );

            assert.equal(
                result.provenance.length,
                2
            );

            assert.equal(
                result.ingested[0]?.record.sourceId,
                "source:youtube:abc123"
            );

            assert.equal(
                result.ingested[1]?.record.sourceId,
                "source:youtube:def456"
            );

            assert.equal(
                result.provenance[0]?.record.sourceId,
                "source:youtube:abc123"
            );

            assert.equal(
                result.provenance[0]?.record.providerRecordId,
                "youtube:abc123"
            );

            assert.equal(
                result.provenance[0]?.record.discoveredAt,
                "2026-09-07T18:00:00.000Z"
            );

            assert.equal(
                result.provenance[0]?.record.capturedAt,
                "2026-09-07T19:00:00.000Z"
            );

            assert.deepEqual(
                result.provenance[0]?.record.providerMetadata,
                {
                    id: {
                        kind:
                            "youtube#video",

                        videoId:
                            "abc123"
                    },

                    snippet: {
                        title:
                            "Published River Video"
                    }
                }
            );

            const canonical =
                await canonicalPersistence.retrieve(
                    "source:youtube:abc123"
                );

            const provenance =
                await provenancePersistence.retrieve(
                    "discovery-provenance:source:youtube:abc123:youtube:abc123"
                );

            assert.equal(
                canonical.sourceId,
                provenance.sourceId
            );

            assert.equal(
                "providerRecordId" in canonical,
                false
            );

            assert.equal(
                "providerMetadata" in canonical,
                false
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
    "does not invoke persistence when provider discovery fails validation",
    async () => {

        let canonicalCalls =
            0;

        let provenanceCalls =
            0;

        const provider:
            ContentSourceDiscoveryProvider =
            {
                platform:
                    "youtube",

                async discover() {

                    return {
                        platform:
                            "instagram",

                        sources:
                            []
                    };

                }
            };

        const orchestrator =
            createGovernedContentSourceDiscoveryIntake(
                provider,
                {
                    async ingest() {

                        canonicalCalls +=
                            1;

                        throw new Error(
                            "should not execute"
                        );

                    }
                },
                {
                    async persist() {

                        provenanceCalls +=
                            1;

                        throw new Error(
                            "should not execute"
                        );

                    },

                    async retrieve() {

                        throw new Error(
                            "should not execute"
                        );

                    }
                }
            );

        await assert.rejects(
            () =>
                orchestrator.execute(
                    {
                        platform:
                            "youtube",

                        publisherId:
                            "river-channel"
                    }
                )
        );

        assert.equal(
            canonicalCalls,
            0
        );

        assert.equal(
            provenanceCalls,
            0
        );

    }
);


test(
    "prevalidates the complete discovery batch before creating durable provenance",
    async () => {

        let provenanceCalls =
            0;

        const provider:
            ContentSourceDiscoveryProvider =
            {
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
                                        "Valid",

                                    publishedAt:
                                        "2026-09-07T12:00:00.000Z"
                                }
                            },

                            {
                                providerRecordId:
                                    "youtube:bad",

                                discoveredAt:
                                    "2026-09-07T18:00:00.000Z",

                                source: {
                                    platform:
                                        "youtube",

                                    url:
                                        "not-a-valid-url",

                                    externalPlatformId:
                                        "bad",

                                    title:
                                        "Invalid",

                                    publishedAt:
                                        "2026-09-07T12:00:00.000Z"
                                }
                            }
                        ]
                    };

                }
            };

        const orchestrator =
            createGovernedContentSourceDiscoveryIntake(
                provider,
                {
                    async ingest() {

                        throw new Error(
                            "should not execute"
                        );

                    }
                },
                {
                    async persist() {

                        provenanceCalls +=
                            1;

                        return "unexpected";
                    },

                    async retrieve() {

                        throw new Error(
                            "should not execute"
                        );

                    }
                }
            );

        await assert.rejects(
            () =>
                orchestrator.execute(
                    {
                        platform:
                            "youtube",

                        publisherId:
                            "river-channel"
                    }
                )
        );

        assert.equal(
            provenanceCalls,
            0
        );

    }
);


test(
    "preserves provenance when canonical persistence fails after discovery evidence is captured",
    async () => {

        let provenancePersisted =
            false;

        const provider:
            ContentSourceDiscoveryProvider =
            {
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
                                        "Published River Video",

                                    publishedAt:
                                        "2026-09-07T12:00:00.000Z"
                                },

                                providerMetadata: {
                                    raw:
                                        "provider-evidence"
                                }
                            }
                        ]
                    };

                }
            };

        const orchestrator =
            createGovernedContentSourceDiscoveryIntake(
                provider,
                {
                    async ingest() {

                        assert.equal(
                            provenancePersisted,
                            true
                        );

                        throw new Error(
                            "canonical persistence failed"
                        );

                    }
                },
                {
                    async persist(
                        record
                    ) {

                        assert.equal(
                            record.sourceId,
                            "source:youtube:abc123"
                        );

                        provenancePersisted =
                            true;

                        return "provenance-path";
                    },

                    async retrieve() {

                        throw new Error(
                            "not required"
                        );

                    }
                }
            );

        await assert.rejects(
            () =>
                orchestrator.execute(
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
                ),
            /canonical persistence failed/
        );

        assert.equal(
            provenancePersisted,
            true
        );

    }
);


test(
    "fails closed when immutable provenance already exists on rerun",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-intake-"
                )
            );

        try {

            const canonicalPersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const provenancePersistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const intake =
                createGovernedPublishedContentSourceIntake(
                    canonicalPersistence
                );

            const orchestrator =
                createGovernedContentSourceDiscoveryIntake(
                    createProvider(),
                    intake,
                    provenancePersistence
                );

            await orchestrator.execute(
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

            await assert.rejects(
                () =>
                    orchestrator.execute(
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
                    )
            );

            const existingCanonical =
                await canonicalPersistence.retrieve(
                    "source:youtube:abc123"
                );

            const existingProvenance =
                await provenancePersistence.retrieve(
                    "discovery-provenance:source:youtube:abc123:youtube:abc123"
                );

            assert.equal(
                existingCanonical.sourceId,
                existingProvenance.sourceId
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
    "keeps provider pagination state outside canonical and provenance records",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-intake-"
                )
            );

        try {

            const canonicalPersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const provenancePersistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const intake =
                createGovernedPublishedContentSourceIntake(
                    canonicalPersistence
                );

            const orchestrator =
                createGovernedContentSourceDiscoveryIntake(
                    createProvider(),
                    intake,
                    provenancePersistence
                );

            const result =
                await orchestrator.execute(
                    {
                        platform:
                            "youtube",

                        publisherId:
                            "river-channel",

                        cursor:
                            "page-one"
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

            assert.equal(
                "nextCursor" in result.ingested[0]!.record,
                false
            );

            assert.equal(
                "nextCursor" in result.provenance[0]!.record,
                false
            );

            assert.equal(
                "cursor" in result.provenance[0]!.record,
                false
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
