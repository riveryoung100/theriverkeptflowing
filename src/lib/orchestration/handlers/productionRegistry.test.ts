import assert from "node:assert/strict";

import {
    mkdtemp,
    rm
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    createProductionWorkflowStepHandlerRegistry
} from "./productionRegistry";


test(
    "creates a production workflow registry with the assimilation handler",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-workflow-registry-"
                )
            );

        try {

            const registry =
                createProductionWorkflowStepHandlerRegistry(
                    rootDirectory,
                    rootDirectory
                );

            assert.equal(
                registry.has(
                    "assimilation"
                ),
                true
            );

            assert.equal(
                registry.get(
                    "assimilation"
                ).type,
                "assimilation"
            );

            assert.deepEqual(
                registry.list(),
                [
    "assimilation",
    "knowledge-build",
    "knowledge-insight",
    "knowledge-query",
    "knowledge-reasoning"
]
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
    "creates independent deterministic production registries",
    async () => {

        const firstRootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-workflow-registry-first-"
                )
            );

        const secondRootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-production-workflow-registry-second-"
                )
            );

        try {

            const firstRegistry =
                createProductionWorkflowStepHandlerRegistry(
                    firstRootDirectory,
                    firstRootDirectory
                );

            const secondRegistry =
                createProductionWorkflowStepHandlerRegistry(
                    secondRootDirectory,
                    secondRootDirectory
                );

            assert.notEqual(
                firstRegistry,
                secondRegistry
            );

            assert.notEqual(
                firstRegistry.get(
                    "assimilation"
                ),
                secondRegistry.get(
                    "assimilation"
                )
            );

            assert.deepEqual(
                firstRegistry.list(),
                secondRegistry.list()
            );

            assert.deepEqual(
                firstRegistry.list(),
                [
    "assimilation",
    "knowledge-build",
    "knowledge-insight",
    "knowledge-query",
    "knowledge-reasoning"
]
            );

        }
        finally {

            await rm(
                firstRootDirectory,
                {
                    recursive:
                        true,
                    force:
                        true
                }
            );

            await rm(
                secondRootDirectory,
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