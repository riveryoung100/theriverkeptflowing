import type {
    RiverDevConfiguration,
    RiverDevManifestPackageExecutionIntegrationFoundation
} from "../types";

import type {
    RiverDevManifestPackageExecutionRequestCompositionResult
} from "./manifest-package-execution-request-composition-foundation";

import {
    executePackage
} from "./package-executor";

import type {
    RiverDevPackageExecutionRequest,
    RiverDevPackageExecutionResult
} from "./package-executor";


export interface RiverDevManifestPackageExecutionIntegrationInput {

    readonly configuration:
        RiverDevConfiguration;

    readonly composition:
        RiverDevManifestPackageExecutionRequestCompositionResult;

}


export interface RiverDevManifestPackageExecutionIntegrationResult
    extends RiverDevManifestPackageExecutionIntegrationFoundation {

    readonly request:
        RiverDevPackageExecutionRequest | null;

    readonly executionResult:
        RiverDevPackageExecutionResult | null;

}


export async function integrateManifestPackageExecution(
    input:
        RiverDevManifestPackageExecutionIntegrationInput
): Promise<RiverDevManifestPackageExecutionIntegrationResult> {

    const composition =
        input.composition;

    const blockedReasons: string[] = [];

    if (
        composition.compositionState !==
        "PACKAGE_EXECUTION_REQUEST_COMPOSED"
    ) {
        blockedReasons.push(
            "Manifest package execution request composition is not composed."
        );
    }

    if (composition.composed !== true) {
        blockedReasons.push(
            "Manifest package execution request composition is not successful."
        );
    }

    if (composition.request === null) {
        blockedReasons.push(
            "Composed package execution request is absent."
        );
    }

    if (composition.blockedReasons.length !== 0) {
        blockedReasons.push(
            "Manifest package execution request composition contains blocked reasons."
        );
    }

    if (blockedReasons.length !== 0) {
        return {
            version:
                "DEV-328",

            source:
                "manifest-package-execution-integration-foundation",

            integrationState:
                "PACKAGE_EXECUTION_INTEGRATION_BLOCKED",

            integrated:
                false,

            blockedReasons,

            createsAuthorization:
                false,

            broadensAuthorization:
                false,

            reacquiresAuthorization:
                false,

            synthesizesAuthorization:
                false,

            executesPackage:
                false,

            bypassesPackageExecutor:
                false,

            request:
                null,

            executionResult:
                null
        };
    }

    const request =
        composition.request;

    if (request === null) {
        throw new TypeError(
            "DEV-328 invariant violation: composed request became absent after validation."
        );
    }

    const executionResult =
        await executePackage(
            input.configuration,
            request
        );

    return {
        version:
            "DEV-328",

        source:
            "manifest-package-execution-integration-foundation",

        integrationState:
            "PACKAGE_EXECUTION_INTEGRATED",

        integrated:
            true,

        blockedReasons:
            [],

        createsAuthorization:
            false,

        broadensAuthorization:
            false,

        reacquiresAuthorization:
            false,

        synthesizesAuthorization:
            false,

        executesPackage:
            true,

        bypassesPackageExecutor:
            false,

        request:
            request,

        executionResult
    };

}
