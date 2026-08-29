import {
    strict as assert
} from "node:assert";

import {
    execFileSync
} from "node:child_process";

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

import {
    test
} from "node:test";

import {
    loadRiverDevConfiguration
} from "../core/config";

import type {
    RiverDevConfiguration
} from "../types";

import {
    implementRiverDevPlan
} from "./implement";

function createManifest() {

    return {
        version:
            "1.0.0",

        implementationId:
            "implementation:proposal:intent:dev-325-example",

        planId:
            "plan:dev-325-example",

        branch:
            "dev-325-test-implementation",

        description:
            "Exercise the DEV-325 implement command production boundary.",

        operations: [
            {
                type:
                    "write-file",

                path:
                    "generated/dev-325-example.ts",

                content:
                    "export const dev325Example = true;\n",

                overwrite:
                    false
            }
        ]
    };

}


async function createConfiguration(
    repositoryRoot:
        string
): Promise<RiverDevConfiguration> {

    execFileSync(
        "git",
        [
            "init",
            "-b",
            "dev-325-test-implementation"
        ],
        {
            cwd:
                repositoryRoot,

            stdio:
                "ignore"
        }
    );

    const sourceRepositoryRoot = process.cwd();

    const baseConfiguration =
        await loadRiverDevConfiguration(
            sourceRepositoryRoot
        );

    return {
        ...baseConfiguration,

        repositoryRoot
    };

}


async function withTemporaryRepository(
    callback:
        (
            repositoryRoot:
                string,

            configuration:
                RiverDevConfiguration,

            manifestPath:
                string
        ) => Promise<void>
): Promise<void> {

    const repositoryRoot =
        await mkdtemp(
            join(
                tmpdir(),
                "river-dev-implement-dev-325-"
            )
        );

    try {

        const configuration =
            await createConfiguration(
                repositoryRoot
            );

        const manifestPath =
            join(
                repositoryRoot,
                "implementation-manifest.json"
            );

        await writeFile(
            manifestPath,
            JSON.stringify(
                createManifest()
            ),
            "utf8"
        );

        await callback(
            repositoryRoot,
            configuration,
            manifestPath
        );

    }
    finally {

        await rm(
            repositoryRoot,
            {
                recursive:
                    true,

                force:
                    true
            }
        );

    }

}


async function assertGeneratedFileAbsent(
    repositoryRoot:
        string
): Promise<void> {

    await assert.rejects(
        readFile(
            join(
                repositoryRoot,
                "generated",
                "dev-325-example.ts"
            ),
            "utf8"
        )
    );

}


test(
    "DEV-333 preserves legacy dry-run evaluation without repository mutation",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                const result =
                    await implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "dry-run"
                    );

                assert.equal(
                    result.applied,
                    false
                );

                await assertGeneratedFileAbsent(
                    repositoryRoot
                );

            }
        );

    }
);


test(
    "DEV-333 legacy apply fails closed and requires the governed execution-package lifecycle",
    async () => {

        await withTemporaryRepository(
            async (
                repositoryRoot,
                configuration,
                manifestPath
            ) => {

                await assert.rejects(
                    implementRiverDevPlan(
                        configuration,
                        manifestPath,
                        "apply"
                    ),
                    /governed execution-package lifecycle/
                );

                await assertGeneratedFileAbsent(
                    repositoryRoot
                );

            }
        );

    }
);
