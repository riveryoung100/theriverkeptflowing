import assert from "node:assert/strict";

import {
    mkdtemp,
    mkdir,
    rm,
    writeFile
} from "node:fs/promises";

import os from "node:os";

import {
    join
} from "node:path";

import test from "node:test";

import {
    FileSystemBinaryRawSourceReader
} from "./filesystemBinaryRawSourceReader";


test(
    "reads filesystem raw source bytes without text decoding",
    async () => {

        const rootDirectory =
            await mkdtemp(
                join(
                    os.tmpdir(),
                    "river-binary-source-reader-"
                )
            );

        try {

            const sourceBytes =
                Uint8Array.from([
                    0,
                    37,
                    80,
                    68,
                    70,
                    45,
                    49,
                    46,
                    55,
                    10,
                    255
                ]);

            const relativePath =
                "source.pdf";

            await writeFile(
                join(
                    rootDirectory,
                    relativePath
                ),
                sourceBytes
            );

            const reader =
                new FileSystemBinaryRawSourceReader(
                    rootDirectory
                );

            const result =
                await reader.read({
                    provider:
                        "filesystem",

                    key:
                        relativePath,

                    versionId:
                        "v1"
                });

            assert.ok(
                result
            );

            assert.deepEqual(
                result.bytes,
                sourceBytes
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
    "preserves arbitrary binary byte values exactly",
    async () => {

        const rootDirectory =
            await mkdtemp(
                join(
                    os.tmpdir(),
                    "river-binary-source-reader-"
                )
            );

        try {

            const sourceBytes =
                Uint8Array.from([
                    0,
                    1,
                    2,
                    10,
                    13,
                    127,
                    128,
                    254,
                    255
                ]);

            const relativePath =
                join(
                    "asset",
                    "binary-source.bin"
                );

            await mkdir(
                join(
                    rootDirectory,
                    "asset"
                ),
                {
                    recursive:
                        true
                }
            );

            await writeFile(
                join(
                    rootDirectory,
                    relativePath
                ),
                sourceBytes
            );

            const reader =
                new FileSystemBinaryRawSourceReader(
                    rootDirectory
                );

            const result =
                await reader.read({
                    provider:
                        "filesystem",

                    key:
                        relativePath,

                    versionId:
                        "v1"
                });

            assert.ok(
                result
            );

            assert.equal(
                result.bytes.byteLength,
                sourceBytes.byteLength
            );

            assert.deepEqual(
                Array.from(
                    result.bytes
                ),
                Array.from(
                    sourceBytes
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
    "returns null when filesystem raw source is unavailable",
    async () => {

        const rootDirectory =
            await mkdtemp(
                join(
                    os.tmpdir(),
                    "river-binary-source-reader-"
                )
            );

        try {

            const reader =
                new FileSystemBinaryRawSourceReader(
                    rootDirectory
                );

            const result =
                await reader.read({
                    provider:
                        "filesystem",

                    key:
                        "missing.pdf",

                    versionId:
                        "v1"
                });

            assert.equal(
                result,
                null
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
    "rejects non-filesystem storage providers",
    async () => {

        const rootDirectory =
            await mkdtemp(
                join(
                    os.tmpdir(),
                    "river-binary-source-reader-"
                )
            );

        try {

            const reader =
                new FileSystemBinaryRawSourceReader(
                    rootDirectory
                );

            const result =
                await reader.read({
                    provider:
                        "object-storage",

                    key:
                        "source.pdf",

                    versionId:
                        "v1"
                });

            assert.equal(
                result,
                null
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
    "rejects absolute filesystem storage keys",
    async () => {

        const rootDirectory =
            await mkdtemp(
                join(
                    os.tmpdir(),
                    "river-binary-source-reader-"
                )
            );

        try {

            const reader =
                new FileSystemBinaryRawSourceReader(
                    rootDirectory
                );

            const result =
                await reader.read({
                    provider:
                        "filesystem",

                    key:
                        join(
                            rootDirectory,
                            "source.pdf"
                        ),

                    versionId:
                        "v1"
                });

            assert.equal(
                result,
                null
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
    "rejects filesystem traversal outside the configured raw-source root",
    async () => {

        const parentDirectory =
            await mkdtemp(
                join(
                    os.tmpdir(),
                    "river-binary-source-reader-"
                )
            );

        const rootDirectory =
            join(
                parentDirectory,
                "raw"
            );

        try {

            await mkdir(
                rootDirectory,
                {
                    recursive:
                        true
                }
            );

            await writeFile(
                join(
                    parentDirectory,
                    "outside.pdf"
                ),
                Uint8Array.from([
                    37,
                    80,
                    68,
                    70
                ])
            );

            const reader =
                new FileSystemBinaryRawSourceReader(
                    rootDirectory
                );

            const result =
                await reader.read({
                    provider:
                        "filesystem",

                    key:
                        join(
                            "..",
                            "outside.pdf"
                        ),

                    versionId:
                        "v1"
                });

            assert.equal(
                result,
                null
            );

        }
        finally {

            await rm(
                parentDirectory,
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
