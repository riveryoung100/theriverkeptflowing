import assert from "node:assert/strict";
import test from "node:test";

import {
    runEndToEndOrchestrator,
    validateOrchestratorSpecification
} from "./orchestrator";

import type {
    RiverDevOrchestratorDependencies,
    RiverDevOrchestratorSpecification
} from "./orchestrator";


function createSpecification():
RiverDevOrchestratorSpecification {

    return {

        version:
            "1.0.0",

        id:
            "orchestrator:test",

        name:
            "Test Orchestrator",

        objective:
            "Test the complete lifecycle.",

        branch:
            "orchestrator-test",

        allowedPaths: [
            "approved"
        ],

        stages: [
            "inspect",
            "plan",
            "implement",
            "verify",
            "repair",
            "review",
            "commit"
        ],

        requirements: {

            expectedBranchRequired:
                true,

            cleanStartRequired:
                true,

            planRequired:
                true,

            dryRunDefault:
                true,

            verificationRequired:
                true,

            repairAllowed:
                true,

            reviewRequired:
                true,

            commitRequiresApplyFlag:
                true,

            pushAllowed:
                false,

            outsideRepositoryAllowed:
                false,

            maximumRepairAttempts:
                3,

            stopOnUnsupportedFailure:
                true,

            stopOnReviewFailure:
                true,

            stopOnScopeFailure:
                true

        },

        outcomes: [
            "completed",
            "dry-run-complete",
            "already-complete",
            "repair-blocked",
            "verification-failed",
            "review-failed",
            "commit-failed",
            "stopped"
        ],

        qualityGates: [
            "verification",
            "review",
            "commit"
        ]

    };

}


function createDependencies(
    options: {
        readonly clean?: boolean;
        readonly inspection?: boolean;
        readonly plan?: boolean;
        readonly implementation?: boolean;
        readonly verification?: readonly boolean[];
        readonly repair?: boolean;
        readonly review?: boolean;
        readonly commit?: boolean;
    } = {}
): RiverDevOrchestratorDependencies {

    let verificationIndex =
        0;

    const verificationResults =
        options.verification ??
        [
            true
        ];

    return {

        getCurrentBranch:
            async () => {
                return "orchestrator-test";
            },

        isWorkingTreeClean:
            async () => {
                return options.clean ??
                    true;
            },

        inspect:
            async () => {
                return options.inspection ??
                    true;
            },

        plan:
            async () => {
                return options.plan ??
                    true;
            },

        implement:
            async () => {
                return options.implementation ??
                    true;
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

                return result ??
                    false;

            },

        repair:
            async () => {
                return options.repair ??
                    true;
            },

        review:
            async () => {
                return options.review ??
                    true;
            },

        commit:
            async () => {
                return options.commit ??
                    true;
            }

    };

}


test(
    "validates an orchestrator specification",
    () => {

        assert.doesNotThrow(
            () => {
                validateOrchestratorSpecification(
                    createSpecification()
                );
            }
        );

    }
);


test(
    "rejects incorrect stage order",
    () => {

        const specification = {

            ...createSpecification(),

            stages: [
                "plan",
                "inspect",
                "implement",
                "verify",
                "repair",
                "review",
                "commit"
            ]

        } as RiverDevOrchestratorSpecification;

        assert.throws(
            () => {
                validateOrchestratorSpecification(
                    specification
                );
            },
            TypeError
        );

    }
);


test(
    "stops when working tree is not clean",
    async () => {

        const result =
            await runEndToEndOrchestrator(
                createDependencies(
                    {
                        clean:
                            false
                    }
                ),
                {
                    specification:
                        createSpecification()
                }
            );

        assert.equal(
            result.outcome,
            "stopped"
        );

        assert.equal(
            result.passed,
            false
        );

    }
);


test(
    "completes a dry run without committing",
    async () => {

        const result =
            await runEndToEndOrchestrator(
                createDependencies(),
                {
                    specification:
                        createSpecification(),
                    apply:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "dry-run-complete"
        );

        assert.equal(
            result.passed,
            true
        );

        assert.equal(
            result.stages.at(-1)?.stage,
            "commit"
        );

        assert.equal(
            result.stages.at(-1)?.skipped,
            true
        );

    }
);


test(
    "repairs a failed verification",
    async () => {

        const result =
            await runEndToEndOrchestrator(
                createDependencies(
                    {
                        verification: [
                            false,
                            true
                        ],
                        repair:
                            true
                    }
                ),
                {
                    specification:
                        createSpecification(),
                    apply:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "dry-run-complete"
        );

        assert.equal(
            result.passed,
            true
        );

        assert.equal(
            result.stages.some(
                (stage) => {
                    return (
                        stage.stage ===
                            "repair" &&
                        !stage.skipped
                    );
                }
            ),
            true
        );

    }
);


test(
    "stops when repair is blocked",
    async () => {

        const result =
            await runEndToEndOrchestrator(
                createDependencies(
                    {
                        verification: [
                            false
                        ],
                        repair:
                            false
                    }
                ),
                {
                    specification:
                        createSpecification(),
                    apply:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "repair-blocked"
        );

        assert.equal(
            result.passed,
            false
        );

    }
);


test(
    "stops when review fails",
    async () => {

        const result =
            await runEndToEndOrchestrator(
                createDependencies(
                    {
                        review:
                            false
                    }
                ),
                {
                    specification:
                        createSpecification(),
                    apply:
                        false
                }
            );

        assert.equal(
            result.outcome,
            "review-failed"
        );

        assert.equal(
            result.passed,
            false
        );

    }
);


test(
    "completes an applied lifecycle",
    async () => {

        const result =
            await runEndToEndOrchestrator(
                createDependencies(),
                {
                    specification:
                        createSpecification(),
                    apply:
                        true
                }
            );

        assert.equal(
            result.outcome,
            "completed"
        );

        assert.equal(
            result.passed,
            true
        );

        assert.equal(
            result.stages.at(-1)?.stage,
            "commit"
        );

        assert.equal(
            result.stages.at(-1)?.passed,
            true
        );

    }
);
