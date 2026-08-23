import type {
    FileSystemSourceIngestionRequest
} from "../ingestion/types";

import type {
    AssimilationPipelineResult
} from "../pipeline/types";


export interface ProductionSourceAssimilationService {

    ingestAndAssimilate(
        request:
            FileSystemSourceIngestionRequest
    ): Promise<AssimilationPipelineResult>;

}