import {
    createHash
} from "node:crypto";
import {
    execFileSync
} from "node:child_process";

import {
    buildProductReleaseArtifact
} from "../src/lib/fulfillment/release-artifact";


function readArgument(
    name:
        string
): string | undefined {

    const index =
        process.argv.indexOf(
            name
        );

    if (
        index ===
            -1 ||
        index + 1 >=
            process.argv.length
    ) {
        return undefined;
    }

    return process.argv[
        index + 1
    ];

}


const releaseId =
    readArgument(
        "--release-id"
    );

if (
    !releaseId
) {
    throw new Error(
        "Missing required --release-id argument."
    );
}

const requestedStatus =
    readArgument(
        "--status"
    ) ??
    "draft";

if (
    requestedStatus !==
        "draft" &&
    requestedStatus !==
        "approved" &&
    requestedStatus !==
        "retired"
) {
    throw new Error(
        "Status must be draft, approved, or retired."
    );
}

const createdAt =
    readArgument(
        "--created-at"
    );

const manuscriptAuthorityCommit =
    "92036c2326ba5a254302c5b8e2dc30a3e2d80dc4";

const sourceManuscriptPath =
    "src/content/products/know-your-number-v1.md";

const expectedSourceSha256 =
    requestedStatus ===
        "approved"
        ? createHash(
            "sha256"
        )
            .update(
                execFileSync(
                    "git",
                    [
                        "show",
                        `${manuscriptAuthorityCommit}:${sourceManuscriptPath}`
                    ]
                )
            )
            .digest(
                "hex"
            )
        : undefined;

const result =
    await buildProductReleaseArtifact({
        productId:
            "know-your-number",

        productVersion:
            "v1",

        releaseId,

        sourceManuscriptPath,

        outputDirectory:
            `.river-release-artifacts/know-your-number/v1/${releaseId}`,

        artifactFilename:
            "know-your-number-v1.pdf",

        documentTitle:
            "Know Your Number",

        releaseStatus:
            requestedStatus,

        expectedSourceSha256,

        createdAt
    });


console.log(
    JSON.stringify(
        result.release,
        null,
        4
    )
);

console.log(
    `Artifact: ${result.artifactPath}`
);

console.log(
    `Manifest: ${result.manifestPath}`
);