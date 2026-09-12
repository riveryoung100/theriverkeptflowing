import {
    readFile,
    stat
} from "node:fs/promises";

import {
    basename,
    extname,
    resolve
} from "node:path";

import type {
    AssetType
} from "../types";

import {
    createProductionSourceAssimilation
} from "./engine";


export interface LocalFileAssimilationCliArguments {

    readonly rawSourceRootDirectory:
        string;

    readonly sourceFile:
        string;

}


interface SupportedLocalSource {

    readonly assetType:
        AssetType;

    readonly mimeType:
        string;

    readonly textual:
        boolean;

}


const SUPPORTED_LOCAL_SOURCES:
    Readonly<Record<string, SupportedLocalSource>> =
    {
        ".txt": {
            assetType:
                "note",
            mimeType:
                "text/plain",
            textual:
                true
        },

        ".md": {
            assetType:
                "document",
            mimeType:
                "text/markdown",
            textual:
                true
        },

        ".html": {
            assetType:
                "document",
            mimeType:
                "text/html",
            textual:
                true
        },

        ".htm": {
            assetType:
                "document",
            mimeType:
                "text/html",
            textual:
                true
        },

        ".pdf": {
            assetType:
                "document",
            mimeType:
                "application/pdf",
            textual:
                false
        },

        ".docx": {
            assetType:
                "document",
            mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            textual:
                false
        }
    };


function requireNonEmpty(
    value:
        string | undefined,
    label:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {

        throw new TypeError(
            `${label} is required.`
        );

    }

    return value.trim();

}


export function parseLocalFileAssimilationCliArguments(
    arguments_:
        readonly string[]
): LocalFileAssimilationCliArguments {

    if (
        arguments_.length !==
        2
    ) {

        throw new TypeError(
            "Usage: assimilation:local <raw-source-root> <source-file>"
        );

    }

    return {
        rawSourceRootDirectory:
            requireNonEmpty(
                arguments_[0],
                "Raw source root directory"
            ),

        sourceFile:
            requireNonEmpty(
                arguments_[1],
                "Local source file"
            )
    };

}


function getSupportedLocalSource(
    sourceFile:
        string
): SupportedLocalSource {

    const extension =
        extname(
            sourceFile
        )
            .toLowerCase();

    const supported =
        SUPPORTED_LOCAL_SOURCES[
            extension
        ];

    if (
        supported ===
        undefined
    ) {

        throw new TypeError(
            `Unsupported local Assimilation source extension: ${extension || "(none)"}.`
        );

    }

    return supported;

}


function createTitle(
    originalFilename:
        string
): string {

    const extension =
        extname(
            originalFilename
        );

    const withoutExtension =
        extension.length ===
            0
            ? originalFilename
            : originalFilename.slice(
                0,
                -extension.length
            );

    return (
        withoutExtension
            .replace(
                /[-_]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim() ||
        originalFilename
    );

}


export async function runLocalFileAssimilationCli(
    arguments_:
        readonly string[]
) {

    const parsed =
        parseLocalFileAssimilationCliArguments(
            arguments_
        );

    const sourcePath =
        resolve(
            parsed.sourceFile
        );

    const sourceStats =
        await stat(
            sourcePath
        );

    if (
        !sourceStats.isFile()
    ) {

        throw new TypeError(
            "Local Assimilation source must be a regular file."
        );

    }

    const supported =
        getSupportedLocalSource(
            sourcePath
        );

    const originalFilename =
        basename(
            sourcePath
        );

    const sourceBytes =
        await readFile(
            sourcePath
        );

    const content =
        supported.textual
            ? sourceBytes.toString(
                "utf8"
            )
            : Uint8Array.from(
                sourceBytes
            );

    const service =
        createProductionSourceAssimilation(
            parsed.rawSourceRootDirectory
        );

    const result =
        await service.ingestAndAssimilate(
            {
                content,

                assetType:
                    supported.assetType,

                originalFilename,

                title:
                    createTitle(
                        originalFilename
                    ),

                mimeType:
                    supported.mimeType,

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

                originalSource:
                    sourcePath,

                declaredOwner:
                    "River",

                declaredPurpose:
                    "Offline production Assimilation from a local source file."
            }
        );

    if (
        result.status !==
        "completed"
    ) {

        throw new Error(
            result.failedStage ===
                null
                ? "Offline production Assimilation failed."
                : `Offline production Assimilation failed during ${result.failedStage}.`
        );

    }

    return result;

}
