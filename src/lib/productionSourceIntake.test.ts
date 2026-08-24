import assert from "node:assert/strict";
import {
    mkdtemp,
    rm
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type {
    FileSystemSourceIngestionRequest
} from "./assimilation/ingestion/types";

import {
    createProductionSourceIntake
} from "./productionSourceIntake";


function createRequest():
FileSystemSourceIngestionRequest {

    return {
        content:
            "The river receives a production source.",
        assetType:
            "note",
        originalFilename:
            "production-source-intake.txt",
        title:
            "Production Source Intake",
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
            "Production source intake validation."
    };

}


test(
    "creates production source intake",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-intake-"
                )
            );

        try {

            assert.ok(
                createProductionSourceIntake(
                    rootDirectory
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
    "ingests a source through production orchestration",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-intake-"
                )
            );

        try {

            const intake =
                createProductionSourceIntake(
                    rootDirectory
                );

            await assert.doesNotReject(
                intake.ingest(
                    createRequest()
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