import type {
    FileSystemSourceIngestionRequest
} from "../ingestion/types";

import type {
    AssimilationPipelineResult
} from "../pipeline/types";

import type {
    AssetId
} from "../types";

import type {
    AssimilationGeneratedRecordSet
} from "../persistence";


export interface ProductionSourceAssimilationService {

    ingestAndAssimilate(
        request:
            FileSystemSourceIngestionRequest
    ): Promise<AssimilationPipelineResult>;

    retrieveGeneratedRecords(
        assetId:
            AssetId
    ): Promise<AssimilationGeneratedRecordSet>;

}