import type {
    RiverDevOperationalExecutorIntegrationEntryAuthorization
} from "../types";

import type {
    RiverDevManifestPropagationFoundation
} from "../types";

import type {
    RiverDevImplementationMode
} from "../execution/runner";

import type {
    RiverDevPackageExecutionRequest
} from "./package-executor";

import type {
    RiverDevExecutionPackage
} from "./execution-package";


export interface RiverDevManifestPackageExecutionRequestCompositionInput {

    readonly manifestPropagation:
        RiverDevManifestPropagationFoundation;

    readonly executionPackage:
        RiverDevExecutionPackage | null;

    readonly mode:
        RiverDevImplementationMode;

    readonly operationExecutionAuthorization?:
        RiverDevOperationalExecutorIntegrationEntryAuthorization
        | null;

}


export interface RiverDevManifestPackageExecutionRequestCompositionResult {

    readonly version:
        "DEV-327";

    readonly source:
        "manifest-package-execution-request-composition-foundation";

    readonly compositionState:
        "PACKAGE_EXECUTION_REQUEST_COMPOSED"
        | "PACKAGE_EXECUTION_REQUEST_BLOCKED";

    readonly composed:
        boolean;

    readonly request:
        RiverDevPackageExecutionRequest | null;

    readonly blockedReasons:
        readonly string[];

    readonly createsAuthorization:
        false;

    readonly broadensAuthorization:
        false;

    readonly consumesAuthorization:
        false;

    readonly executesPackage:
        false;

    readonly mutatesRepository:
        false;

}


export function composeManifestPackageExecutionRequest(
    input:
        RiverDevManifestPackageExecutionRequestCompositionInput
): RiverDevManifestPackageExecutionRequestCompositionResult {

    const blockedReasons: string[] = [];

    const propagation =
        input.manifestPropagation;

    if (
        propagation.propagationState !==
        "MANIFEST_PROPAGATION_READY"
    ) {
        blockedReasons.push(
            "Manifest propagation is not ready for package execution request composition."
        );
    }

    if (
        propagation.eligibleForDownstreamPropagation !==
        true
    ) {
        blockedReasons.push(
            "Manifest is not eligible for downstream propagation."
        );
    }

    if (propagation.manifest === null) {
        blockedReasons.push(
            "Propagated implementation manifest is absent."
        );
    }

    if (input.executionPackage === null) {
        blockedReasons.push(
            "Execution package was not provided."
        );
    }

    if (
        input.mode !== "dry-run" &&
        input.mode !== "apply"
    ) {
        blockedReasons.push(
            "Requested implementation mode is invalid."
        );
    }

    if (
        propagation.manifest !== null &&
        input.executionPackage !== null &&
        input.executionPackage.manifest !==
            propagation.manifest
    ) {
        blockedReasons.push(
            "Execution package manifest is not the successfully propagated manifest."
        );
    }

    const composed =
        blockedReasons.length === 0;

    const request:
        RiverDevPackageExecutionRequest | null =
        composed &&
        input.executionPackage !== null
            ? {
                executionPackage:
                    input.executionPackage,

                mode:
                    input.mode,

                operationExecutionAuthorization:
                    input.operationExecutionAuthorization ??
                    null
            }
            : null;

    return {
        version:
            "DEV-327",

        source:
            "manifest-package-execution-request-composition-foundation",

        compositionState:
            composed
                ? "PACKAGE_EXECUTION_REQUEST_COMPOSED"
                : "PACKAGE_EXECUTION_REQUEST_BLOCKED",

        composed,

        request,

        blockedReasons,

        createsAuthorization:
            false,

        broadensAuthorization:
            false,

        consumesAuthorization:
            false,

        executesPackage:
            false,

        mutatesRepository:
            false
    };
}
