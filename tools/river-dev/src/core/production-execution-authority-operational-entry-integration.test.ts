import assert from "node:assert/strict";
import test from "node:test";
import type {
    RiverDevProductionExecutionAuthorityInputBoundaryFoundation
} from "../types";

import {
    createProductionExecutionAuthorityCompositionFoundation
} from "./production-execution-authority-composition-foundation";

import {
    integrateProductionExecutionAuthorityOrchestration
} from "./production-execution-authority-orchestration-integration";

import type {
    RiverDevControlledExecutorOperationPreparationFoundation
} from "../types";

import {
    buildControlledExecutorOperationExecutionAuthorizationFoundation
} from "./controlled-executor-operation-execution-authorization-foundation-engine";

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
import type {
    RiverDevProductionExecutionAuthorityOrchestrationIntegration
} from "../types";

import {
    integrateProductionExecutionAuthorityOperationalEntry
} from "./production-execution-authority-operational-entry-integration";
function createDev323(
    overrides:
        Partial<RiverDevProductionExecutionAuthorityOrchestrationIntegration> = {}
): RiverDevProductionExecutionAuthorityOrchestrationIntegration {

    const requestedMode =
        overrides.productionAuthority?.requestedMode ??
        "apply";

    const executionAuthorization =
        buildExecutionAuthorization();

    const canonical =
        integrateProductionExecutionAuthorityOrchestration({
            productionAuthority:
                buildProductionAuthority(
                    requestedMode
                ),

            authorizationOrchestrationInput: {
                executionAuthorization,
                requestedMode
            }
        });

    return {
        ...canonical,
        ...overrides,

        productionAuthority:
            overrides.productionAuthority ??
            canonical.productionAuthority
    };
}
test(
    "DEV-324 preserves dry-run and delegates non-mutating admission to DEV-314",
    () => {
        const upstream =
            createDev323({
                productionAuthority: {
                    ...createDev323().productionAuthority,
                    requestedMode:
                        "dry-run"
                },
                authorization:
                    null,
                authorizationAcquired:
                    false,
                authorizationConsumed:
                    false,
                authorizationUsableForOperationalEntry:
                    true
            });

        const result =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        assert.equal(
            result.requestedMode,
            "dry-run"
        );

        assert.equal(
            result.operationalEntry.entryState,
            "DRY_RUN_ADMITTED"
        );

        assert.equal(
            result.admitted,
            true
        );

        assert.equal(
            result.readyForOperationalEntry,
            true
        );

        assert.equal(
            result.operationalExecutionPerformed,
            false
        );

        assert.equal(
            result.repositoryMutationPerformed,
            false
        );
    }
);

test(
    "DEV-324 admits apply only through DEV-314 with preserved authorized identity",
    () => {
        const upstream =
            createDev323();

        const result =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        assert.equal(
            result.requestedMode,
            "apply"
        );

        assert.strictEqual(
            result.authorization,
            upstream.authorization
        );

        assert.equal(
            result.operationalEntry.authorizationState,
            "OPERATION_EXECUTION_AUTHORIZED"
        );

        assert.equal(
            result.operationalEntry.entryState,
            "APPLY_ADMITTED"
        );

        assert.equal(
            result.admitted,
            true
        );

        assert.equal(
            result.requestedApplyIsAuthorization,
            false
        );

        assert.equal(
            result.createsAuthorization,
            false
        );

        assert.equal(
            result.upgradesAuthorization,
            false
        );

        assert.equal(
            result.synthesizesAuthorization,
            false
        );

        assert.equal(
            result.broadensAuthorization,
            false
        );
    }
);

test(
    "DEV-324 fails closed when DEV-323 is blocked",
    () => {
        const upstream =
            createDev323({
                integrationState:
                    "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_BLOCKED",
                readyForOperationalEntry:
                    false,
                authorizationUsableForOperationalEntry:
                    false
            });

        const result =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        assert.equal(
            result.integrationState,
            "PRODUCTION_EXECUTION_AUTHORITY_OPERATIONAL_ENTRY_BLOCKED"
        );

        assert.equal(
            result.admitted,
            false
        );

        assert.equal(
            result.readyForOperationalEntry,
            false
        );

        assert.equal(
            result.authorization,
            null
        );

        assert.equal(
            result.operationalEntry.entryState,
            "APPLY_DENIED"
        );
    }
);

test(
    "DEV-324 fails closed when apply lacks usable authorization",
    () => {
        const upstream =
            createDev323({
                authorization:
                    null,
                authorizationAcquired:
                    false,
                authorizationConsumed:
                    false,
                authorizationUsableForOperationalEntry:
                    false
            });

        const result =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        assert.equal(
            result.admitted,
            false
        );

        assert.equal(
            result.authorization,
            null
        );

        assert.equal(
            result.operationalEntry.authorizationState,
            "AUTHORIZATION_ABSENT"
        );

        assert.equal(
            result.operationalEntry.entryState,
            "APPLY_DENIED"
        );
    }
);

test(
    "DEV-324 does not allow requested apply mode to create authorization",
    () => {
        const upstream =
            createDev323({
                authorization:
                    null,
                authorizationAcquired:
                    false,
                authorizationConsumed:
                    false,
                authorizationUsableForOperationalEntry:
                    false
            });

        const result =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        assert.equal(
            result.requestedMode,
            "apply"
        );

        assert.equal(
            result.requestedApplyIsAuthorization,
            false
        );

        assert.equal(
            result.createsAuthorization,
            false
        );

        assert.equal(
            result.operationalEntry.governedApplyAuthorized,
            false
        );

        assert.equal(
            result.admitted,
            false
        );
    }
);

test(
    "DEV-324 is deterministic for identical DEV-323 input",
    () => {
        const upstream =
            createDev323();

        const first =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        const second =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    upstream
            });

        assert.deepEqual(
            first,
            second
        );
    }
);

test(
    "DEV-324 remains non-executing and non-mutating",
    () => {
        const result =
            integrateProductionExecutionAuthorityOperationalEntry({
                productionExecutionAuthority:
                    createDev323()
            });

        assert.equal(
            result.broadensApprovedExecutionScope,
            false
        );

        assert.equal(
            result.bypassesOperationalEntry,
            false
        );

        assert.equal(
            result.operationalExecutionPerformed,
            false
        );

        assert.equal(
            result.repositoryMutationPerformed,
            false
        );

        assert.equal(
            result.commandExecutionPerformed,
            false
        );

        assert.equal(
            result.commitPerformed,
            false
        );

        assert.equal(
            result.pushPerformed,
            false
        );

        assert.equal(
            result.deploymentPerformed,
            false
        );
    }
);
