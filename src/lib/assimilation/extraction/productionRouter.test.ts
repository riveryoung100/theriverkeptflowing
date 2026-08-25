import assert from "node:assert/strict";
import test from "node:test";

import {
    createExtractionId
} from "../identifiers";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import type {
    SourceAsset
} from "../types";

import type {
    ExtractionEngine,
    ExtractionEngineResult
} from "./types";

import {
    createProductionExtractionRouter
} from "./productionRouter";


function createDelegatedResult():
ExtractionEngineResult {

    return {

        extractionId:
            createExtractionId(),

        status:
            "completed",

        results:
            []

    };

}


test(
    "routes text/plain assets to the configured text extraction engine",
    async () => {

        const delegatedResult =
            createDelegatedResult();

        const receivedAssets:
            SourceAsset[] =
            [];

        const textExtractionEngine:
            ExtractionEngine = {

                async extract(
                    asset: SourceAsset
                ): Promise<ExtractionEngineResult> {

                    receivedAssets.push(
                        asset
                    );

                    return delegatedResult;

                }

            };

        const router =
            createProductionExtractionRouter(
                textExtractionEngine
            );

        const result =
            await router.extract(
                sampleTextAsset
            );

        assert.equal(
            receivedAssets.length,
            1
        );

        assert.equal(
            receivedAssets[0],
            sampleTextAsset
        );

        assert.equal(
            result,
            delegatedResult
        );

    }
);


test(
    "rejects unsupported MIME types without invoking the text extraction engine",
    async () => {

        let invocationCount =
            0;

        const textExtractionEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    invocationCount++;

                    return createDelegatedResult();

                }

            };

        const router =
            createProductionExtractionRouter(
                textExtractionEngine
            );

        const unsupportedAsset:
            SourceAsset = {

                ...sampleTextAsset,

                mimeType:
                    "application/pdf"

            };

        const result =
            await router.extract(
                unsupportedAsset
            );

        assert.equal(
            invocationCount,
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

        assert.ok(
            result.extractionId
        );

    }
);


test(
    "routes parameterized text/plain MIME types through the text extractor",
    async () => {

        const receivedAssets:
            SourceAsset[] =
            [];

        const delegatedResult =
            createDelegatedResult();

        const textExtractionEngine:
            ExtractionEngine = {

                async extract(
                    asset: SourceAsset
                ): Promise<ExtractionEngineResult> {

                    receivedAssets.push(
                        asset
                    );

                    return delegatedResult;

                }

            };

        const router =
            createProductionExtractionRouter(
                textExtractionEngine
            );

        const originalAsset:
            SourceAsset = {

                ...sampleTextAsset,

                mimeType:
                    "text/plain; charset=utf-8"

            };

        const result =
            await router.extract(
                originalAsset
            );

        assert.equal(
            receivedAssets.length,
            1
        );

        assert.equal(
            receivedAssets[0]?.mimeType,
            "text/plain"
        );

        assert.equal(
            originalAsset.mimeType,
            "text/plain; charset=utf-8"
        );

        assert.equal(
            result,
            delegatedResult
        );

    }
);


test(
    "normalizes text MIME type casing and surrounding whitespace",
    async () => {

        const receivedAssets:
            SourceAsset[] =
            [];

        const textExtractionEngine:
            ExtractionEngine = {

                async extract(
                    asset: SourceAsset
                ): Promise<ExtractionEngineResult> {

                    receivedAssets.push(
                        asset
                    );

                    return createDelegatedResult();

                }

            };

        const router =
            createProductionExtractionRouter(
                textExtractionEngine
            );

        const asset:
            SourceAsset = {

                ...sampleTextAsset,

                mimeType:
                    "  TEXT/PLAIN ; charset=UTF-8  "

            };

        const result =
            await router.extract(
                asset
            );

        assert.equal(
            result.status,
            "completed"
        );

        assert.equal(
            receivedAssets.length,
            1
        );

        assert.equal(
            receivedAssets[0]?.mimeType,
            "text/plain"
        );

    }
);


test(
    "continues rejecting unsupported normalized MIME types",
    async () => {

        let invocationCount =
            0;

        const textExtractionEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    invocationCount++;

                    return createDelegatedResult();

                }

            };

        const router =
            createProductionExtractionRouter(
                textExtractionEngine
            );

        const result =
            await router.extract({

                ...sampleTextAsset,

                mimeType:
                    " Application/PDF ; version=1.7 "

            });

        assert.equal(
            invocationCount,
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
