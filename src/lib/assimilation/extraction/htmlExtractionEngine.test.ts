import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import type {
    SourceAsset,
    StorageReference
} from "../types";

import {
    HtmlExtractionEngine,
    extractTextFromHtml
} from "./htmlExtractionEngine";

import type {
    RawSourceReader
} from "./types";


const STORAGE:
StorageReference = {

    provider:
        "filesystem",

    key:
        "sample.html",

    versionId:
        "1"

};


function createHtmlAsset(
    overrides:
        Partial<SourceAsset> = {}
): SourceAsset {

    return {

        ...sampleTextAsset,

        mimeType:
            "text/html",

        storage:
            STORAGE,

        ...overrides

    };

}


function createReader(
    text:
        string | null
): RawSourceReader {

    return {

        async read() {

            if (text === null) {

                return null;

            }

            return {
                text
            };

        }

    };

}


test(
    "extracts human-readable text from HTML",
    async () => {

        const engine =
            new HtmlExtractionEngine(
                createReader(`
                    <!doctype html>
                    <html>
                        <head>
                            <title>River</title>
                            <style>
                                body { color: red; }
                            </style>
                            <script>
                                console.log("ignore");
                            </script>
                        </head>
                        <body>
                            <main>
                                <h1>The River Kept Flowing</h1>
                                <p>
                                    Faith &amp; Calling
                                </p>
                                <p>
                                    Keep moving forward.
                                </p>
                            </main>
                        </body>
                    </html>
                `),
                () =>
                    "2026-08-25T16:00:00.000Z"
            );

        const asset =
            createHtmlAsset();

        const result =
            await engine.extract(
                asset
            );

        assert.equal(
            result.status,
            "completed"
        );

        assert.equal(
            result.results.length,
            1
        );

        const extraction =
            result.results[0]?.extraction;

        assert.ok(
            extraction
        );

        assert.equal(
            result.extractionId,
            extraction.id
        );

        assert.equal(
            extraction.assetId,
            asset.id
        );

        assert.equal(
            extraction.status,
            "complete"
        );

        assert.equal(
            extraction.text,
            [
                "River",
                "The River Kept Flowing",
                "Faith & Calling",
                "Keep moving forward."
            ].join("\n")
        );

        assert.equal(
            extraction.extractedAt,
            "2026-08-25T16:00:00.000Z"
        );

        assert.equal(
            extraction.extractorVersion,
            "html-text-extractor-v1"
        );

        assert.equal(
            extraction.detectedLanguage,
            asset.language
        );

        assert.deepEqual(
            extraction.warnings,
            []
        );

        assert.equal(
            extraction.confidence,
            1
        );

    }
);


test(
    "removes comments scripts styles noscript and templates",
    () => {

        const text =
            extractTextFromHtml(`
                <main>
                    Before
                    <!-- hidden -->
                    <script>hidden script</script>
                    <style>hidden style</style>
                    <noscript>hidden noscript</noscript>
                    <template>hidden template</template>
                    After
                </main>
            `);

        assert.equal(
            text,
            [
                "Before",
                "After"
            ].join("\n")
        );

    }
);


test(
    "decodes common named and numeric HTML entities",
    () => {

        assert.equal(
            extractTextFromHtml(
                "<p>A &amp; B &#38; C &#x26; D&nbsp;E</p>"
            ),
            "A & B & C & D E"
        );

    }
);


test(
    "fails when extraction permission is denied",
    async () => {

        let readCount =
            0;

        const reader:
            RawSourceReader = {

                async read() {

                    readCount++;

                    return {
                        text:
                            "<p>Should not read</p>"
                    };

                }

            };

        const engine =
            new HtmlExtractionEngine(
                reader
            );

        const result =
            await engine.extract(
                createHtmlAsset({
                    usagePermission: {
                        ...sampleTextAsset.usagePermission,
                        mayExtract:
                            false
                    }
                })
            );

        assert.equal(
            readCount,
            0
        );

        assert.equal(
            result.status,
            "failed"
        );

        assert.deepEqual(
            result.results,
            []
        );

    }
);


test(
    "rejects non-HTML MIME without reading source",
    async () => {

        let readCount =
            0;

        const reader:
            RawSourceReader = {

                async read() {

                    readCount++;

                    return {
                        text:
                            "plain text"
                    };

                }

            };

        const engine =
            new HtmlExtractionEngine(
                reader
            );

        const result =
            await engine.extract(
                createHtmlAsset({
                    mimeType:
                        "text/plain"
                })
            );

        assert.equal(
            readCount,
            0
        );

        assert.equal(
            result.status,
            "failed"
        );

    }
);


test(
    "fails when raw HTML source cannot be resolved",
    async () => {

        const engine =
            new HtmlExtractionEngine(
                createReader(
                    null
                )
            );

        const result =
            await engine.extract(
                createHtmlAsset()
            );

        assert.equal(
            result.status,
            "failed"
        );

        assert.deepEqual(
            result.results,
            []
        );

    }
);


test(
    "fails when HTML contains no extractable text",
    async () => {

        const engine =
            new HtmlExtractionEngine(
                createReader(`
                    <html>
                        <head>
                            <style>
                                body {}
                            </style>
                        </head>
                        <body>
                            <script>
                                void 0;
                            </script>
                        </body>
                    </html>
                `)
            );

        const result =
            await engine.extract(
                createHtmlAsset()
            );

        assert.equal(
            result.status,
            "failed"
        );

        assert.deepEqual(
            result.results,
            []
        );

    }
);
