import type {
    AssetId,
    DerivedObjectReference,
    SourceAsset
} from "../../assimilation/types";

import type {
    ProductionSourceAssimilationService
} from "../../assimilation/production/types";

import {
    createKnowledgeEngine
} from "../engine";

import type {
    KnowledgeGraphPersistence
} from "../persistence";

import type {
    KnowledgeEngine,
    KnowledgeEngineResult
} from "../types";

import {
    createKnowledgeRequestFromSemanticCandidates
} from "./mapper";

import type {
    SemanticInterpretationProvider,
    SemanticInterpretationRequest
} from "./types";


export interface SemanticKnowledgeExecutionInput {

    readonly asset:
        SourceAsset;

    readonly derivedObject:
        DerivedObjectReference;

    readonly interpretation:
        SemanticInterpretationRequest;

}


export interface SemanticKnowledgeExecution {

    execute(
        input: SemanticKnowledgeExecutionInput
    ): Promise<KnowledgeEngineResult>;

    executeFromProductionRecords(
        assetId: AssetId,
        assimilation:
            Pick<
                ProductionSourceAssimilationService,
                "retrieveGeneratedRecords"
            >
    ): Promise<KnowledgeEngineResult>;

    executeAndPersistFromProductionRecords(
        assetId: AssetId,
        persistenceKey: string,
        assimilation:
            Pick<
                ProductionSourceAssimilationService,
                "retrieveGeneratedRecords"
            >,
        persistence:
            Pick<
                KnowledgeGraphPersistence,
                "persist"
            >
    ): Promise<KnowledgeEngineResult>;

}


export function createSemanticKnowledgeExecution(
    provider: SemanticInterpretationProvider,
    knowledgeEngine: KnowledgeEngine =
        createKnowledgeEngine()
): SemanticKnowledgeExecution {

    async function execute(
        input: SemanticKnowledgeExecutionInput
    ): Promise<KnowledgeEngineResult> {

        const candidates =
            await provider.interpret(
                input.interpretation
            );

        const request =
            createKnowledgeRequestFromSemanticCandidates({
                asset:
                    input.asset,
                derivedObject:
                    input.derivedObject,
                interpretation:
                    input.interpretation,
                candidates
            });

        return knowledgeEngine.build(
            request
        );

    }

    return {

        execute,

        async executeFromProductionRecords(
            assetId,
            assimilation
        ): Promise<KnowledgeEngineResult> {

            const records =
                await assimilation.retrieveGeneratedRecords(
                    assetId
                );

            return execute({
                asset:
                    records.asset,
                derivedObject:
                    records.derivedObject,
                interpretation: {
                    segment:
                        records.segment,
                    classification:
                        records.classification
                }
            });

        },

        async executeAndPersistFromProductionRecords(
            assetId,
            persistenceKey,
            assimilation,
            persistence
        ): Promise<KnowledgeEngineResult> {

            const result =
                await this.executeFromProductionRecords(
                    assetId,
                    assimilation
                );

            await persistence.persist(
                persistenceKey,
                result.graph
            );

            return result;

        }

    };

}