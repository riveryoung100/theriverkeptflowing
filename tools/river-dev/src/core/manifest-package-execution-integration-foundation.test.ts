import {
    execFileSync
} from "node:child_process";

import assert from "node:assert/strict";
import test from "node:test";
import {
    mkdtemp,
    mkdir,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";
import {
    join
} from "node:path";
import {
    tmpdir
} from "node:os";

import type {
    RiverDevConfiguration
} from "../types";

import type {
    RiverDevManifestPackageExecutionRequestCompositionResult
} from "./manifest-package-execution-request-composition-foundation";

import type {
    RiverDevExecutionPackage
} from "./execution-package";

import type {
    RiverDevPackageExecutionRequest
} from "./package-executor";

import {
    integrateManifestPackageExecution
} from "./manifest-package-execution-integration-foundation";

import {
    loadRiverDevConfiguration
} from "./config";


function createPackage(): RiverDevExecutionPackage {

    return {
        version:
            "1.0.0",

        packageId:
            "execution-package:implementation:proposal:intent:dev-14-example",

        planId:
            "plan:dev-14-example",

        branch:
            "dev-14-controlled-package-execution",

        state:
            "ready-for-implementation",

        proposal:
            {
                version:
                    "1.0.0",

                proposalId:
                    "proposal:intent:dev-14-example",

                planId:
                    "plan:dev-14-example",

                branch:
                    "dev-14-controlled-package-execution",

                objective:
                    "Execute a controlled DEV-14 package.",

                approved:
                    true,

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "generated/dev-14-example.ts",

                        content:
                            "export const dev14Example = true;\n",

                        overwrite:
                            false,

                        reason:
                            "Create the DEV-14 example."
                    }
                ]
            },

        manifest:
            {
                version:
                    "1.0.0",

                implementationId:
                    "implementation:proposal:intent:dev-14-example",

                planId:
                    "plan:dev-14-example",

                branch:
                    "dev-14-controlled-package-execution",

                description:
                    "Execute a controlled DEV-14 package.",

                operations: [
                    {
                        type:
                            "write-file",

                        path:
                            "generated/dev-14-example.ts",

                        content:
                            "export const dev14Example = true;\n",

                        overwrite:
                            false
                    }
                ]
            },

        verification:
            {
                verificationId:
                    "verification:dev-14-example",

                passed:
                    true,

                verifiedAt:
                    "2026-08-06T22:45:00.000Z",

                commands: [
                    "typecheck",
                    "tests"
                ],

                warnings:
                    []
            },

        implementationReady:
            true,

        implementationWritesPerformed:
            false
    };

}


async function withTemporaryRepository(
    callback: (
        repositoryRoot: string,
        configuration: RiverDevConfiguration
    ) => Promise<void>
): Promise<void> {

    const repositoryRoot =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-328-"
            )
        );

    execFileSync(
        "git",
        [
            "init",
            "-b",
            "dev-14-controlled-package-execution"
        ],
        {
            cwd:
                repositoryRoot,
            stdio:
                "ignore"
        }
    );

    try {
        await mkdir(
            join(repositoryRoot, ".river-dev"),
            { recursive: true }
        );

        const sourceRoot = process.cwd();

        for (const file of [
            "project-map.json",
            "safety-policy.json",
            "quality-gates.json",
            "commands.json"
        ]) {
            await writeFile(
                join(repositoryRoot, ".river-dev", file),
                await readFile(
                    join(sourceRoot, ".river-dev", file),
                    "utf8"
                ),
                "utf8"
            );
        }

        const configuration =
            await loadRiverDevConfiguration(
                repositoryRoot
            );

        await callback(
            repositoryRoot,
            configuration
        );
    } finally {
        await rm(
            repositoryRoot,
            { recursive: true, force: true }
        );
    }
}


function blockedComposition(): RiverDevManifestPackageExecutionRequestCompositionResult {
    return {
        version: "DEV-327",
        source: "manifest-package-execution-request-composition-foundation",
        compositionState: "PACKAGE_EXECUTION_REQUEST_BLOCKED",
        composed: false,
        request: null,
        blockedReasons: ["blocked predecessor"],
        createsAuthorization: false,
        broadensAuthorization: false,
        consumesAuthorization: false,
        executesPackage: false,
        mutatesRepository: false
    };
}


test(
    "blocks an unsuccessful DEV-327 composition before package execution",
    async () => {
        await withTemporaryRepository(
            async (
                _repositoryRoot,
                configuration
            ) => {
                const result =
                    await integrateManifestPackageExecution({
                        configuration,
                        composition: blockedComposition()
                    });

                assert.equal(result.integrated, false);
                assert.equal(
                    result.integrationState,
                    "PACKAGE_EXECUTION_INTEGRATION_BLOCKED"
                );
                assert.equal(result.executionResult, null);
                assert.equal(result.executesPackage, false);
                assert.equal(result.createsAuthorization, false);
                assert.equal(result.broadensAuthorization, false);
                assert.equal(result.reacquiresAuthorization, false);
                assert.equal(result.synthesizesAuthorization, false);
                assert.equal(result.bypassesPackageExecutor, false);
                assert.deepEqual(
                    result.blockedReasons,
                    [
                        "Manifest package execution request composition is not composed.",
                        "Manifest package execution request composition is not successful.",
                        "Composed package execution request is absent.",
                        "Manifest package execution request composition contains blocked reasons."
                    ]
                );
            }
        );
    }
);


test(
    "blocks inconsistent composed state when the exact request is absent",
    async () => {
        await withTemporaryRepository(
            async (
                _repositoryRoot,
                configuration
            ) => {
                const composition: RiverDevManifestPackageExecutionRequestCompositionResult = {
                    ...blockedComposition(),
                    compositionState: "PACKAGE_EXECUTION_REQUEST_COMPOSED",
                    composed: true,
                    blockedReasons: []
                };

                const result =
                    await integrateManifestPackageExecution({
                        configuration,
                        composition
                    });

                assert.equal(result.integrated, false);
                assert.deepEqual(
                    result.blockedReasons,
                    ["Composed package execution request is absent."]
                );
                assert.equal(result.executionResult, null);
                assert.equal(result.executesPackage, false);
            }
        );
    }
);


test(
    "delegates a successful composed dry-run request through the package executor",
    async () => {
        await withTemporaryRepository(
            async (
                _repositoryRoot,
                configuration
            ) => {
                const executionPackage =
                    createPackage();

                const request: RiverDevPackageExecutionRequest = {
                    executionPackage,
                    mode: "dry-run",
                    operationExecutionAuthorization: null
                };

                const composition: RiverDevManifestPackageExecutionRequestCompositionResult = {
                    version: "DEV-327",
                    source: "manifest-package-execution-request-composition-foundation",
                    compositionState: "PACKAGE_EXECUTION_REQUEST_COMPOSED",
                    composed: true,
                    request,
                    blockedReasons: [],
                    createsAuthorization: false,
                    broadensAuthorization: false,
                    consumesAuthorization: false,
                    executesPackage: false,
                    mutatesRepository: false
                };

                const result =
                    await integrateManifestPackageExecution({
                        configuration,
                        composition
                    });

                assert.equal(result.integrated, true);
                assert.equal(
                    result.integrationState,
                    "PACKAGE_EXECUTION_INTEGRATED"
                );
                assert.equal(result.executesPackage, true);
                assert.equal(result.request, request);
                assert.equal(result.request?.executionPackage, executionPackage);
                assert.equal(result.request?.operationExecutionAuthorization, null);
                assert.equal(result.executionResult?.mode, "dry-run");
                assert.equal(
                    result.executionResult?.explicitApplyAuthorized,
                    false
                );
                assert.deepEqual(result.blockedReasons, []);
                assert.equal(result.createsAuthorization, false);
                assert.equal(result.broadensAuthorization, false);
                assert.equal(result.reacquiresAuthorization, false);
                assert.equal(result.synthesizesAuthorization, false);
                assert.equal(result.bypassesPackageExecutor, false);
            }
        );
    }
);


test(
    "preserves package-executor apply denial when composed request lacks governed authorization",
    async () => {
        await withTemporaryRepository(
            async (
                _repositoryRoot,
                configuration
            ) => {
                const executionPackage =
                    createPackage();

                const request: RiverDevPackageExecutionRequest = {
                    executionPackage,
                    mode: "apply",
                    operationExecutionAuthorization: null
                };

                const composition: RiverDevManifestPackageExecutionRequestCompositionResult = {
                    version: "DEV-327",
                    source: "manifest-package-execution-request-composition-foundation",
                    compositionState: "PACKAGE_EXECUTION_REQUEST_COMPOSED",
                    composed: true,
                    request,
                    blockedReasons: [],
                    createsAuthorization: false,
                    broadensAuthorization: false,
                    consumesAuthorization: false,
                    executesPackage: false,
                    mutatesRepository: false
                };

                await assert.rejects(
                    integrateManifestPackageExecution({
                        configuration,
                        composition
                    }),
                    /Apply denied because governed operation-execution authorization is absent\./
                );
            }
        );
    }
);


test(
    "executes an authorized composed apply through the package executor",
    async () => {
        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration
            ) => {
                const executionPackage =
                    createPackage();

                const authorization = {
                    authorizationState:
                        "OPERATION_EXECUTION_AUTHORIZED" as const
                };

                const request: RiverDevPackageExecutionRequest = {
                    executionPackage,
                    mode: "apply",
                    operationExecutionAuthorization:
                        authorization
                };

                const composition: RiverDevManifestPackageExecutionRequestCompositionResult = {
                    version: "DEV-327",
                    source: "manifest-package-execution-request-composition-foundation",
                    compositionState: "PACKAGE_EXECUTION_REQUEST_COMPOSED",
                    composed: true,
                    request,
                    blockedReasons: [],
                    createsAuthorization: false,
                    broadensAuthorization: false,
                    consumesAuthorization: false,
                    executesPackage: false,
                    mutatesRepository: false
                };

                const result =
                    await integrateManifestPackageExecution({
                        configuration,
                        composition
                    });

                assert.equal(result.integrated, true);
                assert.equal(
                    result.integrationState,
                    "PACKAGE_EXECUTION_INTEGRATED"
                );
                assert.equal(result.executesPackage, true);
                assert.equal(result.request, request);
                assert.equal(result.request?.executionPackage, executionPackage);
                assert.equal(
                    result.request?.operationExecutionAuthorization,
                    authorization
                );
                assert.equal(result.executionResult?.mode, "apply");
                assert.equal(
                    result.executionResult?.implementation.applied,
                    true
                );
                assert.equal(
                    result.executionResult?.explicitApplyAuthorized,
                    true
                );
                assert.equal(result.createsAuthorization, false);
                assert.equal(result.broadensAuthorization, false);
                assert.equal(result.reacquiresAuthorization, false);
                assert.equal(result.synthesizesAuthorization, false);
                assert.equal(result.bypassesPackageExecutor, false);

                const content =
                    await readFile(
                        join(
                            repositoryRoot,
                            "generated",
                            "dev-14-example.ts"
                        ),
                        "utf8"
                    );

                assert.equal(
                    content,
                    "export const dev14Example = true;\n"
                );
            }
        );
    }
);


test(
    "produces deterministic blocked results for equivalent predecessor state",
    async () => {
        await withTemporaryRepository(
            async (
                _repositoryRoot,
                configuration
            ) => {
                const composition = blockedComposition();

                const first =
                    await integrateManifestPackageExecution({
                        configuration,
                        composition
                    });

                const second =
                    await integrateManifestPackageExecution({
                        configuration,
                        composition
                    });

                assert.deepEqual(first, second);
            }
        );
    }
);
