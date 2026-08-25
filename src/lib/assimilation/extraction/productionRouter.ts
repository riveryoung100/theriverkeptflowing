import {
    createExtractionId
} from "../identifiers";

import type {
    SourceAsset
} from "../types";

import type {
    ExtractionEngine,
    ExtractionEngineResult
} from "./types";


export interface ProductionExtractionCapability {

    readonly mimeType:
        string;

    readonly extractionEngine:
        ExtractionEngine;

}


export function normalizeMimeType(
    mimeType:
        string | undefined
): string | undefined {

    if (mimeType === undefined) {
        return undefined;
    }

    const mediaType =
        mimeType
            .split(
                ";",
                1
            )[0]
            ?.trim()
            .toLowerCase();

    if (
        mediaType === undefined ||
        mediaType.length === 0
    ) {
        return undefined;
    }

    return mediaType;

}


function createCapabilityMap(
    capabilities:
        readonly ProductionExtractionCapability[]
): ReadonlyMap<string, ExtractionEngine> {

    const capabilityMap =
        new Map<string, ExtractionEngine>();

    for (const capability of capabilities) {

        const normalizedMimeType =
            normalizeMimeType(
                capability.mimeType
            );

        if (normalizedMimeType === undefined) {
            throw new Error(
                "Production extraction capability MIME type must resolve to a canonical MIME type."
            );
        }

        if (
            capabilityMap.has(
                normalizedMimeType
            )
        ) {
            throw new Error(
                `Duplicate production extraction capability for MIME type: ${normalizedMimeType}`
            );
        }

        capabilityMap.set(
            normalizedMimeType,
            capability.extractionEngine
        );

    }

    return capabilityMap;

}


export class ProductionExtractionRouter
implements ExtractionEngine {

    private readonly capabilityMap:
        ReadonlyMap<string, ExtractionEngine>;

    constructor(
        capabilities:
            readonly ProductionExtractionCapability[]
    ) {

        this.capabilityMap =
            createCapabilityMap(
                capabilities
            );

    }

    async extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult> {

        const normalizedMimeType =
            normalizeMimeType(
                asset.mimeType
            );

        if (normalizedMimeType !== undefined) {

            const extractionEngine =
                this.capabilityMap.get(
                    normalizedMimeType
                );

            if (extractionEngine !== undefined) {

                if (
                    asset.mimeType ===
                    normalizedMimeType
                ) {

                    return extractionEngine.extract(
                        asset
                    );

                }

                return extractionEngine.extract({
                    ...asset,

                    mimeType:
                        normalizedMimeType
                });

            }

        }

        return {

            extractionId:
                createExtractionId(),

            status:
                "failed",

            results:
                []

        };

    }

}


export function createProductionExtractionRouter(
    capabilities:
        readonly ProductionExtractionCapability[]
): ExtractionEngine {

    return new ProductionExtractionRouter(
        capabilities
    );

}
