import {
    getDocument
} from "pdfjs-dist/legacy/build/pdf.mjs";

import {
    createExtractionId
} from "../identifiers";

import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import type {
    AssetExtraction,
    SourceAsset
} from "../types";

import type {
    BinaryRawSourceReader,
    ExtractionEngine,
    ExtractionEngineResult
} from "./types";


function createFailedResult():
ExtractionEngineResult {

    return {
        extractionId:
            createExtractionId(),

        status:
            "failed",

        results:
            []
    };

}


function normalizeExtractedText(
    value:
        string
): string {

    return value
        .replace(
            /[ \t]+/g,
            " "
        )
        .replace(
            /\s*\n\s*/g,
            "\n"
        )
        .trim();

}


export class PdfJsExtractionEngine
implements ExtractionEngine {

    constructor(
        private readonly rawSourceReader:
            BinaryRawSourceReader,

        private readonly now:
            () => string =
                () =>
                    new Date()
                        .toISOString()
    ) {}


    async extract(
        asset:
            SourceAsset
    ): Promise<ExtractionEngineResult> {

        if (
            !asset.usagePermission.mayExtract
        ) {
            return createFailedResult();
        }

        if (!asset.storage) {
            return createFailedResult();
        }

        if (
            asset.mimeType !==
            "application/pdf"
        ) {
            return createFailedResult();
        }

        const rawSource =
            await this.rawSourceReader.read(
                asset.storage
            );

        if (!rawSource) {
            return createFailedResult();
        }

        const loadingTask =
            getDocument({
                data:
                    new Uint8Array(
                        rawSource.bytes
                    )
            });

        try {

            const document =
                await loadingTask.promise;

            const pageTexts:
                string[] =
                [];

            for (
                let pageNumber = 1;
                pageNumber <=
                    document.numPages;
                pageNumber++
            ) {

                const page =
                    await document.getPage(
                        pageNumber
                    );

                const textContent =
                    await page.getTextContent();

                const pageText =
                    normalizeExtractedText(
                        textContent.items
                            .filter(
                                (item) =>
                                    "str" in item
                            )
                            .map(
                                (item) =>
                                    item.str
                            )
                            .join(
                                " "
                            )
                    );

                if (
                    pageText.length >
                    0
                ) {
                    pageTexts.push(
                        pageText
                    );
                }

            }

            const extractedText =
                pageTexts
                    .join(
                        "\n\n"
                    )
                    .trim();

            if (
                extractedText.length ===
                0
            ) {
                await document.cleanup();

                return createFailedResult();
            }

            const extractionId =
                createExtractionId();

            const extraction:
                AssetExtraction = {

                    id:
                        extractionId,

                    assetId:
                        asset.id,

                    status:
                        "complete",

                    extractedAt:
                        this.now(),

                    extractorVersion:
                        "pdfjs-text-extractor-v1",

                    text:
                        extractedText,

                    detectedLanguage:
                        asset.language,

                    warnings:
                        [],

                    confidence:
                        1,

                    version:
                        1,

                    schemaVersion:
                        ASSIMILATION_SCHEMA_VERSION

                };

            await document.cleanup();

            return {
                extractionId,

                status:
                    "completed",

                results: [
                    {
                        extraction,

                        status:
                            "completed"
                    }
                ]
            };

        }
        catch {

            return createFailedResult();

        }
        finally {

            await loadingTask
                .destroy()
                .catch(
                    () =>
                        undefined
                );

        }

    }

}
