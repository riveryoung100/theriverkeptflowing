import assert from "node:assert/strict";
import {
    mkdtemp,
    rm,
    writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type {
    FileSystemSourceIngestionRequest
} from "./assimilation/ingestion/types";

import {
    parseProductionSourceCommandArguments,
    runProductionSourceCommand
} from "./productionSourceCommand";


function createRequest():
FileSystemSourceIngestionRequest {

    return {
        content:
            "The river receives a source through the production command boundary.",
        assetType:
            "note",
        originalFilename:
            "production-command-source.txt",
        title:
            "Production Command Source",
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
            "Production command adapter validation."
    };

}


test(
    "parses production source command arguments",
    () => {

        assert.deepEqual(
            parseProductionSourceCommandArguments(
                [
                    "request.json",
                    "raw-source"
                ]
            ),
            {
                requestFilePath:
                    "request.json",
                rawSourceRootDirectory:
                    "raw-source"
            }
        );

    }
);


test(
    "rejects an invalid production source command argument count",
    () => {

        assert.throws(
            () => {
                parseProductionSourceCommandArguments(
                    []
                );
            },
            /requires exactly two arguments/
        );

    }
);


test(
    "executes source intake through the production command",
    async () => {

        const temporaryDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-command-"
                )
            );

        const requestFilePath =
            path.join(
                temporaryDirectory,
                "request.json"
            );

        const rawSourceRootDirectory =
            path.join(
                temporaryDirectory,
                "raw-source"
            );

        try {

            await writeFile(
                requestFilePath,
                JSON.stringify(
                    createRequest()
                ),
                "utf8"
            );

            await assert.doesNotReject(
                runProductionSourceCommand(
                    [
                        requestFilePath,
                        rawSourceRootDirectory
                    ]
                )
            );

        }
        finally {

            await rm(
                temporaryDirectory,
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
    "rejects malformed production source requests before intake",
    async () => {

        const temporaryDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-source-command-invalid-"
                )
            );

        const requestFilePath =
            path.join(
                temporaryDirectory,
                "request.json"
            );

        const rawSourceRootDirectory =
            path.join(
                temporaryDirectory,
                "raw-source"
            );

        const malformedRequests:
            readonly unknown[] = [
                null,
                [],
                {},
                {
                    content:
                        42,
                    assetType:
                        "note",
                    originalFilename:
                        "source.txt",
                    ownership:
                        {},
                    usagePermission:
                        {}
                },
                {
                    content:
                        "Source material.",
                    assetType:
                        "",
                    originalFilename:
                        "source.txt",
                    ownership:
                        {},
                    usagePermission:
                        {}
                },
                {
                    content:
                        "Source material.",
                    assetType:
                        "note",
                    originalFilename:
                        "",
                    ownership:
                        {},
                    usagePermission:
                        {}
                },
                {
                    content:
                        "Source material.",
                    assetType:
                        "note",
                    originalFilename:
                        "source.txt",
                    ownership:
                        null,
                    usagePermission:
                        {}
                },
                {
                    content:
                        "Source material.",
                    assetType:
                        "note",
                    originalFilename:
                        "source.txt",
                    ownership:
                        {},
                    usagePermission:
                        null
                }
            ];

        try {

            for (
                const malformedRequest
                of malformedRequests
            ) {

                await writeFile(
                    requestFilePath,
                    JSON.stringify(
                        malformedRequest
                    ),
                    "utf8"
                );

                await assert.rejects(
                    runProductionSourceCommand(
                        [
                            requestFilePath,
                            rawSourceRootDirectory
                        ]
                    ),
                    TypeError
                );

            }

        }
        finally {

            await rm(
                temporaryDirectory,
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
