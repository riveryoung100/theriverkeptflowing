import {
    FileSystemSourceIngestion
} from "../ingestion/filesystem";

import type {
    FileSystemSourceIngestionRequest
} from "../ingestion/types";

import {
    createProductionAssimilationPipeline
} from "../pipeline/production";

import {
    createFileSystemAssimilationGeneratedRecordPersistence
} from "../persistence";

import type {
    AssimilationGeneratedRecordPersistence,
    AssimilationGeneratedRecordSet
} from "../persistence";

import type {
    AssetId
} from "../types";

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

    private readonly persistence:
        AssimilationGeneratedRecordPersistence;


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

        this.persistence =
            createFileSystemAssimilationGeneratedRecordPersistence(
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

        const result =
            await this.pipeline.assimilate(
                asset
            );

        if (
            result.status === "completed" &&
            result.extraction &&
            result.segment &&
            result.classification &&
            result.transformation &&
            result.derivedObject
        ) {
            await this.persistence.persist({
                asset: result.asset,
                extraction: result.extraction,
                segment: result.segment,
                classification: result.classification,
                transformation: result.transformation,
                derivedObject: result.derivedObject
            });
        }

        return result;

    }

    public async retrieveGeneratedRecords(
        assetId:
            AssetId
    ): Promise<AssimilationGeneratedRecordSet> {

        return this.persistence.retrieve(
            assetId
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