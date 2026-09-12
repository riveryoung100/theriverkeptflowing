import assert from "node:assert/strict";

import {
    access,
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    join
} from "node:path";

import {
    tmpdir
} from "node:os";

import test from "node:test";

import {
    parseLocalFileAssimilationCliArguments,
    runLocalFileAssimilationCli
} from "./local-file-cli";


test(
    "parses exactly one offline local-file Assimilation request",
    () => {

        assert.deepEqual(
            parseLocalFileAssimilationCliArguments(
                [
                    ".river-content",
                    "notes/source.md"
                ]
            ),
            {
                rawSourceRootDirectory:
                    ".river-content",

                sourceFile:
                    "notes/source.md"
            }
        );

        assert.throws(
            () =>
                parseLocalFileAssimilationCliArguments(
                    [
                        ".river-content"
                    ]
                ),
            /Usage: assimilation:local/
        );

    }
);


test(
    "assimilates a real local Markdown file and persists authoritative generated records",
    async () => {

        const workspace =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-local-assimilation-"
                )
            );

        const sourceRoot =
            join(
                workspace,
                "river-content"
            );

        const sourceFile =
            join(
                workspace,
                "faith-and-purpose.md"
            );

        const sourceText =
            [
                "# Faith and Purpose",
                "",
                "Stewardship means using what has been entrusted to you well.",
                "Purpose grows clearer when knowledge is preserved and connected."
            ].join(
                "\n"
            );

        try {

            await writeFile(
                sourceFile,
                sourceText,
                "utf8"
            );

            const result =
                await runLocalFileAssimilationCli(
                    [
                        sourceRoot,
                        sourceFile
                    ]
                );

            assert.equal(
                result.status,
                "completed"
            );

            assert.equal(
                result.failedStage,
                null
            );

            assert.equal(
                result.asset.originalFilename,
                "faith-and-purpose.md"
            );

            assert.equal(
                result.asset.mimeType,
                "text/markdown"
            );

            assert.equal(
                result.asset.provenance.intakeMethod,
                "manual"
            );

            assert.equal(
                result.asset.provenance.originalSource,
                sourceFile
            );

            assert.ok(
                result.extraction
            );

            assert.equal(
                result.extraction.text,
                sourceText
            );

            assert.ok(
                result.segment
            );

            assert.ok(
                result.classification
            );

            assert.ok(
                result.transformation
            );

            assert.ok(
                result.derivedObject
            );

            const generatedRecordPath =
                join(
                    sourceRoot,
                    "generated-records",
                    `${encodeURIComponent(result.asset.id)}.json`
                );

            await access(
                generatedRecordPath
            );

            const generated =
                JSON.parse(
                    await readFile(
                        generatedRecordPath,
                        "utf8"
                    )
                ) as {
                    asset:
                        {
                            id:
                                string;
                        };
                    extraction:
                        {
                            assetId:
                                string;
                        };
                    segment:
                        {
                            assetId:
                                string;
                        };
                    classification:
                        {
                            assetId:
                                string;
                        };
                    derivedObject:
                        {
                            assetId:
                                string;
                        };
                };

            assert.equal(
                generated.asset.id,
                result.asset.id
            );

            assert.equal(
                generated.extraction.assetId,
                result.asset.id
            );

            assert.equal(
                generated.segment.assetId,
                result.asset.id
            );

            assert.equal(
                generated.classification.assetId,
                result.asset.id
            );

            assert.equal(
                generated.derivedObject.assetId,
                result.asset.id
            );

        } finally {

            await rm(
                workspace,
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
    "rejects unsupported local file types before production Assimilation mutates the raw-source root",
    async () => {

        const workspace =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-local-assimilation-reject-"
                )
            );

        const sourceRoot =
            join(
                workspace,
                "river-content"
            );

        const sourceFile =
            join(
                workspace,
                "unsupported.bin"
            );

        try {

            await writeFile(
                sourceFile,
                Uint8Array.from(
                    [
                        0,
                        1,
                        2,
                        3
                    ]
                )
            );

            await assert.rejects(
                () =>
                    runLocalFileAssimilationCli(
                        [
                            sourceRoot,
                            sourceFile
                        ]
                    ),
                /Unsupported local Assimilation source extension/
            );

            await assert.rejects(
                () =>
                    access(
                        sourceRoot
                    )
            );

        } finally {

            await rm(
                workspace,
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
