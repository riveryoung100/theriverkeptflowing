import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import {
    createDerivativeId
} from "../identifiers";

import type {
    DerivationEngine,
    DerivationEngineResult,
    DerivationRequest
} from "./types";


export class DeterministicDerivationEngine
implements DerivationEngine {

    derive(
        request: DerivationRequest
    ): DerivationEngineResult {

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
                        "Classification references are preserved by the derivation request but are not yet represented directly on DerivedObjectReference."
                    ]
                    : []

        };

    }

}


export function createDerivationEngine():
DerivationEngine {

    return new
        DeterministicDerivationEngine();

}
