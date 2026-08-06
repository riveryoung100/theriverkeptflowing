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
    RiverDevExecutionPackage
} from "./execution-package";

import {
    serializeExecutionPackage
} from "./execution-package";


export interface RiverDevExecutionPackagePersistenceRequest {

    readonly repositoryRoot:
        string;

    readonly packageRoot:
        string;

    readonly executionPackage:
        RiverDevExecutionPackage;

}


export interface RiverDevExecutionPackagePersistencePreparation {

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly content:
        string;

    readonly implementationWritesPerformed:
        false;

}


export interface RiverDevExecutionPackagePersistenceResult {

    readonly repositoryPath:
        string;

    readonly absolutePath:
        string;

    readonly persisted:
        true;

    readonly implementationWritesPerformed:
        false;

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


export function createExecutionPackageRepositoryPath(
    packageRoot:
        string,
    packageId:
        string
): string {

    const normalizedRoot =
        packageRoot
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
            "Execution package root cannot be empty."
        );
    }

    return [
        normalizedRoot,
        `${sanitizeIdentifier(
            packageId
        )}.json`
    ].join(
        "/"
    );

}


export function prepareExecutionPackagePersistence(
    request:
        RiverDevExecutionPackagePersistenceRequest
): RiverDevExecutionPackagePersistencePreparation {

    if (
        request.executionPackage.version !==
        "1.0.0"
    ) {
        throw new TypeError(
            "Unsupported execution package version."
        );
    }

    if (
        request.executionPackage.packageId.trim().length ===
        0
    ) {
        throw new TypeError(
            "Execution package identifier cannot be empty."
        );
    }

    const repositoryPath =
        createExecutionPackageRepositoryPath(
            request.packageRoot,
            request.executionPackage.packageId
        );

    return {
        repositoryPath,

        absolutePath:
            join(
                request.repositoryRoot,
                repositoryPath
            ),

        content:
            serializeExecutionPackage(
                request.executionPackage
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


export async function persistExecutionPackage(
    preparation:
        RiverDevExecutionPackagePersistencePreparation
): Promise<RiverDevExecutionPackagePersistenceResult> {

    if (
        await pathExists(
            preparation.absolutePath
        )
    ) {
        throw new TypeError(
            `Execution package already exists: ${preparation.repositoryPath}`
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
