import type {
    ProductRelease
} from "../fulfillment/types";

import type {
    ApprovedReleaseArtifact,
    ApprovedReleaseResolver
} from "./runtime-paid-order-handoff";


interface R2ReleaseObject {

    text():
        Promise<string>;

    arrayBuffer():
        Promise<ArrayBuffer>;

}


export interface R2ReleaseBucket {

    get(
        key:
            string
    ): Promise<R2ReleaseObject | null>;

}


export interface R2ApprovedReleaseResolverOptions {

    readonly productId:
        string;

    readonly productVersion:
        string;

    readonly releaseId:
        string;

    readonly keyPrefix:
        string;

}


interface ReleaseManifest {

    productId:
        string;

    productVersion:
        string;

    releaseId:
        string;

    artifactFilename:
        string;

    artifactFormat:
        string;

    artifactByteSize:
        number;

    artifactSha256:
        string;

    createdAt:
        string;

    releaseStatus:
        ProductRelease["releaseStatus"];

}


function requireNormalizedString(
    value:
        unknown,
    label:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.length ===
            0 ||
        value.trim() !==
            value
    ) {

        throw new Error(
            `${label} must be a normalized non-empty string.`
        );

    }

    return value;

}


function parseManifest(
    text:
        string
): ReleaseManifest {

    let value:
        unknown;

    try {

        value =
            JSON.parse(
                text
            );

    }
    catch {

        throw new Error(
            "R2 release manifest is not valid JSON."
        );

    }

    if (
        value === null ||
        typeof value !==
            "object" ||
        Array.isArray(
            value
        )
    ) {

        throw new Error(
            "R2 release manifest must be an object."
        );

    }

    const record =
        value as
            Record<string, unknown>;

    const expectedKeys =
        [
            "artifactByteSize",
            "artifactFilename",
            "artifactFormat",
            "artifactSha256",
            "createdAt",
            "productId",
            "productVersion",
            "releaseId",
            "releaseStatus"
        ];

    const actualKeys =
        Object.keys(
            record
        ).sort();

    if (
        expectedKeys.length !==
            actualKeys.length ||
        expectedKeys.some(
            (
                key,
                index
            ) =>
                key !==
                    actualKeys[
                        index
                    ]
        )
    ) {

        throw new Error(
            "R2 release manifest contract mismatch."
        );

    }

    const productId =
        requireNormalizedString(
            record.productId,
            "R2 manifest productId"
        );

    const productVersion =
        requireNormalizedString(
            record.productVersion,
            "R2 manifest productVersion"
        );

    const releaseId =
        requireNormalizedString(
            record.releaseId,
            "R2 manifest releaseId"
        );

    const artifactFilename =
        requireNormalizedString(
            record.artifactFilename,
            "R2 manifest artifactFilename"
        );

    const artifactFormat =
        requireNormalizedString(
            record.artifactFormat,
            "R2 manifest artifactFormat"
        );

    const artifactSha256 =
        requireNormalizedString(
            record.artifactSha256,
            "R2 manifest artifactSha256"
        ).toLowerCase();

    const createdAt =
        requireNormalizedString(
            record.createdAt,
            "R2 manifest createdAt"
        );

    if (
        typeof record.artifactByteSize !==
            "number" ||
        !Number.isSafeInteger(
            record.artifactByteSize
        ) ||
        record.artifactByteSize <=
            0
    ) {

        throw new Error(
            "R2 manifest artifactByteSize must be a positive safe integer."
        );

    }

    if (
        record.releaseStatus !==
            "draft" &&
        record.releaseStatus !==
            "approved" &&
        record.releaseStatus !==
            "retired"
    ) {

        throw new Error(
            "R2 manifest releaseStatus is invalid."
        );

    }

    return {
        productId,
        productVersion,
        releaseId,
        artifactFilename,
        artifactFormat,
        artifactByteSize:
            record.artifactByteSize,
        artifactSha256,
        createdAt,
        releaseStatus:
            record.releaseStatus
    };

}


function bytesToHex(
    bytes:
        Uint8Array
): string {

    let result =
        "";

    for (
        const byte
        of bytes
    ) {

        result +=
            byte
                .toString(
                    16
                )
                .padStart(
                    2,
                    "0"
                );

    }

    return result;

}


export class R2ApprovedReleaseResolver
implements ApprovedReleaseResolver {

    public constructor(
        private readonly bucket:
            R2ReleaseBucket,
        private readonly options:
            R2ApprovedReleaseResolverOptions
    ) {}


    public async resolveApprovedRelease(
        productId:
            string,
        productVersion:
            string
    ): Promise<ApprovedReleaseArtifact> {

        if (
            productId !==
                this.options.productId ||
            productVersion !==
                this.options.productVersion
        ) {

            throw new Error(
                "Requested runtime product does not match configured approved release."
            );

        }

        const releaseDirectory =
            `${this.options.keyPrefix}/${this.options.productId}/${this.options.productVersion}/${this.options.releaseId}`;

        const manifestKey =
            `${releaseDirectory}/${this.options.releaseId}.release.json`;

        const manifestObject =
            await this.bucket.get(
                manifestKey
            );

        if (
            manifestObject ===
                null
        ) {

            throw new Error(
                "Approved release manifest is missing from R2."
            );

        }

        const manifest =
            parseManifest(
                await manifestObject.text()
            );

        if (
            manifest.productId !==
                productId ||
            manifest.productVersion !==
                productVersion ||
            manifest.releaseId !==
                this.options.releaseId
        ) {

            throw new Error(
                "R2 approved release identity mismatch."
            );

        }

        if (
            manifest.releaseStatus !==
                "approved"
        ) {

            throw new Error(
                "R2 runtime release must be approved."
            );

        }

        if (
            manifest.artifactFormat !==
                "PDF"
        ) {

            throw new Error(
                "R2 runtime artifact must be PDF."
            );

        }

        const artifactKey =
            `${releaseDirectory}/${manifest.artifactFilename}`;

        const artifactObject =
            await this.bucket.get(
                artifactKey
            );

        if (
            artifactObject ===
                null
        ) {

            throw new Error(
                "Approved release artifact is missing from R2."
            );

        }

        const artifactBytes =
            new Uint8Array(
                await artifactObject.arrayBuffer()
            );

        if (
            artifactBytes.byteLength !==
                manifest.artifactByteSize
        ) {

            throw new Error(
                "R2 artifact byte size does not match approved manifest."
            );

        }

        const digest =
            await crypto.subtle.digest(
                "SHA-256",
                artifactBytes
            );

        const artifactSha256 =
            bytesToHex(
                new Uint8Array(
                    digest
                )
            );

        if (
            artifactSha256 !==
                manifest.artifactSha256
        ) {

            throw new Error(
                "R2 artifact SHA-256 does not match approved manifest."
            );

        }

        return {
            release: {
                productId:
                    manifest.productId,

                productVersion:
                    manifest.productVersion,

                releaseId:
                    manifest.releaseId,

                artifactFilename:
                    manifest.artifactFilename,

                artifactFormat:
                    manifest.artifactFormat,

                artifactByteSize:
                    manifest.artifactByteSize,

                artifactSha256:
                    manifest.artifactSha256,

                createdAt:
                    manifest.createdAt,

                releaseStatus:
                    manifest.releaseStatus
            },

            artifactBytes
        };

    }

}
