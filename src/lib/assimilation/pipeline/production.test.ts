import assert from "node:assert/strict";
import {
    mkdtemp,
    rm,
    writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import type {
    SourceAsset
} from "../types";

import {
    createProductionAssimilationPipeline
} from "./production";


test(
    "assimilates a filesystem-backed source through the production pipeline",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-assimilation-pipeline-"
                )
            );

        try {

            const sourceKey =
                "production-source.txt";

            await writeFile(
                path.join(
                    rootDirectory,
                    sourceKey
                ),
                "Faith, family, purpose, stewardship, and legacy.",
                "utf8"
            );

            const asset:
            SourceAsset = {

                ...sampleTextAsset,

                storage: {
                    provider:
                        "filesystem",
                    key:
                        sourceKey,
                    versionId:
                        "v1"
                }

            };

            const pipeline =
                createProductionAssimilationPipeline(
                    rootDirectory
                );

            const result =
                await pipeline.assimilate(
                    asset
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
                asset.id
            );

            assert.equal(
                result.segment.assetId,
                asset.id
            );

            assert.equal(
                result.classification.assetId,
                asset.id
            );

            assert.equal(
                result.derivedObject.assetId,
                asset.id
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
    "reports extraction failure when the production source is missing",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-assimilation-pipeline-"
                )
            );

        try {

            const asset:
            SourceAsset = {

                ...sampleTextAsset,

                storage: {
                    provider:
                        "filesystem",
                    key:
                        "missing-source.txt",
                    versionId:
                        "v1"
                }

            };

            const pipeline =
                createProductionAssimilationPipeline(
                    rootDirectory
                );

            const result =
                await pipeline.assimilate(
                    asset
                );

            assert.equal(
                result.status,
                "failed"
            );

            assert.equal(
                result.failedStage,
                "extraction"
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