import assert from "node:assert/strict";

import {
    createHash
} from "node:crypto";

import {
    mkdtemp,
    readFile,
    rm
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    validateSourceAsset
} from "../validation";

import {
    FileSystemSourceIngestion
} from "./filesystem";


function createRequest(
    content:
        string | Uint8Array =
        "Original immutable source material."
) {

    return {

        content,

        assetType:
            "note" as const,

        originalFilename:
            "original source.txt",

        title:
            "Original Source",

        mimeType:
            "text/plain",

        language:
            "en-US",

        ownership: {
            ownerType:
                "river" as const,
            ownerName:
                "River"
        },

        rightsStatus:
            "owned" as const,

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
            "internal" as const,

        sensitivityCategories:
            [],

        reviewStatus:
            "not-required" as const,

        submittedBy: {
            type:
                "river" as const,
            id:
                "river:owner"
        },

        intakeMethod:
            "manual" as const,

        declaredOwner:
            "River",

        declaredPurpose:
            "Production ingestion validation."

    };

}


test(
    "persists original bytes and creates a valid canonical source asset",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-source-ingestion-"
                )
            );

        try {

            const content =
                "Original immutable source material.";

            const service =
                new FileSystemSourceIngestion(
                    rootDirectory
                );

            const asset =
                await service.ingest(
                    createRequest(
                        content
                    )
                );

            assert.equal(
                asset.status,
                "received"
            );

            assert.equal(
                asset.storage?.provider,
                "filesystem"
            );

            assert.equal(
                asset.storage?.versionId,
                "v1"
            );

            assert.equal(
                asset.originalFilename,
                "original source.txt"
            );

            assert.equal(
                asset.extractionIds.length,
                0
            );

            assert.equal(
                asset.segmentIds.length,
                0
            );

            assert.equal(
                asset.classificationIds.length,
                0
            );

            assert.equal(
                asset.derivedObjectIds.length,
                0
            );

            assert.equal(
                validateSourceAsset(
                    asset
                ).valid,
                true
            );

            assert.ok(
                asset.storage
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        asset.storage.key
                    )
                );

            const expectedBytes =
                Buffer.from(
                    content,
                    "utf8"
                );

            assert.deepEqual(
                storedBytes,
                expectedBytes
            );

            assert.equal(
                asset.byteSize,
                expectedBytes.byteLength
            );

            assert.equal(
                asset.checksum?.value,
                createHash(
                    "sha256"
                )
                    .update(
                        expectedBytes
                    )
                    .digest(
                        "hex"
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
    "preserves arbitrary source bytes without normalization",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-source-ingestion-"
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
                new FileSystemSourceIngestion(
                    rootDirectory
                );

            const asset =
                await service.ingest(
                    {
                        ...createRequest(
                            bytes
                        ),

                        originalFilename:
                            "binary-source.bin",

                        mimeType:
                            "application/octet-stream"
                    }
                );

            assert.ok(
                asset.storage
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        asset.storage.key
                    )
                );

            assert.deepEqual(
                storedBytes,
                Buffer.from(
                    bytes
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
    "creates independent immutable storage keys for repeated ingestion",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-source-ingestion-"
                )
            );

        try {

            const service =
                new FileSystemSourceIngestion(
                    rootDirectory
                );

            const first =
                await service.ingest(
                    createRequest()
                );

            const second =
                await service.ingest(
                    createRequest()
                );

            assert.notEqual(
                first.id,
                second.id
            );

            assert.notEqual(
                first.storage?.key,
                second.storage?.key
            );

            assert.equal(
                first.checksum?.value,
                second.checksum?.value
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
    "sanitizes the storage filename while preserving original filename provenance",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-source-ingestion-"
                )
            );

        try {

            const service =
                new FileSystemSourceIngestion(
                    rootDirectory
                );

            const asset =
                await service.ingest(
                    {
                        ...createRequest(),

                        originalFilename:
                            "../unsafe source?.txt"
                    }
                );

            assert.equal(
                asset.originalFilename,
                "../unsafe source?.txt"
            );

            assert.ok(
                asset.storage
            );

            assert.equal(
                asset.storage.key.includes(
                    ".."
                ),
                false
            );

            const storedBytes =
                await readFile(
                    path.join(
                        rootDirectory,
                        asset.storage.key
                    )
                );

            assert.equal(
                storedBytes.length,
                asset.byteSize
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