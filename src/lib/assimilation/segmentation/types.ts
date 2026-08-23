import type {
    AssetExtraction,
    AssetSegment,
    ExtractionId,
    SegmentId
} from "../types";


export type SegmentationStatus =
    | "pending"
    | "running"
    | "completed"
    | "failed";


export interface SegmentationRequest {

    readonly extractionId:
        ExtractionId;

    readonly requestedAt:
        string;

}


export interface SegmentationResult {

    readonly segment:
        AssetSegment;

    readonly status:
        SegmentationStatus;

}


export interface SegmentationEngineResult {

    readonly segmentationId:
        SegmentId;

    readonly status:
        SegmentationStatus;

    readonly results:
        readonly SegmentationResult[];

}


export interface ExtractionReader {

    read(
        extractionId: ExtractionId
    ): Promise<AssetExtraction | null>;

}


export interface SegmentationEngine {

    segment(
        extractionId: ExtractionId
    ): Promise<SegmentationEngineResult>;

}
