import type {
    AssetClassification,
    AssetSegment
} from "../../assimilation/types";

import type {
    ClaimTruthStatus,
    KnowledgeNodeType,
    KnowledgeRelationType
} from "../types";


export interface SemanticInterpretationRequest {

    readonly segment:
        AssetSegment;

    readonly classification:
        AssetClassification;

}


export interface SemanticCandidateNode {

    readonly key:
        string;

    readonly nodeType:
        KnowledgeNodeType;

    readonly canonicalName:
        string;

    readonly aliases:
        readonly string[];

    readonly summary?: string;

    readonly description?: string;

    readonly confidence:
        number;

}


export interface SemanticCandidateRelation {

    readonly fromKey:
        string;

    readonly toKey:
        string;

    readonly relationType:
        KnowledgeRelationType;

    readonly label?: string;

    readonly confidence:
        number;

}


export interface SemanticCandidateClaim {

    readonly subjectKey:
        string;

    readonly predicate:
        string;

    readonly objectKey?: string;

    readonly objectValue?: string;

    readonly truthStatus:
        ClaimTruthStatus;

    readonly confidence:
        number;

}


export interface SemanticCandidateSet {

    readonly nodes:
        readonly SemanticCandidateNode[];

    readonly relations:
        readonly SemanticCandidateRelation[];

    readonly claims:
        readonly SemanticCandidateClaim[];

}


export interface SemanticInterpretationProvider {

    interpret(
        request: SemanticInterpretationRequest
    ): Promise<SemanticCandidateSet>;

}