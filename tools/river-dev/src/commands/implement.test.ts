import {
    strict as assert
} from "node:assert";

import {
    execFileSync
} from "node:child_process";

import {
    mkdtemp,
    readFile,
    rm,
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
    loadRiverDevConfiguration
} from "../core/config";

import type {
    RiverDevConfiguration,
    RiverDevProductionExecutionAuthorityOrchestrationIntegration
} from "../types";

import {
    implementRiverDevPlan
} from "./implement";
import type {
    RiverDevProductionExecutionAuthorityInputBoundaryFoundation
} from "../types";

import {
    createProductionExecutionAuthorityCompositionFoundation
} from "../core/production-execution-authority-composition-foundation";

import {
    integrateProductionExecutionAuthorityOrchestration
} from "../core/production-execution-authority-orchestration-integration";

import type {
    RiverDevControlledExecutorOperationPreparationFoundation
} from "../types";

import {
    buildControlledExecutorOperationExecutionAuthorizationFoundation
} from "../core/controlled-executor-operation-execution-authorization-foundation-engine";

function buildTrustedPreparation(
    overrides: Partial<RiverDevControlledExecutorOperationPreparationFoundation> = {}
): RiverDevControlledExecutorOperationPreparationFoundation {

    return {
        version:
            "DEV-250",

        source:
            "DEV-250 deterministic DEV-319 test fixture",

        objective:
            "Provide trusted prepared operation evidence.",

        trusted:
            true,

        ready:
            true,

        prepared:
            true,

        defaultPolicy:
            "DENY",

        preparationOnly:
            true,

        operationAdmission:
            {} as RiverDevControlledExecutorOperationPreparationFoundation["operationAdmission"],

        executionRequest:
            "inspect approved repository state",

        preparedOperation:
            "inspect-approved-repository-state",

        requiredCapability:
            "inspect-approved-repository-state",

        authorizedCapabilities: [
            "inspect-approved-repository-state"
        ],

        approvedExecutionScope: [
            "approved execution scope"
        ],

        preparationState: [
            "operation prepared"
        ],

        provenance: [
            "human authorization evidence",
            "repository authorization evidence",
            "explicit approval evidence"
        ],

        authorizationBoundaries: [
            "explicit approval required"
        ],

        scopeBoundaries: [
            "approved execution scope"
        ],

        blockedReasons:
            [],

        preparationMayCreateAuthorization:
            false,

        preparationMayExpandScope:
            false,

        preparationMayExecuteOperation:
            false,

        preparationMayModifyRepository:
            false,

        ...overrides
    };
}


function buildExecutionAuthorization(
    overrides: Partial<RiverDevControlledExecutorOperationPreparationFoundation> = {}
) {

    return buildControlledExecutorOperationExecutionAuthorizationFoundation({
        operationPreparation:
            buildTrustedPreparation(
                overrides
            )
    });
}

function createAuthorityInput(
  overrides:
    Partial<RiverDevProductionExecutionAuthorityInputBoundaryFoundation> = {}
): RiverDevProductionExecutionAuthorityInputBoundaryFoundation {
  return {
    version:
      "DEV-321",

    source:
      "production-execution-authority-input-boundary-foundation",

    objective:
      "Carry explicit production execution authority inputs without creating or broadening authorization.",

    trusted:
      true,

    ready:
      true,

    requestedMode:
      "apply",

    humanAuthorization: {
      authorized:
        true,
      authorizedBy:
        "human-approver",
      authorizationId:
        "human-authorization-1",
      authorizationSignals: [
        "explicit-human-authorization"
      ]
    },

    repositoryAuthorization: {
      authorized:
        true,
      repositoryRoot:
        "C:\\repository",
      authorizationId:
        "repository-authorization-1",
      authorizationSignals: [
        "explicit-repository-authorization"
      ]
    },

    approvedScope: {
      modifiablePaths: [
        "tools/river-dev/src/core/example.ts"
      ],
      creatablePaths: [],
      excludedPaths: []
    },

    approvalEvidence: {
      approved:
        true,
      approvedBy:
        "governance-approver",
      approvalId:
        "approval-1",
      approvalSignals: [
        "explicit-governance-approval"
      ]
    },

    authorityState:
      "PRODUCTION_EXECUTION_AUTHORITY_INPUT_READY",

    provenance: [
      "DEV-321 authority evidence"
    ],

    blockedReasons:
      [],

    requestedApplyIsAuthorization:
      false,

    createsExecutionAuthorization:
      false,

    upgradesExecutionAuthorization:
      false,

    synthesizesExecutionAuthorization:
      false,

    broadensApprovedScope:
      false,

    mayConstructDev317AcquisitionInput:
      false,

    mayInvokeDev317:
      false,

    mayInvokeDev318:
      false,

    mayInvokeDev319:
      false,

    mayExecuteOperation:
      false,

    mayInvokeExecutor:
      false,

    mayModifyRepository:
      false,

    mayDeleteRepositoryContent:
      false,

    mayStageRepositoryChanges:
      false,

    mayCommitRepositoryChanges:
      false,

    mayPushRepositoryChanges:
      false,

    mayDeploy:
      false,

    mayAccessSecrets:
      false,

    mayUseNetwork:
      false,

    mayInvokeShell:
      false,

    ...overrides
  };
}

function buildProductionAuthority(
    requestedMode:
        "dry-run" | "apply" = "apply"
) {
    const authorityInput =
        createAuthorityInput({
            requestedMode
        });

    return createProductionExecutionAuthorityCompositionFoundation({
        authorityInput
    });
}
function createManifest() {

    return {
        version:
            "1.0.0",

        implementationId:
            "implementation:proposal:intent:dev-325-example",

        planId:
            "plan:dev-325-example",

        branch:
            "dev-325-test-implementation",

        description:
            "Exercise the DEV-325 implement command production boundary.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "generated/dev-325-example.ts",

                content:
                    "export const dev325Example = true;\n",

                overwrite:
                    false
            }
        ]
    };

}


async function createConfiguration(
    repositoryRoot:
        string
): Promise<RiverDevConfiguration> {

    execFileSync(
        "git",
        [
            "init",
            "-b",
            "dev-325-test-implementation"
        ],
        {
            cwd:
                repositoryRoot,

            stdio:
                "ignore"
        }
    );

    const sourceRepositoryRoot = process.cwd();

    const baseConfiguration =
        await loadRiverDevConfiguration(
            sourceRepositoryRoot
        );

    return {
        ...baseConfiguration,

        repositoryRoot
    };

}


async function withTemporaryRepository(
    callback:
        (
            repositoryRoot:
                string,

            configuration:
                RiverDevConfiguration,

            manifestPath:
                string
        ) => Promise<void>
): Promise<void> {

    const repositoryRoot =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-implement-dev-325-"
            )
        );

    try {

        const configuration =
            await createConfiguration(
                repositoryRoot
            );

        const manifestPath =
            join(
                repositoryRoot,
                "implementation-manifest.json"
            );

        await writeFile(
            manifestPath,
            JSON.stringify(
                createManifest()
            ),
            "utf8"
        );

        await callback(
            repositoryRoot,
            configuration,
            manifestPath
        );

    }
    finally {

        await rm(
            repositoryRoot,
            {
                recursive:
                    true,

                force:
                    true
            }
        );

    }

}


function buildDev323(
    requestedMode:
        "dry-run" | "apply" =
            "apply"
): RiverDevProductionExecutionAuthorityOrchestrationIntegration {

    const executionAuthorization =
        buildExecutionAuthorization();

    return integrateProductionExecutionAuthorityOrchestration({
        productionAuthority:
            buildProductionAuthority(
                requestedMode
            ),

        authorizationOrchestrationInput: {
            executionAuthorization,
            requestedMode
        }
    });

}


async function assertGeneratedFileAbsent(
    repositoryRoot:
        string
): Promise<void> {

    await assert.rejects(
        readFile(
            join(
                repositoryRoot,
                "generated",
                "dev-325-example.ts"
            ),
            "utf8"
        )
    );

}

test(
    "DEV-325 preserves three-argument dry-run through DEV-314 without repository mutation",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                const result =
                    await implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "dry-run"
                    );

                assert.equal(
                    result.applied,
                    false
                );

                await assertGeneratedFileAbsent(
                    repositoryRoot
                );

            }
        );

    }
);


test(
    "DEV-325 fails closed when apply has no preexisting DEV-323 production authority",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                await assert.rejects(
                    implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "apply"
                    ),
                    /preexisting DEV-323 production execution authority orchestration result/
                );

                await assertGeneratedFileAbsent(
                    repositoryRoot
                );

            }
        );

    }
);


test(
    "DEV-325 rejects apply when supplied DEV-323 authority preserves dry-run mode",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                await assert.rejects(
                    implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "apply",
                        buildDev323(
                            "dry-run"
                        )
                    ),
                    /requestedMode to be apply/
                );

                await assertGeneratedFileAbsent(
                    repositoryRoot
                );

            }
        );

    }
);


test(
    "DEV-325 allows apply only through preexisting DEV-323 then DEV-324 and DEV-314 admission",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                const productionExecutionAuthority =
                    buildDev323(
                        "apply"
                    );

                assert.equal(
                    productionExecutionAuthority.readyForOperationalEntry,
                    true
                );

                assert.equal(
                    productionExecutionAuthority.authorizationUsableForOperationalEntry,
                    true
                );

                const result =
                    await implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "apply",
                        productionExecutionAuthority
                    );

                assert.equal(
                    result.applied,
                    true
                );

                const content =
                    await readFile(
                        join(
                            repositoryRoot,
                            "generated",
                            "dev-325-example.ts"
                        ),
                        "utf8"
                    );

                assert.equal(
                    content,
                    "export const dev325Example = true;\n"
                );

            }
        );

    }
);


test(
    "DEV-325 fails closed when DEV-323 is blocked before runner mutation",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                const canonical =
                    buildDev323(
                        "apply"
                    );

                const blocked:
                    RiverDevProductionExecutionAuthorityOrchestrationIntegration =
                    {
                        ...canonical,

                        integrationState:
                            "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_BLOCKED",

                        readyForOperationalEntry:
                            false,

                        authorizationUsableForOperationalEntry:
                            false
                    };

                await assert.rejects(
                    implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "apply",
                        blocked
                    )
                );

                await assertGeneratedFileAbsent(
                    repositoryRoot
                );

            }
        );

    }
);
