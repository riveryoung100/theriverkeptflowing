import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import type {
    SourceAsset
} from "../types";

import {
    createTransformationId
} from "../identifiers";

import type {
    ExtractionEngine
} from "../extraction/types";

import {
    createSegmentationEngine
} from "../segmentation/engine";

import {
    createClassificationEngine
} from "../classification/engine";

import {
    createDerivationEngine
} from "../derivation/engine";

import type {
    AssimilationPipeline,
    AssimilationPipelineResult
} from "./types";


export class DeterministicAssimilationPipeline
implements AssimilationPipeline {

    constructor(
        private readonly extractionEngine:
            ExtractionEngine
    ) {}


    public async assimilate(
        asset: SourceAsset
    ): Promise<AssimilationPipelineResult> {

        const extractionResult =
            await this.extractionEngine.extract(
                asset
            );

        const extraction =
            extractionResult.results[0]
                ?.extraction ??
            null;

        if (
            extractionResult.status !==
                "completed" ||
            extraction === null
        ) {

            return {
                status:
                    "failed",
                failedStage:
                    "extraction",
                asset,
                extraction:
                    null,
                segment:
                    null,
                classification:
                    null,
                transformation:
                    null,
                derivedObject:
                    null
            };

        }


        const segmentationEngine =
            createSegmentationEngine();

        const segmentationResult =
            await segmentationEngine.segmentExtraction(
                extraction
            );

        const segment =
            segmentationResult.results[0]
                ?.segment ??
            null;

        if (
            segmentationResult.status !==
                "completed" ||
            segment === null
        ) {

            return {
                status:
                    "failed",
                failedStage:
                    "segmentation",
                asset,
                extraction,
                segment:
                    null,
                classification:
                    null,
                transformation:
                    null,
                derivedObject:
                    null
            };

        }


        const classificationEngine =
            createClassificationEngine();

        const classificationResult =
            await classificationEngine.classifySegment(
                segment
            );

        const classification =
            classificationResult.results[0]
                ?.classification ??
            null;

        if (
            classificationResult.status !==
                "completed" ||
            classification === null
        ) {

            return {
                status:
                    "failed",
                failedStage:
                    "classification",
                asset,
                extraction,
                segment,
                classification:
                    null,
                transformation:
                    null,
                derivedObject:
                    null
            };

        }


        const derivationEngine =
            createDerivationEngine();


        const derivationResult =
            await derivationEngine
                .deriveClassifications(
                    {
                        assetId:
                            asset.id,
                        objectType:
                            "knowledge-entry",
                        objectId:
                            `knowledge:${classification.id}`,
                        sourceSegmentIds: [
                            segment.id
                        ],
                        sourceClassificationIds: [
                            classification.id
                        ],
                        transformationId:
                            createTransformationId(),
                        requestedAt:
                            classification.classifiedAt
                    },
                    [
                        classification
                    ]
                );

        const derivedObject =
            derivationResult.results[0]
                ?.derivative ??
            null;

        if (
            derivationResult.status !==
                "completed" ||
            derivedObject === null
        ) {

            return {
                status:
                    "failed",
                failedStage:
                    "derivation",
                asset,
                extraction,
                segment,
                classification,
                transformation:
                    null,
                derivedObject:
                    null
            };

        }


        const transformation = {
            id:
                derivedObject.transformationId,
            inputObjectIds: [
                classification.id
            ],
            outputObjectIds: [
                derivedObject.id
            ],
            transformationType:
                "normalization" as const,
            tool:
                "system" as const,
            instructions:
                "Deterministically derive the governed object reference from the validated classification.",
            confidence:
                classification.confidence,
            createdAt:
                derivedObject.createdAt,
            createdBy: {
                type:
                    "system" as const,
                id:
                    "assimilation:deterministic-derivation"
            },
            version:
                1,
            schemaVersion:
                ASSIMILATION_SCHEMA_VERSION
        };

        return {
            status:
                "completed",
            failedStage:
                null,
            asset,
            extraction,
            segment,
            classification,
            transformation,
            derivedObject
        };

    }

}


export function createAssimilationPipeline(
    extractionEngine: ExtractionEngine
): AssimilationPipeline {

    return new DeterministicAssimilationPipeline(
        extractionEngine
    );

}