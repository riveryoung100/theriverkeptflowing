import type {
    AssetId,
    AssetExtraction,
    ExtractionId,
    SourceAsset,
    StorageReference
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

export interface RawSourceContent {

    readonly text:
        string;

}

export interface RawSourceReader {

    read(
        storage: StorageReference
    ): Promise<RawSourceContent | null>;

}



export interface BinaryRawSourceContent {

    readonly bytes:
        Uint8Array;

}


export interface BinaryRawSourceReader {

    read(
        storage: StorageReference
    ): Promise<BinaryRawSourceContent | null>;

}export interface ExtractionEngine {

    extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult>;

}