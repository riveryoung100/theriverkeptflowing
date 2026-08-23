import {
    createProductionExtractionEngine
} from "../extraction/production";

import {
    createAssimilationPipeline
} from "./engine";

import type {
    AssimilationPipeline
} from "./types";


export function createProductionAssimilationPipeline(
    rawSourceRootDirectory: string
): AssimilationPipeline {

    return createAssimilationPipeline(
        createProductionExtractionEngine(
            rawSourceRootDirectory
        )
    );

}