import assert from "node:assert/strict";
import test from "node:test";

import {
    execFile
} from "node:child_process";

import {
    promisify
} from "node:util";

import {
    loadRiverDevConfiguration
} from "../core/config";

import {
    createVerificationRunner,
    validateVerificationSpecification
} from "./verification";

import type {
    RiverDevVerificationSpecification
} from "./verification";


const execFileAsync =
    promisify(
        execFile
    );


async function readCurrentBranch():
Promise<string> {

    const result =
        await execFileAsync(
            "git",
            [
                "branch",
                "--show-current"
            ],
            {
                cwd:
                    process.cwd(),

                windowsHide:
                    true
            }
        );

    const branch =
        result.stdout.trim();

    if (
        branch.length ===
        0
    ) {
        throw new TypeError(
            "Could not determine current Git branch."
        );
    }

    return branch;

}


function createSpecification(
    branch: string
): RiverDevVerificationSpecification {

    return {

        version:
            "1.0.0",

        verificationId:
            "verification:test",

        branch,

        commands: [
            {
                name:
                    "git-branch-current",

                required:
                    true
            }
        ]

    };

}


test(
    "validates a verification specification",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const branch =
            await readCurrentBranch();

        const specification =
            createSpecification(
                branch
            );

        assert.doesNotThrow(
            () => {
                validateVerificationSpecification(
                    configuration,
                    specification
                );
            }
        );

    }
);


test(
    "rejects unknown verification commands",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const branch =
            await readCurrentBranch();

        const specification = {

            ...createSpecification(
                branch
            ),

            commands: [
                {
                    name:
                        "unknown-command",

                    required:
                        true
                }
            ]

        };

        assert.throws(
            () => {
                validateVerificationSpecification(
                    configuration,
                    specification
                );
            },
            TypeError
        );

    }
);


test(
    "rejects duplicate verification commands",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const branch =
            await readCurrentBranch();

        const baseSpecification =
            createSpecification(
                branch
            );

        const specification = {

            ...baseSpecification,

            commands: [
                ...baseSpecification.commands,
                ...baseSpecification.commands
            ]

        };

        assert.throws(
            () => {
                validateVerificationSpecification(
                    configuration,
                    specification
                );
            },
            TypeError
        );

    }
);


test(
    "executes an approved verification command",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const branch =
            await readCurrentBranch();

        const runner =
            createVerificationRunner(
                configuration
            );

        const result =
            await runner.verify(
                createSpecification(
                    branch
                )
            );

        assert.equal(
            result.passed,
            true
        );

        assert.equal(
            result.commands.length,
            1
        );

        assert.equal(
            result.commands[0]?.name,
            "git-branch-current"
        );

    }
);


test(
    "rejects verification on the wrong branch",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                process.cwd()
            );

        const branch =
            await readCurrentBranch();

        const runner =
            createVerificationRunner(
                configuration
            );

        const specification = {

            ...createSpecification(
                branch
            ),

            branch:
                `${branch}-incorrect`

        };

        await assert.rejects(
            async () => {
                await runner.verify(
                    specification
                );
            },
            TypeError
        );

    }
);
