import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevDevelopmentContext
} from "../types";

import type {
    RiverDevImplementationPlan
} from "../core/planner";

import {
    createModelSourceAuthoringProvider
} from "./model-source-authoring-provider";

function createPlan(): RiverDevImplementationPlan {
    return {
        version:
            "1.0.0",
        planId:
            "plan:generate-002-provider-test",
        phase:
            "GENERATE-002",
        branch:
            "generate-002-provider-test",
        commitMessage:
            "GENERATE-002 provider test",
        objective:
            "Author the exact approved source file.",
        generatedAt:
            "2026-08-29T00:00:00.000Z",
        allowedPaths: [
            "tools/river-dev/src/core/example.ts"
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
            1,
        scopeExpansionAllowed:
            false,
        approvalBoundaries:
            [],
        steps:
            [],
        planningIntelligence: {
            version:
                "1.0.0",
            decisions: [
                {
                    path:
                        "tools/river-dev/src/core/example.ts",
                    priority:
                        100,
                    reason:
                        "Implement the approved example.",
                    action:
                        "modify"
                }
            ]
        }
    };
}

function createContext(): RiverDevDevelopmentContext {
    return {
        version:
            "1.0.0",
        identity: {
            repositoryRoot:
                "C:/repo",
            branch:
                "generate-002-provider-test",
            specificationPath:
                ".river-dev/specifications/generate-002-provider-test.json"
        },
        phase: {
            phase:
                "GENERATE-002",
            objective:
                "Author the exact approved source file."
        },
        repository: {
            files: []
        },
        specification: {
            allowedPaths: [
                "tools/river-dev/src/core/example.ts"
            ],
            excludedPaths:
                []
        },
        understanding: {
            version:
                "1.0.0",
            relevance: [],
            summary:
                "Architecture-grounded provider test context."
        }
    } as unknown as RiverDevDevelopmentContext;
}

test(
    "authors candidate content for only the governance-selected decision",
    async () => {
        let calls =
            0;

        const provider =
            createModelSourceAuthoringProvider({
                transport:
                    async (
                        request
                    ) => {
                        calls +=
                            1;

                        assert.match(
                            request.system,
                            /exact target path supplied by governance/
                        );

                        assert.match(
                            request.user,
                            /Target path: tools\/river-dev\/src\/core\/example\.ts/
                        );

                        assert.match(
                            request.user,
                            /Planned action: modify/
                        );

                        assert.match(
                            request.user,
                            /Architecture-grounded provider test context/
                        );

                        return {
                            content:
                                "export const example = true;\n"
                        };
                    }
            });

        const plan =
            createPlan();

        const decision =
            plan.planningIntelligence!
                .decisions[0]!;

        const result =
            await provider({
                plan,
                context:
                    createContext(),
                decision
            });

        assert.equal(
            calls,
            1
        );

        assert.deepEqual(
            result,
            {
                content:
                    "export const example = true;\n",
                overwrite:
                    true,
                reason:
                    "Implement the approved example."
            }
        );
    }
);

test(
    "derives overwrite semantics from the governance decision rather than model output",
    async () => {
        const provider =
            createModelSourceAuthoringProvider({
                transport:
                    async () => ({
                        content:
                            "export const created = true;\n"
                    })
            });

        const plan =
            createPlan();

        const decision = {
            ...plan.planningIntelligence!
                .decisions[0]!,
            action:
                "create" as const
        };

        const result =
            await provider({
                plan,
                context:
                    createContext(),
                decision
            });

        assert.equal(
            result.overwrite,
            false
        );
    }
);

test(
    "fails closed when the model returns empty candidate content",
    async () => {
        const provider =
            createModelSourceAuthoringProvider({
                transport:
                    async () => ({
                        content:
                            "   "
                    })
            });

        const plan =
            createPlan();

        await assert.rejects(
            provider({
                plan,
                context:
                    createContext(),
                decision:
                    plan.planningIntelligence!
                        .decisions[0]!
            }),
            /empty candidate content/
        );
    }
);