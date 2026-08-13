import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevControlledExecutorOperationPreparationFoundation
} from "../types";

import {
    buildControlledExecutorOperationExecutionAuthorizationFoundation
} from "./controlled-executor-operation-execution-authorization-foundation-engine";

import {
    orchestrateGovernedOperationExecutionAuthorization
} from "./governed-operation-execution-authorization-orchestration-integration";


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


test(
    "orchestrates authorized apply toward operational entry without executing",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            orchestrateGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

        assert.equal(
            result.version,
            "DEV-319"
        );

        assert.equal(
            result.orchestrationState,
            "AUTHORIZATION_READY_FOR_OPERATIONAL_ENTRY"
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
            result.readyForOperationalEntry,
            true
        );

        assert.notEqual(
            result.authorization,
            null
        );

        assert.equal(
            result.authorization?.authorizationState,
            "OPERATION_EXECUTION_AUTHORIZED"
        );

        assert.deepEqual(
            result.blockedReasons,
            []
        );
    }
);


test(
    "fails closed when authorization is not usable for operational entry",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization({
                authorizedCapabilities: [
                    "validate-approved-repository-change"
                ]
            });

        const result =
            orchestrateGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

        assert.equal(
            result.orchestrationState,
            "AUTHORIZATION_BLOCKED"
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

        assert.ok(
            result.blockedReasons.length >
                0
        );
    }
);


test(
    "dry-run orchestration remains non-executing",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            orchestrateGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "dry-run"
            });

        assert.equal(
            result.authorizationAcquired,
            true
        );

        assert.equal(
            result.authorizationConsumed,
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

        assert.equal(
            result.invokesOperationalEntry,
            false
        );
    }
);


test(
    "requested apply cannot manufacture or broaden authorization",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        const result =
            orchestrateGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
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
    }
);


test(
    "orchestration preserves the DEV-318 authorization identity when usable",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        const first =
            orchestrateGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

        const second =
            orchestrateGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

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