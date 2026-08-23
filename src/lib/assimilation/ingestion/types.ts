import type {
    ActorReference,
    AssetProvenance,
    AssetType,
    OwnershipRecord,
    PrivacyLevel,
    RightsStatus,
    ReviewStatus,
    SensitivityCategory,
    SourceAsset,
    UsagePermission
} from "../types";


export interface FileSystemSourceIngestionRequest {

    readonly content:
        string | Uint8Array;

    readonly assetType:
        AssetType;

    readonly originalFilename:
        string;

    readonly title?:
        string;

    readonly mimeType?:
        string;

    readonly language?:
        string;

    readonly createdAt?:
        string;

    readonly ownership:
        OwnershipRecord;

    readonly rightsStatus:
        RightsStatus;

    readonly usagePermission:
        UsagePermission;

    readonly privacy:
        PrivacyLevel;

    readonly sensitivityCategories?:
        readonly SensitivityCategory[];

    readonly reviewStatus:
        ReviewStatus;

    readonly submittedBy:
        ActorReference;

    readonly intakeMethod:
        AssetProvenance["intakeMethod"];

    readonly originalSource?:
        string;

    readonly originalPlatformId?:
        string;

    readonly declaredOwner?:
        string;

    readonly declaredPurpose?:
        string;

}


export interface FileSystemSourceIngestionService {

    ingest(
        request:
            FileSystemSourceIngestionRequest
    ): Promise<SourceAsset>;

}