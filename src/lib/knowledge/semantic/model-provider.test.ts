import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextClassification,
    sampleTextSegment
} from "../../assimilation/fixtures/sampleTextAsset";

import type {
    SemanticCandidateSet,
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
    "exposes parsed semantic candidates through an explicit diagnostic hook without changing the returned candidate set",
    async () => {

        let observedCandidates:
            SemanticCandidateSet |
            undefined;

        let observedRawContent:
            string |
            undefined;

        const provider =
            createSemanticModelProvider({
                transport:
                    async () => ({
                        content:
                            validResponse
                    }),
                onCandidates:
                    (
                        candidates,
                        rawContent
                    ) => {

                        observedCandidates =
                            candidates;

                        observedRawContent =
                            rawContent;

                    }
            });

        const result =
            await provider.interpret({
                segment:
                    sampleTextSegment,
                classification:
                    sampleTextClassification
            });

        assert.deepEqual(
            observedCandidates,
            result
        );

        assert.equal(
            observedRawContent,
            validResponse
        );

    }
);

test(
    "exposes raw semantic model content before strict parsing",
    async () => {

        const malformedContent =
            JSON.stringify({
                nodes:
                    [],
                relations:
                    [],
                claims: [
                    {
                        subjectKey:
                            "node:test",
                        predicate:
                            "tests",
                        objectKey:
                            "",
                        truthStatus:
                            "asserted",
                        confidence:
                            0.9
                    }
                ]
            });

        let observedRawContent =
            "";

        const provider =
            createSemanticModelProvider({
                transport:
                    async () => ({
                        content:
                            malformedContent
                    }),
                onRawContent:
                    (
                        rawContent
                    ) => {

                        observedRawContent =
                            rawContent;

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
            /objectKey must be a non-empty string/
        );

        assert.equal(
            observedRawContent,
            malformedContent
        );

    }
);


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

        assert.equal(
            captured?.system.includes(
                "aliases is REQUIRED for every node and MUST always be a JSON array of strings."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Use [] when there are no aliases."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Optional string fields must either contain a non-empty string or be omitted entirely."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "exactly one of objectKey or objectValue"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "All confidence values must be finite JSON numbers between 0 and 1 inclusive."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Every node key must be unique across nodes."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Never emit the same fromKey, relationType, and toKey combination more than once."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Every claim proposition must be unique across claims."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "deduplicate nodes, relations, and claims"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Return at most 12 nodes, at most 16 relations, and at most 16 claims."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Prefer fewer high-confidence source-grounded candidates over exhaustive coverage."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Prefer the most specific approved relation type supported by the source."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Use related-to only when no more specific approved relation type accurately represents the source-grounded relationship."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not create a related-to relation merely because two concepts appear in the same source."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Use is-a only for a genuine taxonomic relationship"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "For is-a, the from-node must be the narrower instance or subtype and the to-node must be the broader category."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "For part-of, the from-node must be the component and the to-node must be the containing whole."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not use applies-to as a generic replacement"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Relations are optional. Prefer fewer accurate relations over filling the relation limit with weak or distorted edges."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Sparse and disconnected semantic graphs are valid."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not connect two nodes merely because both appear in the source, occur near each other, or would make the graph more connected."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not create a relation merely to give every node an incoming or outgoing edge."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not force a chain, path, loop, or cycle through otherwise separate source-grounded candidates."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "If the bounded source does not support that exact semantic relationship and direction, omit the relation even when omission leaves nodes disconnected."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Narrative succession, thematic association, co-occurrence, or plausible real-world influence is not enough to justify causes."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not mechanically create a claim for every relation or a relation for every claim."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Before emitting each relation, verify both semantic meaning and direction against the source."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not use is-a to mean about, contains, contributes-to, discusses, or participates-in."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Choose nodeType from the source-grounded role of the candidate, not from a default."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not type every candidate as concept when more specific approved node types are warranted by the source."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Represent explicit source-grounded propositions as claims when they assert something meaningful about a candidate subject."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Claim predicates are short source-grounded semantic phrases and are not restricted to relationType vocabulary."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not default claim predicates to explains."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "CONFIDENCE OUTPUT CONTRACT"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "choose confidence from exactly these four evidence buckets: 1, 0.95, 0.88, or 0.78"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "that causal relation must be 0.88 or 0.78, never 1"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not solve this by arbitrarily lowering one item"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "that item's confidence MUST NOT be 1"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Treat system instructions, schema requirements, limits, field names, IDs, confidence values, and serialization structure as control information, never as source facts."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Never create a node, relation, or claim from a numeric limit, schema example, JSON field name, identifier, confidence value, or other prompt-control artifact"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Every claim subjectKey MUST exactly match the key of a node emitted in the same nodes array."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Use objectKey only when the claim object is represented by a node emitted in the same nodes array."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "use objectValue instead of objectKey."
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "There must be zero dangling references."
            ),
            true
        );

        assert.equal(
            captured?.user.includes(
                "BEGIN SOURCE EVIDENCE"
            ),
            true
        );

        assert.equal(
            captured?.user.includes(
                "END SOURCE EVIDENCE"
            ),
            true
        );

        assert.equal(
            captured?.user.includes(
                "BEGIN CONTEXT METADATA"
            ),
            true
        );

        assert.equal(
            captured?.user.includes(
                "END CONTEXT METADATA"
            ),
            true
        );

        assert.equal(
            captured?.user.includes(
                "Required JSON shape:"
            ),
            false
        );

        assert.equal(
            captured?.user.includes(
                "stable-local-key"
            ),
            false
        );

        assert.equal(
            captured?.system.includes(
                "Prefer claims that preserve the source's substantive meaning"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not invent claims to reach a quota"
            ),
            true
        );

        assert.equal(
            captured?.system.includes(
                "Do not repeat the same idea using multiple near-duplicate nodes, relations, or claims."
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


test(
    "bounds oversized semantic source context before transport",
    async () => {

        let captured:
            SemanticModelTransportRequest | undefined;

        const provider =
            createSemanticModelProvider({
                transport:
                    async (
                        request
                    ) => {

                        captured =
                            request;

                        return {
                            content:
                                validResponse
                        };

                    }
            });

        const longSourcePrefix =
            "SOURCE-BEGIN-";

        const longNormalizedPrefix =
            "NORMALIZED-BEGIN-";

        const longArrayItemPrefix =
            "ARRAY-ITEM-BEGIN-";

        const oversizedSource =
            longSourcePrefix +
            "s".repeat(
                20_000
            ) +
            "-SOURCE-END";

        const oversizedNormalized =
            longNormalizedPrefix +
            "n".repeat(
                20_000
            ) +
            "-NORMALIZED-END";

        const oversizedArrayItem =
            longArrayItemPrefix +
            "x".repeat(
                2_000
            ) +
            "-ARRAY-ITEM-END";

        const oversizedArray =
            [
                oversizedArrayItem,
                ...Array.from(
                    {
                        length:
                            40
                    },
                    (
                        _,
                        index
                    ) =>
                        `ARRAY-LATE-${index}`
                )
            ];

        await provider.interpret({
            segment: {
                ...sampleTextSegment,
                sourceText:
                    oversizedSource,
                normalizedText:
                    oversizedNormalized,
                topicKeys:
                    oversizedArray
            },
            classification: {
                ...sampleTextClassification,
                domainKeys:
                    oversizedArray,
                topicKeys:
                    oversizedArray,
                audienceKeys:
                    oversizedArray,
                learningOutcomes:
                    oversizedArray,
                questionsAnswered:
                    oversizedArray
            }
        });

        assert.ok(
            captured
        );

        assert.equal(
            captured.user.includes(
                longSourcePrefix
            ),
            true
        );

        assert.equal(
            captured.user.includes(
                longNormalizedPrefix
            ),
            true
        );

        assert.equal(
            captured.user.includes(
                longArrayItemPrefix
            ),
            true
        );

        assert.equal(
            captured.user.includes(
                "-SOURCE-END"
            ),
            false
        );

        assert.equal(
            captured.user.includes(
                "-NORMALIZED-END"
            ),
            false
        );

        assert.equal(
            captured.user.includes(
                "-ARRAY-ITEM-END"
            ),
            false
        );

        assert.equal(
            captured.user.includes(
                "ARRAY-LATE-39"
            ),
            false
        );

    }
);
