import assert from "node:assert/strict";

import {
    access,
    mkdtemp,
    readFile,
    rm
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";
import test from "node:test";

import type {
    FileSystemSourceIngestionRequest
} from "../ingestion/types";

import {
    createSamplePdfBytes
} from "../extraction/fixtures/samplePdfBytes";

import {
    createProductionSourceAssimilation
} from "./engine";


function createRequest(
    content:
        string | Uint8Array =
        "Faith, family, purpose, stewardship, and legacy."
): FileSystemSourceIngestionRequest {

    return {

        content,

        assetType:
            "note",

        originalFilename:
            "production-source.txt",

        title:
            "Production Source",

        mimeType:
            "text/plain",

        language:
            "en-US",

        ownership: {
            ownerType:
                "river",
            ownerName:
                "River"
        },

        rightsStatus:
            "owned",

        usagePermission: {
            mayStore:
                true,
            mayExtract:
                true,
            mayAnalyze:
                true,
            mayQuote:
                true,
            mayTransform:
                true,
            mayPublish:
                false,
            mayCommercialize:
                false,
            mayTrainModels:
                false
        },

        privacy:
            "internal",

        sensitivityCategories:
            [],

        reviewStatus:
            "not-required",

        submittedBy: {
            type:
                "river",
            id:
                "river:owner"
        },

        intakeMethod:
            "manual",

        declaredOwner:
            "River",

        declaredPurpose:
            "Production ingestion and assimilation integration validation."

    };

}


test(
    "ingests immutable source bytes and assimilates the resulting source asset",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-assimilation-"
                )
            );

        try {

            const content =
                "Faith, family, purpose, stewardship, and legacy.";

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const result =
                await service.ingestAndAssimilate(
                    createRequest(
                        content
                    )
                );

            assert.equal(
                result.status,
                "completed"
            );

            assert.equal(
                result.failedStage,
                null
            );

            assert.equal(
                result.asset.status,
                "received"
            );

            assert.equal(
                result.asset.storage?.provider,
                "filesystem"
            );

            assert.ok(
                result.asset.storage
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        result.asset.storage.key
                    )
                );

            assert.deepEqual(
                storedBytes,
                Buffer.from(
                    content,
                    "utf8"
                )
            );

            assert.ok(
                result.extraction
            );

            assert.ok(
                result.segment
            );

            assert.ok(
                result.classification
            );

            assert.ok(
                result.derivedObject
            );

            assert.equal(
                result.extraction.assetId,
                result.asset.id
            );

            assert.equal(
                result.segment.assetId,
                result.asset.id
            );

            assert.equal(
                result.classification.assetId,
                result.asset.id
            );

            assert.equal(
                result.derivedObject.assetId,
                result.asset.id
            );

        }
        finally {

            await rm(
                rootDirectory,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "uses the same raw-source root for ingestion and production extraction",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-assimilation-"
                )
            );

        try {

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const result =
                await service.ingestAndAssimilate(
                    createRequest(
                        "One governed source crosses the complete production boundary."
                    )
                );

            assert.equal(
                result.status,
                "completed"
            );

            assert.ok(
                result.asset.storage
            );

            const storedPath =
                path.join(
                    rootDirectory,
                    result.asset.storage.key
                );

            await access(
                storedPath
            );

            assert.ok(
                result.extraction
            );

            assert.equal(
                result.extraction.assetId,
                result.asset.id
            );

        }
        finally {

            await rm(
                rootDirectory,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);


test(
    "preserves ingestion validation failure instead of invoking downstream assimilation",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-assimilation-"
                )
            );

        try {

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const request =
                createRequest();

            const invalidRequest:
                FileSystemSourceIngestionRequest = {
                    ...request,

                    rightsStatus:
                        "unknown",

                    usagePermission: {
                        ...request.usagePermission,

                        mayPublish:
                            true
                    }
                };

            await assert.rejects(
                () =>
                    service.ingestAndAssimilate(
                        invalidRequest
                    )
            );

        }
        finally {

            await rm(
                rootDirectory,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

        }

    }
);

test(
    "assimilates UTF-8 Uint8Array text through the complete production pipeline",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-assimilation-"
                )
            );

        try {

            const expectedText =
                "Binary text still becomes governed knowledge through the production pipeline.";

            const content =
                Uint8Array.from(
                    Buffer.from(
                        expectedText,
                        "utf8"
                    )
                );

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const result =
                await service.ingestAndAssimilate(
                    createRequest(
                        content
                    )
                );

            assert.equal(
                result.status,
                "completed"
            );

            assert.equal(
                result.failedStage,
                null
            );

            assert.ok(
                result.asset.storage
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        result.asset.storage.key
                    )
                );

            assert.deepEqual(
                storedBytes,
                Buffer.from(
                    content
                )
            );

            assert.ok(
                result.extraction
            );

            assert.equal(
                result.extraction.text,
                expectedText
            );

            assert.ok(
                result.segment
            );

            assert.ok(
                result.classification
            );

            assert.ok(
                result.derivedObject
            );

        }
        finally {

            await rm(
                rootDirectory,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);


test(
    "preserves unsupported binary source bytes and stops at extraction",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-assimilation-"
                )
            );

        try {

            const bytes =
                Uint8Array.from(
                    [
                        0,
                        1,
                        2,
                        10,
                        13,
                        255
                    ]
                );

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const request =
                createRequest(
                    bytes
                );

            const result =
                await service.ingestAndAssimilate({
                    ...request,

                    originalFilename:
                        "unsupported-binary-source.bin",

                    mimeType:
                        "application/octet-stream"
                });

            assert.equal(
                result.status,
                "failed"
            );

            assert.equal(
                result.failedStage,
                "extraction"
            );

            assert.ok(
                result.asset.storage
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        result.asset.storage.key
                    )
                );

            assert.deepEqual(
                storedBytes,
                Buffer.from(
                    bytes
                )
            );

            assert.equal(
                result.asset.mimeType,
                "application/octet-stream"
            );

            assert.equal(
                result.extraction,
                null
            );

            assert.equal(
                result.segment,
                null
            );

            assert.equal(
                result.classification,
                null
            );

            assert.equal(
                result.derivedObject,
                null
            );

        }
        finally {

            await rm(
                rootDirectory,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);

test(
    "ingests PDF bytes and assimilates them through the complete production pipeline",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-pdf-assimilation-"
                )
            );

        try {

            const expectedText =
                "Faith Purpose Stewardship Legacy";

            const pdfBytes =
                createSamplePdfBytes(
                    expectedText
                );

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const baseRequest =
                createRequest(
                    pdfBytes
                );

            const result =
                await service.ingestAndAssimilate({
                    ...baseRequest,

                    assetType:
                        "document",

                    originalFilename:
                        "river-production-assimilation.pdf",

                    title:
                        "River Production PDF Assimilation",

                    mimeType:
                        "application/pdf"
                });

            assert.equal(
                result.status,
                "completed"
            );

            assert.equal(
                result.failedStage,
                null
            );

            assert.equal(
                result.asset.mimeType,
                "application/pdf"
            );

            assert.equal(
                result.asset.originalFilename,
                "river-production-assimilation.pdf"
            );

            assert.ok(
                result.asset.storage
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        result.asset.storage.key
                    )
                );

            assert.deepEqual(
                storedBytes,
                Buffer.from(
                    pdfBytes
                )
            );

            assert.ok(
                result.extraction
            );

            assert.equal(
                result.extraction.assetId,
                result.asset.id
            );

            assert.equal(
                result.extraction.text,
                expectedText
            );

            assert.equal(
                result.extraction.extractorVersion,
                "pdfjs-text-extractor-v1"
            );

            assert.ok(
                result.segment
            );

            assert.equal(
                result.segment.assetId,
                result.asset.id
            );

            assert.equal(
                result.segment.extractionId,
                result.extraction.id
            );

            assert.equal(
                result.segment.sourceText,
                expectedText
            );

            assert.equal(
                result.segment.normalizedText,
                expectedText
            );

            assert.ok(
                result.classification
            );

            assert.equal(
                result.classification.assetId,
                result.asset.id
            );



            assert.ok(
                result.derivedObject
            );

            assert.equal(
                result.derivedObject.assetId,
                result.asset.id
            );

            assert.ok(
                result.derivedObject.sourceSegmentIds.includes(
                    result.segment.id
                )
            );

        }
        finally {

            await rm(
                rootDirectory,
                {
                    recursive:
                        true,

                    force:
                        true
                }
            );

        }

    }
);
