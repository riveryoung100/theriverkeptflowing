import type {
    AssetId,
    AssetExtraction,
    ExtractionId,
    SourceAsset
} from "../types";

export type ExtractionStatus =
    | "pending"
    | "running"
    | "completed"
    | "failed";

export interface ExtractionRequest {

    readonly assetId:
        AssetId;

    readonly requestedAt:
        string;

}

export interface ExtractionResult {

    readonly extraction:
        AssetExtraction;

    readonly status:
        ExtractionStatus;

}

export interface ExtractionEngineResult {

    readonly extractionId:
        ExtractionId;

    readonly status:
        ExtractionStatus;

    readonly results:
        readonly ExtractionResult[];

}

export interface ExtractionEngine {

    extract(
        asset: SourceAsset
    ): ExtractionEngineResult;

}

