import {
    createHash
} from "node:crypto";

import {
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    basename,
    join,
    resolve
} from "node:path";

import {
    ASSIMILATION_SCHEMA_VERSION,
    type SourceAsset
} from "../types";

import {
    createAssetId
} from "../identifiers";

import {
    validateSourceAsset
} from "../validation";

import type {
    FileSystemSourceIngestionRequest,
    FileSystemSourceIngestionService
} from "./types";


function sanitizeFilename(
    filename: string
): string {

    const base =
        basename(
            filename
        );

    const sanitized =
        base
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );

    return sanitized ||
        "source";

}


function toBytes(
    content:
        string | Uint8Array
): Uint8Array {

    if (
        typeof content ===
        "string"
    ) {

        return Buffer.from(
            content,
            "utf8"
        );

    }

    return new Uint8Array(
        content
    );

}


export class FileSystemSourceIngestion
implements FileSystemSourceIngestionService {

    private readonly rootDirectory:
        string;


    public constructor(
        rootDirectory: string
    ) {

        this.rootDirectory =
            resolve(
                rootDirectory
            );

    }


    public async ingest(
        request:
            FileSystemSourceIngestionRequest
    ): Promise<SourceAsset> {

        const assetId =
            createAssetId();

        const assetDirectoryName =
            assetId.replace(
                ":",
                "-"
            );

        const filename =
            sanitizeFilename(
                request.originalFilename
            );

        const storageKey =
            join(
                assetDirectoryName,
                filename
            );

        const destinationDirectory =
            join(
                this.rootDirectory,
                assetDirectoryName
            );

        const destinationPath =
            join(
                destinationDirectory,
                filename
            );

        const bytes =
            toBytes(
                request.content
            );

        const checksum =
            createHash(
                "sha256"
            )
                .update(
                    bytes
                )
                .digest(
                    "hex"
                );

        const now =
            new Date()
                .toISOString();

        const asset:
        SourceAsset = {

            id:
                assetId,

            assetType:
                request.assetType,

            ...(request.title
                ? {
                    title:
                        request.title
                }
                : {}),

            originalFilename:
                request.originalFilename,

            ...(request.createdAt
                ? {
                    createdAt:
                        request.createdAt
                }
                : {}),

            receivedAt:
                now,

            updatedAt:
                now,

            checksum: {
                algorithm:
                    "sha256",
                value:
                    checksum
            },

            ...(request.mimeType
                ? {
                    mimeType:
                        request.mimeType
                }
                : {}),

            byteSize:
                bytes.byteLength,

            ...(request.language
                ? {
                    language:
                        request.language
                }
                : {}),

            ownership:
                request.ownership,

            rightsStatus:
                request.rightsStatus,

            usagePermission:
                request.usagePermission,

            privacy:
                request.privacy,

            sensitivityCategories:
                request.sensitivityCategories ??
                [],

            status:
                "received",

            reviewStatus:
                request.reviewStatus,

            provenance: {

                submittedBy:
                    request.submittedBy,

                submittedAt:
                    now,

                intakeMethod:
                    request.intakeMethod,

                ...(request.originalSource
                    ? {
                        originalSource:
                            request.originalSource
                    }
                    : {}),

                ...(request.originalPlatformId
                    ? {
                        originalPlatformId:
                            request.originalPlatformId
                    }
                    : {}),

                ...(request.declaredOwner
                    ? {
                        declaredOwner:
                            request.declaredOwner
                    }
                    : {}),

                ...(request.declaredPurpose
                    ? {
                        declaredPurpose:
                            request.declaredPurpose
                    }
                    : {}),

                transformationIds:
                    []

            },

            storage: {
                provider:
                    "filesystem",
                key:
                    storageKey,
                versionId:
                    "v1"
            },

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

        const validation =
            validateSourceAsset(
                asset
            );

        if (!validation.valid) {

            const details =
                validation.issues
                    .map(
                        (issue) =>
                            `${issue.code}: ${issue.message}`
                    )
                    .join(
                        "; "
                    );

            throw new Error(
                `Invalid source asset: ${details}`
            );

        }

        await mkdir(
            destinationDirectory,
            {
                recursive:
                    true
            }
        );

        await writeFile(
            destinationPath,
            bytes,
            {
                flag:
                    "wx"
            }
        );

        return asset;

    }

}