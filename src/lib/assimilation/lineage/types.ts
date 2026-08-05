import type {
    AssetId,
    ClassificationId,
    DerivativeId,
    ExtractionId,
    SegmentId,
    TransformationId
} from "../types";

export type LineageNodeType =
    | "asset"
    | "extraction"
    | "segment"
    | "classification"
    | "transformation"
    | "derivative";

export type LineageEdgeType =
    | "produced"
    | "derived-from"
    | "classified-from"
    | "segmented-from"
    | "extracted-from"
    | "transformed-by";

export type LineageNodeId =
    | AssetId
    | ExtractionId
    | SegmentId
    | ClassificationId
    | TransformationId
    | DerivativeId;

export interface LineageNode {
    readonly id: LineageNodeId;
    readonly type: LineageNodeType;
}

export interface LineageEdge {
    readonly from: LineageNodeId;
    readonly to: LineageNodeId;
    readonly relationship: LineageEdgeType;
}

export interface LineageGraph {
    readonly nodes: readonly LineageNode[];
    readonly edges: readonly LineageEdge[];
}

export interface LineageTraversalResult {
    readonly visited: readonly LineageNodeId[];
    readonly edges: readonly LineageEdge[];
}
