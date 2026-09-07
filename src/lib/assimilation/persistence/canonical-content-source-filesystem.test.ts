import assert from "node:assert/strict";

import {
    access,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import test from "node:test";

import {
    normalizePublishedContentSource
} from "../ingestion/content-source-normalization";

import {
    createFileSystemCanonicalContentSourcePersistence
} from "./canonical-content-source-filesystem";


function createRecord() {

    return normalizePublishedContentSource(
        {
            platform:
                "youtube",
            url:
                "https://youtu.be/abc123",
            title:
                "Canonical Source",
            description:
                "Durable River content source.",
            publishedAt:
                "2026-09-07T12:00:00Z",
            durationSeconds:
                420,
            pillar:
                "faith",
            tags: [
                "faith",
                "purpose"
            ]
        },
        {
            now:
                "2026-09-07T13:00:00.000Z"
        }
    );

}


test(
    "persists and retrieves a canonical content source with exact round-trip data",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const record =
                createRecord();

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const storedPath =
                await persistence.persist(
                    record
                );

            assert.equal(
                storedPath,
                join(
                    root,
                    "canonical-content-sources",
                    `${encodeURIComponent(record.sourceId)}.json`
                )
            );

            const stored =
                JSON.parse(
                    await readFile(
                        storedPath,
                        "utf8"
                    )
                );

            assert.deepEqual(
                stored,
                record
            );

            const retrieved =
                await persistence.retrieve(
                    record.sourceId
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
    "keeps canonical sources physically separate from generated assimilation records",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const record =
                createRecord();

            const storedPath =
                await createFileSystemCanonicalContentSourcePersistence(
                    root
                )
                    .persist(
                        record
                    );

            assert.equal(
                storedPath.startsWith(
                    join(
                        root,
                        "canonical-content-sources"
                    )
                ),
                true
            );

            assert.equal(
                storedPath.includes(
                    join(
                        root,
                        "generated-records"
                    )
                ),
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
    "fails closed rather than overwriting an existing canonical source identity",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const record =
                createRecord();

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const storedPath =
                await persistence.persist(
                    record
                );

            const before =
                await readFile(
                    storedPath,
                    "utf8"
                );

            await assert.rejects(
                () =>
                    persistence.persist(
                        record
                    )
            );

            assert.equal(
                await readFile(
                    storedPath,
                    "utf8"
                ),
                before
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
    "contains traversal-shaped River source identities inside canonical source storage",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const record = {
                ...createRecord(),
                sourceId:
                    "source:youtube:../../outside"
            };

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const storedPath =
                await persistence.persist(
                    record
                );

            assert.equal(
                storedPath,
                join(
                    root,
                    "canonical-content-sources",
                    `${encodeURIComponent(record.sourceId)}.json`
                )
            );

            await access(
                storedPath
            );

            await assert.rejects(
                () =>
                    access(
                        join(
                            root,
                            "outside.json"
                        )
                    )
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
    "fails closed when a requested canonical source does not exist",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        "source:youtube:missing"
                    )
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
    "fails closed when persisted canonical source JSON is malformed",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const record =
                createRecord();

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const storedPath =
                await persistence.persist(
                    record
                );

            await writeFile(
                storedPath,
                "{malformed",
                "utf8"
            );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        record.sourceId
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


test(
    "fails closed when persisted canonical source violates authoritative validation",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const record =
                createRecord();

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            const storedPath =
                await persistence.persist(
                    record
                );

            const corrupted = {
                ...record,
                originalSourcePreserved:
                    false
            };

            await writeFile(
                storedPath,
                JSON.stringify(
                    corrupted
                ),
                "utf8"
            );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        record.sourceId
                    ),
                /authoritative validation/
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
    "fails closed when persisted identity differs from requested River source identity",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "canonical-content-source-"
                )
            );

        try {

            const requestedId =
                "source:youtube:requested";

            const otherRecord = {
                ...createRecord(),
                sourceId:
                    "source:youtube:other"
            };

            const targetDirectory =
                join(
                    root,
                    "canonical-content-sources"
                );

            const targetPath =
                join(
                    targetDirectory,
                    `${encodeURIComponent(requestedId)}.json`
                );

            await mkdir(
                targetDirectory,
                {
                    recursive:
                        true
                }
            );

            await writeFile(
                targetPath,
                JSON.stringify(
                    otherRecord
                ),
                "utf8"
            );

            const persistence =
                createFileSystemCanonicalContentSourcePersistence(
                    root
                );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        requestedId
                    ),
                /identity does not match/
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
