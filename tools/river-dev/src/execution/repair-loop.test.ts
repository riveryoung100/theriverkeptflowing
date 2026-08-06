import assert from "node:assert/strict";
import test from "node:test";

import {
    runAutonomousRepairLoop,
    validateRepairLoopSpecification,
    validateRepairManifest
} from "./repair-loop";

import type {
    RiverDevRepairLoopDependencies,
    RiverDevRepairLoopSpecification,
    RiverDevRepairManifest
} from "./repair-loop";


function createSpecification():
RiverDevRepairLoopSpecification {

    return {

        version:
            "1.0.0",

        id:
            "repair:test",

        name:
            "Test Repair Loop",

        objective:
            "Test deterministic repair behavior.",

        branch:
            "repair-test",

        maximumRepairAttempts:
            3,

        allowedPaths: [
            "approved"
        ],

        requirements: {

            verificationRequiredBeforeRepair:
                true,

            repairManifestRequired:
                true,

            scopeValidationRequired:
                true,

            reviewRequiredAfterRepair:
                true,

            verificationRequiredAfterRepair:
                true,

            dryRunDefault:
                true,

            pushAllowed:
                false,

            commitAllowed:
                false,

            outsideRepositoryAllowed:
                false,

            stopOnUnknownFailure:
                true,

            stopWhenAttemptsExhausted:
                true

        },

        repairOutcomes: [
            "repaired",
            "already-passing",
            "attempts-exhausted",
            "blocked",
            "unsupported-failure"
        ],

        qualityGates: [
            "verification",
            "review"
        ]

    };

}


function createManifest():
RiverDevRepairManifest {

    return {

        id:
            "manifest:test",

        failureCode:
            "typecheck",

        paths: [
            "approved/file.ts"
        ],

        description:
            "Repair the approved test file."

    };

}


function createDependencies(
    verificationResults:
        readonly {
            readonly passed:
                boolean;

            readonly failureCode?:
                string;

            readonly message:
                string;
        }[],
    reviewPassed = true
): RiverDevRepairLoopDependencies {

    let verificationIndex =
        0;

    return {

        getCurrentBranch:
            async () => {
                return "repair-test";
            },

        verify:
            async () => {

                const result =
                    verificationResults[
                        Math.min(
                            verificationIndex,
                            verificationResults.length -
                                1
                        )
                    ];

                verificationIndex +=
                    1;

                if (
                    result ===
                    undefined
                ) {
                    throw new TypeError(
                        "No verification result was configured."
                    );
                }

                return result;

            },

        resolveManifest:
            async (
                failureCode
            ) => {

                if (
                    failureCode !==
                    "typecheck"
                ) {
                    return undefined;
                }

                return createManifest();

            },

        applyManifest:
            async () => {
                return;
            },

        review:
            async () => {
                return reviewPassed;
            }

    };

}


test(
    "validates a safe repair-loop specification",
    () => {

        assert.doesNotThrow(
            () => {
                validateRepairLoopSpecification(
                    createSpecification()
                );
            }
        );

    }
);


test(
    "rejects repair manifests outside approved scope",
    () => {

        const manifest = {

            ...createManifest(),

            paths: [
                "unexpected/file.ts"
            ]

        };

        assert.throws(
            () => {
                validateRepairManifest(
                    createSpecification(),
                    manifest
                );
            },
            TypeError
        );

    }
);


test(
    "reports already-passing verification",
    async () => {

        const result =
            await runAutonomousRepairLoop(
                createDependencies(
                    [
                        {
                            passed:
                                true,

                            message:
                                "Verification passed."
                        }
                    ]
                ),
                {
                    specification:
                        createSpecification(),

                    dryRun:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "already-passing"
        );

        assert.equal(
            result.passed,
            true
        );

        assert.equal(
            result.attempts.length,
            0
        );

    }
);


test(
    "dry run validates without applying repair",
    async () => {

        const result =
            await runAutonomousRepairLoop(
                createDependencies(
                    [
                        {
                            passed:
                                false,

                            failureCode:
                                "typecheck",

                            message:
                                "Typecheck failed."
                        }
                    ]
                ),
                {
                    specification:
                        createSpecification(),

                    dryRun:
                        true
                }
            );

        assert.equal(
            result.outcome,
            "blocked"
        );

        assert.equal(
            result.dryRun,
            true
        );

        assert.equal(
            result.attempts.length,
            1
        );

        assert.equal(
            result.attempts[0]?.applied,
            false
        );

    }
);


test(
    "repairs a supported verification failure",
    async () => {

        const result =
            await runAutonomousRepairLoop(
                createDependencies(
                    [
                        {
                            passed:
                                false,

                            failureCode:
                                "typecheck",

                            message:
                                "Typecheck failed."
                        },
                        {
                            passed:
                                true,

                            message:
                                "Typecheck passed."
                        }
                    ]
                ),
                {
                    specification:
                        createSpecification(),

                    dryRun:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "repaired"
        );

        assert.equal(
            result.passed,
            true
        );

        assert.equal(
            result.attempts.length,
            1
        );

    }
);


test(
    "blocks a repair when review fails",
    async () => {

        const result =
            await runAutonomousRepairLoop(
                createDependencies(
                    [
                        {
                            passed:
                                false,

                            failureCode:
                                "typecheck",

                            message:
                                "Typecheck failed."
                        }
                    ],
                    false
                ),
                {
                    specification:
                        createSpecification(),

                    dryRun:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "blocked"
        );

        assert.equal(
            result.passed,
            false
        );

        assert.equal(
            result.attempts[0]?.reviewPassed,
            false
        );

    }
);


test(
    "stops when no approved repair manifest exists",
    async () => {

        const result =
            await runAutonomousRepairLoop(
                createDependencies(
                    [
                        {
                            passed:
                                false,

                            failureCode:
                                "unknown",

                            message:
                                "Unknown failure."
                        }
                    ]
                ),
                {
                    specification:
                        createSpecification(),

                    dryRun:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "unsupported-failure"
        );

        assert.equal(
            result.passed,
            false
        );

    }
);


test(
    "stops after maximum repair attempts",
    async () => {

        const failedVerification = {

            passed:
                false,

            failureCode:
                "typecheck",

            message:
                "Typecheck still fails."

        } as const;

        const result =
            await runAutonomousRepairLoop(
                createDependencies(
                    [
                        failedVerification,
                        failedVerification,
                        failedVerification,
                        failedVerification
                    ]
                ),
                {
                    specification:
                        createSpecification(),

                    dryRun:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "attempts-exhausted"
        );

        assert.equal(
            result.attempts.length,
            3
        );

        assert.equal(
            result.passed,
            false
        );

    }
);
