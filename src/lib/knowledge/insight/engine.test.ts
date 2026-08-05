import assert from "node:assert/strict";
import test from "node:test";

import {
    createKnowledgeInsightEngine
} from "./engine";

import {
    sampleInsightRequest
} from "./fixtures/sampleInsight";


test(
    "creates deterministic insight engine",
    () => {

        const engine =
            createKnowledgeInsightEngine();

        assert.ok(engine);

    }
);


test(
    "creates an insight",
    () => {

        const engine =
            createKnowledgeInsightEngine();

        const result =
            engine.create(
                sampleInsightRequest
            );

        assert.equal(
            result.insight.title,
            sampleInsightRequest.title
        );

    }
);


test(
    "preserves reasoning conclusion",
    () => {

        const engine =
            createKnowledgeInsightEngine();

        const result =
            engine.create(
                sampleInsightRequest
            );

        assert.equal(
            result.insight.conclusion,
            sampleInsightRequest
                .reasoning
                .conclusion
        );

    }
);


test(
    "preserves explanation",
    () => {

        const engine =
            createKnowledgeInsightEngine();

        const result =
            engine.create(
                sampleInsightRequest
            );

        assert.equal(
            result.insight.explanation,
            sampleInsightRequest
                .reasoning
                .explanation
        );

    }
);


test(
    "returns deterministic results",
    () => {

        const engine =
            createKnowledgeInsightEngine();

        const first =
            engine.create(
                sampleInsightRequest
            );

        const second =
            engine.create(
                sampleInsightRequest
            );

        assert.deepEqual(
            first,
            second
        );

    }
);
