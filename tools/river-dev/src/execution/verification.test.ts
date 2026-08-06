import assert from "node:assert/strict";
import test from "node:test";

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


function createSpecification():
RiverDevVerificationSpecification {

    return {

        version:
            "1.0.0",

        verificationId:
            "verification:test",

        branch:
            "dev-03-verification-engine",

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

        assert.doesNotThrow(
            () => {
                validateVerificationSpecification(
                    configuration,
                    createSpecification()
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

        const specification = {

            ...createSpecification(),

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

        const specification = {

            ...createSpecification(),

            commands: [
                ...createSpecification().commands,
                ...createSpecification().commands
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

        const runner =
            createVerificationRunner(
                configuration
            );

        const result =
            await runner.verify(
                createSpecification()
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

        const runner =
            createVerificationRunner(
                configuration
            );

        const specification = {

            ...createSpecification(),

            branch:
                "wrong-branch"

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
