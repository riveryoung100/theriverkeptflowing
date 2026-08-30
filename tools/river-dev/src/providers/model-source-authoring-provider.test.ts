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
    const sourcePath =
        "tools/river-dev/src/core/example.ts";
    const sourceContent =
        "export const existingExample = false;\n";

    return {
        version:
            "1.0.0",
        generatedAt:
            "2026-08-30T00:00:00.000Z",
        identity: {
            repositoryRoot:
                "C:/repo",
            branch:
                "generate-002-provider-test",
            commit:
                "fixture-commit",
            capturedAt:
                "2026-08-30T00:00:00.000Z",
            discoveryVersion:
                "1.0.0",
            specificationPath:
                ".river-dev/specifications/generate-002-provider-test.json"
        },
        project: {
            name:
                "river-dev-provider-test",
            repositoryType:
                "typescript",
            defaultBranch:
                "main",
            packageManager:
                "npm"
        },
        phase: {
            phase:
                "GENERATE-002",
            branch:
                "generate-002-provider-test",
            specificationPath:
                ".river-dev/specifications/generate-002-provider-test.json",
            objective:
                "Author the exact approved source file.",
            commitMessage:
                "GENERATE-002 provider fixture"
        },
        repository: {
            repositoryRoot:
                "C:/repo",
            branch:
                "generate-002-provider-test",
            commit:
                "fixture-commit",
            clean:
                true,
            changedPaths:
                [],
            capturedAt:
                "2026-08-30T00:00:00.000Z"
        },
        discovery: {
            version:
                "1.0.0",
            repositoryRoot:
                "C:/repo",
            projectName:
                "river-dev-provider-test",
            branch:
                "generate-002-provider-test",
            commit:
                "fixture-commit",
            discoveredAt:
                "2026-08-30T00:00:00.000Z",
            entries:
                [],
            counts: {} as RiverDevDevelopmentContext["discovery"]["counts"],
            keyPaths: {}
        },
        keyPaths: {},
        architecturalContext: [
            "Architecture-grounded provider test context."
        ],
        scope: {
            modifiablePaths: [
                sourcePath
            ],
            creatablePaths:
                [],
            excludedPaths:
                []
        },
        acceptanceCriteria:
            [],
        requiredTests:
            [],
        requiredQualityGates:
            [],
        approvedCommands:
            [],
        repairLimits: {
            maximumAttempts:
                1,
            allowScopeExpansion:
                false
        },
        approvalBoundaries:
            [],
        session: {
            hasActiveSession:
                false,
            sessionId:
                null,
            compatible:
                true,
            reason:
                "No active session required for provider fixture."
        },
        relevantEntries:
            [],
        understanding: {
            version:
                "1.0.0",
            artifactCount:
                1,
            metadata: [
                {
                    path:
                        sourcePath,
                    extension:
                        ".ts",
                    bytes:
                        sourceContent.length,
                    classification:
                        "source"
                }
            ],
            relationships:
                [],
            relevance: [
                {
                    path:
                        sourcePath,
                    score:
                        10,
                    reasons: [
                        "Architecture-grounded provider test context."
                    ]
                }
            ]
        },
        artifacts: {
            version:
                "1.0.0",
            maximumArtifactBytes:
                50000,
            maximumTotalBytes:
                250000,
            loadedBytes:
                sourceContent.length,
            loadedCount:
                1,
            truncatedCount:
                0,
            omittedCount:
                0,
            artifacts: [
                {
                    path:
                        sourcePath,
                    classification:
                        "source",
                    reason:
                        "Architecture-grounded provider test context.",
                    originalBytes:
                        sourceContent.length,
                    loadedBytes:
                        sourceContent.length,
                    truncated:
                        false,
                    content:
                        sourceContent
                }
            ]
        }
    };
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

test(
    "GENERATE-003 governed model-context projection retains relevant source and excludes protected internal context",
    async () => {
        let capturedUser = "";

        const provider =
            createModelSourceAuthoringProvider({
                transport:
                    async (transportRequest) => {
                        capturedUser =
                            transportRequest.user;

                        return {
                            content:
                                "export const hardened = true;\n"
                        };
                    }
            });

        const plan =
            createPlan();
        const baseContext =
            createContext();
        const decision =
            plan.planningIntelligence!
                .decisions[0]!;
        const relevantArtifact =
            baseContext.artifacts.artifacts.find(
                (artifact) =>
                    baseContext.understanding.relevance.some(
                        (entry) =>
                            entry.path === artifact.path &&
                            entry.score > 0
                    )
            );

        assert.ok(relevantArtifact);

        await provider({
            plan,
            context:
                baseContext,
            decision
        });

        assert.equal(
            capturedUser.includes(
                JSON.stringify(
                    relevantArtifact.content
                ).slice(1, -1)
            ),
            true
        );
        assert.equal(
            capturedUser.includes(
                decision.path
            ),
            true
        );
        assert.equal(
            capturedUser.includes('\"session\"'),
            false
        );
        assert.equal(
            capturedUser.includes('\"repository\"'),
            false
        );
        assert.equal(
            capturedUser.includes('\"discovery\"'),
            false
        );
        assert.equal(
            capturedUser.includes('\"approvedCommands\"'),
            false
        );
    }
);

test(
    "GENERATE-003 governed model-context projection does not externalize excluded or secret-like artifact content",
    async () => {
        let capturedUser = "";

        const provider =
            createModelSourceAuthoringProvider({
                transport:
                    async (transportRequest) => {
                        capturedUser =
                            transportRequest.user;

                        return {
                            content:
                                "export const hardened = true;\n"
                        };
                    }
            });

        const plan =
            createPlan();
        const baseContext =
            createContext();
        const decision =
            plan.planningIntelligence!
                .decisions[0]!;
        const templateArtifact =
            baseContext.artifacts.artifacts[0]!;
        const secretContent =
            "GENERATE_003_SECRET_SENTINEL=value";
        const excludedContent =
            "GENERATE_003_EXCLUDED_SENTINEL";
        const secretPaths = [
            ".env",
            ".env.local",
            ".git/config",
            "node_modules/package/index.js",
            "dist/generated.js",
            "secrets/token.txt"
        ];
        const excludedPath =
            "excluded-generate-003/private.ts";
        const context = {
            ...baseContext,
            artifacts: {
                ...baseContext.artifacts,
                artifacts: [
                    ...baseContext.artifacts.artifacts,
                    ...secretPaths.map((path) => ({
                        ...templateArtifact,
                        path,
                        content: secretContent
                    })),
                    {
                        ...templateArtifact,
                        path: excludedPath,
                        content: excludedContent
                    }
                ]
            },
            understanding: {
                ...baseContext.understanding,
                relevance: [
                    ...baseContext.understanding.relevance,
                    ...secretPaths.map((path) => ({
                        path,
                        score: 100,
                        reasons: [
                            "adversarial secret fixture"
                        ]
                    })),
                    {
                        path: excludedPath,
                        score: 100,
                        reasons: [
                            "adversarial excluded fixture"
                        ]
                    }
                ]
            }
        };

        await provider({
            plan: {
                ...plan,
                excludedPaths: [
                    ...plan.excludedPaths,
                    "excluded-generate-003"
                ]
            },
            context,
            decision
        });

        assert.equal(
            capturedUser.includes(secretContent),
            false
        );
        assert.equal(
            capturedUser.includes(excludedContent),
            false
        );
        for (const secretPath of secretPaths) {
            assert.equal(
                capturedUser.includes(secretPath),
                false
            );
        }
        assert.equal(
            capturedUser.includes(excludedPath),
            false
        );
    }
);
