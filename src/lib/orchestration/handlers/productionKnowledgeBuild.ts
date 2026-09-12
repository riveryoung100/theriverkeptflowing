import type {
    AssetId
} from "../../assimilation/types";

import {
    createProductionSourceAssimilation
} from "../../assimilation/production/engine";

import {
    createAssimilationKnowledgeExecution
} from "../../knowledge/assimilationKnowledgeExecution";

import {
    createKnowledgeEngine
} from "../../knowledge/engine";

import {
    createFilesystemKnowledgeGraphPersistence
} from "../../knowledge/persistence";

import type {
    KnowledgeGraphPersistence
} from "../../knowledge/persistence";

import type {
    KnowledgeEngineResult
} from "../../knowledge/types";

import type {
    ProductionSourceAssimilationService
} from "../../assimilation/production/types";

import type {
    WorkflowStepInput,
    WorkflowStepType
} from "../types";

import type {
    WorkflowStepHandler,
    WorkflowStepHandlerContext,
    WorkflowStepHandlerResult
} from "./types";


export const productionKnowledgeSourceAssetIdInputKey =
    "sourceAssetId";

export const productionKnowledgePersistenceKeyInputKey =
    "persistenceKey";


export interface ProductionKnowledgeBuildExecution {

    executeAndPersistFromProductionRecords(
        assetId:
            AssetId,
        persistenceKey:
            string,
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


function getStepInput(
    context: WorkflowStepHandlerContext,
    key: string
): WorkflowStepInput | undefined {

    return context.step.inputs.find(
        (input) => {
            return input.key === key;
        }
    );

}


function requireStringInput(
    context: WorkflowStepHandlerContext,
    key: string
): string {

    const input =
        getStepInput(
            context,
            key
        );

    if (
        input === undefined ||
        typeof input.value !== "string" ||
        input.value.trim().length === 0
    ) {

        throw new TypeError(
            `Knowledge workflow step requires non-empty string input "${key}".`
        );

    }

    return input.value.trim();

}


function resolveSourceAssetId(
    context: WorkflowStepHandlerContext
): AssetId {

    const explicitInput =
        getStepInput(
            context,
            productionKnowledgeSourceAssetIdInputKey
        );

    if (explicitInput !== undefined) {

        if (
            typeof explicitInput.value !== "string" ||
            explicitInput.value.trim().length === 0
        ) {

            throw new TypeError(
                `Knowledge workflow step requires non-empty string input "${productionKnowledgeSourceAssetIdInputKey}".`
            );

        }

        return explicitInput.value.trim() as AssetId;

    }

    const dependencySourceAssets =
        Object.values(context.dependencyOutputs)
            .flat()
            .filter((output) => {
                return output.key === "sourceAsset";
            })
            .map((output) => output.value)
            .filter((value): value is { readonly id: string } => {
                return (
                    typeof value === "object" &&
                    value !== null &&
                    "id" in value &&
                    typeof (value as { readonly id?: unknown }).id === "string" &&
                    (value as { readonly id: string }).id.trim().length > 0
                );
            });

    if (dependencySourceAssets.length !== 1) {

        throw new TypeError(
            `Knowledge workflow step requires input "${productionKnowledgeSourceAssetIdInputKey}" or exactly one dependency output "sourceAsset".`
        );

    }

    return dependencySourceAssets[0].id.trim() as AssetId;

}

export class ProductionKnowledgeBuildWorkflowStepHandler
implements WorkflowStepHandler {

    public readonly type:
        WorkflowStepType =
        "knowledge-build";


    public constructor(
        private readonly rawSourceRootDirectory:
            string,
        private readonly knowledgeGraphRootDirectory:
            string,
        private readonly execution?:
            ProductionKnowledgeBuildExecution
    ) {}


    public async execute(
        context: WorkflowStepHandlerContext
    ): Promise<WorkflowStepHandlerResult> {

        try {

            const sourceAssetId =
                resolveSourceAssetId(
                    context
                );

            const persistenceKey =
                requireStringInput(
                    context,
                    productionKnowledgePersistenceKeyInputKey
                );

            const assimilation =
                createProductionSourceAssimilation(
                    this.rawSourceRootDirectory
                );

            const execution =
                this.execution ??
                createAssimilationKnowledgeExecution(
                    createKnowledgeEngine()
                );

            const persistence =
                createFilesystemKnowledgeGraphPersistence({
                    rootDirectory:
                        this.knowledgeGraphRootDirectory
                });

            const result =
                await execution.executeAndPersistFromProductionRecords(
                    sourceAssetId,
                    persistenceKey,
                    assimilation,
                    persistence
                );

            return {
                status:
                    "completed",
                outputs: [
                    {
                        key:
                            "knowledgeResult",
                        value:
                            result
                    },
                    {
                        key:
                            "knowledgeGraph",
                        value:
                            result.graph
                    },
                    {
                        key:
                            "persistenceKey",
                        value:
                            persistenceKey
                    }
                ],
                warnings:
                    result.warnings
            };

        }
        catch (error) {

            return {
                status:
                    "failed",
                outputs:
                    [],
                warnings:
                    [],
                error:
                    error instanceof Error
                        ? error.message
                        : "Production knowledge-build handler failed."
            };

        }

    }

}


export function createProductionKnowledgeBuildWorkflowStepHandler(
    rawSourceRootDirectory: string,
    knowledgeGraphRootDirectory: string,
    execution?:
        ProductionKnowledgeBuildExecution
): WorkflowStepHandler {

    return new ProductionKnowledgeBuildWorkflowStepHandler(
        rawSourceRootDirectory,
        knowledgeGraphRootDirectory,
        execution
    );

}
