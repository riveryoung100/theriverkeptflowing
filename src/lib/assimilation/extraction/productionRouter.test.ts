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
    "routes assets through the extraction engine registered for their canonical MIME type",
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
            createProductionExtractionRouter([
                {
                    mimeType:
                        "text/plain",

                    extractionEngine:
                        textExtractionEngine
                }
            ]);

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
    "rejects unsupported MIME types without invoking registered extraction engines",
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
            createProductionExtractionRouter([
                {
                    mimeType:
                        "text/plain",

                    extractionEngine:
                        textExtractionEngine
                }
            ]);

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
    "normalizes asset MIME parameters before resolving a registered capability",
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
            createProductionExtractionRouter([
                {
                    mimeType:
                        "text/plain",

                    extractionEngine:
                        textExtractionEngine
                }
            ]);

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
    "normalizes asset MIME type casing and surrounding whitespace before capability resolution",
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
            createProductionExtractionRouter([
                {
                    mimeType:
                        "text/plain",

                    extractionEngine:
                        textExtractionEngine
                }
            ]);

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
    "normalizes registered capability MIME types before resolution",
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
            createProductionExtractionRouter([
                {
                    mimeType:
                        " TEXT/PLAIN ; charset=UTF-8 ",

                    extractionEngine:
                        textExtractionEngine
                }
            ]);

        const result =
            await router.extract(
                sampleTextAsset
            );

        assert.equal(
            invocationCount,
            1
        );

        assert.equal(
            result.status,
            "completed"
        );

    }
);


test(
    "routes different registered canonical MIME types to different extraction engines",
    async () => {

        let textInvocationCount =
            0;

        let pdfInvocationCount =
            0;

        const textExtractionEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    textInvocationCount++;

                    return createDelegatedResult();

                }

            };

        const pdfExtractionEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    pdfInvocationCount++;

                    return createDelegatedResult();

                }

            };

        const router =
            createProductionExtractionRouter([
                {
                    mimeType:
                        "text/plain",

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

        const result =
            await router.extract({

                ...sampleTextAsset,

                mimeType:
                    "application/pdf"

            });

        assert.equal(
            textInvocationCount,
            0
        );

        assert.equal(
            pdfInvocationCount,
            1
        );

        assert.equal(
            result.status,
            "completed"
        );

    }
);


test(
    "rejects duplicate canonical MIME capability registrations",
    () => {

        const firstEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    return createDelegatedResult();

                }

            };

        const secondEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    return createDelegatedResult();

                }

            };

        assert.throws(
            () => {

                createProductionExtractionRouter([
                    {
                        mimeType:
                            "text/plain",

                        extractionEngine:
                            firstEngine
                    },
                    {
                        mimeType:
                            " TEXT/PLAIN ; charset=UTF-8 ",

                        extractionEngine:
                            secondEngine
                    }
                ]);

            },
            /Duplicate production extraction capability for MIME type: text\/plain/
        );

    }
);


test(
    "rejects capability registrations without a canonical MIME type",
    () => {

        const extractionEngine:
            ExtractionEngine = {

                async extract():
                Promise<ExtractionEngineResult> {

                    return createDelegatedResult();

                }

            };

        assert.throws(
            () => {

                createProductionExtractionRouter([
                    {
                        mimeType:
                            " ; charset=UTF-8",

                        extractionEngine
                    }
                ]);

            },
            /Production extraction capability MIME type must resolve to a canonical MIME type/
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
            createProductionExtractionRouter([
                {
                    mimeType:
                        "text/plain",

                    extractionEngine:
                        textExtractionEngine
                }
            ]);

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
