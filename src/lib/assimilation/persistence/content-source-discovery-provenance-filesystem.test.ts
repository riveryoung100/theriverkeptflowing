import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
    rm,
    writeFile,
    mkdir
} from "node:fs/promises";

import {
    dirname,
    join
} from "node:path";

import {
    tmpdir
} from "node:os";

import {
    createContentSourceDiscoveryProvenanceRecord
} from "../ingestion/content-source-discovery-provenance";

import {
    createFileSystemContentSourceDiscoveryProvenancePersistence
} from "./content-source-discovery-provenance-filesystem";


test(
    "persists and retrieves discovery provenance with exact raw metadata round trip",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-provenance-"
                )
            );

        try {

            const persistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const record =
                createContentSourceDiscoveryProvenanceRecord(
                    {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        providerRecordId:
                            "youtube:abc123",

                        discoveredAt:
                            "2026-09-07T18:00:00.000Z",

                        providerMetadata: {
                            id: {
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
                        now:
                            "2026-09-07T19:00:00.000Z"
                    }
                );

            const path =
                await persistence.persist(
                    record
                );

            assert.match(
                path,
                /content-source-discovery-provenance/
            );

            const retrieved =
                await persistence.retrieve(
                    record.provenanceId
                );

            assert.deepEqual(
                retrieved,
                record
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
    "keeps discovery provenance physically separate from canonical source persistence",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-provenance-"
                )
            );

        try {

            const persistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const record =
                createContentSourceDiscoveryProvenanceRecord(
                    {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        providerRecordId:
                            "youtube:abc123",

                        discoveredAt:
                            "2026-09-07T18:00:00.000Z"
                    },
                    {
                        now:
                            "2026-09-07T19:00:00.000Z"
                    }
                );

            const path =
                await persistence.persist(
                    record
                );

            assert.equal(
                path.includes(
                    "canonical-content-sources"
                ),
                false
            );

            assert.equal(
                path.includes(
                    "content-source-discovery-provenance"
                ),
                true
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
    "fails closed rather than overwriting immutable discovery provenance",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-provenance-"
                )
            );

        try {

            const persistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const record =
                createContentSourceDiscoveryProvenanceRecord(
                    {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        providerRecordId:
                            "youtube:abc123",

                        discoveredAt:
                            "2026-09-07T18:00:00.000Z"
                    },
                    {
                        now:
                            "2026-09-07T19:00:00.000Z"
                    }
                );

            await persistence.persist(
                record
            );

            await assert.rejects(
                () =>
                    persistence.persist(
                        record
                    )
            );

            const retrieved =
                await persistence.retrieve(
                    record.provenanceId
                );

            assert.deepEqual(
                retrieved,
                record
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
    "fails closed on malformed persisted discovery provenance",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "discovery-provenance-"
                )
            );

        try {

            const persistence =
                createFileSystemContentSourceDiscoveryProvenancePersistence(
                    root
                );

            const record =
                createContentSourceDiscoveryProvenanceRecord(
                    {
                        sourceId:
                            "source:youtube:abc123",

                        platform:
                            "youtube",

                        providerRecordId:
                            "youtube:abc123",

                        discoveredAt:
                            "2026-09-07T18:00:00.000Z"
                    },
                    {
                        now:
                            "2026-09-07T19:00:00.000Z"
                    }
                );

            const path =
                await persistence.persist(
                    record
                );

            await writeFile(
                path,
                "{bad-json",
                "utf8"
            );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        record.provenanceId
                    ),
                /malformed JSON/
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
