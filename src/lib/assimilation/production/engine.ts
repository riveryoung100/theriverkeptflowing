import {
    FileSystemSourceIngestion
} from "../ingestion/filesystem";

import type {
    FileSystemSourceIngestionRequest
} from "../ingestion/types";

import {
    createProductionAssimilationPipeline
} from "../pipeline/production";

import type {
    AssimilationPipeline
} from "../pipeline/types";

import type {
    ProductionSourceAssimilationService
} from "./types";


export class ProductionSourceAssimilation
implements ProductionSourceAssimilationService {

    private readonly ingestion:
        FileSystemSourceIngestion;

    private readonly pipeline:
        AssimilationPipeline;


    public constructor(
        rawSourceRootDirectory: string
    ) {

        this.ingestion =
            new FileSystemSourceIngestion(
                rawSourceRootDirectory
            );

        this.pipeline =
            createProductionAssimilationPipeline(
                rawSourceRootDirectory
            );

    }


    public async ingestAndAssimilate(
        request:
            FileSystemSourceIngestionRequest
    ) {

        const asset =
            await this.ingestion.ingest(
                request
            );

        return this.pipeline.assimilate(
            asset
        );

    }

}


export function createProductionSourceAssimilation(
    rawSourceRootDirectory: string
): ProductionSourceAssimilationService {

    return new ProductionSourceAssimilation(
        rawSourceRootDirectory
    );

}