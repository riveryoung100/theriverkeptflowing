import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import type {
    SourceAsset
} from "../types";

import type {
    BinaryRawSourceReader
} from "./types";

import {
    MammothDocxExtractionEngine
} from "./mammothDocxExtractionEngine";


const DOCX_MIME_TYPE =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const STORAGE = {
    provider:
        "filesystem",

    bucket:
        "raw",

    key:
        "test.docx",

    versionId:
        "version-1"
} as const;


function createDocxAsset(
    mimeType:
        string =
        DOCX_MIME_TYPE
): SourceAsset {

    return {
        id:
            "asset:11111111-1111-4111-8111-111111111111",

        assetType:
            "document",

        title:
            "DOCX Test",

        originalFilename:
            "test.docx",

        createdAt:
            "2026-08-25T00:00:00.000Z",

        receivedAt:
            "2026-08-25T00:00:00.000Z",

        updatedAt:
            "2026-08-25T00:00:00.000Z",

        checksum: {
            algorithm:
                "sha256",

            value:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },

        mimeType,

        byteSize:
            1,

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
            "private",

        sensitivityCategories:
            [],

        status:
            "stored",

        reviewStatus:
            "not-required",

        provenance: {
            submittedBy: {
                type:
                    "river",

                id:
                    "river"
            },

            submittedAt:
                "2026-08-25T00:00:00.000Z",

            intakeMethod:
                "manual",

            transformationIds:
                []
        },

        storage:
            STORAGE,

        extractionIds:
            [],

        segmentIds:
            [],

        classificationIds:
            [],

        derivedObjectIds:
            [],

        version:
            1,

        schemaVersion:
            ASSIMILATION_SCHEMA_VERSION
    };

}


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


test(
    "extracts raw text from DOCX bytes",
    async () => {

        const expectedText =
            "Faith, family, purpose, stewardship, and legacy.";

        const bytes =
            await createMinimalDocx(
                expectedText
            );

        let readCount =
            0;

        const reader:
            BinaryRawSourceReader = {

                async read() {

                    readCount +=
                        1;

                    return {
                        bytes
                    };

                }

            };

        const engine =
            new MammothDocxExtractionEngine(
                reader,
                () =>
                    "2026-08-25T15:00:00.000Z"
            );

        const asset =
            createDocxAsset();

        const result =
            await engine.extract(
                asset
            );

        assert.equal(
            readCount,
            1
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
            extraction.text.trim(),
            expectedText
        );

        assert.equal(
            extraction.extractedAt,
            "2026-08-25T15:00:00.000Z"
        );

        assert.equal(
            extraction.extractorVersion,
            "mammoth-docx-extractor-v1"
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
    "rejects non-DOCX MIME without reading binary source",
    async () => {

        let readCount =
            0;

        const reader:
            BinaryRawSourceReader = {

                async read() {

                    readCount +=
                        1;

                    return {
                        bytes:
                            new Uint8Array()
                    };

                }

            };

        const engine =
            new MammothDocxExtractionEngine(
                reader
            );

        const result =
            await engine.extract(
                createDocxAsset(
                    "application/pdf"
                )
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
    "fails safely when DOCX bytes are invalid",
    async () => {

        const reader:
            BinaryRawSourceReader = {

                async read() {

                    return {
                        bytes:
                            Uint8Array.from(
                                [
                                    0,
                                    1,
                                    2,
                                    3,
                                    4,
                                    5
                                ]
                            )
                    };

                }

            };

        const engine =
            new MammothDocxExtractionEngine(
                reader
            );

        const result =
            await engine.extract(
                createDocxAsset()
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
