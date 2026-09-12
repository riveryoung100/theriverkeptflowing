import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextClassification,
    sampleTextSegment
} from "../../assimilation/fixtures/sampleTextAsset";

import type {
    SemanticModelTransportRequest
} from "./model-provider";

import {
    createSemanticModelProvider,
    parseSemanticCandidateSet
} from "./model-provider";


const validResponse =
    JSON.stringify({
        nodes: [
            {
                key:
                    "source-provenance",
                nodeType:
                    "principle",
                canonicalName:
                    "Source provenance",
                aliases:
                    [],
                confidence:
                    1
            },
            {
                key:
                    "derived-knowledge",
                nodeType:
                    "concept",
                canonicalName:
                    "Derived knowledge",
                aliases:
                    [],
                confidence:
                    1
            }
        ],
        relations: [
            {
                fromKey:
                    "derived-knowledge",
                toKey:
                    "source-provenance",
                relationType:
                    "depends-on",
                confidence:
                    0.95
            }
        ],
        claims: [
            {
                subjectKey:
                    "derived-knowledge",
                predicate:
                    "must-remain-separate-from",
                objectValue:
                    "raw source assets",
                truthStatus:
                    "asserted",
                confidence:
                    1
            }
        ]
    });


test(
    "parses strict semantic candidate JSON",
    () => {

        const result =
            parseSemanticCandidateSet(
                validResponse
            );

        assert.equal(
            result.nodes.length,
            2
        );

        assert.equal(
            result.relations[0]?.relationType,
            "depends-on"
        );

        assert.equal(
            result.claims[0]?.truthStatus,
            "asserted"
        );

    }
);


test(
    "fails closed on empty or malformed semantic model content",
    () => {

        assert.throws(
            () =>
                parseSemanticCandidateSet(
                    ""
                ),
            /empty candidate content/
        );

        assert.throws(
            () =>
                parseSemanticCandidateSet(
                    "{not-json"
                ),
            /malformed JSON/
        );

    }
);


test(
    "fails closed on unapproved semantic vocabulary",
    () => {

        const parsed =
            JSON.parse(
                validResponse
            );

        parsed.nodes[0].nodeType =
            "invented-type";

        assert.throws(
            () =>
                parseSemanticCandidateSet(
                    JSON.stringify(
                        parsed
                    )
                ),
            /approved KnowledgeNodeType/
        );

    }
);


test(
    "fails closed on malformed candidate structure",
    () => {

        assert.throws(
            () =>
                parseSemanticCandidateSet(
                    JSON.stringify({
                        nodes:
                            {},
                        relations:
                            [],
                        claims:
                            []
                    })
                ),
            /nodes must be an array/
        );

    }
);


test(
    "calls only the injected transport with bounded source context",
    async () => {

        let calls =
            0;

        let captured:
            SemanticModelTransportRequest | undefined;

        const provider =
            createSemanticModelProvider({
                transport:
                    async (
                        request
                    ) => {

                        calls +=
                            1;

                        captured =
                            request;

                        return {
                            content:
                                validResponse
                        };

                    }
            });

        const result =
            await provider.interpret({
                segment:
                    sampleTextSegment,
                classification:
                    sampleTextClassification
            });

        assert.equal(
            calls,
            1
        );

        assert.equal(
            result.nodes.length,
            2
        );

        assert.equal(
            captured?.user.includes(
                sampleTextSegment.normalizedText ??
                ""
            ),
            true
        );

        assert.equal(
            captured?.user.includes(
                sampleTextClassification.learningOutcomes[0] ??
                ""
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Return candidate knowledge only"
            ),
            true
        );

    }
);


test(
    "propagates injected transport failure without fallback or retry",
    async () => {

        let calls =
            0;

        const failure =
            new Error(
                "transport failed"
            );

        const provider =
            createSemanticModelProvider({
                transport:
                    async () => {

                        calls +=
                            1;

                        throw failure;

                    }
            });

        await assert.rejects(
            () =>
                provider.interpret({
                    segment:
                        sampleTextSegment,
                    classification:
                        sampleTextClassification
                }),
            (error: unknown) =>
                error ===
                failure
        );

        assert.equal(
            calls,
            1
        );

    }
);

test(
    "rejects unexpected top-level semantic model fields",
    () => {

        assert.throws(
            () =>
                parseSemanticCandidateSet(
                    JSON.stringify({
                        nodes:
                            [],
                        relations:
                            [],
                        claims:
                            [],
                        action:
                            "publish"
                    })
                ),
            /unexpected field: action/
        );

    }
);


test(
    "rejects unexpected semantic candidate record fields",
    () => {

        const cases = [
            {
                mutate:
                    (
                        parsed:
                            ReturnType<typeof JSON.parse>
                    ) => {

                        parsed.nodes[0].action =
                            "publish";

                    },
                expected:
                    /nodes\[0\] contains unexpected field: action/
            },
            {
                mutate:
                    (
                        parsed:
                            ReturnType<typeof JSON.parse>
                    ) => {

                        parsed.relations[0].tool =
                            "send-email";

                    },
                expected:
                    /relations\[0\] contains unexpected field: tool/
            },
            {
                mutate:
                    (
                        parsed:
                            ReturnType<typeof JSON.parse>
                    ) => {

                        parsed.claims[0].authority =
                            "execute";

                    },
                expected:
                    /claims\[0\] contains unexpected field: authority/
            }
        ];

        for (
            const item of
            cases
        ) {

            const parsed =
                JSON.parse(
                    validResponse
                );

            item.mutate(
                parsed
            );

            assert.throws(
                () =>
                    parseSemanticCandidateSet(
                        JSON.stringify(
                            parsed
                        )
                    ),
                item.expected
            );

        }

    }
);
