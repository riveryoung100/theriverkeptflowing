import assert from "node:assert/strict";
import {
    createHash
} from "node:crypto";
import {
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    resolveRuntimeProductRelease
} from "./runtime-release-resolver";


async function withRuntimeRelease(
    run: (
        input: {
            directory:
                string;

            manifestPath:
                string;

            artifactPath:
                string;
        }
    ) => Promise<void>
): Promise<void> {

    const directory =
        await mkdtemp(
            path.join(
                os.tmpdir(),
                "river-runtime-release-"
            )
        );

    const artifactPath =
        path.join(
            directory,
            "river-life-operating-system-v1.pdf"
        );

    const manifestPath =
        path.join(
            directory,
            "release.json"
        );

    const artifactBytes =
        Buffer.from(
            "%PDF-runtime-release-test"
        );

    await writeFile(
        artifactPath,
        artifactBytes
    );

    await writeFile(
        manifestPath,
        JSON.stringify(
            {
                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",

                releaseId:
                    "runtime-approved-001",

                artifactFilename:
                    "river-life-operating-system-v1.pdf",

                artifactFormat:
                    "PDF",

                artifactByteSize:
                    artifactBytes.byteLength,

                artifactSha256:
                    createHash(
                        "sha256"
                    )
                        .update(
                            artifactBytes
                        )
                        .digest(
                            "hex"
                        ),

                createdAt:
                    "2026-09-07T00:00:00.000Z",

                releaseStatus:
                    "approved"
            },
            null,
            4
        )
    );

    try {

        await run({
            directory,
            manifestPath,
            artifactPath
        });

    } finally {

        await rm(
            directory,
            {
                recursive:
                    true,

                force:
                    true
            }
        );
    }
}


test(
    "resolves an approved private release and returns canonical release plus artifact bytes",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                const result =
                    await resolveRuntimeProductRelease({
                        manifestPath,
                        artifactPath,
                        expectedProductId:
                            "river-life-operating-system",
                        expectedProductVersion:
                            "v1"
                    });

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
                    "runtime-approved-001"
                );

                assert.equal(
                    result.release.releaseStatus,
                    "approved"
                );

                assert.ok(
                    result.artifactBytes.byteLength >
                        0
                );
            }
        );
    }
);


test(
    "rejects a non-approved runtime release",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                const manifest =
                    JSON.parse(
                        await readFile(
                            manifestPath,
                            "utf8"
                        )
                    );

                manifest.releaseStatus =
                    "draft";

                await writeFile(
                    manifestPath,
                    JSON.stringify(
                        manifest,
                        null,
                        4
                    )
                );

                await assert.rejects(
                    () =>
                        resolveRuntimeProductRelease({
                            manifestPath,
                            artifactPath,
                            expectedProductId:
                                "river-life-operating-system",
                            expectedProductVersion:
                                "v1"
                        }),
                    /must be approved/
                );
            }
        );
    }
);


test(
    "rejects a release for another product",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                await assert.rejects(
                    () =>
                        resolveRuntimeProductRelease({
                            manifestPath,
                            artifactPath,
                            expectedProductId:
                                "different-product",
                            expectedProductVersion:
                                "v1"
                        }),
                    /productId/
                );
            }
        );
    }
);


test(
    "rejects a release for another product version",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                await assert.rejects(
                    () =>
                        resolveRuntimeProductRelease({
                            manifestPath,
                            artifactPath,
                            expectedProductId:
                                "river-life-operating-system",
                            expectedProductVersion:
                                "v2"
                        }),
                    /productVersion/
                );
            }
        );
    }
);


test(
    "rejects artifact byte-size drift",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                await writeFile(
                    artifactPath,
                    Buffer.from(
                        "%PDF-drift"
                    )
                );

                await assert.rejects(
                    () =>
                        resolveRuntimeProductRelease({
                            manifestPath,
                            artifactPath,
                            expectedProductId:
                                "river-life-operating-system",
                            expectedProductVersion:
                                "v1"
                        }),
                    /byte size/
                );
            }
        );
    }
);


test(
    "rejects artifact SHA-256 drift when byte size is unchanged",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                const original =
                    await readFile(
                        artifactPath
                    );

                const replacement =
                    Buffer.from(
                        original
                    );

                replacement[
                    replacement.length -
                        1
                ] =
                    replacement[
                        replacement.length -
                            1
                    ] ===
                        0x41
                        ? 0x42
                        : 0x41;

                await writeFile(
                    artifactPath,
                    replacement
                );

                await assert.rejects(
                    () =>
                        resolveRuntimeProductRelease({
                            manifestPath,
                            artifactPath,
                            expectedProductId:
                                "river-life-operating-system",
                            expectedProductVersion:
                                "v1"
                        }),
                    /SHA-256/
                );
            }
        );
    }
);


test(
    "rejects unexpected manifest properties",
    async () => {

        await withRuntimeRelease(
            async ({
                manifestPath,
                artifactPath
            }) => {

                const manifest =
                    JSON.parse(
                        await readFile(
                            manifestPath,
                            "utf8"
                        )
                    );

                manifest.unexpected =
                    true;

                await writeFile(
                    manifestPath,
                    JSON.stringify(
                        manifest,
                        null,
                        4
                    )
                );

                await assert.rejects(
                    () =>
                        resolveRuntimeProductRelease({
                            manifestPath,
                            artifactPath,
                            expectedProductId:
                                "river-life-operating-system",
                            expectedProductVersion:
                                "v1"
                        }),
                    /contract mismatch/
                );
            }
        );
    }
);
