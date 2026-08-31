import type {
    AssetClassification,
    AssetExtraction,
    AssetSegment,
    DerivedObjectReference,
    TransformationRecord,
    SourceAsset
} from "../types";


export type AssimilationPipelineStatus =
    | "completed"
    | "failed";


export type AssimilationPipelineStage =
    | "extraction"
    | "segmentation"
    | "classification"
    | "derivation";


export interface AssimilationPipelineResult {

    readonly status:
        AssimilationPipelineStatus;

    readonly failedStage:
        AssimilationPipelineStage | null;

    readonly asset:
        SourceAsset;

    readonly extraction:
        AssetExtraction | null;

    readonly segment:
        AssetSegment | null;

    readonly classification:
        AssetClassification | null;

    readonly transformation:
        TransformationRecord | null;

    readonly derivedObject:
        DerivedObjectReference | null;

}


export interface AssimilationPipeline {

    assimilate(
        asset: SourceAsset
    ): Promise<AssimilationPipelineResult>;

}
