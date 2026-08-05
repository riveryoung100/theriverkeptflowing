import {
    ASSIMILATION_SCHEMA_VERSION,
    type AssimilationResult,
    type AssetClassification,
    type AssetExtraction,
    type AssetSegment,
    type SourceAsset,
    type TransformationRecord
} from "../types";


export const SAMPLE_ASSET_ID =
    "asset:11111111-1111-4111-8111-111111111111" as const;

export const SAMPLE_EXTRACTION_ID =
    "extraction:22222222-2222-4222-8222-222222222222" as const;

export const SAMPLE_SEGMENT_ID =
    "segment:33333333-3333-4333-8333-333333333333" as const;

export const SAMPLE_CLASSIFICATION_ID =
    "classification:44444444-4444-4444-8444-444444444444" as const;

export const SAMPLE_TRANSFORMATION_ID =
    "transformation:55555555-5555-4555-8555-555555555555" as const;


export const sampleTextAsset:
SourceAsset = {
    id:
        SAMPLE_ASSET_ID,

    assetType:
        "note",

    title:
        "Synthetic Assimilation Fixture",

    originalFilename:
        "synthetic-assimilation-fixture.txt",

    createdAt:
        "2026-08-05T14:00:00.000Z",

    receivedAt:
        "2026-08-05T14:05:00.000Z",

    updatedAt:
        "2026-08-05T14:05:00.000Z",

    checksum: {
        algorithm:
            "sha256",

        value:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },

    mimeType:
        "text/plain",

    byteSize:
        128,

    language:
        "en-US",

    ownership: {
        ownerType:
            "river",

        ownerName:
            "River"
    },

    rightsStatus:
        "owned",

    usagePermission: {
        mayStore:
            true,

        mayExtract:
            true,

        mayAnalyze:
            true,

        mayQuote:
            true,

        mayTransform:
            true,

        mayPublish:
            false,

        mayCommercialize:
            false,

        mayTrainModels:
            false
    },

    privacy:
        "internal",

    sensitivityCategories:
        [],

    status:
        "classified",

    reviewStatus:
        "not-required",

    provenance: {
        submittedBy: {
            type:
                "river",

            id:
                "river:owner"
        },

        submittedAt:
            "2026-08-05T14:05:00.000Z",

        intakeMethod:
            "manual",

        declaredOwner:
            "River",

        declaredPurpose:
            "Synthetic fixture for Phase 26A validation.",

        transformationIds: [
            SAMPLE_TRANSFORMATION_ID
        ]
    },

    extractionIds: [
        SAMPLE_EXTRACTION_ID
    ],

    segmentIds: [
        SAMPLE_SEGMENT_ID
    ],

    classificationIds: [
        SAMPLE_CLASSIFICATION_ID
    ],

    derivedObjectIds:
        [],

    version:
        1,

    schemaVersion:
        ASSIMILATION_SCHEMA_VERSION
};


export const sampleTextExtraction:
AssetExtraction = {
    id:
        SAMPLE_EXTRACTION_ID,

    assetId:
        SAMPLE_ASSET_ID,

    status:
        "complete",

    extractedAt:
        "2026-08-05T14:06:00.000Z",

    extractorVersion:
        "synthetic-text-extractor-v1",

    text:
        "Every source asset must retain provenance and remain separate from its derived knowledge.",

    detectedLanguage:
        "en-US",

    warnings:
        [],

    confidence:
        1,

    version:
        1,

    schemaVersion:
        ASSIMILATION_SCHEMA_VERSION
};


export const sampleTextSegment:
AssetSegment = {
    id:
        SAMPLE_SEGMENT_ID,

    assetId:
        SAMPLE_ASSET_ID,

    extractionId:
        SAMPLE_EXTRACTION_ID,

    segmentType:
        "instruction",

    location: {
        type:
            "character",

        start:
            0,

        end:
            89
    },

    sourceText:
        "Every source asset must retain provenance and remain separate from its derived knowledge.",

    normalizedText:
        "Preserve source provenance and separate raw assets from derived knowledge.",

    topicKeys: [
        "provenance",
        "data-lineage",
        "source-preservation"
    ],

    confidence:
        1,

    publicationEligibility:
        "private",

    reviewStatus:
        "not-required",

    version:
        1,

    schemaVersion:
        ASSIMILATION_SCHEMA_VERSION
};


export const sampleTextClassification:
AssetClassification = {
    id:
        SAMPLE_CLASSIFICATION_ID,

    assetId:
        SAMPLE_ASSET_ID,

    domainKeys: [
        "technology",
        "business-systems"
    ],

    topicKeys: [
        "provenance",
        "assimilation-engine"
    ],

    audienceKeys: [
        "internal-team"
    ],

    contentFunctions: [
        "instruct",
        "document"
    ],

    businessRelevance: [
        "internal-training"
    ],

    learningOutcomes: [
        "Understand why raw sources and derived knowledge remain separate."
    ],

    questionsAnswered: [
        "Why must source assets preserve provenance?"
    ],

    confidence:
        1,

    reviewStatus:
        "not-required",

    classifiedAt:
        "2026-08-05T14:07:00.000Z",

    version:
        1,

    schemaVersion:
        ASSIMILATION_SCHEMA_VERSION
};


export const sampleTextTransformation:
TransformationRecord = {
    id:
        SAMPLE_TRANSFORMATION_ID,

    inputObjectIds: [
        SAMPLE_ASSET_ID
    ],

    outputObjectIds: [
        SAMPLE_EXTRACTION_ID,
        SAMPLE_SEGMENT_ID,
        SAMPLE_CLASSIFICATION_ID
    ],

    transformationType:
        "manual-edit",

    tool:
        "human",

    instructions:
        "Create a synthetic fixture with no private or customer data.",

    confidence:
        1,

    createdAt:
        "2026-08-05T14:07:00.000Z",

    createdBy: {
        type:
            "river",

        id:
            "river:owner"
    },

    version:
        1,

    schemaVersion:
        ASSIMILATION_SCHEMA_VERSION
};


export const sampleAssimilationResult:
AssimilationResult = {
    asset:
        sampleTextAsset,

    extractions: [
        sampleTextExtraction
    ],

    segments: [
        sampleTextSegment
    ],

    classifications: [
        sampleTextClassification
    ],

    transformations: [
        sampleTextTransformation
    ],

    derivedObjects:
        [],

    completedAt:
        "2026-08-05T14:07:00.000Z",

    warnings:
        []
};