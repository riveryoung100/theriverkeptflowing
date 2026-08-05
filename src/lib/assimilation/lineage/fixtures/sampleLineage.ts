import {
    sampleTextAsset,
    sampleTextExtraction,
    sampleTextSegment,
    sampleTextClassification,
    sampleTextTransformation
} from "../../fixtures/sampleTextAsset";

import type {
    LineageGraph
} from "../types";

export const sampleLineageGraph:
LineageGraph = {

    nodes: [

        {
            id:
                sampleTextAsset.id,

            type:
                "asset"
        },

        {
            id:
                sampleTextExtraction.id,

            type:
                "extraction"
        },

        {
            id:
                sampleTextSegment.id,

            type:
                "segment"
        },

        {
            id:
                sampleTextClassification.id,

            type:
                "classification"
        },

        {
            id:
                sampleTextTransformation.id,

            type:
                "transformation"
        }

    ],

    edges: [

        {
            from:
                sampleTextAsset.id,

            to:
                sampleTextExtraction.id,

            relationship:
                "extracted-from"
        },

        {
            from:
                sampleTextExtraction.id,

            to:
                sampleTextSegment.id,

            relationship:
                "segmented-from"
        },

        {
            from:
                sampleTextSegment.id,

            to:
                sampleTextClassification.id,

            relationship:
                "classified-from"
        },

        {
            from:
                sampleTextTransformation.id,

            to:
                sampleTextClassification.id,

            relationship:
                "produced"
        }

    ]

};
