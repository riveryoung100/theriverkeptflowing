import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";


export const RIVER_DEV_EXECUTION_PACKAGE_VERSION =
    "1.0.0" as const;


export type RiverDevExecutionPackageState =
    | "ready-for-verification"
    | "verified"
    | "ready-for-implementation"
    | "blocked";


export interface RiverDevExecutionVerificationMetadata {

    readonly verificationId:
        string;

    readonly passed:
        boolean;

    readonly verifiedAt:
        string |
        null;

    readonly commands:
        readonly string[];

    readonly warnings:
        readonly string[];

}


export interface RiverDevExecutionPackage {

    readonly version:
        typeof RIVER_DEV_EXECUTION_PACKAGE_VERSION;

    readonly packageId:
        string;

    readonly planId:
        string;

    readonly branch:
        string;

    readonly state:
        RiverDevExecutionPackageState;

    readonly proposal:
        RiverDevImplementationProposal;

    readonly manifest:
        RiverDevImplementationManifest;

    readonly verification:
        RiverDevExecutionVerificationMetadata;

    readonly implementationReady:
        boolean;

    readonly implementationWritesPerformed:
        false;

}


export interface RiverDevExecutionPackageRequest {

    readonly proposal:
        RiverDevImplementationProposal;

    readonly manifest:
        RiverDevImplementationManifest;

    readonly verification:
        RiverDevExecutionVerificationMetadata;

}


export interface RiverDevExecutionPackageResult {

    readonly executionPackage:
        RiverDevExecutionPackage;

    readonly serialized:
        string;

    readonly implementationWritesPerformed:
        false;

}


function assertNonEmpty(
    value:
        string,
    label:
        string
): void {

    if (
        value.trim().length ===
        0
    ) {
        throw new TypeError(
            `${label} cannot be empty.`
        );
    }

}


function sanitizeIdentifier(
    value:
        string
): string {

    const sanitized =
        value
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9._-]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );

    if (
        sanitized.length ===
        0
    ) {
        throw new TypeError(
            "Execution package identifier cannot be empty after sanitization."
        );
    }

    return sanitized;

}


export function createExecutionPackageIdentifier(
    manifest:
        RiverDevImplementationManifest
): string {

    return `execution-package:${sanitizeIdentifier(
        manifest.implementationId
    )}`;

}


export function determineExecutionPackageState(
    verification:
        RiverDevExecutionVerificationMetadata
): RiverDevExecutionPackageState {

    if (
        verification.passed ===
        true
    ) {
        return "ready-for-implementation";
    }

    if (
        verification.verifiedAt !==
        null
    ) {
        return "blocked";
    }

    return "ready-for-verification";

}


export function serializeExecutionPackage(
    executionPackage:
        RiverDevExecutionPackage
): string {

    return `${JSON.stringify(
        executionPackage,
        null,
        2
    )}\n`;

}


export function validateExecutionPackageRequest(
    request:
        RiverDevExecutionPackageRequest
): void {

    const proposal =
        request.proposal;

    const manifest =
        request.manifest;

    const verification =
        request.verification;

    assertNonEmpty(
        proposal.proposalId,
        "Proposal identifier"
    );

    assertNonEmpty(
        proposal.planId,
        "Proposal plan identifier"
    );

    assertNonEmpty(
        proposal.branch,
        "Proposal branch"
    );

    assertNonEmpty(
        manifest.implementationId,
        "Implementation identifier"
    );

    assertNonEmpty(
        manifest.planId,
        "Manifest plan identifier"
    );

    assertNonEmpty(
        manifest.branch,
        "Manifest branch"
    );

    assertNonEmpty(
        verification.verificationId,
        "Verification identifier"
    );

    if (
        proposal.approved !==
        true
    ) {
        throw new TypeError(
            "Execution package requires an approved proposal."
        );
    }

    if (
        proposal.planId !==
        manifest.planId
    ) {
        throw new TypeError(
            "Execution package proposal and manifest plan identifiers do not match."
        );
    }

    if (
        proposal.branch !==
        manifest.branch
    ) {
        throw new TypeError(
            "Execution package proposal and manifest branches do not match."
        );
    }

    if (
        proposal.operations.length !==
        manifest.operations.length
    ) {
        throw new TypeError(
            "Execution package proposal and manifest operation counts do not match."
        );
    }

    for (
        let index =
            0;
        index <
            proposal.operations.length;
        index +=
            1
    ) {

        const proposalOperation =
            proposal.operations[index];

        const manifestOperation =
            manifest.operations[index];

        if (
            proposalOperation ===
                undefined ||
            manifestOperation ===
                undefined
        ) {
            throw new TypeError(
                "Execution package contains an incomplete operation mapping."
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

    if (
        verification.passed ===
            true &&
        verification.verifiedAt ===
            null
    ) {
        throw new TypeError(
            "Passing verification metadata requires a verification timestamp."
        );
    }

    if (
        verification.passed ===
            false &&
        verification.verifiedAt ===
            null &&
        verification.commands.length >
            0
    ) {
        throw new TypeError(
            "Unexecuted verification metadata cannot contain completed commands."
        );
    }

}


export function createExecutionPackage(
    request:
        RiverDevExecutionPackageRequest
): RiverDevExecutionPackageResult {

    validateExecutionPackageRequest(
        request
    );

    const state =
        determineExecutionPackageState(
            request.verification
        );

    const executionPackage:
        RiverDevExecutionPackage =
        {
            version:
                RIVER_DEV_EXECUTION_PACKAGE_VERSION,

            packageId:
                createExecutionPackageIdentifier(
                    request.manifest
                ),

            planId:
                request.manifest.planId,

            branch:
                request.manifest.branch,

            state,

            proposal:
                structuredClone(
                    request.proposal
                ),

            manifest:
                structuredClone(
                    request.manifest
                ),

            verification:
                structuredClone(
                    request.verification
                ),

            implementationReady:
                state ===
                "ready-for-implementation",

            implementationWritesPerformed:
                false
        };

    return {
        executionPackage,

        serialized:
            serializeExecutionPackage(
                executionPackage
            ),

        implementationWritesPerformed:
            false
    };

}
