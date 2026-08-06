import assert from "node:assert/strict";
import test from "node:test";

import {
    execFile
} from "node:child_process";

import {
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

import {
    promisify
} from "node:util";

import {
    createSafeLocalCommit,
    validateCommitSpecification
} from "./commit-engine";

import type {
    RiverDevCommitSpecification
} from "./commit-engine";


const execFileAsync =
    promisify(
        execFile
    );


function createSpecification(
    branch:
        string
): RiverDevCommitSpecification {

    return {

        version:
            "1.0.0",

        id:
            "commit:test",

        name:
            "Test Commit",

        objective:
            "Test safe local commits.",

        branch,

        commitMessage:
            "Test: Create safe local commit",

        allowedPaths: [
            "approved"
        ],

        requirements: {

            workingTreeMustContainChanges:
                true,

            verificationMustPass:
                true,

            reviewMustPass:
                true,

            stagedScopeMustMatchAllowedPaths:
                true,

            pushAllowed:
                false,

            amendAllowed:
                false,

            allowEmptyCommit:
                false

        },

        qualityGates: [
            "scope",
            "verification",
            "review"
        ]

    };

}


async function createRepository():
Promise<string> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-commit-"
            )
        );

    await execFileAsync(
        "git",
        [
            "init"
        ],
        {
            cwd:
                root
        }
    );

    await execFileAsync(
        "git",
        [
            "checkout",
            "-b",
            "commit-test"
        ],
        {
            cwd:
                root
        }
    );

    await execFileAsync(
        "git",
        [
            "config",
            "user.email",
            "river-dev@example.test"
        ],
        {
            cwd:
                root
        }
    );

    await execFileAsync(
        "git",
        [
            "config",
            "user.name",
            "River Dev Test"
        ],
        {
            cwd:
                root
        }
    );

    await writeFile(
        join(
            root,
            "README.md"
        ),
        "Initial repository.\n",
        "utf8"
    );

    await execFileAsync(
        "git",
        [
            "add",
            "README.md"
        ],
        {
            cwd:
                root
        }
    );

    await execFileAsync(
        "git",
        [
            "commit",
            "-m",
            "Initial commit"
        ],
        {
            cwd:
                root
        }
    );

    return root;

}


test(
    "validates a safe commit specification",
    () => {

        assert.doesNotThrow(
            () => {
                validateCommitSpecification(
                    createSpecification(
                        "commit-test"
                    )
                );
            }
        );

    }
);


test(
    "rejects autonomous push",
    () => {

        const specification = {

            ...createSpecification(
                "commit-test"
            ),

            requirements: {

                ...createSpecification(
                    "commit-test"
                ).requirements,

                pushAllowed:
                    true

            }

        };

        assert.throws(
            () => {
                validateCommitSpecification(
                    specification
                );
            },
            TypeError
        );

    }
);


test(
    "blocks commit when verification fails",
    async () => {

        const root =
            await createRepository();

        try {

            await writeFile(
                join(
                    root,
                    "approved"
                ),
                "Approved change.\n",
                "utf8"
            );

            await assert.rejects(
                async () => {
                    await createSafeLocalCommit(
                        root,
                        {
                            specification:
                                createSpecification(
                                    "commit-test"
                                ),

                            verificationPassed:
                                false,

                            reviewPassed:
                                true,

                            dryRun:
                                true
                        }
                    );
                },
                TypeError
            );

        }
        finally {

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
    "blocks unexpected paths",
    async () => {

        const root =
            await createRepository();

        try {

            await writeFile(
                join(
                    root,
                    "unexpected.txt"
                ),
                "Unexpected change.\n",
                "utf8"
            );

            await assert.rejects(
                async () => {
                    await createSafeLocalCommit(
                        root,
                        {
                            specification:
                                createSpecification(
                                    "commit-test"
                                ),

                            verificationPassed:
                                true,

                            reviewPassed:
                                true,

                            dryRun:
                                true
                        }
                    );
                },
                TypeError
            );

        }
        finally {

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
    "dry run validates without creating a commit",
    async () => {

        const root =
            await createRepository();

        try {

            await writeFile(
                join(
                    root,
                    "approved"
                ),
                "Approved change.\n",
                "utf8"
            );

            const before =
                (
                    await execFileAsync(
                        "git",
                        [
                            "rev-parse",
                            "HEAD"
                        ],
                        {
                            cwd:
                                root
                        }
                    )
                ).stdout.trim();

            const result =
                await createSafeLocalCommit(
                    root,
                    {
                        specification:
                            createSpecification(
                                "commit-test"
                            ),

                        verificationPassed:
                            true,

                        reviewPassed:
                            true,

                        dryRun:
                            true
                    }
                );

            const after =
                (
                    await execFileAsync(
                        "git",
                        [
                            "rev-parse",
                            "HEAD"
                        ],
                        {
                            cwd:
                                root
                        }
                    )
                ).stdout.trim();

            assert.equal(
                result.committed,
                false
            );

            assert.equal(
                before,
                after
            );

        }
        finally {

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
    "creates a safe local commit",
    async () => {

        const root =
            await createRepository();

        try {

            await writeFile(
                join(
                    root,
                    "approved"
                ),
                "Approved change.\n",
                "utf8"
            );

            const result =
                await createSafeLocalCommit(
                    root,
                    {
                        specification:
                            createSpecification(
                                "commit-test"
                            ),

                        verificationPassed:
                            true,

                        reviewPassed:
                            true,

                        dryRun:
                            false
                    }
                );

            assert.equal(
                result.committed,
                true
            );

            const commitHash =
                result.commitHash;

            assert.ok(
                commitHash
            );

            assert.ok(
                commitHash.length >
                    0
            );

            const committedSource =
                await readFile(
                    join(
                        root,
                        "approved"
                    ),
                    "utf8"
                );

            assert.equal(
                committedSource,
                "Approved change.\n"
            );

            const status =
                (
                    await execFileAsync(
                        "git",
                        [
                            "status",
                            "--porcelain"
                        ],
                        {
                            cwd:
                                root
                        }
                    )
                ).stdout.trim();

            assert.equal(
                status,
                ""
            );

        }
        finally {

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


