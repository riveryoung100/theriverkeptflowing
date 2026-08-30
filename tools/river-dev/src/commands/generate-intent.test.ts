import {
    strict as assert
} from "node:assert";

import {
    mkdtemp,
    readFile,
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    test
} from "node:test";

import {
    formatIntentGenerationResult,
    generateIntentRiverDev,
    loadImplementationPlanForIntentGeneration
} from "./generate-intent";

import type {
    RiverDevImplementationIntentGenerationResult
} from "../core/implementation-intent-generator";
import type {
    RiverDevConfiguration
} from "../types";



test(
    "loads the authoritative persisted implementation plan from repository scope",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-generate-intent-"
                )
            );

        const planDirectory =
            join(
                repositoryRoot,
                ".river-dev",
                "plans"
            );

        await mkdir(
            planDirectory,
            {
                recursive:
                    true
            }
        );

        const planPath =
            join(
                ".river-dev",
                "plans",
                "generate-001.json"
            );

        const persistedPlan = {
            version:
                "1.0.0",
            planId:
                "plan:generate-001-command",
            phase:
                "GENERATE-001 Command",
            branch:
                "generate-001-governed-implementation-intent-generation-foundation",
            objective:
                "Load an authoritative persisted plan."
        };

        await writeFile(
            join(
                repositoryRoot,
                planPath
            ),
            JSON.stringify(
                persistedPlan
            ),
            "utf8"
        );

        const loaded =
            await loadImplementationPlanForIntentGeneration(
                repositoryRoot,
                planPath
            );

        assert.deepEqual(
            loaded,
            persistedPlan
        );

    }
);


test(
    "rejects implementation plan paths outside repository scope",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-generate-intent-scope-"
                )
            );

        await assert.rejects(
            loadImplementationPlanForIntentGeneration(
                repositoryRoot,
                join(
                    "..",
                    "outside-plan.json"
                )
            ),
            /within the repository root/
        );

    }
);


test(
    "formats generated intent without persisting or approving downstream artifacts",
    () => {

        const result = {
            intent: {
                version:
                    "1.0.0",
                intentId:
                    "intent:generate-001-command",
                planId:
                    "plan:generate-001-command",
                branch:
                    "generate-001-governed-implementation-intent-generation-foundation",
                objective:
                    "Format generated intent.",
                operations: [
                    {
                        type:
                            "write-file",
                        path:
                            "tools/river-dev/src/core/example.ts",
                        content:
                            "export const example = true;\n",
                        overwrite:
                            false,
                        reason:
                            "Create example."
                    }
                ]
            },
            operationCount:
                1,
            repositoryWritesPerformed:
                false
        } as RiverDevImplementationIntentGenerationResult;

        const formatted =
            formatIntentGenerationResult(
                result
            );

        assert.deepEqual(
            JSON.parse(
                formatted
            ),
            result.intent
        );

        assert.equal(
            formatted.includes(
                "approved"
            ),
            false
        );

    }
);
test(
    "generates validated implementation intent through real development context",
    async () => {

        const repositoryRoot =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-generate-intent-e2e-"
                )
            );

        const runGit =
            async (
                args:
                    readonly string[]
            ): Promise<void> => {

                const {
                    spawn
                } =
                    await import(
                        "node:child_process"
                    );

                await new Promise<void>(
                    (
                        resolvePromise,
                        rejectPromise
                    ) => {

                        const child =
                            spawn(
                                "git",
                                [
                                    ...args
                                ],
                                {
                                    cwd:
                                        repositoryRoot,
                                    stdio:
                                        "ignore"
                                }
                            );

                        child.once(
                            "error",
                            rejectPromise
                        );

                        child.once(
                            "exit",
                            (code) => {

                                if (
                                    code === 0
                                ) {
                                    resolvePromise();
                                    return;
                                }

                                rejectPromise(
                                    new Error(
                                        `git ${args.join(" ")} failed with ${code}`
                                    )
                                );

                            }
                        );

                    }
                );

            };

        await mkdir(
            join(
                repositoryRoot,
                ".river-dev",
                "specifications"
            ),
            {
                recursive:
                    true
            }
        );

        await mkdir(
            join(
                repositoryRoot,
                ".river-dev",
                "plans"
            ),
            {
                recursive:
                    true
            }
        );

        await mkdir(
            join(
                repositoryRoot,
                "src"
            ),
            {
                recursive:
                    true
            }
        );

        await mkdir(
            join(
                repositoryRoot,
                "tools",
                "river-dev"
            ),
            {
                recursive:
                    true
            }
        );

        await writeFile(
            join(
                repositoryRoot,
                "src",
                "feature.ts"
            ),
            "export const feature = false;\n",
            "utf8"
        );

        const specificationPath =
            join(
                ".river-dev",
                "specifications",
                "generate-intent-e2e.json"
            );

        const specification = {
            phase:
                "GENERATE-INTENT-E2E",
            branch:
                "generate-intent-e2e",
            commitMessage:
                "Generate intent integration fixture",
            objective:
                "Generate an implementation intent through real development context.",
            architecturalContext: [
                "The feature module is an approved modification target."
            ],
            approvedScope: {
                modifiablePaths: [
                    "src/feature.ts"
                ],
                creatablePaths: [],
                excludedPaths: []
            },
            acceptanceCriteria: [
                "Generated intent remains inside approved scope."
            ],
            requiredTests: [],
            requiredQualityGates: [],
            approvedCommands: [],
            repairLimits: {
                maximumAttempts:
                    1,
                allowScopeExpansion:
                    false
            },
            approvalBoundaries: []
        };

        await writeFile(
            join(
                repositoryRoot,
                specificationPath
            ),
            JSON.stringify(
                specification,
                null,
                2
            ) + "\n",
            "utf8"
        );

        const planPath =
            join(
                ".river-dev",
                "plans",
                "generate-intent-e2e.json"
            );

        const plan = {
            version:
                "1.0.0",
            planId:
                "plan:generate-intent-e2e",
            phase:
                "GENERATE-INTENT-E2E",
            branch:
                "generate-intent-e2e",
            objective:
                "Generate an implementation intent through real development context.",
            allowedPaths: [
                "src/feature.ts"
            ],
            excludedPaths: [],
            requiredTests: [],
            qualityGates: [],
            planningIntelligence: {
                version:
                    "1.0.0",
                decisions: [
                    {
                        path:
                            "src/feature.ts",
                        priority:
                            100,
                        reason:
                            "Modify the architecture-grounded approved feature.",
                        action:
                            "modify"
                    }
                ]
            }
        };

        await writeFile(
            join(
                repositoryRoot,
                planPath
            ),
            JSON.stringify(
                plan,
                null,
                2
            ) + "\n",
            "utf8"
        );

        await runGit(
            [
                "init"
            ]
        );

        await runGit(
            [
                "config",
                "user.email",
                "river-dev@example.invalid"
            ]
        );

        await runGit(
            [
                "config",
                "user.name",
                "River Dev Test"
            ]
        );

        await runGit(
            [
                "add",
                "."
            ]
        );

        await runGit(
            [
                "commit",
                "-m",
                "fixture"
            ]
        );

        await runGit(
            [
                "branch",
                "-M",
                "generate-intent-e2e"
            ]
        );

        const configuration:
            RiverDevConfiguration = {

            repositoryRoot,

            policyRoot:
                join(
                    repositoryRoot,
                    ".river-dev"
                ),

            projectMap: {
                version:
                    "1.0.0",
                project: {
                    name:
                        "Generate Intent Integration",
                    repositoryType:
                        "test",
                    defaultBranch:
                        "main",
                    packageManager:
                        "npm"
                },
                paths: {
                    publicApplication:
                        "src",
                    developmentAgent:
                        "tools/river-dev",
                    developmentAgentPolicy:
                        ".river-dev"
                },
                commands: {},
                conventions: {},
                protectedPaths: [
                    ".git",
                    ".env",
                    ".env.*",
                    "node_modules",
                    "dist"
                ]
            },

            safetyPolicy: {
                version:
                    "1.0.0",
                defaultMode:
                    "approval-required",
                repositoryBoundary: {
                    allowOutsideRepository:
                        false,
                    allowParentDirectoryTraversal:
                        false,
                    allowAbsolutePathsOutsideRepository:
                        false
                },
                git: {},
                filesystem: {},
                commands: {
                    allowShell:
                        true,
                    allowNetworkCommands:
                        false,
                    allowDownloadedScripts:
                        false,
                    allowPackageInstall:
                        false,
                    allowProductionCommands:
                        false,
                    maximumCommandSeconds:
                        300
                },
                secrets: {
                    denyPatterns: [],
                    allowReadingSecretFiles:
                        false,
                    allowWritingSecretFiles:
                        false,
                    allowReportingSecretValues:
                        false
                },
                repairs: {
                    maximumAttempts:
                        3,
                    requireFailureEvidence:
                        true,
                    allowScopeExpansion:
                        false
                },
                approvalRequiredFor: [
                    "push"
                ]
            },

            qualityGates: {
                version:
                    "1.0.0",
                requiredBeforeCommit: [],
                existingNonBlockingHints: [],
                failureBehavior:
                    "stop"
            },

            commandPolicy: {
                version:
                    "1.0.0",
                allowedCommands: [],
                deniedExecutables: [],
                deniedGitArguments: []
            }

        };

        let providerCallCount =
            0;

        const result =
            await generateIntentRiverDev({
                repositoryRoot,
                configuration,
                planPath,
                specificationPath,
                generatedAt:
                    "2026-08-30T03:00:00.000Z",
                provider:
                    async (
                        request
                    ) => {

                        providerCallCount +=
                            1;

                        assert.equal(
                            request.plan.planId,
                            "plan:generate-intent-e2e"
                        );

                        assert.equal(
                            request.context.phase.phase,
                            "GENERATE-INTENT-E2E"
                        );

                        assert.equal(
                            request.context.identity.branch,
                            "generate-intent-e2e"
                        );

                        assert.equal(
                            request.context.identity.specificationPath,
                            ".river-dev/specifications/generate-intent-e2e.json"
                        );

                        assert.equal(
                            request.decision.path,
                            "src/feature.ts"
                        );

                        assert.equal(
                            request.context.understanding.relevance.some(
                                (entry) =>
                                    entry.path ===
                                    "src/feature.ts"
                            ),
                            true
                        );

                        return {
                            content:
                                "export const feature = true;\n",
                            overwrite:
                                true,
                            reason:
                                "Implement the approved feature modification."
                        };

                    }
            });

        assert.equal(
            providerCallCount,
            1
        );

        assert.equal(
            result.repositoryWritesPerformed,
            false
        );

        assert.equal(
            result.operationCount,
            1
        );

        assert.equal(
            result.intent.planId,
            "plan:generate-intent-e2e"
        );

        assert.deepEqual(
            result.intent.operations,
            [
                {
                    type:
                        "write-file",
                    path:
                        "src/feature.ts",
                    content:
                        "export const feature = true;\n",
                    overwrite:
                        true,
                    reason:
                        "Implement the approved feature modification."
                }
            ]
        );

        const sourceAfterGeneration =
            await readFile(
                join(
                    repositoryRoot,
                    "src",
                    "feature.ts"
                ),
                "utf8"
            );

        assert.equal(
            sourceAfterGeneration,
            "export const feature = false;\n"
        );

    }
);
