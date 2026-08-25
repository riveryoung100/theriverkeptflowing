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

import {
    FileSystemBinaryRawSourceReader
} from "./filesystemBinaryRawSourceReader";

import {
    PdfJsExtractionEngine
} from "./pdfJsExtractionEngine";


export function createProductionExtractionEngine(
    rawSourceRootDirectory: string
): ExtractionEngine {

    const textExtractionEngine =
        createExtractionEngine(
            new FileSystemRawSourceReader(
                rawSourceRootDirectory
            )
        );
    const pdfExtractionEngine =
        new PdfJsExtractionEngine(
            new FileSystemBinaryRawSourceReader(
                rawSourceRootDirectory
            )
        );

    return createProductionExtractionRouter([
        {
            mimeType:
                "text/plain",

            extractionEngine:
                textExtractionEngine
        },        {
            mimeType:
                "text/markdown",

            extractionEngine:
                textExtractionEngine
        },
        {
            mimeType:
                "application/pdf",

            extractionEngine:
                pdfExtractionEngine
        }
    ]);

}
