import assert from "node:assert/strict";

import {
    mkdtemp,
    mkdir,
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

import type {
    StorageReference
} from "../types";

import {
    FileSystemRawSourceReader
} from "./filesystemRawSourceReader";


async function withTemporaryStorage(
    callback: (
        root: string
    ) => Promise<void>
): Promise<void> {

    const root =
        await mkdtemp(
            join(
                tmpdir(),
                "river-assimilation-filesystem-reader-"
            )
        );

    try {

        await callback(
            root
        );
    }
    finally {

        await rm(
            root,
            {
                recursive:
                    true,
                force:
                    true
            }
        );
    }
}


function createStorageReference(
    overrides: Partial<StorageReference> = {}
): StorageReference {

    return {
        provider:
            "filesystem",
        bucket:
            "raw",
        key:
            "sample.txt",
        versionId:
            "v1",
        ...overrides
    };
}


test(
    "reads UTF-8 raw source text from filesystem storage",
    async () => {

        await withTemporaryStorage(
            async root => {

                const rawDirectory =
                    join(
                        root,
                        "raw"
                    );

                await mkdir(
                    rawDirectory,
                    {
                        recursive:
                            true
                    }
                );

                await writeFile(
                    join(
                        rawDirectory,
                        "sample.txt"
                    ),
                    "The river kept flowing.",
                    "utf8"
                );

                const reader =
                    new FileSystemRawSourceReader(
                        root
                    );

                const result =
                    await reader.read(
                        createStorageReference()
                    );

                assert.deepEqual(
                    result,
                    {
                        text:
                            "The river kept flowing."
                    }
                );
            }
        );
    }
);


test(
    "reads filesystem storage when bucket is omitted",
    async () => {

        await withTemporaryStorage(
            async root => {

                await writeFile(
                    join(
                        root,
                        "sample.txt"
                    ),
                    "Root-level source.",
                    "utf8"
                );

                const reader =
                    new FileSystemRawSourceReader(
                        root
                    );

                const result =
                    await reader.read(
                        createStorageReference({
                            bucket:
                                undefined
                        })
                    );

                assert.deepEqual(
                    result,
                    {
                        text:
                            "Root-level source."
                    }
                );
            }
        );
    }
);


test(
    "returns null for a non-filesystem provider",
    async () => {

        await withTemporaryStorage(
            async root => {

                const reader =
                    new FileSystemRawSourceReader(
                        root
                    );

                const result =
                    await reader.read(
                        createStorageReference({
                            provider:
                                "memory"
                        })
                    );

                assert.equal(
                    result,
                    null
                );
            }
        );
    }
);


test(
    "rejects storage paths that escape the configured root",
    async () => {

        await withTemporaryStorage(
            async root => {

                const reader =
                    new FileSystemRawSourceReader(
                        root
                    );

                const result =
                    await reader.read(
                        createStorageReference({
                            bucket:
                                "..",
                            key:
                                "outside.txt"
                        })
                    );

                assert.equal(
                    result,
                    null
                );
            }
        );
    }
);


test(
    "returns null when the filesystem source does not exist",
    async () => {

        await withTemporaryStorage(
            async root => {

                const reader =
                    new FileSystemRawSourceReader(
                        root
                    );

                const result =
                    await reader.read(
                        createStorageReference()
                    );

                assert.equal(
                    result,
                    null
                );
            }
        );
    }
);
