import assert from "node:assert/strict";
import test from "node:test";

import {
    resolve
} from "node:path";

import {
    loadRiverDevConfiguration
} from "./config";

import {
    createImplementationPlan,
    loadPhaseSpecification,
    validatePhaseSpecification
} from "./planner";


const repositoryRoot =
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        ".."
    );

const specificationPath =
    resolve(
        repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-01-planning-engine.json"
    );


test(
    "loads a phase specification",
    async () => {

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        assert.equal(
            specification.phase,
            "DEV-01 Planning Engine"
        );

    }
);


test(
    "validates an approved phase specification",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        assert.doesNotThrow(
            () => {
                validatePhaseSpecification(
                    configuration,
                    specification
                );
            }
        );

    }
);


test(
    "creates deterministic implementation plans",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        const generatedAt =
            "2026-08-06T14:00:00.000Z";

        const first =
            createImplementationPlan(
                configuration,
                specification,
                generatedAt
            );

        const second =
            createImplementationPlan(
                configuration,
                specification,
                generatedAt
            );

        assert.deepEqual(
            first,
            second
        );

        assert.match(
            first.planId,
            /^plan:[0-9a-f]{24}$/
        );

    }
);


test(
    "creates ordered implementation steps",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        const plan =
            createImplementationPlan(
                configuration,
                specification,
                "2026-08-06T14:01:00.000Z"
            );

        assert.equal(
            plan.steps.length,
            8
        );

        assert.equal(
            plan.steps[0]?.type,
            "inspect"
        );

        assert.equal(
            plan.steps[7]?.type,
            "commit"
        );

    }
);


test(
    "rejects protected modification paths",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        const invalidSpecification = {

            ...specification,

            approvedScope: {

                ...specification.approvedScope,

                modifiablePaths: [
                    ".env"
                ]

            }

        };

        assert.throws(
            () => {
                validatePhaseSpecification(
                    configuration,
                    invalidSpecification
                );
            },
            TypeError
        );

    }
);


test(
    "rejects unknown approved commands",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        const invalidSpecification = {

            ...specification,

            approvedCommands: [
                "unknown-command"
            ]

        };

        assert.throws(
            () => {
                validatePhaseSpecification(
                    configuration,
                    invalidSpecification
                );
            },
            TypeError
        );

    }
);

test(
    "bounds architecture-grounded planning intelligence to approved scope",
    async () => {

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        const specification =
            await loadPhaseSpecification(
                specificationPath
            );

        const approvedPath =
            specification.approvedScope.modifiablePaths[0];

        assert.ok(
            approvedPath
        );

        const understanding = {
            version: "1.0.0" as const,
            artifactCount: 2,
            metadata: [],
            relationships: [],
            relevance: [
                {
                    path: approvedPath,
                    score: 9,
                    reasons: [
                        "has repository-local dependents"
                    ]
                },
                {
                    path: "unapproved/outside-scope.ts",
                    score: 100,
                    reasons: [
                        "high relevance must not broaden governance"
                    ]
                }
            ]
        };

        const first =
            createImplementationPlan(
                configuration,
                specification,
                "2026-08-30T02:00:00.000Z",
                understanding
            );

        const second =
            createImplementationPlan(
                configuration,
                specification,
                "2026-08-30T02:00:00.000Z",
                understanding
            );

        assert.deepEqual(
            first,
            second
        );

        assert.ok(
            first.planningIntelligence
        );

        const planningIntelligence =
            first.planningIntelligence;

        assert.deepEqual(
            planningIntelligence.decisions,
            [
                {
                    path: approvedPath,
                    priority: 9,
                    reason: "has repository-local dependents",
                    action: "modify"
                }
            ]
        );

        assert.equal(
            planningIntelligence.decisions.some(
                (decision) =>
                    decision.path === "unapproved/outside-scope.ts"
            ),
            false
        );

        assert.deepEqual(
            first.allowedPaths,
            [
                ...specification.approvedScope.modifiablePaths,
                ...specification.approvedScope.creatablePaths
            ].sort()
        );

        assert.deepEqual(
            first.excludedPaths,
            [
                ...specification.approvedScope.excludedPaths
            ].sort()
        );

        assert.deepEqual(
            first.approvedCommands,
            specification.approvedCommands
        );

        assert.deepEqual(
            first.approvalBoundaries,
            specification.approvalBoundaries
        );

        assert.equal(
            first.maximumRepairAttempts,
            specification.repairLimits.maximumAttempts
        );

        assert.equal(
            first.scopeExpansionAllowed,
            specification.repairLimits.allowScopeExpansion
        );

    }
);
