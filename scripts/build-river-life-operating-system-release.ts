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
    "90b537d7080586ab26c6472d5e51f84b53d5d1fb";

const sourceManuscriptPath =
    "src/content/products/river-life-operating-system-v1.md";

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
            "river-life-operating-system",

        productVersion:
            "v1",

        releaseId,

        sourceManuscriptPath,

        outputDirectory:
            `.river-release-artifacts/river-life-operating-system/v1/${releaseId}`,

        artifactFilename:
            "river-life-operating-system-v1.pdf",

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
