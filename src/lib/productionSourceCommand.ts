import {
    readFile
} from "node:fs/promises";

import {
    assertFileSystemSourceIngestionRequest
} from "./assimilation/ingestion/validation";

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

    assertFileSystemSourceIngestionRequest(
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