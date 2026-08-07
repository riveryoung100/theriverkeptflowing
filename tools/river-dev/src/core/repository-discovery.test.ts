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
    discoverRepository
} from "./repository-discovery";


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


async function createTestRepository():
Promise<{
    readonly root: string;
    readonly configuration: RiverDevConfiguration;
}> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-discovery-"
            )
        );

    await mkdir(
        join(
            root,
            "src",
            "content"
        ),
        {
            recursive:
                true
        }
    );

    await mkdir(
        join(
            root,
            "src",
            "lib"
        ),
        {
            recursive:
                true
        }
    );

    await mkdir(
        join(
            root,
            "docs"
        ),
        {
            recursive:
                true
        }
    );

    await mkdir(
        join(
            root,
            "public",
            "images"
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
            ".github",
            "workflows"
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
            "hidden-package"
        ),
        {
            recursive:
                true
        }
    );

    await mkdir(
        join(
            root,
            "secrets",
            "nested"
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
            "lib",
            "engine.ts"
        ),
        "export const engine = true;\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "src",
            "lib",
            "engine.test.ts"
        ),
        "export {};\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "src",
            "content",
            "guide.md"
        ),
        "# Guide\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "docs",
            "architecture.md"
        ),
        "# Architecture\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "public",
            "images",
            "hero.txt"
        ),
        "asset\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "tools",
            "river-dev",
            "src",
            "index.ts"
        ),
        "export {};\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            ".river-dev",
            "specifications",
            "dev-test.json"
        ),
        "{}\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            ".github",
            "workflows",
            "ci.yml"
        ),
        "name: CI\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "package.json"
        ),
        "{}\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "node_modules",
            "hidden-package",
            "should-not-be-discovered.js"
        ),
        "secret\n",
        "utf8"
    );

    await writeFile(
        join(
            root,
            "secrets",
            "nested",
            "credential.txt"
        ),
        "never traverse\n",
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
            "Initial test repository"
        ]
    );

    await runGit(
        root,
        [
            "branch",
            "-M",
            "dev-18-repository-discovery"
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
                    "Discovery Test",

                repositoryType:
                    "TypeScript test repository",

                defaultBranch:
                    "main",

                packageManager:
                    "npm"

            },

            paths: {

                publicApplication:
                    "src",

                publicAssets:
                    "public",

                documentation:
                    "docs",

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

                denyPatterns: [
                    "**/secrets/**",
                    "**/*credential*"
                ],

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

            approvalRequiredFor: []

        },

        qualityGates: {

            version:
                "1.0.0",

            requiredBeforeCommit: [
                {
                    id:
                        "tests",
                    description:
                        "Tests pass"
                }
            ],

            existingNonBlockingHints:
                [],

            failureBehavior:
                "stop"

        },

        commandPolicy: {

            version:
                "1.0.0",

            allowedCommands: [
                {
                    name:
                        "test",
                    executable:
                        "node"
                }
            ],

            deniedExecutables:
                [],

            deniedGitArguments:
                []

        }

    };

    return {
        root,
        configuration
    };

}


test(
    "discovers repository entries deterministically",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestRepository();

        try {

            const first =
                await discoverRepository(
                    configuration,
                    "2026-08-07T15:00:00.000Z"
                );

            const second =
                await discoverRepository(
                    configuration,
                    "2026-08-07T15:00:00.000Z"
                );

            assert.deepEqual(
                first,
                second
            );

            const paths =
                first.entries.map(
                    (entry) => {
                        return entry.path;
                    }
                );

            assert.deepEqual(
                paths,
                [
                    ...paths
                ].sort(
                    (left, right) => {
                        return left.localeCompare(
                            right
                        );
                    }
                )
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
    "normalizes repository paths and distinguishes files from directories",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestRepository();

        try {

            const report =
                await discoverRepository(
                    configuration,
                    "2026-08-07T15:01:00.000Z"
                );

            assert.equal(
                report.entries.some(
                    (entry) => {
                        return entry.path.includes(
                            "\\"
                        );
                    }
                ),
                false
            );

            assert.equal(
                report.entries.find(
                    (entry) => {
                        return entry.path ===
                            "src";
                    }
                )?.kind,
                "directory"
            );

            assert.equal(
                report.entries.find(
                    (entry) => {
                        return entry.path ===
                            "src/lib/engine.ts";
                    }
                )?.kind,
                "file"
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
    "classifies important repository paths",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestRepository();

        try {

            const report =
                await discoverRepository(
                    configuration,
                    "2026-08-07T15:02:00.000Z"
                );

            const classification =
                (
                    path: string
                ) => {

                    return report.entries.find(
                        (entry) => {
                            return entry.path ===
                                path;
                        }
                    )?.classification;

                };

            assert.equal(
                classification(
                    "tools/river-dev/src/index.ts"
                ),
                "river-dev"
            );

            assert.equal(
                classification(
                    ".river-dev/specifications/dev-test.json"
                ),
                "river-dev"
            );

            assert.equal(
                classification(
                    "src/lib/engine.ts"
                ),
                "source"
            );

            assert.equal(
                classification(
                    "src/lib/engine.test.ts"
                ),
                "test"
            );

            assert.equal(
                classification(
                    "src/content/guide.md"
                ),
                "content"
            );

            assert.equal(
                classification(
                    "docs/architecture.md"
                ),
                "documentation"
            );

            assert.equal(
                classification(
                    "public/images/hero.txt"
                ),
                "public-asset"
            );

            assert.equal(
                classification(
                    ".github/workflows/ci.yml"
                ),
                "infrastructure"
            );

            assert.equal(
                classification(
                    "package.json"
                ),
                "configuration"
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
    "records protected paths without traversing their contents",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestRepository();

        try {

            const report =
                await discoverRepository(
                    configuration,
                    "2026-08-07T15:03:00.000Z"
                );

            const nodeModules =
                report.entries.find(
                    (entry) => {
                        return entry.path ===
                            "node_modules";
                    }
                );

            assert.equal(
                nodeModules?.protected,
                true
            );

            assert.equal(
                nodeModules?.classification,
                "protected"
            );

            assert.equal(
                report.entries.some(
                    (entry) => {
                        return entry.path.startsWith(
                            "node_modules/"
                        );
                    }
                ),
                false
            );

            assert.equal(
                report.entries.some(
                    (entry) => {
                        return entry.path ===
                            "secrets/nested/credential.txt";
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
    "reports counts, repository identity, and configured key paths",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestRepository();

        try {

            const report =
                await discoverRepository(
                    configuration,
                    "2026-08-07T15:04:00.000Z"
                );

            assert.equal(
                report.projectName,
                "Discovery Test"
            );

            assert.equal(
                report.branch,
                "dev-18-repository-discovery"
            );

            assert.match(
                report.commit,
                /^[0-9a-f]{40}$/
            );

            assert.equal(
                report.discoveredAt,
                "2026-08-07T15:04:00.000Z"
            );

            assert.equal(
                report.counts.total,
                report.entries.length
            );

            assert.equal(
                report.counts.files +
                    report.counts.directories,
                report.counts.total
            );

            assert.equal(
                report.counts.protected >
                    0,
                true
            );

            assert.equal(
                report.keyPaths.publicApplication,
                "src"
            );

            assert.equal(
                report.keyPaths.developmentAgent,
                "tools/river-dev"
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
