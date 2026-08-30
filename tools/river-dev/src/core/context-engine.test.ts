import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdir,
    mkdtemp,
    rm,
    writeFile
} from "node:fs/promises";

import {
    execFile
} from "node:child_process";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    promisify
} from "node:util";

import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevSession
} from "./session-state";

import {
    createRiverDevStateStore
} from "../state/store";

import {
    createRiverDevDevelopmentContext,
    RIVER_DEV_MAX_RELEVANT_CONTEXT_ENTRIES
} from "./context-engine";


const execFileAsync =
    promisify(
        execFile
    );


async function runGit(
    root: string,
    argumentsList:
        readonly string[]
): Promise<void> {

    await execFileAsync(
        "git",
        [
            ...argumentsList
        ],
        {
            cwd:
                root,
            windowsHide:
                true
        }
    );

}


async function createFixture():
Promise<{
    readonly root: string;
    readonly configuration: RiverDevConfiguration;
}> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-context-"
            )
        );

    await mkdir(
        join(
            root,
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
            root,
            "src"
        ),
        {
            recursive:
                true
        }
    );

    await mkdir(
        join(
            root,
            "tools",
            "river-dev",
            "src",
            "core"
        ),
        {
            recursive:
                true
        }
    );

    await mkdir(
        join(
            root,
            "node_modules",
            "hidden"
        ),
        {
            recursive:
                true
        }
    );

    await writeFile(
        join(
            root,
            "src",
            "feature.ts"
        ),
        'import { helper } from "./helper";\nexport const feature = helper;\n',
        "utf8"
    );

    await writeFile(
        join(
            root,
            "src",
            "helper.ts"
        ),
        "export const helper = true;\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "src",
            "feature.test.ts"
        ),
        "export {};\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "tools",
            "river-dev",
            "src",
            "core",
            "context-engine.ts"
        ),
        "export {};\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "node_modules",
            "hidden",
            "secret.js"
        ),
        "hidden\n",
        "utf8"
    );

    const specification = {
        version:
            "1.0.0",
        phase:
            "DEV-19 Context Engine",
        branch:
            "dev-19-context-engine",
        commitMessage:
            "DEV-19: Build deterministic development context engine",
        objective:
            "Build deterministic context.",
        architecturalContext: [
            "Repository discovery",
            "Session state"
        ],
        approvedScope: {
            modifiablePaths: [
                "src/feature.ts"
            ],
            creatablePaths: [
                "tools/river-dev/src/core/context-engine.test.ts"
            ],
            excludedPaths: [
                ".env",
                ".git",
                "node_modules",
                "dist"
            ]
        },
        acceptanceCriteria: [
            "Context is deterministic."
        ],
        requiredTests: [
            "src/feature.test.ts"
        ],
        requiredQualityGates: [
            "tests",
            "typecheck"
        ],
        approvedCommands: [
            "git-status",
            "typecheck"
        ],
        repairLimits: {
            maximumAttempts:
                3,
            allowScopeExpansion:
                false
        },
        approvalBoundaries: [
            "push"
        ]
    };

    await writeFile(
        join(
            root,
            ".river-dev",
            "specifications",
            "dev-19-context-engine.json"
        ),
        JSON.stringify(
            specification,
            null,
            2
        ),
        "utf8"
    );

    await runGit(
        root,
        [
            "init"
        ]
    );

    await runGit(
        root,
        [
            "config",
            "user.email",
            "river-dev@example.test"
        ]
    );

    await runGit(
        root,
        [
            "config",
            "user.name",
            "River Dev Test"
        ]
    );

    await runGit(
        root,
        [
            "add",
            "."
        ]
    );

    await runGit(
        root,
        [
            "commit",
            "-m",
            "Initial fixture"
        ]
    );

    await runGit(
        root,
        [
            "branch",
            "-M",
            "dev-19-context-engine"
        ]
    );

    const configuration:
        RiverDevConfiguration = {

        repositoryRoot:
            root,

        policyRoot:
            join(
                root,
                ".river-dev"
            ),

        projectMap: {

            version:
                "1.0.0",

            project: {
                name:
                    "Context Test",
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

    return {
        root,
        configuration
    };

}


test(
    "creates deterministic development context",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const timestamp =
                "2026-08-07T15:30:00.000Z";

            const first =
                await createRiverDevDevelopmentContext(
                    configuration,
                    timestamp
                );

            const second =
                await createRiverDevDevelopmentContext(
                    configuration,
                    timestamp
                );

            assert.deepEqual(
                first,
                second
            );

            assert.equal(
                first.phase.phase,
                "DEV-19 Context Engine"
            );

            assert.equal(
                first.identity.branch,
                "dev-19-context-engine"
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
    "includes approved scope and required test entries",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-07T15:31:00.000Z"
                );

            const feature =
                context.relevantEntries.find(
                    (entry) => {
                        return entry.path ===
                            "src/feature.ts";
                    }
                );

            const testEntry =
                context.relevantEntries.find(
                    (entry) => {
                        return entry.path ===
                            "src/feature.test.ts";
                    }
                );

            assert.equal(
                feature?.reason,
                "approved-modifiable-scope"
            );

            assert.equal(
                testEntry?.reason,
                "required-test"
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
    "excludes protected repository content",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-07T15:32:00.000Z"
                );

            assert.equal(
                context.relevantEntries.some(
                    (entry) => {
                        return (
                            entry.path ===
                                "node_modules" ||
                            entry.path.startsWith(
                                "node_modules/"
                            )
                        );
                    }
                ),
                false
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
    "reports no active session as compatible",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-07T15:33:00.000Z"
                );

            assert.equal(
                context.session.hasActiveSession,
                false
            );

            assert.equal(
                context.session.compatible,
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
    "detects compatible active session repository state",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-07T15:34:00.000Z"
                );

            const session =
                createRiverDevSession({
                    phase:
                        context.phase.phase,
                    specificationPath:
                        context.phase.specificationPath,
                    repository:
                        context.repository,
                    startedAt:
                        "2026-08-07T15:34:00.000Z"
                });

            const store =
                createRiverDevStateStore(
                    root
                );

            await store.beginSession(
                session
            );

            const resumedContext =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-07T15:34:00.000Z"
                );

            assert.equal(
                resumedContext.session.hasActiveSession,
                true
            );

            assert.equal(
                resumedContext.session.sessionId,
                session.sessionId
            );

            assert.equal(
                resumedContext.session.compatible,
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
    "grounds production context relationships in the repository architecture map",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-30T00:00:00.000Z"
                );

            const relationship =
                context.understanding.relationships.find(
                    (item) =>
                        item.from === "src/feature.ts" &&
                        item.to === "src/helper.ts"
                );

            assert.deepEqual(
                relationship,
                {
                    from: "src/feature.ts",
                    to: "src/helper.ts",
                    type: "imports",
                    reason: "repository architecture dependency"
                }
            );

            assert.equal(
                context.understanding.relationships.some(
                    (item) => item.to === "./helper"
                ),
                false
            );

            const featureRelevance =
                context.understanding.relevance.find(
                    (item) => item.path === "src/feature.ts"
                );

            const helperRelevance =
                context.understanding.relevance.find(
                    (item) => item.path === "src/helper.ts"
                );

            assert.equal(
                featureRelevance?.reasons.includes(
                    "has repository-local dependencies"
                ),
                true
            );

            assert.equal(
                helperRelevance?.reasons.includes(
                    "has repository-local dependents"
                ),
                true
            );

        }
        finally {

            await rm(
                root,
                {
                    recursive: true,
                    force: true
                }
            );

        }

    }
);
test(
    "bounds relevant repository context",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            for (
                let index = 0;
                index < 250;
                index += 1
            ) {

                await writeFile(
                    join(
                        root,
                        "tools",
                        "river-dev",
                        `generated-${index}.ts`
                    ),
                    "export {};\n",
                    "utf8"
                );

            }

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-07T15:35:00.000Z"
                );

            assert.equal(
                context.relevantEntries.length <=
                    RIVER_DEV_MAX_RELEVANT_CONTEXT_ENTRIES,
                true
            );

            assert.equal(
                context.relevantEntries.length,
                RIVER_DEV_MAX_RELEVANT_CONTEXT_ENTRIES
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
    "uses an explicitly requested phase specification",
    async () => {

        const {
            root,
            configuration
        } =
            await createFixture();

        try {

            const requestedSpecificationPath =
                join(
                    root,
                    ".river-dev",
                    "specifications",
                    "explicit-plan-specification.json"
                );

            const requestedSpecification = {
                phase:
                    "PLAN-EXPLICIT",
                branch:
                    "dev-19-context-engine",
                commitMessage:
                    "Explicit planning specification",
                objective:
                    "Prove explicit specification context selection.",
                architecturalContext: [
                    "Explicit specification context."
                ],
                approvedScope: {
                    modifiablePaths: [
                        "src/feature.ts"
                    ],
                    creatablePaths: [],
                    excludedPaths: []
                },
                acceptanceCriteria: [
                    "Explicit specification is selected."
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
                requestedSpecificationPath,
                JSON.stringify(
                    requestedSpecification,
                    null,
                    2
                ) + "\n",
                "utf8"
            );

            const context =
                await createRiverDevDevelopmentContext(
                    configuration,
                    "2026-08-30T01:00:00.000Z",
                    requestedSpecificationPath
                );

            assert.equal(
                context.phase.phase,
                "PLAN-EXPLICIT"
            );

            assert.equal(
                context.phase.objective,
                "Prove explicit specification context selection."
            );

            assert.equal(
                context.phase.commitMessage,
                "Explicit planning specification"
            );

            assert.deepEqual(
                context.scope.modifiablePaths,
                [
                    "src/feature.ts"
                ]
            );

            assert.equal(
                context.identity.specificationPath,
                ".river-dev/specifications/explicit-plan-specification.json"
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
