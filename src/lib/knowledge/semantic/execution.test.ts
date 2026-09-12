import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextAsset,
    sampleTextClassification,
    sampleTextExtraction,
    sampleTextSegment,
    sampleTextTransformation
} from "../../assimilation/fixtures/sampleTextAsset";

import {
    sampleDerivationResult
} from "../../assimilation/derivation/fixtures/sampleDerivation";

import type {
    KnowledgeEngine,
    KnowledgeEngineRequest,
    KnowledgeEngineResult
} from "../types";

import {
    createKnowledgeEngine
} from "../engine";

import type {
    SemanticCandidateSet,
    SemanticInterpretationProvider,
    SemanticInterpretationRequest
} from "./types";

import {
    createSemanticKnowledgeExecution
} from "./execution";


const candidates:
SemanticCandidateSet = {

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

};


function createInput() {

    return {

        asset:
            sampleTextAsset,

        derivedObject:
            sampleDerivationResult.results[0]!.derivative,

        interpretation: {
            segment:
                sampleTextSegment,
            classification:
                sampleTextClassification
        }

    };

}


function createProductionRecords() {

    return {
        asset:
            sampleTextAsset,
        extraction:
            sampleTextExtraction,
        segment:
            sampleTextSegment,
        classification:
            sampleTextClassification,
        transformation:
            sampleTextTransformation,
        derivedObject:
            sampleDerivationResult.results[0]!.derivative
    };

}


test(
    "executes one semantic provider result through the authoritative knowledge engine",
    async () => {

        let providerCalls =
            0;

        let capturedRequest:
            SemanticInterpretationRequest | undefined;

        const provider:
        SemanticInterpretationProvider = {

            async interpret(
                request
            ) {

                providerCalls +=
                    1;

                capturedRequest =
                    request;

                return candidates;

            }

        };

        const result =
            await createSemanticKnowledgeExecution(
                provider
            ).execute(
                createInput()
            );

        assert.equal(
            providerCalls,
            1
        );

        assert.deepEqual(
            capturedRequest,
            createInput().interpretation
        );

        assert.equal(
            result.graph.nodes.length,
            2
        );

        assert.equal(
            result.graph.relations.length,
            1
        );

        assert.equal(
            result.graph.claims.length,
            1
        );

    }
);


test(
    "passes the mapped semantic request to an injected knowledge engine exactly once",
    async () => {

        let buildCalls =
            0;

        let capturedRequest:
            KnowledgeEngineRequest | undefined;

        const expectedResult:
        KnowledgeEngineResult = {

            graph: {
                nodes:
                    [],
                relations:
                    [],
                claims:
                    [],
                revisions:
                    []
            },

            createdNodeIds:
                [],

            createdRelationIds:
                [],

            createdClaimIds:
                [],

            warnings:
                []

        };

        const knowledgeEngine:
        KnowledgeEngine = {

            build(
                request
            ) {

                buildCalls +=
                    1;

                capturedRequest =
                    request;

                return expectedResult;

            }

        };

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                return candidates;

            }

        };

        const result =
            await createSemanticKnowledgeExecution(
                provider,
                knowledgeEngine
            ).execute(
                createInput()
            );

        assert.equal(
            buildCalls,
            1
        );

        assert.equal(
            capturedRequest?.nodes.length,
            2
        );

        assert.equal(
            capturedRequest?.relations.length,
            1
        );

        assert.equal(
            capturedRequest?.claims.length,
            1
        );

        assert.equal(
            result,
            expectedResult
        );

    }
);


test(
    "fails closed on invalid semantic provider output before knowledge execution",
    async () => {

        let knowledgeCalls =
            0;

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                return {
                    nodes:
                        candidates.nodes,
                    relations: [
                        {
                            fromKey:
                                "missing-node",
                            toKey:
                                "source-provenance",
                            relationType:
                                "related-to",
                            confidence:
                                1
                        }
                    ],
                    claims:
                        []
                };

            }

        };

        const knowledgeEngine:
        KnowledgeEngine = {

            build() {

                knowledgeCalls +=
                    1;

                return createKnowledgeEngine()
                    .build({
                        nodes:
                            [],
                        relations:
                            [],
                        claims:
                            [],
                        revisions:
                            []
                    });

            }

        };

        await assert.rejects(
            () =>
                createSemanticKnowledgeExecution(
                    provider,
                    knowledgeEngine
                ).execute(
                    createInput()
                ),
            /Cannot map invalid semantic candidates/
        );

        assert.equal(
            knowledgeCalls,
            0
        );

    }
);


test(
    "propagates semantic provider failure without invoking knowledge",
    async () => {

        let knowledgeCalls =
            0;

        const providerFailure =
            new Error(
                "semantic provider failed"
            );

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                throw providerFailure;

            }

        };

        const knowledgeEngine:
        KnowledgeEngine = {

            build() {

                knowledgeCalls +=
                    1;

                throw new Error(
                    "knowledge must not execute"
                );

            }

        };

        await assert.rejects(
            () =>
                createSemanticKnowledgeExecution(
                    provider,
                    knowledgeEngine
                ).execute(
                    createInput()
                ),
            (error: unknown) =>
                error ===
                providerFailure
        );

        assert.equal(
            knowledgeCalls,
            0
        );

    }
);


test(
    "is deterministic for equivalent provider output and source context",
    async () => {

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                return candidates;

            }

        };

        const execution =
            createSemanticKnowledgeExecution(
                provider
            );

        const first =
            await execution.execute(
                createInput()
            );

        const second =
            await execution.execute(
                createInput()
            );

        assert.deepEqual(
            second,
            first
        );

    }
);


test(
    "retrieves authoritative production records before semantic interpretation",
    async () => {

        let retrievalCalls =
            0;

        let providerCalls =
            0;

        const assimilation = {

            async retrieveGeneratedRecords(
                assetId: typeof sampleTextAsset.id
            ) {

                retrievalCalls +=
                    1;

                assert.equal(
                    assetId,
                    sampleTextAsset.id
                );

                return createProductionRecords();

            }

        };

        const provider:
        SemanticInterpretationProvider = {

            async interpret(
                request
            ) {

                providerCalls +=
                    1;

                assert.equal(
                    request.segment.id,
                    sampleTextSegment.id
                );

                assert.equal(
                    request.classification.id,
                    sampleTextClassification.id
                );

                return candidates;

            }

        };

        const result =
            await createSemanticKnowledgeExecution(
                provider
            ).executeFromProductionRecords(
                sampleTextAsset.id,
                assimilation
            );

        assert.equal(
            retrievalCalls,
            1
        );

        assert.equal(
            providerCalls,
            1
        );

        assert.equal(
            result.graph.nodes.length,
            2
        );

        assert.equal(
            result.graph.claims.length,
            1
        );

    }
);


test(
    "propagates authoritative production retrieval failure before semantic interpretation",
    async () => {

        let providerCalls =
            0;

        const retrievalFailure =
            new Error(
                "authoritative retrieval failed"
            );

        const assimilation = {

            async retrieveGeneratedRecords() {

                throw retrievalFailure;

            }

        };

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                providerCalls +=
                    1;

                return candidates;

            }

        };

        await assert.rejects(
            () =>
                createSemanticKnowledgeExecution(
                    provider
                ).executeFromProductionRecords(
                    sampleTextAsset.id,
                    assimilation
                ),
            (error: unknown) =>
                error ===
                retrievalFailure
        );

        assert.equal(
            providerCalls,
            0
        );

    }
);


test(
    "persists successful semantic production knowledge under the exact caller-supplied key",
    async () => {

        let retrievalCalls =
            0;

        let persistenceCalls =
            0;

        let capturedKey:
            string | undefined;

        let capturedGraph:
            KnowledgeEngineResult["graph"] | undefined;

        const assimilation = {

            async retrieveGeneratedRecords() {

                retrievalCalls +=
                    1;

                return createProductionRecords();

            }

        };

        const persistence = {

            async persist(
                key: string,
                graph: KnowledgeEngineResult["graph"]
            ) {

                persistenceCalls +=
                    1;

                capturedKey =
                    key;

                capturedGraph =
                    graph;

            }

        };

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                return candidates;

            }

        };

        const result =
            await createSemanticKnowledgeExecution(
                provider
            ).executeAndPersistFromProductionRecords(
                sampleTextAsset.id,
                "semantic-production-test",
                assimilation,
                persistence
            );

        assert.equal(
            retrievalCalls,
            1
        );

        assert.equal(
            persistenceCalls,
            1
        );

        assert.equal(
            capturedKey,
            "semantic-production-test"
        );

        assert.deepEqual(
            capturedGraph,
            result.graph
        );

    }
);


test(
    "does not persist when semantic interpretation fails",
    async () => {

        let persistenceCalls =
            0;

        const providerFailure =
            new Error(
                "semantic provider failed"
            );

        const assimilation = {

            async retrieveGeneratedRecords() {

                return createProductionRecords();

            }

        };

        const persistence = {

            async persist() {

                persistenceCalls +=
                    1;

            }

        };

        const provider:
        SemanticInterpretationProvider = {

            async interpret() {

                throw providerFailure;

            }

        };

        await assert.rejects(
            () =>
                createSemanticKnowledgeExecution(
                    provider
                ).executeAndPersistFromProductionRecords(
                    sampleTextAsset.id,
                    "semantic-production-test",
                    assimilation,
                    persistence
                ),
            (error: unknown) =>
                error ===
                providerFailure
        );

        assert.equal(
            persistenceCalls,
            0
        );

    }
);

test(
    "persists successfully when the production persistence method is detached",
    async () => {

        const provider = {
            async interpret() {
                return candidates;
            }
        };

        const execution =
            createSemanticKnowledgeExecution(
                provider
            );

        const detached =
            execution.executeAndPersistFromProductionRecords;

        const persistenceKeys:
            string[] = [];

        const result =
            await detached(
                sampleTextAsset.id,
                "detached-semantic-knowledge",
                {
                    async retrieveGeneratedRecords() {
                        return createProductionRecords();
                    }
                },
                {
                    async persist(
                        key
                    ) {
                        persistenceKeys.push(
                            key
                        );
                    }
                }
            );

        assert.equal(
            result.graph.nodes.length >
                0,
            true
        );

        assert.deepEqual(
            persistenceKeys,
            [
                "detached-semantic-knowledge"
            ]
        );

    }
);
