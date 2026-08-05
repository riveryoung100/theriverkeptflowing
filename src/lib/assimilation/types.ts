export const ASSIMILATION_SCHEMA_VERSION =
    "1.0.0" as const;


export type AssimilationSchemaVersion =
    typeof ASSIMILATION_SCHEMA_VERSION;


export type AssetId =
    `asset:${string}`;

export type ExtractionId =
    `extraction:${string}`;

export type SegmentId =
    `segment:${string}`;

export type ClassificationId =
    `classification:${string}`;

export type TransformationId =
    `transformation:${string}`;

export type DerivativeId =
    `derivative:${string}`;

export type ReviewId =
    `review:${string}`;


export type AssimilationRecordId =
    | AssetId
    | ExtractionId
    | SegmentId
    | ClassificationId
    | TransformationId
    | DerivativeId
    | ReviewId;


export type AssetType =
    | "video"
    | "audio"
    | "document"
    | "pdf"
    | "image"
    | "note"
    | "webpage"
    | "social-post"
    | "transcript"
    | "email"
    | "dataset"
    | "other";


export type AssimilationStatus =
    | "received"
    | "preserved"
    | "extraction-pending"
    | "extracting"
    | "extracted"
    | "segmentation-pending"
    | "segmented"
    | "classification-pending"
    | "classified"
    | "review-needed"
    | "approved"
    | "assimilated"
    | "archived"
    | "quarantined"
    | "failed"
    | "rejected"
    | "blocked";


export type RightsStatus =
    | "owned"
    | "jointly-owned"
    | "licensed"
    | "permission-granted"
    | "public-domain"
    | "fair-use-review"
    | "reference-only"
    | "restricted"
    | "unknown";


export type PrivacyLevel =
    | "public"
    | "internal"
    | "private"
    | "restricted"
    | "highly-sensitive";


export type SensitivityCategory =
    | "personal-identity"
    | "contact-information"
    | "financial"
    | "insurance"
    | "medical"
    | "mental-health"
    | "family"
    | "children"
    | "religious-reflection"
    | "legal"
    | "employment"
    | "customer-information"
    | "credentials"
    | "security"
    | "third-party-private-information";


export type ReviewStatus =
    | "not-required"
    | "pending"
    | "in-review"
    | "approved"
    | "approved-with-changes"
    | "rejected"
    | "blocked";


export type ExtractionStatus =
    | "complete"
    | "partial"
    | "failed"
    | "review-needed";


export type SegmentType =
    | "chapter"
    | "section"
    | "idea"
    | "story"
    | "claim"
    | "quote"
    | "instruction"
    | "procedure"
    | "lesson"
    | "clip"
    | "offer"
    | "question"
    | "answer"
    | "reflection"
    | "example"
    | "warning";


export type PublicationEligibility =
    | "approved"
    | "review"
    | "private"
    | "blocked";


export type TransformationType =
    | "transcription"
    | "ocr"
    | "normalization"
    | "segmentation"
    | "classification"
    | "summary"
    | "translation"
    | "clip"
    | "rewrite"
    | "publication"
    | "manual-edit";


export type TransformationTool =
    | "human"
    | "system"
    | "ai"
    | "external-service";


export type DerivedObjectType =
    | "knowledge-entry"
    | "topic"
    | "relationship"
    | "claim"
    | "learning-outcome"
    | "faq"
    | "guide-section"
    | "article"
    | "trail-candidate"
    | "internal-sop"
    | "content-derivative"
    | "other";


export type ActorReference =
    | {
        readonly type: "river";
        readonly id: string;
    }
    | {
        readonly type: "staff";
        readonly id: string;
    }
    | {
        readonly type: "system";
        readonly id: string;
    }
    | {
        readonly type: "ai";
        readonly provider: string;
        readonly model: string;
    };


export interface UsagePermission {
    readonly mayStore: boolean;
    readonly mayExtract: boolean;
    readonly mayAnalyze: boolean;
    readonly mayQuote: boolean;
    readonly mayTransform: boolean;
    readonly mayPublish: boolean;
    readonly mayCommercialize: boolean;
    readonly mayTrainModels: boolean;
}


export interface OwnershipRecord {
    readonly ownerType:
        | "river"
        | "third-party"
        | "joint"
        | "unknown";

    readonly ownerName?: string;
    readonly evidence?: string;
    readonly effectiveDate?: string;
    readonly expirationDate?: string;
}


export interface AssetChecksum {
    readonly algorithm: "sha256";
    readonly value: string;
}


export interface StorageReference {
    readonly provider: string;
    readonly bucket?: string;
    readonly key: string;
    readonly versionId?: string;
}


export interface AssetProvenance {
    readonly submittedBy: ActorReference;
    readonly submittedAt: string;

    readonly intakeMethod:
        | "upload"
        | "url"
        | "connector"
        | "api"
        | "manual"
        | "bulk-import";

    readonly originalSource?: string;
    readonly originalPlatformId?: string;
    readonly parentAssetId?: AssetId;

    readonly declaredOwner?: string;
    readonly declaredPurpose?: string;

    readonly transformationIds:
        readonly TransformationId[];
}


export type SourceLocation =
    | {
        readonly type: "time";
        readonly startSeconds: number;
        readonly endSeconds?: number;
    }
    | {
        readonly type: "page";
        readonly startPage: number;
        readonly endPage?: number;
    }
    | {
        readonly type: "character";
        readonly start: number;
        readonly end: number;
    }
    | {
        readonly type: "section";
        readonly heading: string;
    };


export interface TranscriptSpeaker {
    readonly id: string;
    readonly label?: string;
    readonly confidence?: number;
}


export interface TranscriptCue {
    readonly startSeconds: number;
    readonly endSeconds?: number;
    readonly text: string;
    readonly speakerId?: string;
    readonly confidence?: number;
}


export interface Transcript {
    readonly language?: string;
    readonly speakers: readonly TranscriptSpeaker[];
    readonly cues: readonly TranscriptCue[];
}


export interface AssetExtraction {
    readonly id: ExtractionId;
    readonly assetId: AssetId;

    readonly status: ExtractionStatus;

    readonly extractedAt: string;
    readonly extractorVersion: string;

    readonly text?: string;
    readonly transcript?: Transcript;
    readonly detectedLanguage?: string;

    readonly warnings: readonly string[];
    readonly confidence: number;

    readonly version: number;
    readonly schemaVersion:
        AssimilationSchemaVersion;
}


export interface AssetSegment {
    readonly id: SegmentId;
    readonly assetId: AssetId;
    readonly extractionId: ExtractionId;

    readonly segmentType: SegmentType;
    readonly location: SourceLocation;

    readonly sourceText?: string;
    readonly normalizedText?: string;

    readonly topicKeys: readonly string[];
    readonly confidence: number;

    readonly publicationEligibility:
        PublicationEligibility;

    readonly reviewStatus: ReviewStatus;

    readonly version: number;
    readonly schemaVersion:
        AssimilationSchemaVersion;
}


export interface AssetClassification {
    readonly id: ClassificationId;
    readonly assetId: AssetId;

    readonly domainKeys: readonly string[];
    readonly topicKeys: readonly string[];
    readonly audienceKeys: readonly string[];

    readonly contentFunctions:
        readonly (
            | "teach"
            | "explain"
            | "persuade"
            | "reflect"
            | "document"
            | "entertain"
            | "instruct"
            | "sell"
            | "invite"
            | "warn"
            | "compare"
        )[];

    readonly businessRelevance:
        readonly (
            | "educational"
            | "service-adjacent"
            | "product-adjacent"
            | "recruitment"
            | "lead-generation"
            | "customer-support"
            | "internal-training"
            | "ministry"
        )[];

    readonly learningOutcomes:
        readonly string[];

    readonly questionsAnswered:
        readonly string[];

    readonly confidence: number;
    readonly reviewStatus: ReviewStatus;

    readonly classifiedAt: string;

    readonly version: number;
    readonly schemaVersion:
        AssimilationSchemaVersion;
}


export interface TransformationRecord {
    readonly id: TransformationId;

    readonly inputObjectIds:
        readonly AssimilationRecordId[];

    readonly outputObjectIds:
        readonly AssimilationRecordId[];

    readonly transformationType:
        TransformationType;

    readonly tool: TransformationTool;

    readonly toolDetails?: {
        readonly provider?: string;
        readonly model?: string;
        readonly version?: string;
    };

    readonly instructions?: string;
    readonly confidence?: number;

    readonly createdAt: string;
    readonly createdBy: ActorReference;

    readonly version: number;
    readonly schemaVersion:
        AssimilationSchemaVersion;
}


export interface DerivedObjectReference {
    readonly id: DerivativeId;
    readonly assetId: AssetId;

    readonly objectType:
        DerivedObjectType;

    readonly objectId: string;

    readonly sourceSegmentIds:
        readonly SegmentId[];

    readonly transformationId:
        TransformationId;

    readonly reviewStatus:
        ReviewStatus;

    readonly createdAt: string;

    readonly version: number;
    readonly schemaVersion:
        AssimilationSchemaVersion;
}


export interface SourceAsset {
    readonly id: AssetId;

    readonly assetType: AssetType;

    readonly title?: string;
    readonly originalFilename?: string;
    readonly sourceUrl?: string;
    readonly platform?: string;

    readonly createdAt?: string;
    readonly receivedAt: string;
    readonly updatedAt: string;

    readonly checksum?: AssetChecksum;

    readonly mimeType?: string;
    readonly byteSize?: number;
    readonly durationSeconds?: number;

    readonly language?: string;

    readonly ownership: OwnershipRecord;
    readonly rightsStatus: RightsStatus;
    readonly usagePermission:
        UsagePermission;

    readonly privacy: PrivacyLevel;
    readonly sensitivityCategories:
        readonly SensitivityCategory[];

    readonly status: AssimilationStatus;
    readonly reviewStatus: ReviewStatus;

    readonly provenance: AssetProvenance;

    readonly storage?: StorageReference;

    readonly extractionIds:
        readonly ExtractionId[];

    readonly segmentIds:
        readonly SegmentId[];

    readonly classificationIds:
        readonly ClassificationId[];

    readonly derivedObjectIds:
        readonly DerivativeId[];

    readonly version: number;
    readonly schemaVersion:
        AssimilationSchemaVersion;
}


export interface AssimilationResult {
    readonly asset: SourceAsset;

    readonly extractions:
        readonly AssetExtraction[];

    readonly segments:
        readonly AssetSegment[];

    readonly classifications:
        readonly AssetClassification[];

    readonly transformations:
        readonly TransformationRecord[];

    readonly derivedObjects:
        readonly DerivedObjectReference[];

    readonly completedAt?: string;

    readonly warnings:
        readonly string[];
}