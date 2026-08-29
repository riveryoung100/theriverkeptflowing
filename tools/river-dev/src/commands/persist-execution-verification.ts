import {
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    join
} from "node:path";

import type {
    RiverDevConfiguration
} from "../types";

import type {
    RiverDevVerificationResult
} from "../execution/verification";

import type {
    RiverDevExecutionVerificationMetadata
} from "../core/execution-package";


export interface RiverDevExecutionVerificationPersistenceResult {

    readonly verification:
        RiverDevExecutionVerificationMetadata;

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly persisted:
        true;

    readonly implementationWritesPerformed:
        false;

}


function sanitizeVerificationIdentifier(
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
            "Verification identifier cannot be empty after sanitization."
        );
    }

    return sanitized;

}


export function createExecutionVerificationRepositoryPath(
    verificationId:
        string
): string {

    return [
        ".river-dev/execution-verifications",
        `${sanitizeVerificationIdentifier(
            verificationId
        )}.json`
    ].join(
        "/"
    );

}


export function createExecutionVerificationMetadata(
    verificationResult:
        RiverDevVerificationResult,
    verifiedAt:
        string
): RiverDevExecutionVerificationMetadata {

    if (
        verificationResult.verificationId.trim().length ===
        0
    ) {
        throw new TypeError(
            "Verification identifier cannot be empty."
        );
    }

    if (
        verificationResult.commandCount !==
        verificationResult.commands.length
    ) {
        throw new TypeError(
            "Verification command count is inconsistent with authoritative command results."
        );
    }

    if (
        verificationResult.passed !==
        verificationResult.requiredCommandsPassed
    ) {
        throw new TypeError(
            "Verification pass state is inconsistent with authoritative required-command evidence."
        );
    }

    const normalizedVerifiedAt =
        verifiedAt.trim();

    if (
        normalizedVerifiedAt.length ===
        0 ||
        Number.isNaN(
            Date.parse(
                normalizedVerifiedAt
            )
        )
    ) {
        throw new TypeError(
            "Verification materialization timestamp must be a valid date-time string."
        );
    }

    return {
        verificationId:
            verificationResult.verificationId,

        passed:
            verificationResult.passed,

        verifiedAt:
            normalizedVerifiedAt,

        commands:
            verificationResult.commands.map(
                (command) => {
                    return command.name;
                }
            ),

        warnings:
            [
                ...verificationResult.warnings
            ]
    };

}


export function serializeExecutionVerificationMetadata(
    verification:
        RiverDevExecutionVerificationMetadata
): string {

    return `${JSON.stringify(
        verification,
        null,
        2
    )}\n`;

}


export async function persistExecutionVerificationRiverDev(
    configuration:
        RiverDevConfiguration,
    verificationResult:
        RiverDevVerificationResult,
    verifiedAt:
        string = new Date().toISOString()
): Promise<RiverDevExecutionVerificationPersistenceResult> {

    const verification =
        createExecutionVerificationMetadata(
            verificationResult,
            verifiedAt
        );

    const repositoryPath =
        createExecutionVerificationRepositoryPath(
            verification.verificationId
        );

    const absolutePath =
        join(
            configuration.repositoryRoot,
            repositoryPath
        );

    await mkdir(
        dirname(
            absolutePath
        ),
        {
            recursive:
                true
        }
    );

    await writeFile(
        absolutePath,
        serializeExecutionVerificationMetadata(
            verification
        ),
        {
            encoding:
                "utf8",
            flag:
                "wx"
        }
    );

    return {
        verification,
        repositoryPath,
        absolutePath,
        persisted:
            true,
        implementationWritesPerformed:
            false
    };

}
