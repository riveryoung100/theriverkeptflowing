import type {
    AssetClassification,
    ClassificationId,
    SegmentId
} from "../types";

export type ClassificationStatus =
    | "pending"
    | "running"
    | "completed"
    | "failed";

export interface ClassificationRequest {

    readonly segmentId:
        SegmentId;

    readonly requestedAt:
        string;

}

export interface ClassificationResult {

    readonly classification:
        AssetClassification;

    readonly status:
        ClassificationStatus;

}

export interface ClassificationEngineResult {

    readonly classificationId:
        ClassificationId;

    readonly status:
        ClassificationStatus;

    readonly results:
        readonly ClassificationResult[];

}

export interface ClassificationEngine {

    classify(
        segmentId: SegmentId
    ): ClassificationEngineResult;

}
