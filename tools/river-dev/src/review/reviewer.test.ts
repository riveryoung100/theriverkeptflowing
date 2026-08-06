import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
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
    execFile
} from "node:child_process";

import {
    promisify
} from "node:util";

import {
    reviewRepository,
    validateReviewSpecification
} from "./reviewer";

import type {
    RiverDevReviewSpecification
} from "./reviewer";


const execFileAsync =
    promisify(
        execFile
    );


function createSpecification():
RiverDevReviewSpecification {

    return {

        id:
            "review:test",

        name:
            "Test Review",

        objective:
            "Review approved repository changes.",

        allowedPaths: [
            "approved"
        ],

        qualityGates: [
            "scope",
            "secret-scan"
        ],

        reviewChecks: [
            "working-tree",
            "approved-files"
        ]

    };

}


async function createRepository():
Promise<string> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-review-"
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
            "review-test"
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
        "Review test repository.\n",
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
            "Initial test commit"
        ],
        {
            cwd:
                root
        }
    );

    return root;

}


test(
    "validates a review specification",
    () => {

        assert.doesNotThrow(
            () => {
                validateReviewSpecification(
                    createSpecification()
                );
            }
        );

    }
);


test(
    "accepts approved changed paths",
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
                await reviewRepository(
                    root,
                    createSpecification()
                );

            assert.equal(
                result.passed,
                true
            );

            assert.deepEqual(
                result.unexpectedPaths,
                []
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
    "rejects unexpected changed paths",
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

            const result =
                await reviewRepository(
                    root,
                    createSpecification()
                );

            assert.equal(
                result.passed,
                false
            );

            assert.deepEqual(
                result.unexpectedPaths,
                [
                    "unexpected.txt"
                ]
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
    "detects potential secrets",
    async () => {

        const root =
            await createRepository();

        try {

            const secretLabel =
                [
                    "api",
                    "key"
                ].join(
                    "_"
                );

            const secretValue =
                [
                    "super",
                    "secret",
                    "value"
                ].join(
                    "-"
                );

            await writeFile(
                join(
                    root,
                    "approved"
                ),
                `${secretLabel} = "${secretValue}"\n`,
                "utf8"
            );

            const result =
                await reviewRepository(
                    root,
                    createSpecification()
                );

            assert.equal(
                result.passed,
                false
            );

            assert.equal(
                result.findings.some(
                    (finding) => {
                        return (
                            finding.code ===
                            "potential-secret"
                        );
                    }
                ),
                true
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
    "reports a clean working tree",
    async () => {

        const root =
            await createRepository();

        try {

            const result =
                await reviewRepository(
                    root,
                    createSpecification()
                );

            assert.equal(
                result.passed,
                true
            );

            assert.equal(
                result.changedPaths.length,
                0
            );

            assert.equal(
                result.findings.some(
                    (finding) => {
                        return (
                            finding.code ===
                            "clean-working-tree"
                        );
                    }
                ),
                true
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

