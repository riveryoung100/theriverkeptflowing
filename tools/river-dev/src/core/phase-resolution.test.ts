import {
    mkdtemp,
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    join
} from "node:path";

import {
    tmpdir
} from "node:os";

import test from "node:test";

import assert from "node:assert/strict";

import type {
    RiverDevConfiguration
} from "../types";

import {
    resolvePhaseSpecification
} from "./phase-resolution";


async function createTestConfiguration(): Promise<{
    readonly root: string;
    readonly configuration: RiverDevConfiguration;
}> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-phase-resolution-"
            )
        );

    const specificationsRoot =
        join(
            root,
            ".river-dev",
            "specifications"
        );

    await mkdir(
        specificationsRoot,
        {
            recursive:
                true
        }
    );

    const configuration: RiverDevConfiguration = {
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
                    "Test Project",
                repositoryType:
                    "test",
                defaultBranch:
                    "main",
                packageManager:
                    "npm"
            },
            paths: {},
            commands: {},
            conventions: {},
            protectedPaths: []
        },
        safetyPolicy: {
            version:
                "1.0.0",
            defaultMode:
                "dry-run",
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
                    false,
                allowNetworkCommands:
                    false,
                allowDownloadedScripts:
                    false,
                allowPackageInstall:
                    false,
                allowProductionCommands:
                    false,
                maximumCommandSeconds:
                    30
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
            existingNonBlockingHints: [],
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
            deniedExecutables: [],
            deniedGitArguments: []
        }
    };

    return {
        root,
        configuration
    };

}


async function writeSpecification(
    root: string,
    fileName: string,
    branch: string
): Promise<string> {

    const path =
        join(
            root,
            ".river-dev",
            "specifications",
            fileName
        );

    await writeFile(
        path,
        JSON.stringify(
            {
                branch
            },
            null,
            2
        ),
        "utf8"
    );

    return path;

}


test(
    "resolves the specification whose branch matches",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestConfiguration();

        const expectedPath =
            await writeSpecification(
                root,
                "dev-16-phase-resolution.json",
                "dev-16-agent-session-state"
            );

        await writeSpecification(
            root,
            "dev-15-other.json",
            "dev-15-execution-audit-record"
        );

        const resolvedPath =
            await resolvePhaseSpecification(
                configuration,
                "dev-16-agent-session-state"
            );

        assert.equal(
            resolvedPath,
            expectedPath
        );

    }
);


test(
    "rejects a non-development branch",
    async () => {

        const {
            configuration
        } =
            await createTestConfiguration();

        await assert.rejects(
            async () => {
                await resolvePhaseSpecification(
                    configuration,
                    "main"
                );
            },
            /not a River Dev phase branch/
        );

    }
);


test(
    "rejects when no matching specification exists",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestConfiguration();

        await writeSpecification(
            root,
            "dev-15-other.json",
            "dev-15-execution-audit-record"
        );

        await assert.rejects(
            async () => {
                await resolvePhaseSpecification(
                    configuration,
                    "dev-16-agent-session-state"
                );
            },
            /No River Dev specification found/
        );

    }
);


test(
    "rejects multiple specifications for the same branch",
    async () => {

        const {
            root,
            configuration
        } =
            await createTestConfiguration();

        await writeSpecification(
            root,
            "dev-16-first.json",
            "dev-16-agent-session-state"
        );

        await writeSpecification(
            root,
            "dev-16-second.json",
            "dev-16-agent-session-state"
        );

        await assert.rejects(
            async () => {
                await resolvePhaseSpecification(
                    configuration,
                    "dev-16-agent-session-state"
                );
            },
            /Multiple River Dev specifications found/
        );

    }
);
