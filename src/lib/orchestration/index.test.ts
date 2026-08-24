import assert from "node:assert/strict";
import {
    mkdtemp,
    rm
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    ProductionWorkflowExecution,
    createProductionWorkflowExecution
} from "./index";

import type {
    ProductionWorkflowExecutionService
} from "./index";


test(
    "exposes production workflow execution through orchestration public boundary",
    async () => {

        const rootDirectory =
            await mkdtemp(
                path.join(
                    os.tmpdir(),
                    "river-orchestration-public-boundary-"
                )
            );

        try {

            const execution =
                createProductionWorkflowExecution(
                    rootDirectory
                );

            const service:
                ProductionWorkflowExecutionService =
                execution;

            assert.ok(
                service
            );

            assert.ok(
                execution instanceof
                    ProductionWorkflowExecution
            );

            assert.equal(
                typeof execution.execute,
                "function"
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
