import type {
    ExtractionEngine
} from "./types";

import {
    createExtractionEngine
} from "./engine";

import {
    createProductionExtractionRouter
} from "./productionRouter";

import {
    FileSystemRawSourceReader
} from "./filesystemRawSourceReader";


export function createProductionExtractionEngine(
    rawSourceRootDirectory: string
): ExtractionEngine {

    const textExtractionEngine =
        createExtractionEngine(
            new FileSystemRawSourceReader(
                rawSourceRootDirectory
            )
        );

    return createProductionExtractionRouter(
        textExtractionEngine
    );

}
