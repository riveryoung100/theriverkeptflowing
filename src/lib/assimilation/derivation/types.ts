import type {
    AssetId,
    ClassificationId,
    DerivedObjectReference,
    DerivedObjectType,
    DerivativeId,
    ReviewStatus,
    SegmentId,
    TransformationId
} from "../types";


export type DerivationStatus =
    | "pending"
    | "running"
    | "completed"
    | "review-needed"
    | "failed"
    | "blocked";


export interface DerivationRequest {

    readonly assetId:
        AssetId;

    readonly objectType:
        DerivedObjectType;

    readonly objectId:
        string;

    readonly sourceSegmentIds:
        readonly SegmentId[];

    readonly sourceClassificationIds:
        readonly ClassificationId[];

    readonly transformationId:
        TransformationId;

    readonly requestedAt:
        string;

}


export interface DerivationResult {

    readonly derivative:
        DerivedObjectReference;

    readonly status:
        DerivationStatus;

}


export interface DerivationEngineResult {

    readonly derivationId:
        DerivativeId;

    readonly assetId:
        AssetId;

    readonly status:
        DerivationStatus;

    readonly reviewStatus:
        ReviewStatus;

    readonly results:
        readonly DerivationResult[];

    readonly warnings:
        readonly string[];

}


export interface DerivationEngine {

    derive(
        request: DerivationRequest
    ): DerivationEngineResult;

}
