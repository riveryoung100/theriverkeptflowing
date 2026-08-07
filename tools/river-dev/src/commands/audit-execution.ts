import {
    readFile
} from "node:fs/promises";

import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import type {
    RiverDevPackageExecutionResult
} from "../core/package-executor";

import {
    persistExecutionAudit,
    prepareExecutionAudit
} from "../core/execution-audit";

import type {
    RiverDevExecutionAuditPersistenceResult
} from "../core/execution-audit";


function removeUtf8Bom(
    source:
        string
): string {

    if (
        source.charCodeAt(
            0
        ) ===
        0xfeff
    ) {
        return source.slice(
            1
        );
    }

    return source;

}


export async function loadPackageExecutionResult(
    configuration:
        RiverDevConfiguration,
    executionResultPath:
        string
): Promise<RiverDevPackageExecutionResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedPath =
        policy.assertRepositoryPath(
            executionResultPath
        );

    const source =
        await readFile(
            resolvedPath,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevPackageExecutionResult;

}


export async function auditExecutionRiverDev(
    configuration:
        RiverDevConfiguration,
    executionResult:
        RiverDevPackageExecutionResult,
    executedAt:
        string
): Promise<RiverDevExecutionAuditPersistenceResult> {

    const preparation =
        prepareExecutionAudit(
            {
                repositoryRoot:
                    configuration.repositoryRoot,

                auditRoot:
                    ".river-dev/execution-audits",

                executionResult,

                executedAt
            }
        );

    return persistExecutionAudit(
        preparation
    );

}


export async function auditExecutionFileRiverDev(
    configuration:
        RiverDevConfiguration,
    executionResultPath:
        string,
    executedAt:
        string
): Promise<RiverDevExecutionAuditPersistenceResult> {

    const executionResult =
        await loadPackageExecutionResult(
            configuration,
            executionResultPath
        );

    return auditExecutionRiverDev(
        configuration,
        executionResult,
        executedAt
    );

}


export function formatExecutionAuditResult(
    result:
        RiverDevExecutionAuditPersistenceResult
): string {

    return [
        "River Development Agent Execution Audit",
        `Audit ID: ${result.auditId}`,
        `Repository path: ${result.repositoryPath}`,
        `Persisted: ${result.persisted}`,
        `Implementation writes: ${result.implementationWritesPerformed}`
    ].join(
        "\n"
    );

}
