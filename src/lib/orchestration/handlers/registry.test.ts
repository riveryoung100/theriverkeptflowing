import assert from "node:assert/strict";
import test from "node:test";

import {
    createWorkflowStepHandlerRegistry
} from "./registry";

import {
    sampleAssimilationHandler,
    sampleCustomHandler,
    sampleKnowledgeBuildHandler
} from "./fixtures/sampleHandlers";


test(
    "creates an empty handler registry",
    () => {

        const registry =
            createWorkflowStepHandlerRegistry();

        assert.deepEqual(
            registry.list(),
            []
        );

    }
);


test(
    "registers and retrieves handlers",
    () => {

        const registry =
            createWorkflowStepHandlerRegistry();

        registry.register(
            sampleAssimilationHandler
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
            ),
            sampleAssimilationHandler
        );

    }
);


test(
    "rejects duplicate handler registration",
    () => {

        const registry =
            createWorkflowStepHandlerRegistry();

        registry.register(
            sampleAssimilationHandler
        );

        assert.throws(
            () => {
                registry.register(
                    sampleAssimilationHandler
                );
            },
            TypeError
        );

    }
);


test(
    "rejects missing handler lookup",
    () => {

        const registry =
            createWorkflowStepHandlerRegistry();

        assert.throws(
            () => {
                registry.get(
                    "knowledge-query"
                );
            },
            TypeError
        );

    }
);


test(
    "lists handler types deterministically",
    () => {

        const registry =
            createWorkflowStepHandlerRegistry();

        registry.register(
            sampleCustomHandler
        );

        registry.register(
            sampleKnowledgeBuildHandler
        );

        registry.register(
            sampleAssimilationHandler
        );

        assert.deepEqual(
            registry.list(),
            [
                "assimilation",
                "custom",
                "knowledge-build"
            ]
        );

    }
);
