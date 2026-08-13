import type {
    RiverDevControlledExecutorOperationExecutionAuthorizationFoundation,
    RiverDevGovernedExecutorIntegrationFoundationInput,
    RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult
} from "../types";

import {
    buildGovernedExecutorIntegrationFoundation
} from "./governed-executor-integration-foundation-engine";

import {
    buildGovernedExecutorIntegrationVerificationFoundation
} from "./governed-executor-integration-verification-foundation-engine";

import {
    buildGovernedExecutorIntegrationAcceptanceFoundation
} from "./governed-executor-integration-acceptance-foundation-engine";

import {
    buildGovernedExecutorIntegrationHandoffFoundation
} from "./governed-executor-integration-handoff-foundation-engine";

import {
    verifyGovernedExecutorIntegrationHandoffFoundation
} from "./governed-executor-integration-handoff-verification-foundation-engine";

import {
    buildGovernedExecutorIntegrationHandoffAcceptanceFoundation
} from "./governed-executor-integration-handoff-acceptance-foundation-engine";

import {
    evaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundation
} from "./governed-executor-integration-accepted-handoff-packaging-foundation-engine";

import {
    evaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundation
} from "./governed-executor-integration-packaged-handoff-verification-foundation-engine";

import {
    evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation
} from "./governed-executor-integration-verified-package-downstream-admission-foundation-engine";

import {
    consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission
} from "./governed-executor-integration-verified-package-downstream-admission-consumption-foundation-engine";

import {
    evaluateGovernedExecutorIntegrationActiveAdmissionEligibility
} from "./governed-executor-integration-active-admission-eligibility-foundation-engine";

import {
    authorizeGovernedExecutorIntegrationActiveAdmission
} from "./governed-executor-integration-active-admission-authorization-foundation-engine";

import {
    verifyGovernedExecutorIntegrationActiveAdmissionAuthorization
} from "./governed-executor-integration-active-admission-verification-foundation-engine";

import {
    enforceGovernedExecutorIntegrationActiveAdmission
} from "./governed-executor-integration-active-admission-enforcement-foundation-engine";

import {
    authorizeGovernedExecutorIntegrationExecutorInvocation
} from "./governed-executor-integration-executor-invocation-authorization-foundation-engine";

import {
    invokeGovernedExecutor
} from "./governed-executor-integration-executor-invocation-foundation-engine";

import {
    createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation
} from "./governed-executor-integration-operation-execution-authorization-foundation-engine";


export interface RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput {

    readonly executionAuthorization:
        RiverDevControlledExecutorOperationExecutionAuthorizationFoundation;

    readonly requestedMode:
        RiverDevGovernedExecutorIntegrationFoundationInput["requestedMode"];

}


export function acquireGovernedOperationExecutionAuthorization(
    input:
        RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput
): RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult {

    const governedExecutorIntegration =
        buildGovernedExecutorIntegrationFoundation({
            executionAuthorization:
                input.executionAuthorization,
            requestedMode:
                input.requestedMode
        });


    const verification =
        buildGovernedExecutorIntegrationVerificationFoundation({
            governedExecutorIntegration
        });

    const acceptance =
        buildGovernedExecutorIntegrationAcceptanceFoundation({
            verification
        });

    const handoff =
        buildGovernedExecutorIntegrationHandoffFoundation({
            acceptance
        });

    const handoffVerification =
        verifyGovernedExecutorIntegrationHandoffFoundation({
            handoff
        });

    const handoffAcceptance =
        buildGovernedExecutorIntegrationHandoffAcceptanceFoundation({
            verification:
                handoffVerification
        });

    const packaging =
        evaluateGovernedExecutorIntegrationAcceptedHandoffPackagingFoundation({
            acceptance:
                handoffAcceptance
        });

    const packageVerification =
        evaluateGovernedExecutorIntegrationPackagedHandoffVerificationFoundation({
            packaging
        });

    const downstreamAdmission =
        evaluateGovernedExecutorIntegrationVerifiedPackageDownstreamAdmissionFoundation({
            verification:
                packageVerification
        });

    const admissionConsumption =
        consumeGovernedExecutorIntegrationVerifiedPackageDownstreamAdmission(
            downstreamAdmission
        );

    const activeAdmissionEligibility =
        evaluateGovernedExecutorIntegrationActiveAdmissionEligibility(
            admissionConsumption
        );

    const activeAdmissionAuthorization =
        authorizeGovernedExecutorIntegrationActiveAdmission(
            activeAdmissionEligibility
        );

    const activeAdmissionVerification =
        verifyGovernedExecutorIntegrationActiveAdmissionAuthorization({
            activeAdmissionAuthorization
        });

    const activeAdmissionEnforcement =
        enforceGovernedExecutorIntegrationActiveAdmission({
            activeAdmissionVerification
        });

    const executorInvocationAuthorization =
        authorizeGovernedExecutorIntegrationExecutorInvocation(
            activeAdmissionEnforcement
        );

    const executorInvocation =
        invokeGovernedExecutor(
            executorInvocationAuthorization
        );

    const operationExecutionAuthorization =
        createGovernedExecutorIntegrationOperationExecutionAuthorizationFoundation({
            executorInvocation
        });

    if (
        input.requestedMode === "apply" &&
        (
            input.executionAuthorization.authorized !== true ||
            input.executionAuthorization.requiredCapabilityAuthorized !== true
        )
    ) {
        return {
            ...operationExecutionAuthorization,

            trusted: false,
            ready: false,
            authorized: false,

            authorizationState:
                "OPERATION_EXECUTION_UNAUTHORIZED",

            invocation:
                null,

            operationExecutionAuthorizationEvidence:
                [],

            blockedReasons: [
                ...operationExecutionAuthorization.blockedReasons,
                "Original operation execution authorization does not authorize the requested apply operation."
            ]
        };
    }

    return operationExecutionAuthorization;

}
