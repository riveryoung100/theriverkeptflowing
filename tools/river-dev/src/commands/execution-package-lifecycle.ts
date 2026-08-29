import type {
    RiverDevConfiguration,
    RiverDevOperationalExecutorIntegrationEntryAuthorization
} from "../types";

import type {
    RiverDevImplementationMode
} from "../execution/runner";

import type {
    RiverDevExecutionPackageResult
} from "../core/execution-package";

import type {
    RiverDevExecutionPackagePersistenceResult
} from "../core/execution-package-persistence";

import type {
    RiverDevPackageExecutionResult
} from "../core/package-executor";

import {
    createExecutionPackageRiverDev
} from "./create-execution-package";

import {
    persistExecutionPackageRiverDev
} from "./persist-execution-package";

import {
    executePackageRiverDev
} from "./execute-package";


export interface RiverDevExecutionPackageLifecycleResult {

    readonly creation:
        RiverDevExecutionPackageResult;

    readonly persistence:
        RiverDevExecutionPackagePersistenceResult;

    readonly execution:
        RiverDevPackageExecutionResult;

}


export async function executeExecutionPackageLifecycleRiverDev(
    configuration:
        RiverDevConfiguration,
    proposalPath:
        string,
    manifestPath:
        string,
    verificationPath:
        string,
    mode:
        RiverDevImplementationMode =
            "dry-run",
    operationExecutionAuthorization:
        RiverDevOperationalExecutorIntegrationEntryAuthorization
        | null =
            null
): Promise<RiverDevExecutionPackageLifecycleResult> {

    const creation =
        await createExecutionPackageRiverDev(
            configuration,
            proposalPath,
            manifestPath,
            verificationPath
        );

    const persistence =
        await persistExecutionPackageRiverDev(
            configuration,
            creation.executionPackage
        );

    const execution =
        await executePackageRiverDev(
            configuration,
            persistence.repositoryPath,
            mode,
            operationExecutionAuthorization
        );

    return {
        creation,
        persistence,
        execution
    };

}
