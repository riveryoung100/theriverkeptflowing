import assert from "node:assert/strict";
import {
    createHash
} from "node:crypto";
import {
    readFileSync
} from "node:fs";
import {
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";
import {
    tmpdir
} from "node:os";
import {
    join
} from "node:path";
import test from "node:test";

import {
    buildProductReleaseArtifact
} from "./release-artifact";


function sha256File(
    path:
        string
): string {

    return createHash(
        "sha256"
    )
        .update(
            readFileSync(
                path
            )
        )
        .digest(
            "hex"
        );

}


async function createFixture(): Promise<{
    root:
        string;
    source:
        string;
    output:
        string;
}> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-release-artifact-"
            )
        );

    const source =
        join(
            root,
            "source.md"
        );

    const output =
        join(
            root,
            "private-releases"
        );

    await writeFile(
        source,
        [
            "---",
            'title: "Test Product"',
            "draft: true",
            "---",
            "",
            "# Test Product",
            "",
            "A governed release artifact.",
            "",
            "## Exercise",
            "",
            "- First step",
            "- Second step",
            ""
        ].join(
            "\n"
        ),
        "utf8"
    );

    return {
        root,
        source,
        output
    };

}


test(
    "builds a private PDF artifact with exact required release metadata",
    async () => {

        const fixture =
            await createFixture();

        try {

            const result =
                await buildProductReleaseArtifact({
                    productId:
                        "river-life-operating-system",
                    productVersion:
                        "v1",
                    releaseId:
                        "release-001",
                    sourceManuscriptPath:
                        fixture.source,
                    outputDirectory:
                        fixture.output,
                    artifactFilename:
                        "river-life-operating-system-v1.pdf",
                    releaseStatus:
                        "approved",
                    expectedSourceSha256:
                        sha256File(
                            fixture.source
                        ),
                    createdAt:
                        "2026-09-04T00:00:00.000Z"
                });

            const artifact =
                await readFile(
                    result.artifactPath
                );

            assert.equal(
                artifact
                    .subarray(
                        0,
                        5
                    )
                    .toString(
                        "ascii"
                    ),
                "%PDF-"
            );

            assert.equal(
                result.release.productId,
                "river-life-operating-system"
            );

            assert.equal(
                result.release.productVersion,
                "v1"
            );

            assert.equal(
                result.release.releaseId,
                "release-001"
            );

            assert.equal(
                result.release.artifactFilename,
                "river-life-operating-system-v1.pdf"
            );

            assert.equal(
                result.release.artifactFormat,
                "PDF"
            );

            assert.equal(
                result.release.artifactByteSize,
                artifact.byteLength
            );

            assert.equal(
                result.release.artifactSha256,
                createHash(
                    "sha256"
                )
                    .update(
                        artifact
                    )
                    .digest(
                        "hex"
                    )
            );

            assert.equal(
                result.release.createdAt,
                "2026-09-04T00:00:00.000Z"
            );

            assert.equal(
                result.release.releaseStatus,
                "approved"
            );

            const manifest =
                JSON.parse(
                    await readFile(
                        result.manifestPath,
                        "utf8"
                    )
                );

            assert.deepEqual(
                manifest,
                result.release
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "rejects approved generation without an expected authoritative source hash",
    async () => {

        const fixture =
            await createFixture();

        try {

            await assert.rejects(
                () =>
                    buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "release-missing-authority",
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            fixture.output,
                        artifactFilename:
                            "river-life-operating-system-v1.pdf",
                        releaseStatus:
                            "approved",
                    }),
                /expectedSourceSha256/
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "accepts approved generation when filesystem CRLF normalizes to authoritative LF",
    async () => {

        const fixture =
            await createFixture();

        const authoritativeSource =
            await readFile(
                fixture.source,
                "utf8"
            );

        const authoritativeSourceHash =
            createHash(
                "sha256"
            )
                .update(
                    Buffer.from(
                        authoritativeSource,
                        "utf8"
                    )
                )
                .digest(
                    "hex"
                );

        const firstLineFeed =
            authoritativeSource.indexOf(
                "\n"
            );

        assert.notEqual(
            firstLineFeed,
            -1
        );

        const crlfEquivalentSource =
            authoritativeSource.slice(
                0,
                firstLineFeed
            ) +
            "\r\n" +
            authoritativeSource.slice(
                firstLineFeed + 1
            );

        await writeFile(
            fixture.source,
            crlfEquivalentSource,
            "utf8"
        );

        const result =
            await buildProductReleaseArtifact({
                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",

                releaseId:
                    "release-approved-crlf-equivalent",

                sourceManuscriptPath:
                    fixture.source,

                outputDirectory:
                    fixture.output,

                artifactFilename:
                    "river-life-operating-system-v1.pdf",

                releaseStatus:
                    "approved",

                expectedSourceSha256:
                    authoritativeSourceHash,

                createdAt:
                    "2026-09-04T17:30:00.000Z"
            });

        assert.equal(
            result.release.releaseStatus,
            "approved"
        );

    }
);

test(
    "rejects approved generation when the source manuscript does not match the expected authoritative hash",
    async () => {

        const fixture =
            await createFixture();

        try {

            const differentSourceHash =
                createHash(
                    "sha256"
                )
                    .update(
                        "different authoritative manuscript",
                        "utf8"
                    )
                    .digest(
                        "hex"
                    );

            await assert.rejects(
                () =>
                    buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "release-authority-mismatch",
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            fixture.output,
                        artifactFilename:
                            "river-life-operating-system-v1.pdf",
                        releaseStatus:
                            "approved",
                        expectedSourceSha256:
                            differentSourceHash
                    }),
                /does not match the expected authoritative SHA-256/
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "rejects a non-PDF V1 artifact filename",
    async () => {

        const fixture =
            await createFixture();

        try {

            await assert.rejects(
                () =>
                    buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "release-001",
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            fixture.output,
                        artifactFilename:
                            "river-life-operating-system-v1.md",
                        releaseStatus:
                            "approved",
                            expectedSourceSha256:
                        sha256File(
                            fixture.source
                        )
                    }),
                /must use PDF format/
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "rejects an artifact filename containing a path",
    async () => {

        const fixture =
            await createFixture();

        try {

            await assert.rejects(
                () =>
                    buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "release-001",
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            fixture.output,
                        artifactFilename:
                            "../river-life-operating-system-v1.pdf",
                        releaseStatus:
                            "approved",
                            expectedSourceSha256:
                        sha256File(
                            fixture.source
                        )
                    }),
                /must be a filename/
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "rejects output beneath the public static directory",
    async () => {

        const fixture =
            await createFixture();

        try {

            await assert.rejects(
                () =>
                    buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "release-001",
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            join(
                                process.cwd(),
                                "public",
                                "products"
                            ),
                        artifactFilename:
                            "river-life-operating-system-v1.pdf",
                        releaseStatus:
                            "approved",
                            expectedSourceSha256:
                        sha256File(
                            fixture.source
                        )
                    }),
                /must not be written beneath public/
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "rejects output beneath the generated static dist directory",
    async () => {

        const fixture =
            await createFixture();

        try {

            await assert.rejects(
                () =>
                    buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "release-001",
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            join(
                                process.cwd(),
                                "dist",
                                "products"
                            ),
                        artifactFilename:
                            "river-life-operating-system-v1.pdf",
                        releaseStatus:
                            "approved",
                            expectedSourceSha256:
                        sha256File(
                            fixture.source
                        )
                    }),
                /must not be written beneath dist/
            );

        }
        finally {

            await rm(
                fixture.root,
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
    "supports draft approved and retired release statuses",
    async () => {

        const statuses =
            [
                "draft",
                "approved",
                "retired"
            ] as const;

        for (
            const releaseStatus
            of statuses
        ) {

            const fixture =
                await createFixture();

            try {

                const result =
                    await buildProductReleaseArtifact({
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            `release-${releaseStatus}`,
                        sourceManuscriptPath:
                            fixture.source,
                        outputDirectory:
                            fixture.output,
                        artifactFilename:
                            "river-life-operating-system-v1.pdf",
                        releaseStatus,
                        expectedSourceSha256:
                            releaseStatus ===
                                "approved"
                                ? sha256File(
                                    fixture.source
                                )
                                : undefined,
                        createdAt:
                            "2026-09-04T00:00:00.000Z"
                    });

                assert.equal(
                    result.release.releaseStatus,
                    releaseStatus
                );

            }
            finally {

                await rm(
                    fixture.root,
                    {
                        recursive:
                            true,
                        force:
                            true
                    }
                );

            }

        }

    }
);
