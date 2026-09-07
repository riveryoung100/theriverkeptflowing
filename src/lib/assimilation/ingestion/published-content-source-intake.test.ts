import assert from "node:assert/strict";

import {
    mkdtemp,
    readFile,
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
    createGovernedPublishedContentSourceIntake
} from "./published-content-source-intake";


function createInput() {

    return {
        platform:
            "youtube",
        url:
            "https://youtu.be/abc123",
        title:
            "Published River Source",
        description:
            "Already-posted source content.",
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
    };

}


test(
    "normalizes and durably persists a published source in one governed operation",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "published-source-intake-"
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

            const result =
                await intake.ingest(
                    createInput(),
                    {
                        now:
                            "2026-09-07T13:00:00.000Z"
                    }
                );

            assert.equal(
                result.record.sourceId,
                "source:youtube:abc123"
            );

            assert.equal(
                result.record.sourceStatus,
                "transcript-pending"
            );

            assert.equal(
                result.record.originalSourcePreserved,
                true
            );

            const stored =
                JSON.parse(
                    await readFile(
                        result.storedPath,
                        "utf8"
                    )
                );

            assert.deepEqual(
                stored,
                result.record
            );

            const retrieved =
                await persistence.retrieve(
                    result.record.sourceId
                );

            assert.deepEqual(
                retrieved,
                result.record
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
    "preserves deterministic River identity across equivalent source URLs",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "published-source-intake-"
                )
            );

        try {

            const firstPersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    join(
                        root,
                        "first"
                    )
                );

            const secondPersistence =
                createFileSystemCanonicalContentSourcePersistence(
                    join(
                        root,
                        "second"
                    )
                );

            const first =
                await createGovernedPublishedContentSourceIntake(
                    firstPersistence
                )
                    .ingest(
                        createInput(),
                        {
                            now:
                                "2026-09-07T13:00:00.000Z"
                        }
                    );

            const second =
                await createGovernedPublishedContentSourceIntake(
                    secondPersistence
                )
                    .ingest(
                        {
                            ...createInput(),
                            url:
                                "https://www.youtube.com/watch?v=abc123"
                        },
                        {
                            now:
                                "2026-09-07T13:00:00.000Z"
                        }
                    );

            assert.equal(
                first.record.sourceId,
                second.record.sourceId
            );

            assert.equal(
                first.record.canonicalUrl,
                second.record.canonicalUrl
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
    "fails closed on duplicate durable source identity",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "published-source-intake-"
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

            const options = {
                now:
                    "2026-09-07T13:00:00.000Z"
            };

            await intake.ingest(
                createInput(),
                options
            );

            await assert.rejects(
                () =>
                    intake.ingest(
                        createInput(),
                        options
                    )
            );

            const stored =
                await persistence.retrieve(
                    "source:youtube:abc123"
                );

            assert.equal(
                stored.title,
                "Published River Source"
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
    "does not persist malformed published source input",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "published-source-intake-"
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

            await assert.rejects(
                () =>
                    intake.ingest(
                        {
                            ...createInput(),
                            url:
                                "not-a-url"
                        }
                    )
            );

            await assert.rejects(
                () =>
                    persistence.retrieve(
                        "source:youtube:abc123"
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
