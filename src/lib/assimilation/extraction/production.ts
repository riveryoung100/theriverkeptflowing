import type {
    ExtractionEngine
} from "./types";

import {
    createExtractionEngine
} from "./engine";

import {
    FileSystemRawSourceReader
} from "./filesystemRawSourceReader";


export function createProductionExtractionEngine(
    rawSourceRootDirectory: string
): ExtractionEngine {

    return createExtractionEngine(
        new FileSystemRawSourceReader(
            rawSourceRootDirectory
        )
    );

}
