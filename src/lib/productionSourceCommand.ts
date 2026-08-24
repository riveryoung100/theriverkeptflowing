import {
    readFile
} from "node:fs/promises";

import type {
    FileSystemSourceIngestionRequest
} from "./assimilation/ingestion/types";

import {
    createProductionSourceIntake
} from "./productionSourceIntake";


export interface ProductionSourceCommandArguments {

    requestFilePath:
        string;

    rawSourceRootDirectory:
        string;

}


export function parseProductionSourceCommandArguments(
    arguments_: readonly string[]
): ProductionSourceCommandArguments {

    if (arguments_.length !== 2) {

        throw new Error(
            "Production source intake requires exactly two arguments: <request-file-path> <raw-source-root-directory>."
        );

    }

    const requestFilePath =
        arguments_[0]?.trim() ??
        "";

    const rawSourceRootDirectory =
        arguments_[1]?.trim() ??
        "";

    if (requestFilePath.length === 0) {

        throw new Error(
            "Production source request file path must not be empty."
        );

    }

    if (rawSourceRootDirectory.length === 0) {

        throw new Error(
            "Production raw-source root directory must not be empty."
        );

    }

    return {
        requestFilePath,
        rawSourceRootDirectory
    };

}


function assertProductionSourceRequest(
    value: unknown
): asserts value is FileSystemSourceIngestionRequest {

    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            "Production source request must be a JSON object."
        );

    }

    const request =
        value as
            Record<string, unknown>;

    if (
        typeof request.content !==
            "string"
    ) {

        throw new TypeError(
            'Production source request field "content" must be a string.'
        );

    }

    if (
        typeof request.assetType !==
            "string" ||
        request.assetType.length ===
            0
    ) {

        throw new TypeError(
            'Production source request field "assetType" must be a non-empty string.'
        );

    }

    if (
        typeof request.originalFilename !==
            "string" ||
        request.originalFilename.length ===
            0
    ) {

        throw new TypeError(
            'Production source request field "originalFilename" must be a non-empty string.'
        );

    }

    if (
        request.ownership ===
            null ||
        typeof request.ownership !==
            "object" ||
        Array.isArray(
            request.ownership
        )
    ) {

        throw new TypeError(
            'Production source request field "ownership" must be an object.'
        );

    }

    if (
        request.usagePermission ===
            null ||
        typeof request.usagePermission !==
            "object" ||
        Array.isArray(
            request.usagePermission
        )
    ) {

        throw new TypeError(
            'Production source request field "usagePermission" must be an object.'
        );

    }

}


export async function runProductionSourceCommand(
    arguments_: readonly string[]
): Promise<void> {

    const {
        requestFilePath,
        rawSourceRootDirectory
    } =
        parseProductionSourceCommandArguments(
            arguments_
        );

    const requestJson =
        await readFile(
            requestFilePath,
            "utf8"
        );

    const request:
        unknown =
        JSON.parse(
            requestJson
        );

    assertProductionSourceRequest(
        request
    );

    const intake =
        createProductionSourceIntake(
            rawSourceRootDirectory
        );

    await intake.ingest(
        request
    );

}