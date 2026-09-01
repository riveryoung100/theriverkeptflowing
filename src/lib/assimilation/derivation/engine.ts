import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import {
    createDerivativeId
} from "../identifiers";

import type {
    AssetClassification,
    ClassificationId
} from "../types";

import type {
    ClassificationReader,
    DerivationEngine,
    DerivationEngineResult,
    DerivationRequest
} from "./types";


export interface InMemoryClassificationEntry {

    readonly classification:
        AssetClassification;

}


export class InMemoryClassificationReader
implements ClassificationReader {

    public constructor(
        private readonly entries:
            readonly InMemoryClassificationEntry[] = []
    ) {}


    public async read(
        classificationId: ClassificationId
    ): Promise<AssetClassification | null> {

        const entry =
            this.entries.find(
                candidate =>
                    candidate.classification.id ===
                    classificationId
            );

        return entry?.classification ?? null;
    }

}

export class DeterministicDerivationEngine
implements DerivationEngine {

    public constructor(
        private readonly classificationReader:
            ClassificationReader =
                new InMemoryClassificationReader()
    ) {}

    public async deriveClassifications(
        request: DerivationRequest,
        classifications:
            readonly AssetClassification[]
    ): Promise<DerivationEngineResult> {

        for (
            const classificationId of
            request.sourceClassificationIds
        ) {

            const classification =
                classifications.find(
                    candidate =>
                        candidate.id ===
                        classificationId
                ) ?? null;

            if (
                classification === null ||
                classification.assetId !==
                    request.assetId
            ) {

                const derivationId =
                    createDerivativeId();

                return {

                    derivationId,

                    assetId:
                        request.assetId,

                    status:
                        "failed",

                    reviewStatus:
                        "not-required",

                    results:
                        [],

                    warnings: [
                        "Source classification could not be resolved for derivation."
                    ]

                };
            }
        }

        const derivativeId =
            createDerivativeId();

        return {

            derivationId:
                derivativeId,

            assetId:
                request.assetId,

            status:
                "completed",

            reviewStatus:
                "not-required",

            results: [

                {

                    derivative: {

                        id:
                            derivativeId,

                        assetId:
                            request.assetId,

                        objectType:
                            request.objectType,

                        objectId:
                            request.objectId,

                        sourceSegmentIds:
                            request.sourceSegmentIds,

                sourceClassificationIds:
                    request.sourceClassificationIds,

                        transformationId:
                            request.transformationId,

                        reviewStatus:
                            "not-required",

                        createdAt:
                            request.requestedAt,

                        version:
                            1,

                        schemaVersion:
                            ASSIMILATION_SCHEMA_VERSION

                    },

                    status:
                        "completed"

                }

            ],

            warnings:
                request.sourceClassificationIds.length > 0
                    ? [
                        "Classification references are preserved directly on DerivedObjectReference."
                    ]
                    : []

        };

    }

    public async derive(
        request: DerivationRequest
    ): Promise<DerivationEngineResult> {

        for (
            const classificationId of
            request.sourceClassificationIds
        ) {

            const classification =
                await this.classificationReader.read(
                    classificationId
                );

            if (
                classification === null ||
                classification.assetId !==
                    request.assetId
            ) {

                const derivationId =
                    createDerivativeId();

                return {

                    derivationId,

                    assetId:
                        request.assetId,

                    status:
                        "failed",

                    reviewStatus:
                        "not-required",

                    results:
                        [],

                    warnings: [
                        "Source classification could not be resolved for derivation."
                    ]

                };
            }
        }

        const derivativeId =
            createDerivativeId();

        return {

            derivationId:
                derivativeId,

            assetId:
                request.assetId,

            status:
                "completed",

            reviewStatus:
                "not-required",

            results: [

                {

                    derivative: {

                        id:
                            derivativeId,

                        assetId:
                            request.assetId,

                        objectType:
                            request.objectType,

                        objectId:
                            request.objectId,

                        sourceSegmentIds:
                            request.sourceSegmentIds,

                sourceClassificationIds:
                    request.sourceClassificationIds,

                        transformationId:
                            request.transformationId,

                        reviewStatus:
                            "not-required",

                        createdAt:
                            request.requestedAt,

                        version:
                            1,

                        schemaVersion:
                            ASSIMILATION_SCHEMA_VERSION

                    },

                    status:
                        "completed"

                }

            ],

            warnings:
                request.sourceClassificationIds.length > 0
                    ? [
                        "Classification references are preserved directly on DerivedObjectReference."
                    ]
                    : []

        };

    }

}


export function createDerivationEngine(
    classificationReader:
        ClassificationReader =
            new InMemoryClassificationReader()
): DerivationEngine {

    return new
        DeterministicDerivationEngine(
            classificationReader
        );

}
