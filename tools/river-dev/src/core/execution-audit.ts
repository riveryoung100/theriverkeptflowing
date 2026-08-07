import {
    access,
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    join
} from "node:path";

import type {
    RiverDevPackageExecutionResult
} from "./package-executor";


export const RIVER_DEV_EXECUTION_AUDIT_VERSION =
    "1.0.0" as const;


export interface RiverDevExecutionAuditRecord {

    readonly version:
        typeof RIVER_DEV_EXECUTION_AUDIT_VERSION;

    readonly auditId:
        string;

    readonly packageId:
        string;

    readonly implementationId:
        string;

    readonly planId:
        string;

    readonly branch:
        string;

    readonly mode:
        RiverDevPackageExecutionResult["mode"];

    readonly applied:
        boolean;

    readonly explicitApplyAuthorized:
        boolean;

    readonly operationCount:
        number;

    readonly operations:
        RiverDevPackageExecutionResult[
            "implementation"
        ][
            "operations"
        ];

    readonly warnings:
        RiverDevPackageExecutionResult[
            "implementation"
        ][
            "warnings"
        ];

    readonly writesPerformed:
        boolean;

    readonly executedAt:
        string;

}


export interface RiverDevExecutionAuditRequest {

    readonly repositoryRoot:
        string;

    readonly auditRoot:
        string;

    readonly executionResult:
        RiverDevPackageExecutionResult;

    readonly executedAt:
        string;

}


export interface RiverDevExecutionAuditPreparation {

    readonly auditRecord:
        RiverDevExecutionAuditRecord;

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly content:
        string;

    readonly implementationWritesPerformed:
        false;

}


export interface RiverDevExecutionAuditPersistenceResult {

    readonly auditId:
        string;

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly persisted:
        true;

    readonly implementationWritesPerformed:
        false;

}


function requireNonEmpty(
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
            "Audit identifier cannot be empty after sanitization."
        );
    }

    return sanitized;

}


export function createExecutionAuditId(
    executionResult:
        RiverDevPackageExecutionResult,
    executedAt:
        string
): string {

    requireNonEmpty(
        executionResult.packageId,
        "Package identifier"
    );

    requireNonEmpty(
        executedAt,
        "Execution timestamp"
    );

    return [
        "execution-audit",
        sanitizeIdentifier(
            executionResult.packageId
        ),
        sanitizeIdentifier(
            executionResult.mode
        ),
        sanitizeIdentifier(
            executedAt
        )
    ].join(
        ":"
    );

}


export function createExecutionAuditRecord(
    executionResult:
        RiverDevPackageExecutionResult,
    executedAt:
        string
): RiverDevExecutionAuditRecord {

    requireNonEmpty(
        executionResult.implementation
            .implementationId,
        "Implementation identifier"
    );

    requireNonEmpty(
        executionResult.implementation
            .planId,
        "Plan identifier"
    );

    requireNonEmpty(
        executionResult.implementation
            .branch,
        "Execution branch"
    );

    requireNonEmpty(
        executedAt,
        "Execution timestamp"
    );

    if (
        executionResult.implementation
            .operationCount !==
        executionResult.implementation
            .operations.length
    ) {
        throw new TypeError(
            "Execution operation count does not match operation results."
        );
    }

    if (
        executionResult.mode ===
            "dry-run" &&
        executionResult.implementation
            .applied ===
            true
    ) {
        throw new TypeError(
            "Dry-run execution cannot report applied changes."
        );
    }

    if (
        executionResult.mode ===
            "apply" &&
        executionResult.explicitApplyAuthorized !==
            true
    ) {
        throw new TypeError(
            "Apply execution requires explicit authorization."
        );
    }

    return {
        version:
            RIVER_DEV_EXECUTION_AUDIT_VERSION,

        auditId:
            createExecutionAuditId(
                executionResult,
                executedAt
            ),

        packageId:
            executionResult.packageId,

        implementationId:
            executionResult.implementation
                .implementationId,

        planId:
            executionResult.implementation
                .planId,

        branch:
            executionResult.implementation
                .branch,

        mode:
            executionResult.mode,

        applied:
            executionResult.implementation
                .applied,

        explicitApplyAuthorized:
            executionResult
                .explicitApplyAuthorized,

        operationCount:
            executionResult.implementation
                .operationCount,

        operations:
            executionResult.implementation
                .operations.map(
                    (operation) => {
                        return {
                            ...operation
                        };
                    }
                ),

        warnings:
            [
                ...executionResult
                    .implementation
                    .warnings
            ],

        writesPerformed:
            executionResult.implementation
                .applied,

        executedAt
    };

}


export function serializeExecutionAuditRecord(
    auditRecord:
        RiverDevExecutionAuditRecord
): string {

    return JSON.stringify(
        auditRecord,
        null,
        2
    ) + "\n";

}


export function createExecutionAuditRepositoryPath(
    auditRoot:
        string,
    auditId:
        string
): string {

    const normalizedRoot =
        auditRoot
            .trim()
            .replace(
                /\\/g,
                "/"
            )
            .replace(
                /\/+$/g,
                ""
            );

    if (
        normalizedRoot.length ===
        0
    ) {
        throw new TypeError(
            "Execution audit root cannot be empty."
        );
    }

    return [
        normalizedRoot,
        `${sanitizeIdentifier(
            auditId
        )}.json`
    ].join(
        "/"
    );

}


export function prepareExecutionAudit(
    request:
        RiverDevExecutionAuditRequest
): RiverDevExecutionAuditPreparation {

    const auditRecord =
        createExecutionAuditRecord(
            request.executionResult,
            request.executedAt
        );

    const repositoryPath =
        createExecutionAuditRepositoryPath(
            request.auditRoot,
            auditRecord.auditId
        );

    return {
        auditRecord,

        repositoryPath,

        absolutePath:
            join(
                request.repositoryRoot,
                repositoryPath
            ),

        content:
            serializeExecutionAuditRecord(
                auditRecord
            ),

        implementationWritesPerformed:
            false
    };

}


async function pathExists(
    path:
        string
): Promise<boolean> {

    try {

        await access(
            path
        );

        return true;

    }
    catch {

        return false;

    }

}


export async function persistExecutionAudit(
    preparation:
        RiverDevExecutionAuditPreparation
): Promise<RiverDevExecutionAuditPersistenceResult> {

    if (
        await pathExists(
            preparation.absolutePath
        )
    ) {
        throw new TypeError(
            `Execution audit already exists: ${preparation.repositoryPath}`
        );
    }

    await mkdir(
        dirname(
            preparation.absolutePath
        ),
        {
            recursive:
                true
        }
    );

    await writeFile(
        preparation.absolutePath,
        preparation.content,
        {
            encoding:
                "utf8",

            flag:
                "wx"
        }
    );

    return {
        auditId:
            preparation.auditRecord.auditId,

        repositoryPath:
            preparation.repositoryPath,

        absolutePath:
            preparation.absolutePath,

        persisted:
            true,

        implementationWritesPerformed:
            false
    };

}

