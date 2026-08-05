import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleInsightRequest,
    sampleInsightResult,
    sampleKnowledgeInsight
} from "./fixtures/sampleInsight";

import {
    validateKnowledgeInsight,
    validateKnowledgeInsightRequest,
    validateKnowledgeInsightResult
} from "./validation";


test(
    "accepts a valid insight request",
    () => {

        assert.doesNotThrow(
            () => {
                validateKnowledgeInsightRequest(
                    sampleInsightRequest
                );
            }
        );

    }
);


test(
    "accepts a valid knowledge insight",
    () => {

        assert.doesNotThrow(
            () => {
                validateKnowledgeInsight(
                    sampleKnowledgeInsight
                );
            }
        );

    }
);


test(
    "accepts a valid insight result",
    () => {

        assert.doesNotThrow(
            () => {
                validateKnowledgeInsightResult(
                    sampleInsightResult
                );
            }
        );

    }
);


test(
    "rejects an empty request title",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsightRequest({

                    ...sampleInsightRequest,

                    title:
                        "   "

                });
            },
            TypeError
        );

    }
);


test(
    "rejects an empty reasoning explanation",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsightRequest({

                    ...sampleInsightRequest,

                    reasoning: {

                        ...sampleInsightRequest.reasoning,

                        explanation:
                            "   "

                    }

                });
            },
            TypeError
        );

    }
);


test(
    "rejects invalid minimum confidence",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsightRequest({

                    ...sampleInsightRequest,

                    minimumConfidence:
                        2

                });
            },
            TypeError
        );

    }
);


test(
    "rejects invalid insight identifiers",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsight({

                    ...sampleKnowledgeInsight,

                    id:
                        "insight:invalid"

                });
            },
            TypeError
        );

    }
);


test(
    "rejects an empty insight title",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsight({

                    ...sampleKnowledgeInsight,

                    title:
                        ""

                });
            },
            TypeError
        );

    }
);


test(
    "rejects an empty insight summary",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsight({

                    ...sampleKnowledgeInsight,

                    summary:
                        "   "

                });
            },
            TypeError
        );

    }
);


test(
    "rejects insight confidence below zero",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsight({

                    ...sampleKnowledgeInsight,

                    confidence:
                        -0.01

                });
            },
            TypeError
        );

    }
);


test(
    "rejects insight confidence above one",
    () => {

        assert.throws(
            () => {
                validateKnowledgeInsight({

                    ...sampleKnowledgeInsight,

                    confidence:
                        1.01

                });
            },
            TypeError
        );

    }
);
