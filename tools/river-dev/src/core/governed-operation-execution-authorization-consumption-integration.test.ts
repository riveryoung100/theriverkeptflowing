import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevControlledExecutorOperationPreparationFoundation
} from "../types";

import {
    buildControlledExecutorOperationExecutionAuthorizationFoundation
} from "./controlled-executor-operation-execution-authorization-foundation-engine";

import {
    consumeGovernedOperationExecutionAuthorization
} from "./governed-operation-execution-authorization-consumption-integration";


function buildTrustedPreparation(
    overrides: Partial<RiverDevControlledExecutorOperationPreparationFoundation> = {}
): RiverDevControlledExecutorOperationPreparationFoundation {

    return {
        version:
            "DEV-250",

        source:
            "DEV-250 deterministic DEV-318 test fixture",

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
    "consumes authorized governed apply authorization for operational entry",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        assert.equal(
            executionAuthorization.authorized,
            true
        );

        assert.equal(
            executionAuthorization.requiredCapabilityAuthorized,
            true
        );

        const result =
            consumeGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

        assert.equal(
            result.version,
            "DEV-318"
        );

        assert.equal(
            result.source,
            "governed-operation-execution-authorization-consumption-integration"
        );

        assert.equal(
            result.authorizationAcquired,
            true
        );

        assert.equal(
            result.authorizationUsableForOperationalEntry,
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
            result.grantsArbitraryRepositoryMutation,
            false
        );

        assert.equal(
            result.operationalExecutionPerformed,
            false
        );
    }
);


test(
    "fails closed when governed apply authorization is unusable",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization({
                authorizedCapabilities: [
                    "validate-approved-repository-change"
                ]
            });

        assert.equal(
            executionAuthorization.authorized,
            false
        );

        assert.equal(
            executionAuthorization.requiredCapabilityAuthorized,
            false
        );

        const result =
            consumeGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

        assert.equal(
            result.authorizationAcquired,
            true
        );

        assert.equal(
            result.authorizationUsableForOperationalEntry,
            false
        );

        assert.equal(
            result.authorization,
            null
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
            result.grantsArbitraryRepositoryMutation,
            false
        );

        assert.equal(
            result.operationalExecutionPerformed,
            false
        );
    }
);


test(
    "preserves dry-run authorization as inert consumption data",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        assert.equal(
            executionAuthorization.authorized,
            true
        );

        const result =
            consumeGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "dry-run"
            });

        assert.equal(
            result.authorizationAcquired,
            true
        );

        assert.equal(
            result.authorizationUsableForOperationalEntry,
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


        assert.equal(
            result.requestedApplyIsAuthorization,
            false
        );

        assert.equal(
            result.operationalExecutionPerformed,
            false
        );
    }
);


test(
    "consumption cannot manufacture or broaden execution authority",
    () => {

        const executionAuthorization =
            buildExecutionAuthorization();

        assert.equal(
            executionAuthorization.authorized,
            true
        );

        assert.equal(
            executionAuthorization.requiredCapabilityAuthorized,
            true
        );

        const result =
            consumeGovernedOperationExecutionAuthorization({
                executionAuthorization,
                requestedMode:
                    "apply"
            });

        assert.notEqual(
            result.authorization,
            null
        );

        assert.equal(
            result.authorization?.authorizationState,
            "OPERATION_EXECUTION_AUTHORIZED"
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
            result.grantsArbitraryRepositoryMutation,
            false
        );

        assert.equal(
            result.operationalExecutionPerformed,
            false
        );
    }
);