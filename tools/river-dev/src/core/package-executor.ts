import type {
    RiverDevConfiguration,
    RiverDevOperationalExecutorIntegrationEntryAuthorization
} from "../types";

import {
    createImplementationRunner
} from "../execution/runner";

import type {
    RiverDevImplementationMode,
    RiverDevImplementationResult
} from "../execution/runner";

import type {
    RiverDevExecutionPackage
} from "./execution-package";

import {
    establishOperationalExecutorIntegrationEntryFoundation
} from "./operational-executor-integration-entry-foundation-engine";


export interface RiverDevPackageExecutionRequest {

    readonly executionPackage:
        RiverDevExecutionPackage;

    readonly mode:
        RiverDevImplementationMode;

    readonly operationExecutionAuthorization?:
        RiverDevOperationalExecutorIntegrationEntryAuthorization
        | null;

}


export interface RiverDevPackageExecutionResult {

    readonly packageId:
        string;

    readonly mode:
        RiverDevImplementationMode;

    readonly implementation:
        RiverDevImplementationResult;

    readonly explicitApplyAuthorized:
        boolean;

}


export function validatePackageExecutionRequest(
    request:
        RiverDevPackageExecutionRequest
): void {

    const executionPackage =
        request.executionPackage;

    if (
        executionPackage.version !==
        "1.0.0"
    ) {
        throw new TypeError(
            "Unsupported execution package version."
        );
    }

    if (
        executionPackage.proposal.approved !==
        true
    ) {
        throw new TypeError(
            "Execution package requires an approved proposal."
        );
    }

    if (
        executionPackage.verification.passed !==
        true
    ) {
        throw new TypeError(
            "Execution package requires passing verification."
        );
    }

    if (
        executionPackage.verification.verifiedAt ===
        null
    ) {
        throw new TypeError(
            "Execution package requires a verification timestamp."
        );
    }

    if (
        executionPackage.state !==
        "ready-for-implementation"
    ) {
        throw new TypeError(
            `Execution package is not ready for implementation: ${executionPackage.state}`
        );
    }

    if (
        executionPackage.implementationReady !==
        true
    ) {
        throw new TypeError(
            "Execution package implementation readiness is false."
        );
    }

    if (
        executionPackage.implementationWritesPerformed !==
        false
    ) {
        throw new TypeError(
            "Execution package indicates prior implementation writes."
        );
    }

    if (
        executionPackage.planId !==
        executionPackage.proposal.planId ||
        executionPackage.planId !==
        executionPackage.manifest.planId
    ) {
        throw new TypeError(
            "Execution package plan identifiers do not match."
        );
    }

    if (
        executionPackage.branch !==
        executionPackage.proposal.branch ||
        executionPackage.branch !==
        executionPackage.manifest.branch
    ) {
        throw new TypeError(
            "Execution package branches do not match."
        );
    }

    if (
        executionPackage.proposal.operations.length !==
        executionPackage.manifest.operations.length
    ) {
        throw new TypeError(
            "Execution package operation counts do not match."
        );
    }

    for (
        const [
            index,
            proposalOperation
        ] of
        executionPackage.proposal.operations.entries()
    ) {

        const manifestOperation =
            executionPackage.manifest.operations[
                index
            ];

        if (
            manifestOperation ===
            undefined
        ) {
            throw new TypeError(
                `Execution package manifest operation is missing at index ${index}.`
            );
        }

        if (
            proposalOperation.type !==
                manifestOperation.type ||
            proposalOperation.path !==
                manifestOperation.path ||
            proposalOperation.content !==
                manifestOperation.content ||
            proposalOperation.overwrite !==
                manifestOperation.overwrite
        ) {
            throw new TypeError(
                `Execution package operation mismatch at index ${index}.`
            );
        }

    }

}


export async function executePackage(
    configuration:
        RiverDevConfiguration,
    request:
        RiverDevPackageExecutionRequest
): Promise<RiverDevPackageExecutionResult> {

    validatePackageExecutionRequest(
        request
    );

    const operationalEntry =
        establishOperationalExecutorIntegrationEntryFoundation(
            {
                requestedMode:
                    request.mode,

                authorization:
                    request.operationExecutionAuthorization ??
                    null
            }
        );

    if (
        request.mode ===
            "apply" &&
        operationalEntry.admitted !==
            true
    ) {
        throw new TypeError(
            operationalEntry.blockedReasons.join(
                " "
            )
        );
    }

    const runner =
        createImplementationRunner(
            configuration
        );

    const implementation =
        await runner.execute(
            request.executionPackage.manifest,
            operationalEntry.effectiveMode
        );

    return {
        packageId:
            request.executionPackage.packageId,

        mode:
            request.mode,

        implementation,

        explicitApplyAuthorized:
            operationalEntry.governedApplyAuthorized
    };

}
