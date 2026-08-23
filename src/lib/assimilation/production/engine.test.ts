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