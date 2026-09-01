import assert from "node:assert/strict";

import JSZip from "jszip";

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


async function createMinimalDocx(
    text:
        string
): Promise<Uint8Array> {

    const zip =
        new JSZip();

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    zip.folder("_rels")?.file(
        ".rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    zip.folder("word")?.file(
        "document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p>
<w:r>
<w:t>${text}</w:t>
</w:r>
</w:p>
<w:sectPr/>
</w:body>
</w:document>`
    );

    return zip.generateAsync({
        type:
            "uint8array"
    });

}



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

test(
    "assimilates Markdown through the complete production pipeline",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-markdown-assimilation-"
                )
            );

        try {

            const expectedText =
                "# Faith\n\nPurpose, stewardship, and legacy.";

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const baseRequest =
                createRequest(
                    expectedText
                );

            const result =
                await service.ingestAndAssimilate({
                    ...baseRequest,

                    assetType:
                        "document",

                    originalFilename:
                        "river-production-assimilation.md",

                    title:
                        "River Markdown Assimilation",

                    mimeType:
                        "text/markdown"
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
                "text/markdown"
            );

            assert.equal(
                result.asset.originalFilename,
                "river-production-assimilation.md"
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

            assert.ok(
                result.derivedObject
            );

            assert.ok(
                result.derivedObject
                    .sourceSegmentIds
                    .includes(
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

test(
    "assimilates HTML through the complete production pipeline",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-html-assimilation-"
                )
            );

        try {

            const htmlSource =
                `<!doctype html>
<html>
    <head>
        <title>River Production HTML Assimilation</title>
        <style>
            body { color: red; }
        </style>
        <script>
            console.log("ignore this script");
        </script>
    </head>
    <body>
        <main>
            <h1>Faith</h1>
            <p>Family, purpose, stewardship, and legacy.</p>
        </main>
    </body>
</html>`;

            const expectedText =
                [
                    "River Production HTML Assimilation",
                    "Faith",
                    "Family, purpose, stewardship, and legacy."
                ].join("\n");

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const baseRequest =
                createRequest(
                    htmlSource
                );

            const result =
                await service.ingestAndAssimilate({
                    ...baseRequest,

                    assetType:
                        "document",

                    originalFilename:
                        "river-production-assimilation.html",

                    title:
                        "River Production HTML Assimilation",

                    mimeType:
                        "text/html"
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
                "text/html"
            );

            assert.equal(
                result.asset.originalFilename,
                "river-production-assimilation.html"
            );

            assert.ok(
                result.asset.storage
            );

            const storedSource =
                await readFile(
                    path.join(
                        rootDirectory,
                        result.asset.storage.key
                    ),
                    "utf8"
                );

            assert.equal(
                storedSource,
                htmlSource
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
                "html-text-extractor-v1"
            );

            assert.ok(
                !result.extraction.text?.includes(
                    "color: red"
                )
            );

            assert.ok(
                !result.extraction.text?.includes(
                    "ignore this script"
                )
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
                result.derivedObject
                    .sourceSegmentIds
                    .includes(
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
test(
    "assimilates DOCX bytes through the complete production pipeline",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-docx-assimilation-"
                )
            );

        try {

            const expectedText =
                "Faith, family, purpose, stewardship, and legacy.";

            const docxBytes =
                await createMinimalDocx(
                    expectedText
                );

            const service =
                createProductionSourceAssimilation(
                    rootDirectory
                );

            const baseRequest =
                createRequest(
                    docxBytes
                );

            const result =
                await service.ingestAndAssimilate({
                    ...baseRequest,

                    assetType:
                        "document",

                    originalFilename:
                        "river-production-assimilation.docx",

                    title:
                        "River Production DOCX Assimilation",

                    mimeType:
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );

            assert.equal(
                result.asset.originalFilename,
                "river-production-assimilation.docx"
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
                    docxBytes
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
                typeof result.extraction.text,
                "string"
            );

            assert.equal(
                result.extraction.text?.trim(),
                expectedText
            );

            assert.equal(
                result.extraction.extractorVersion,
                "mammoth-docx-extractor-v1"
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
                typeof result.segment.sourceText,
                "string"
            );

            assert.equal(
                result.segment.sourceText?.trim(),
                expectedText
            );

            assert.equal(
                typeof result.segment.normalizedText,
                "string"
            );

            assert.equal(
                result.segment.normalizedText?.trim(),
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
                result.derivedObject
                    .sourceSegmentIds
                    .includes(
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

test(
    "persists the complete generated record set after successful production assimilation",
    async () => {
        const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "river-production-persistence-success-"));
        try {
            const service = createProductionSourceAssimilation(rootDirectory);
            const result = await service.ingestAndAssimilate(createRequest());
            assert.equal(result.status, "completed");
            assert.ok(result.extraction); assert.ok(result.segment); assert.ok(result.classification); assert.ok(result.transformation); assert.ok(result.derivedObject);
            const generatedRecordPath = path.join(rootDirectory, "generated-records", encodeURIComponent(result.asset.id) + ".json");
            const generatedRecords = JSON.parse(await readFile(generatedRecordPath, "utf8"));
            assert.deepEqual(generatedRecords, { asset: result.asset, extraction: result.extraction, segment: result.segment, classification: result.classification, transformation: result.transformation, derivedObject: result.derivedObject });
        } finally {
            await rm(rootDirectory, { recursive: true, force: true });
        }
    }
);

test(
    "retrieves the exact durable generated record set through the production service",
    async () => {
        const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "river-production-retrieval-success-"));
        try {
            const service = createProductionSourceAssimilation(rootDirectory);
            const result = await service.ingestAndAssimilate(createRequest());
            assert.equal(result.status, "completed");
            assert.ok(result.extraction);
            assert.ok(result.segment);
            assert.ok(result.classification);
            assert.ok(result.transformation);
            assert.ok(result.derivedObject);
            const retrieved = await service.retrieveGeneratedRecords(result.asset.id);
            assert.deepEqual(retrieved, {
                asset: result.asset,
                extraction: result.extraction,
                segment: result.segment,
                classification: result.classification,
                transformation: result.transformation,
                derivedObject: result.derivedObject
            });
            const generatedRecordPath = path.join(rootDirectory, "generated-records", encodeURIComponent(result.asset.id) + ".json");
            const beforeRetrieval = await readFile(generatedRecordPath, "utf8");
            await service.retrieveGeneratedRecords(result.asset.id);
            const afterRetrieval = await readFile(generatedRecordPath, "utf8");
            assert.equal(afterRetrieval, beforeRetrieval);
        } finally {
            await rm(rootDirectory, { recursive: true, force: true });
        }
    }
);

test(
    "propagates missing durable generated-record failure through the production service",
    async () => {
        const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "river-production-retrieval-missing-"));
        try {
            const service = createProductionSourceAssimilation(rootDirectory);
            await assert.rejects(() => service.retrieveGeneratedRecords("asset:missing" as import("../types").AssetId));
        } finally {
            await rm(rootDirectory, { recursive: true, force: true });
        }
    }
);

test(
    "does not persist generated records when production assimilation fails",
    async () => {
        const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "river-production-persistence-failure-"));
        try {
            const service = createProductionSourceAssimilation(rootDirectory);
            const bytes = Uint8Array.from([0, 1, 2, 3, 255]);
            const request = createRequest(bytes);
            const result = await service.ingestAndAssimilate({ ...request, originalFilename: "unsupported-persistence-source.bin", mimeType: "application/octet-stream" });
            assert.equal(result.status, "failed");
            assert.equal(result.failedStage, "extraction");
            assert.ok(result.asset.storage);
            const rawSourcePath = path.join(rootDirectory, result.asset.storage.key);
            await access(rawSourcePath);
            const generatedRecordPath = path.join(rootDirectory, "generated-records", encodeURIComponent(result.asset.id) + ".json");
            await assert.rejects(() => access(generatedRecordPath));
        } finally {
            await rm(rootDirectory, { recursive: true, force: true });
        }
    }
);
