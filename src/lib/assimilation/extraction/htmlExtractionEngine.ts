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
    ExtractionEngine,
    ExtractionEngineResult,
    RawSourceReader
} from "./types";


function createFailedResult(
    extractionId:
        ReturnType<typeof createExtractionId>
): ExtractionEngineResult {

    return {
        extractionId,

        status:
            "failed",

        results:
            []
    };

}


function decodeHtmlEntities(
    value: string
): string {

    const namedEntities:
        Readonly<Record<string, string>> = {

            amp:
                "&",

            lt:
                "<",

            gt:
                ">",

            quot:
                '"',

            apos:
                "'",

            nbsp:
                " "

        };

    return value.replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (
            original,
            entity:
                string
        ) => {

            const normalized =
                entity.toLowerCase();

            if (
                normalized.startsWith(
                    "#x"
                )
            ) {

                const codePoint =
                    Number.parseInt(
                        normalized.slice(2),
                        16
                    );

                if (
                    Number.isFinite(
                        codePoint
                    )
                ) {

                    try {

                        return String.fromCodePoint(
                            codePoint
                        );

                    }
                    catch {

                        return original;

                    }

                }

                return original;

            }

            if (
                normalized.startsWith(
                    "#"
                )
            ) {

                const codePoint =
                    Number.parseInt(
                        normalized.slice(1),
                        10
                    );

                if (
                    Number.isFinite(
                        codePoint
                    )
                ) {

                    try {

                        return String.fromCodePoint(
                            codePoint
                        );

                    }
                    catch {

                        return original;

                    }

                }

                return original;

            }

            return (
                namedEntities[
                    normalized
                ] ??
                original
            );

        }
    );

}


export function extractTextFromHtml(
    html: string
): string {

    let text =
        html;

    text =
        text.replace(
            /<!--[\s\S]*?-->/g,
            " "
        );

    text =
        text.replace(
            /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
            " "
        );

    text =
        text.replace(
            /<(br|hr)\b[^>]*\/?>/gi,
            "\n"
        );

    text =
        text.replace(
            /<\/?(address|article|aside|blockquote|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi,
            "\n"
        );

    text =
        text.replace(
            /<[^>]+>/g,
            " "
        );

    text =
        decodeHtmlEntities(
            text
        );

    text =
        text.replace(
            /\r\n?/g,
            "\n"
        );

    text =
        text
            .split("\n")
            .map(
                (line) =>
                    line.replace(
                        /[ \t\f\v]+/g,
                        " "
                    ).trim()
            )
            .filter(
                (line) =>
                    line.length > 0
            )
            .join("\n");

    return text;

}


export class HtmlExtractionEngine
implements ExtractionEngine {

    public constructor(
        private readonly rawSourceReader:
            RawSourceReader,
        private readonly now:
            () => string =
                () =>
                    new Date().toISOString()
    ) {}


    public async extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult> {

        const extractionId =
            createExtractionId();

        if (
            !asset.usagePermission.mayExtract
        ) {

            return createFailedResult(
                extractionId
            );

        }

        if (!asset.storage) {

            return createFailedResult(
                extractionId
            );

        }

        if (
            asset.mimeType !==
                "text/html"
        ) {

            return createFailedResult(
                extractionId
            );

        }

        const rawSource =
            await this.rawSourceReader.read(
                asset.storage
            );

        if (!rawSource) {

            return createFailedResult(
                extractionId
            );

        }

        const text =
            extractTextFromHtml(
                rawSource.text
            );

        if (text.length === 0) {

            return createFailedResult(
                extractionId
            );

        }

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
                    "html-text-extractor-v1",

                text,

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

}
