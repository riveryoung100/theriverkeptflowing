import {
    strict as assert
} from "node:assert";

import {
    test
} from "node:test";

import type {
    RiverDevDevelopmentContext
} from "../types";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    generateImplementationIntent
} from "./implementation-intent-generator";


function createPlan(): RiverDevImplementationPlan {

    return {
        version:
            "1.0.0",
        planId:
            "plan:generate-001-core",
        phase:
            "GENERATE-001 Core",
        branch:
            "generate-001-governed-implementation-intent-generation-foundation",
        commitMessage:
            "GENERATE-001: Test core generation",
        objective:
            "Generate deterministic implementation intent.",
        generatedAt:
            "2026-08-30T03:00:00.000Z",
        allowedPaths: [
            "tools/river-dev/src/core/alpha.ts",
            "tools/river-dev/src/core/zeta.ts"
        ],
        excludedPaths:
            [],
        acceptanceCriteria:
            [],
        requiredTests:
            [],
        requiredQualityGates:
            [],
        approvedCommands:
            [],
        maximumRepairAttempts:
            3,
        scopeExpansionAllowed:
            false,
        approvalBoundaries:
            [],
        planningIntelligence: {
            version:
                "1.0.0",
            decisions: [
                {
                    path:
                        "tools/river-dev/src/core/zeta.ts",
                    priority:
                        10,
                    reason:
                        "Modify the approved zeta implementation.",
                    action:
                        "modify"
                },
                {
                    path:
                        "tools/river-dev/src/core/alpha.ts",
                    priority:
                        20,
                    reason:
                        "Create the approved alpha implementation.",
                    action:
                        "create"
                }
            ]
        },
        steps:
            []
    };

}


function createContext(): RiverDevDevelopmentContext {

    return {
        identity: {
            branch:
                "generate-001-governed-implementation-intent-generation-foundation"
        }
    } as RiverDevDevelopmentContext;

}


test(
    "generates deterministic validated implementation intent from planning intelligence",
    async () => {

        const provider =
            async (
                request:
                    Parameters<typeof generateImplementationIntent>[2] extends (request: infer T) => Promise<unknown> ? T : never
            ) => {

                return {
                    content:
                        `export const generatedPath = ${JSON.stringify(request.decision.path)};\n`,
                    overwrite:
                        request.decision.action === "modify",
                    reason:
                        request.decision.reason
                };

            };

        const first =
            await generateImplementationIntent(
                createPlan(),
                createContext(),
                provider
            );

        const second =
            await generateImplementationIntent(
                createPlan(),
                createContext(),
                provider
            );

        assert.deepEqual(
            first,
            second
        );

        assert.equal(
            first.intent.intentId,
            "intent:generate-001-core"
        );

        assert.equal(
            first.intent.planId,
            "plan:generate-001-core"
        );

        assert.equal(
            first.operationCount,
            2
        );

        assert.equal(
            first.repositoryWritesPerformed,
            false
        );

        assert.deepEqual(
            first.intent.operations.map(
                (operation) =>
                    operation.path
            ),
            [
                "tools/river-dev/src/core/alpha.ts",
                "tools/river-dev/src/core/zeta.ts"
            ]
        );

        assert.equal(
            first.intent.operations[0]!.overwrite,
            false
        );

        assert.equal(
            first.intent.operations[1]!.overwrite,
            true
        );

    }
);


test(
    "rejects generation when architecture-grounded planning intelligence is absent",
    async () => {

        const plan =
            createPlan();


        const {
            planningIntelligence: _planningIntelligence,
            ...planWithoutPlanningIntelligence
        } = plan;
        await assert.rejects(
            generateImplementationIntent(
                planWithoutPlanningIntelligence,
                createContext(),
                async () => ({
                    content:
                        "export const value = true;\n",
                    overwrite:
                        false
                })
            ),
            /planning intelligence is required/
        );

    }
);


test(
    "rejects a planning decision outside the approved plan scope before provider execution",
    async () => {

        const plan =
            createPlan();

        let providerCalled =
            false;

        await assert.rejects(
            generateImplementationIntent(
                {
                    ...plan,
                    planningIntelligence: {
                        version:
                            "1.0.0",
                        decisions: [
                            {
                                path:
                                    "src/outside-scope.ts",
                                priority:
                                    100,
                                reason:
                                    "Outside scope.",
                                action:
                                    "create"
                            }
                        ]
                    }
                },
                createContext(),
                async () => {
                    providerCalled =
                        true;

                    return {
                        content:
                            "export const outside = true;\n",
                        overwrite:
                            false
                    };
                }
            ),
            /outside the approved plan scope/
        );

        assert.equal(
            providerCalled,
            false
        );

    }
);


test(
    "rejects provider overwrite semantics that conflict with the planned action",
    async () => {

        const plan =
            createPlan();

        await assert.rejects(
            generateImplementationIntent(
                {
                    ...plan,
                    planningIntelligence: {
                        version:
                            "1.0.0",
                        decisions: [
                            {
                                path:
                                    "tools/river-dev/src/core/alpha.ts",
                                priority:
                                    20,
                                reason:
                                    "Create alpha.",
                                action:
                                    "create"
                            }
                        ]
                    }
                },
                createContext(),
                async () => ({
                    content:
                        "export const alpha = true;\n",
                    overwrite:
                        true
                })
            ),
            /overwrite semantics do not match planned action/
        );

    }
);


test(
    "rejects duplicate generation paths before producing an intent",
    async () => {

        const plan =
            createPlan();

        await assert.rejects(
            generateImplementationIntent(
                {
                    ...plan,
                    planningIntelligence: {
                        version:
                            "1.0.0",
                        decisions: [
                            {
                                path:
                                    "tools/river-dev/src/core/alpha.ts",
                                priority:
                                    20,
                                reason:
                                    "Create alpha.",
                                action:
                                    "create"
                            },
                            {
                                path:
                                    "tools/river-dev/src/core/alpha.ts",
                                priority:
                                    10,
                                reason:
                                    "Duplicate alpha.",
                                action:
                                    "create"
                            }
                        ]
                    }
                },
                createContext(),
                async () => ({
                    content:
                        "export const alpha = true;\n",
                    overwrite:
                        false
                })
            ),
            /Duplicate implementation generation path/
        );

    }
);
