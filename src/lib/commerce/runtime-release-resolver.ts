import {
    createHash
} from "node:crypto";
import {
    readFile
} from "node:fs/promises";

import type {
    ProductRelease
} from "../fulfillment/types";


export interface RuntimeResolvedProductRelease {
    release:
        ProductRelease;

    artifactBytes:
        Uint8Array;
}


interface RuntimeReleaseManifest {
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


function assertNonEmptyString(
    value:
        unknown,
    field:
        string
): asserts value is string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {
        throw new Error(
            `Runtime release manifest ${field} must be a non-empty string.`
        );
    }
}


function parseManifest(
    rawManifest:
        string
): RuntimeReleaseManifest {

    let parsed:
        unknown;

    try {

        parsed =
            JSON.parse(
                rawManifest
            );

    } catch {

        throw new Error(
            "Runtime release manifest is not valid JSON."
        );
    }

    if (
        typeof parsed !==
            "object" ||
        parsed ===
            null ||
        Array.isArray(
            parsed
        )
    ) {
        throw new Error(
            "Runtime release manifest must be an object."
        );
    }

    const candidate =
        parsed as
            Record<
                string,
                unknown
            >;

    const expectedKeys =
        [
            "productId",
            "productVersion",
            "releaseId",
            "artifactFilename",
            "artifactFormat",
            "artifactByteSize",
            "artifactSha256",
            "createdAt",
            "releaseStatus"
        ].sort();

    const actualKeys =
        Object.keys(
            candidate
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
            "Runtime release manifest contract mismatch."
        );
    }

    assertNonEmptyString(
        candidate.productId,
        "productId"
    );

    assertNonEmptyString(
        candidate.productVersion,
        "productVersion"
    );

    assertNonEmptyString(
        candidate.releaseId,
        "releaseId"
    );

    assertNonEmptyString(
        candidate.artifactFilename,
        "artifactFilename"
    );

    assertNonEmptyString(
        candidate.artifactFormat,
        "artifactFormat"
    );

    assertNonEmptyString(
        candidate.artifactSha256,
        "artifactSha256"
    );

    assertNonEmptyString(
        candidate.createdAt,
        "createdAt"
    );

    if (
        typeof candidate.artifactByteSize !==
            "number" ||
        !Number.isSafeInteger(
            candidate.artifactByteSize
        ) ||
        candidate.artifactByteSize <=
            0
    ) {
        throw new Error(
            "Runtime release manifest artifactByteSize must be a positive safe integer."
        );
    }

    if (
        candidate.releaseStatus !==
            "draft" &&
        candidate.releaseStatus !==
            "approved" &&
        candidate.releaseStatus !==
            "retired"
    ) {
        throw new Error(
            "Runtime release manifest releaseStatus is invalid."
        );
    }

    return {
        productId:
            candidate.productId,

        productVersion:
            candidate.productVersion,

        releaseId:
            candidate.releaseId,

        artifactFilename:
            candidate.artifactFilename,

        artifactFormat:
            candidate.artifactFormat,

        artifactByteSize:
            candidate.artifactByteSize,

        artifactSha256:
            candidate.artifactSha256,

        createdAt:
            candidate.createdAt,

        releaseStatus:
            candidate.releaseStatus
    };
}


export async function resolveRuntimeProductRelease(
    input: {
        manifestPath:
            string;

        artifactPath:
            string;

        expectedProductId:
            string;

        expectedProductVersion:
            string;
    }
): Promise<RuntimeResolvedProductRelease> {

    const manifest =
        parseManifest(
            await readFile(
                input.manifestPath,
                "utf8"
            )
        );

    if (
        manifest.productId !==
            input.expectedProductId
    ) {
        throw new Error(
            "Runtime release productId does not match requested product."
        );
    }

    if (
        manifest.productVersion !==
            input.expectedProductVersion
    ) {
        throw new Error(
            "Runtime release productVersion does not match requested version."
        );
    }

    if (
        manifest.releaseStatus !==
            "approved"
    ) {
        throw new Error(
            "Runtime release must be approved."
        );
    }

    if (
        manifest.artifactFormat !==
            "PDF"
    ) {
        throw new Error(
            "Runtime release artifact format must be PDF."
        );
    }

    const artifactBytes =
        await readFile(
            input.artifactPath
        );

    if (
        artifactBytes.byteLength !==
            manifest.artifactByteSize
    ) {
        throw new Error(
            "Runtime release artifact byte size does not match manifest."
        );
    }

    const artifactSha256 =
        createHash(
            "sha256"
        )
            .update(
                artifactBytes
            )
            .digest(
                "hex"
            );

    if (
        artifactSha256 !==
            manifest.artifactSha256.toLowerCase()
    ) {
        throw new Error(
            "Runtime release artifact SHA-256 does not match manifest."
        );
    }

    const release:
        ProductRelease =
    {
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
            manifest.artifactSha256.toLowerCase(),

        createdAt:
            manifest.createdAt,

        releaseStatus:
            manifest.releaseStatus
    };

    return {
        release,
        artifactBytes:
            new Uint8Array(
                artifactBytes
            )
    };
}
