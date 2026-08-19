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


test(
    "composes trusted production authority with independently authorized apply orchestration",
    () => {
        const executionAuthorization =
            buildExecutionAuthorization();

        const productionAuthority =
            buildProductionAuthority("apply");

        const result =
            integrateProductionExecutionAuthorityOrchestration({
                productionAuthority,

                authorizationOrchestrationInput: {
                    executionAuthorization,
                    requestedMode:
                        "apply"
                }
            });

        assert.equal(
            result.version,
            "DEV-323"
        );

        assert.equal(
            result.integrationState,
            "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_READY"
        );

        assert.equal(
            result.readyForOperationalEntry,
            true
        );

        assert.equal(
            result.authorizationAcquired,
            true
        );

        assert.equal(
            result.authorizationConsumed,
            true
        );

        assert.equal(
            result.authorizationUsableForOperationalEntry,
            true
        );

        assert.equal(
            result.authorization?.authorizationState,
            "OPERATION_EXECUTION_AUTHORIZED"
        );

        assert.deepEqual(
            result.productionAuthority,
            productionAuthority
        );
    }
);


test(
    "dry-run preserves independently established authorization while remaining non-executing",
    () => {
        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            integrateProductionExecutionAuthorityOrchestration({
                productionAuthority:
                    buildProductionAuthority("dry-run"),

                authorizationOrchestrationInput: {
                    executionAuthorization,
                    requestedMode:
                        "dry-run"
                }
            });

        assert.equal(
            result.readyForOperationalEntry,
            true
        );

        assert.equal(
            result.authorizationAcquired,
            true
        );

        assert.equal(
            result.authorizationConsumed,
            true
        );

        assert.equal(
            result.authorizationUsableForOperationalEntry,
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

        assert.equal(
            result.commandExecutionPerformed,
            false
        );
    }
);


test(
    "fails closed when DEV-322 production authority is not trusted",
    () => {
        const executionAuthorization =
            buildExecutionAuthorization();

        const canonical =
            buildProductionAuthority("apply");

        const productionAuthority = {
            ...canonical,
            trusted:
                false
        };

        const result =
            integrateProductionExecutionAuthorityOrchestration({
                productionAuthority,

                authorizationOrchestrationInput: {
                    executionAuthorization,
                    requestedMode:
                        "apply"
                }
            });

        assert.equal(
            result.readyForOperationalEntry,
            false
        );

        assert.equal(
            result.integrationState,
            "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_BLOCKED"
        );

        assert.equal(
            result.authorization,
            null
        );
    }
);


test(
    "fails closed when production and authorization requested modes differ",
    () => {
        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            integrateProductionExecutionAuthorityOrchestration({
                productionAuthority:
                    buildProductionAuthority("dry-run"),

                authorizationOrchestrationInput: {
                    executionAuthorization,
                    requestedMode:
                        "apply"
                }
            });

        assert.equal(
            result.readyForOperationalEntry,
            false
        );

        assert.ok(
            result.blockedReasons.includes(
                "DEV-322 requested mode does not match DEV-319 authorization orchestration requested mode."
            )
        );

        assert.equal(
            result.authorization,
            null
        );
    }
);


test(
    "cannot create upgrade synthesize broaden or invoke authorization",
    () => {
        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            integrateProductionExecutionAuthorityOrchestration({
                productionAuthority:
                    buildProductionAuthority("apply"),

                authorizationOrchestrationInput: {
                    executionAuthorization,
                    requestedMode:
                        "apply"
                }
            });

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

        assert.equal(
            result.invokesOperationalEntry,
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


test(
    "preserves canonical DEV-322 authority composition evidence",
    () => {
        const productionAuthority =
            buildProductionAuthority("apply");

        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            integrateProductionExecutionAuthorityOrchestration({
                productionAuthority,

                authorizationOrchestrationInput: {
                    executionAuthorization,
                    requestedMode:
                        "apply"
                }
            });

        assert.deepEqual(
            result.productionAuthority,
            productionAuthority
        );

        assert.equal(
            result.productionAuthority.compositionState,
            "PRODUCTION_EXECUTION_AUTHORITY_COMPOSED"
        );

        assert.deepEqual(
            result.productionAuthority.blockedReasons,
            []
        );
    }
);


test(
    "produces deterministic integration output",
    () => {
        const executionAuthorization =
            buildExecutionAuthorization();

        const input = {
            productionAuthority:
                buildProductionAuthority("apply"),

            authorizationOrchestrationInput: {
                executionAuthorization,
                requestedMode:
                    "apply" as const
            }
        };

        const first =
            integrateProductionExecutionAuthorityOrchestration(
                input
            );

        const second =
            integrateProductionExecutionAuthorityOrchestration(
                input
            );

        assert.deepEqual(
            first,
            second
        );

        assert.equal(
            first.authorization?.authorizationState,
            "OPERATION_EXECUTION_AUTHORIZED"
        );
    }
);
