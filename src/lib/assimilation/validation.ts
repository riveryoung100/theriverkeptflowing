import {
    isAssetId,
    isClassificationId,
    isDerivativeId,
    isExtractionId,
    isSegmentId,
    isTransformationId
} from "./identifiers";

import {
    ASSIMILATION_SCHEMA_VERSION,
    type AssimilationStatus,
    type AssetClassification,
    type AssetExtraction,
    type AssetSegment,
    type SourceAsset,
    type SourceLocation
} from "./types";


export type ValidationSeverity =
    | "error"
    | "warning";


export interface ValidationIssue {
    readonly code: string;
    readonly message: string;
    readonly path: string;
    readonly severity: ValidationSeverity;
}


export interface ValidationResult {
    readonly valid: boolean;
    readonly issues: readonly ValidationIssue[];
}


const ISO_UTC_TIMESTAMP_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;


const BCP_47_PATTERN =
    /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;


const SHA_256_PATTERN =
    /^[a-f0-9]{64}$/i;


const VALID_STATUS_TRANSITIONS:
Readonly<Record<
    AssimilationStatus,
    readonly AssimilationStatus[]
>> = {
    received: [
        "preserved",
        "quarantined",
        "failed",
        "rejected"
    ],

    preserved: [
        "extraction-pending",
        "archived",
        "blocked",
        "failed"
    ],

    "extraction-pending": [
        "extracting",
        "quarantined",
        "failed"
    ],

    extracting: [
        "extracted",
        "failed",
        "review-needed"
    ],

    extracted: [
        "segmentation-pending",
        "review-needed",
        "archived",
        "failed"
    ],

    "segmentation-pending": [
        "segmented",
        "failed",
        "review-needed"
    ],

    segmented: [
        "classification-pending",
        "review-needed",
        "archived",
        "failed"
    ],

    "classification-pending": [
        "classified",
        "failed",
        "review-needed"
    ],

    classified: [
        "review-needed",
        "approved",
        "archived",
        "failed"
    ],

    "review-needed": [
        "approved",
        "rejected",
        "blocked",
        "classified"
    ],

    approved: [
        "assimilated",
        "review-needed",
        "blocked"
    ],

    assimilated: [
        "archived",
        "review-needed",
        "blocked"
    ],

    archived: [
        "preserved",
        "review-needed"
    ],

    quarantined: [
        "received",
        "rejected",
        "blocked",
        "failed"
    ],

    failed: [
        "received",
        "extraction-pending",
        "segmentation-pending",
        "classification-pending",
        "archived"
    ],

    rejected: [
        "received",
        "archived"
    ],

    blocked: [
        "review-needed",
        "archived"
    ]
};


function issue(
    code: string,
    message: string,
    path: string,
    severity: ValidationSeverity
): ValidationIssue {

    return {
        code,
        message,
        path,
        severity
    };

}


function result(
    issues: readonly ValidationIssue[]
): ValidationResult {

    return {
        valid:
            !issues.some(
                (item) => {
                    return item.severity ===
                        "error";
                }
            ),
        issues
    };

}


export function isIsoUtcTimestamp(
    value: unknown
): value is string {

    if (
        typeof value !==
            "string" ||
        !ISO_UTC_TIMESTAMP_PATTERN.test(
            value
        )
    ) {

        return false;

    }


    const parsed =
        Date.parse(
            value
        );


    return Number.isFinite(
        parsed
    );

}


export function isConfidence(
    value: unknown
): value is number {

    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        ) &&
        value >= 0 &&
        value <= 1
    );

}


export function isNonNegativeNumber(
    value: unknown
): value is number {

    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        ) &&
        value >= 0
    );

}


export function isPositiveInteger(
    value: unknown
): value is number {

    return (
        typeof value ===
            "number" &&
        Number.isInteger(
            value
        ) &&
        value > 0
    );

}


export function isBcp47LanguageCode(
    value: unknown
): value is string {

    return (
        typeof value ===
            "string" &&
        BCP_47_PATTERN.test(
            value
        )
    );

}


export function isValidStatusTransition(
    currentStatus: AssimilationStatus,
    nextStatus: AssimilationStatus
): boolean {

    if (
        currentStatus ===
        nextStatus
    ) {

        return true;

    }


    return VALID_STATUS_TRANSITIONS[
        currentStatus
    ].includes(
        nextStatus
    );

}


export function getAllowedStatusTransitions(
    status: AssimilationStatus
): readonly AssimilationStatus[] {

    return VALID_STATUS_TRANSITIONS[
        status
    ];

}


export function validateSourceLocation(
    location: SourceLocation,
    path = "location"
): ValidationResult {

    const issues: ValidationIssue[] =
        [];


    switch (location.type) {

        case "time": {

            if (
                !isNonNegativeNumber(
                    location.startSeconds
                )
            ) {

                issues.push(
                    issue(
                        "location.time.start.invalid",
                        "Time locations require a non-negative startSeconds value.",
                        `${path}.startSeconds`,
                        "error"
                    )
                );

            }


            if (
                location.endSeconds !==
                    undefined &&
                (
                    !isNonNegativeNumber(
                        location.endSeconds
                    ) ||
                    location.endSeconds <
                        location.startSeconds
                )
            ) {

                issues.push(
                    issue(
                        "location.time.end.invalid",
                        "endSeconds must be greater than or equal to startSeconds.",
                        `${path}.endSeconds`,
                        "error"
                    )
                );

            }


            break;

        }

        case "page": {

            if (
                !isPositiveInteger(
                    location.startPage
                )
            ) {

                issues.push(
                    issue(
                        "location.page.start.invalid",
                        "Page locations require a positive startPage.",
                        `${path}.startPage`,
                        "error"
                    )
                );

            }


            if (
                location.endPage !==
                    undefined &&
                (
                    !isPositiveInteger(
                        location.endPage
                    ) ||
                    location.endPage <
                        location.startPage
                )
            ) {

                issues.push(
                    issue(
                        "location.page.end.invalid",
                        "endPage must be greater than or equal to startPage.",
                        `${path}.endPage`,
                        "error"
                    )
                );

            }


            break;

        }

        case "character": {

            if (
                !Number.isInteger(
                    location.start
                ) ||
                location.start < 0
            ) {

                issues.push(
                    issue(
                        "location.character.start.invalid",
                        "Character locations require a non-negative integer start.",
                        `${path}.start`,
                        "error"
                    )
                );

            }


            if (
                !Number.isInteger(
                    location.end
                ) ||
                location.end <
                    location.start
            ) {

                issues.push(
                    issue(
                        "location.character.end.invalid",
                        "Character end must be greater than or equal to start.",
                        `${path}.end`,
                        "error"
                    )
                );

            }


            break;

        }

        case "section": {

            if (
                !location.heading.trim()
            ) {

                issues.push(
                    issue(
                        "location.section.heading.missing",
                        "Section locations require a heading.",
                        `${path}.heading`,
                        "error"
                    )
                );

            }


            break;

        }

    }


    return result(
        issues
    );

}


function findDuplicates(
    values: readonly string[]
): string[] {

    const seen =
        new Set<string>();

    const duplicates =
        new Set<string>();


    for (const value of values) {

        if (
            seen.has(
                value
            )
        ) {

            duplicates.add(
                value
            );

        }
        else {

            seen.add(
                value
            );

        }

    }


    return Array.from(
        duplicates
    );

}


function addDuplicateIssues(
    issues: ValidationIssue[],
    values: readonly string[],
    path: string
): void {

    for (
        const duplicate of
        findDuplicates(
            values
        )
    ) {

        issues.push(
            issue(
                "reference.duplicate",
                `Duplicate reference: ${duplicate}`,
                path,
                "error"
            )
        );

    }

}


export function validateAssetExtraction(
    extraction: AssetExtraction,
    path = "extraction"
): ValidationResult {

    const issues: ValidationIssue[] =
        [];


    if (
        !isExtractionId(
            extraction.id
        )
    ) {

        issues.push(
            issue(
                "extraction.id.invalid",
                "Extraction ID must use the extraction UUID prefix.",
                `${path}.id`,
                "error"
            )
        );

    }


    if (
        !isAssetId(
            extraction.assetId
        )
    ) {

        issues.push(
            issue(
                "extraction.asset-id.invalid",
                "Extraction assetId must be a valid asset identifier.",
                `${path}.assetId`,
                "error"
            )
        );

    }


    if (
        !isIsoUtcTimestamp(
            extraction.extractedAt
        )
    ) {

        issues.push(
            issue(
                "extraction.timestamp.invalid",
                "extractedAt must be a UTC ISO 8601 timestamp.",
                `${path}.extractedAt`,
                "error"
            )
        );

    }


    if (
        !extraction.extractorVersion.trim()
    ) {

        issues.push(
            issue(
                "extraction.version.missing",
                "extractorVersion is required.",
                `${path}.extractorVersion`,
                "error"
            )
        );

    }


    if (
        !isConfidence(
            extraction.confidence
        )
    ) {

        issues.push(
            issue(
                "extraction.confidence.invalid",
                "Extraction confidence must be between 0 and 1.",
                `${path}.confidence`,
                "error"
            )
        );

    }


    if (
        extraction.detectedLanguage !==
            undefined &&
        !isBcp47LanguageCode(
            extraction.detectedLanguage
        )
    ) {

        issues.push(
            issue(
                "extraction.language.invalid",
                "detectedLanguage must use a BCP 47 language code.",
                `${path}.detectedLanguage`,
                "error"
            )
        );

    }


    if (
        extraction.status ===
            "complete" &&
        !extraction.text &&
        !extraction.transcript
    ) {

        issues.push(
            issue(
                "extraction.content.missing",
                "A complete extraction should contain text or a transcript.",
                path,
                "warning"
            )
        );

    }


    if (
        extraction.version < 1 ||
        !Number.isInteger(
            extraction.version
        )
    ) {

        issues.push(
            issue(
                "record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`,
                "error"
            )
        );

    }


    if (
        extraction.schemaVersion !==
        ASSIMILATION_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "schema.version.unsupported",
                `Expected schema version ${ASSIMILATION_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`,
                "error"
            )
        );

    }


    return result(
        issues
    );

}


export function validateAssetSegment(
    segment: AssetSegment,
    path = "segment"
): ValidationResult {

    const issues: ValidationIssue[] =
        [];


    if (
        !isSegmentId(
            segment.id
        )
    ) {

        issues.push(
            issue(
                "segment.id.invalid",
                "Segment ID must use the segment UUID prefix.",
                `${path}.id`,
                "error"
            )
        );

    }


    if (
        !isAssetId(
            segment.assetId
        )
    ) {

        issues.push(
            issue(
                "segment.asset-id.invalid",
                "Segment assetId must be a valid asset identifier.",
                `${path}.assetId`,
                "error"
            )
        );

    }


    if (
        !isExtractionId(
            segment.extractionId
        )
    ) {

        issues.push(
            issue(
                "segment.extraction-id.invalid",
                "Segment extractionId must be a valid extraction identifier.",
                `${path}.extractionId`,
                "error"
            )
        );

    }


    issues.push(
        ...validateSourceLocation(
            segment.location,
            `${path}.location`
        ).issues
    );


    if (
        !isConfidence(
            segment.confidence
        )
    ) {

        issues.push(
            issue(
                "segment.confidence.invalid",
                "Segment confidence must be between 0 and 1.",
                `${path}.confidence`,
                "error"
            )
        );

    }


    if (
        !segment.sourceText &&
        !segment.normalizedText
    ) {

        issues.push(
            issue(
                "segment.content.missing",
                "A segment should contain sourceText or normalizedText.",
                path,
                "warning"
            )
        );

    }


    addDuplicateIssues(
        issues,
        segment.topicKeys,
        `${path}.topicKeys`
    );


    if (
        segment.version < 1 ||
        !Number.isInteger(
            segment.version
        )
    ) {

        issues.push(
            issue(
                "record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`,
                "error"
            )
        );

    }


    if (
        segment.schemaVersion !==
        ASSIMILATION_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "schema.version.unsupported",
                `Expected schema version ${ASSIMILATION_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`,
                "error"
            )
        );

    }


    return result(
        issues
    );

}


export function validateAssetClassification(
    classification: AssetClassification,
    path = "classification"
): ValidationResult {

    const issues: ValidationIssue[] =
        [];


    if (
        !isClassificationId(
            classification.id
        )
    ) {

        issues.push(
            issue(
                "classification.id.invalid",
                "Classification ID must use the classification UUID prefix.",
                `${path}.id`,
                "error"
            )
        );

    }


    if (
        !isAssetId(
            classification.assetId
        )
    ) {

        issues.push(
            issue(
                "classification.asset-id.invalid",
                "Classification assetId must be a valid asset identifier.",
                `${path}.assetId`,
                "error"
            )
        );

    }


    if (
        !isIsoUtcTimestamp(
            classification.classifiedAt
        )
    ) {

        issues.push(
            issue(
                "classification.timestamp.invalid",
                "classifiedAt must be a UTC ISO 8601 timestamp.",
                `${path}.classifiedAt`,
                "error"
            )
        );

    }


    if (
        !isConfidence(
            classification.confidence
        )
    ) {

        issues.push(
            issue(
                "classification.confidence.invalid",
                "Classification confidence must be between 0 and 1.",
                `${path}.confidence`,
                "error"
            )
        );

    }


    addDuplicateIssues(
        issues,
        classification.domainKeys,
        `${path}.domainKeys`
    );

    addDuplicateIssues(
        issues,
        classification.topicKeys,
        `${path}.topicKeys`
    );

    addDuplicateIssues(
        issues,
        classification.audienceKeys,
        `${path}.audienceKeys`
    );


    if (
        classification.domainKeys.length ===
            0 &&
        classification.topicKeys.length ===
            0
    ) {

        issues.push(
            issue(
                "classification.taxonomy.empty",
                "Classification has no domain or topic assignments.",
                path,
                "warning"
            )
        );

    }


    if (
        classification.version < 1 ||
        !Number.isInteger(
            classification.version
        )
    ) {

        issues.push(
            issue(
                "record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`,
                "error"
            )
        );

    }


    if (
        classification.schemaVersion !==
        ASSIMILATION_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "schema.version.unsupported",
                `Expected schema version ${ASSIMILATION_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`,
                "error"
            )
        );

    }


    return result(
        issues
    );

}


export function validateSourceAsset(
    asset: SourceAsset,
    path = "asset"
): ValidationResult {

    const issues: ValidationIssue[] =
        [];


    if (
        !isAssetId(
            asset.id
        )
    ) {

        issues.push(
            issue(
                "asset.id.invalid",
                "Asset ID must use the asset UUID prefix.",
                `${path}.id`,
                "error"
            )
        );

    }


    if (
        !isIsoUtcTimestamp(
            asset.receivedAt
        )
    ) {

        issues.push(
            issue(
                "asset.received-at.invalid",
                "receivedAt must be a UTC ISO 8601 timestamp.",
                `${path}.receivedAt`,
                "error"
            )
        );

    }


    if (
        !isIsoUtcTimestamp(
            asset.updatedAt
        )
    ) {

        issues.push(
            issue(
                "asset.updated-at.invalid",
                "updatedAt must be a UTC ISO 8601 timestamp.",
                `${path}.updatedAt`,
                "error"
            )
        );

    }


    if (
        asset.createdAt !==
            undefined &&
        !isIsoUtcTimestamp(
            asset.createdAt
        )
    ) {

        issues.push(
            issue(
                "asset.created-at.invalid",
                "createdAt must be a UTC ISO 8601 timestamp when present.",
                `${path}.createdAt`,
                "error"
            )
        );

    }


    if (
        !isIsoUtcTimestamp(
            asset.provenance.submittedAt
        )
    ) {

        issues.push(
            issue(
                "asset.provenance.timestamp.invalid",
                "Provenance submittedAt must be a UTC ISO 8601 timestamp.",
                `${path}.provenance.submittedAt`,
                "error"
            )
        );

    }


    if (
        asset.provenance.parentAssetId !==
            undefined &&
        !isAssetId(
            asset.provenance.parentAssetId
        )
    ) {

        issues.push(
            issue(
                "asset.parent-id.invalid",
                "parentAssetId must be a valid asset identifier.",
                `${path}.provenance.parentAssetId`,
                "error"
            )
        );

    }


    if (
        asset.provenance.parentAssetId ===
        asset.id
    ) {

        issues.push(
            issue(
                "asset.parent-id.self-reference",
                "An asset cannot be its own parent.",
                `${path}.provenance.parentAssetId`,
                "error"
            )
        );

    }


    if (
        asset.checksum !==
            undefined &&
        !SHA_256_PATTERN.test(
            asset.checksum.value
        )
    ) {

        issues.push(
            issue(
                "asset.checksum.invalid",
                "SHA-256 checksums must contain exactly 64 hexadecimal characters.",
                `${path}.checksum.value`,
                "error"
            )
        );

    }


    if (
        asset.byteSize !==
            undefined &&
        !isNonNegativeNumber(
            asset.byteSize
        )
    ) {

        issues.push(
            issue(
                "asset.byte-size.invalid",
                "byteSize must be a non-negative number.",
                `${path}.byteSize`,
                "error"
            )
        );

    }


    if (
        asset.durationSeconds !==
            undefined &&
        !isNonNegativeNumber(
            asset.durationSeconds
        )
    ) {

        issues.push(
            issue(
                "asset.duration.invalid",
                "durationSeconds must be a non-negative number.",
                `${path}.durationSeconds`,
                "error"
            )
        );

    }


    if (
        asset.language !==
            undefined &&
        !isBcp47LanguageCode(
            asset.language
        )
    ) {

        issues.push(
            issue(
                "asset.language.invalid",
                "language must use a BCP 47 language code.",
                `${path}.language`,
                "error"
            )
        );

    }


    if (
        asset.rightsStatus ===
        "unknown"
    ) {

        issues.push(
            issue(
                "asset.rights.unknown",
                "Asset rights have not yet been established.",
                `${path}.rightsStatus`,
                "warning"
            )
        );

    }


    if (
        asset.usagePermission.mayPublish &&
        (
            asset.rightsStatus ===
                "unknown" ||
            asset.rightsStatus ===
                "reference-only" ||
            asset.rightsStatus ===
                "restricted"
        )
    ) {

        issues.push(
            issue(
                "asset.publication.rights-conflict",
                "Publication permission conflicts with the current rights status.",
                `${path}.usagePermission.mayPublish`,
                "error"
            )
        );

    }


    if (
        asset.usagePermission.mayCommercialize &&
        !asset.usagePermission.mayPublish
    ) {

        issues.push(
            issue(
                "asset.commercialization.permission-conflict",
                "Commercialization requires publication permission.",
                `${path}.usagePermission.mayCommercialize`,
                "error"
            )
        );

    }


    if (
        asset.privacy ===
            "highly-sensitive" &&
        asset.usagePermission.mayPublish
    ) {

        issues.push(
            issue(
                "asset.privacy.publication-conflict",
                "Highly sensitive assets cannot be marked publishable.",
                `${path}.usagePermission.mayPublish`,
                "error"
            )
        );

    }


    if (
        !asset.title &&
        !asset.originalFilename &&
        !asset.sourceUrl
    ) {

        issues.push(
            issue(
                "asset.identity.metadata-missing",
                "Asset has no title, original filename, or source URL.",
                path,
                "warning"
            )
        );

    }


    addDuplicateIssues(
        issues,
        asset.extractionIds,
        `${path}.extractionIds`
    );

    addDuplicateIssues(
        issues,
        asset.segmentIds,
        `${path}.segmentIds`
    );

    addDuplicateIssues(
        issues,
        asset.classificationIds,
        `${path}.classificationIds`
    );

    addDuplicateIssues(
        issues,
        asset.derivedObjectIds,
        `${path}.derivedObjectIds`
    );

    addDuplicateIssues(
        issues,
        asset.provenance.transformationIds,
        `${path}.provenance.transformationIds`
    );


    for (
        const extractionId of
        asset.extractionIds
    ) {

        if (
            !isExtractionId(
                extractionId
            )
        ) {

            issues.push(
                issue(
                    "asset.extraction-reference.invalid",
                    `Invalid extraction reference: ${extractionId}`,
                    `${path}.extractionIds`,
                    "error"
                )
            );

        }

    }


    for (
        const segmentId of
        asset.segmentIds
    ) {

        if (
            !isSegmentId(
                segmentId
            )
        ) {

            issues.push(
                issue(
                    "asset.segment-reference.invalid",
                    `Invalid segment reference: ${segmentId}`,
                    `${path}.segmentIds`,
                    "error"
                )
            );

        }

    }


    for (
        const classificationId of
        asset.classificationIds
    ) {

        if (
            !isClassificationId(
                classificationId
            )
        ) {

            issues.push(
                issue(
                    "asset.classification-reference.invalid",
                    `Invalid classification reference: ${classificationId}`,
                    `${path}.classificationIds`,
                    "error"
                )
            );

        }

    }


    for (
        const derivativeId of
        asset.derivedObjectIds
    ) {

        if (
            !isDerivativeId(
                derivativeId
            )
        ) {

            issues.push(
                issue(
                    "asset.derivative-reference.invalid",
                    `Invalid derivative reference: ${derivativeId}`,
                    `${path}.derivedObjectIds`,
                    "error"
                )
            );

        }

    }


    for (
        const transformationId of
        asset.provenance.transformationIds
    ) {

        if (
            !isTransformationId(
                transformationId
            )
        ) {

            issues.push(
                issue(
                    "asset.transformation-reference.invalid",
                    `Invalid transformation reference: ${transformationId}`,
                    `${path}.provenance.transformationIds`,
                    "error"
                )
            );

        }

    }


    if (
        asset.status ===
            "extracted" &&
        asset.extractionIds.length ===
            0
    ) {

        issues.push(
            issue(
                "asset.status.extraction-missing",
                "An extracted asset must reference at least one extraction.",
                `${path}.extractionIds`,
                "error"
            )
        );

    }


    if (
        asset.status ===
            "segmented" &&
        asset.segmentIds.length ===
            0
    ) {

        issues.push(
            issue(
                "asset.status.segments-missing",
                "A segmented asset must reference at least one segment.",
                `${path}.segmentIds`,
                "error"
            )
        );

    }


    if (
        asset.status ===
            "classified" &&
        asset.classificationIds.length ===
            0
    ) {

        issues.push(
            issue(
                "asset.status.classification-missing",
                "A classified asset must reference at least one classification.",
                `${path}.classificationIds`,
                "error"
            )
        );

    }


    if (
        asset.status ===
            "assimilated" &&
        asset.reviewStatus !==
            "approved" &&
        asset.reviewStatus !==
            "approved-with-changes" &&
        asset.reviewStatus !==
            "not-required"
    ) {

        issues.push(
            issue(
                "asset.status.review-incomplete",
                "An assimilated asset must have an approved or not-required review status.",
                `${path}.reviewStatus`,
                "error"
            )
        );

    }


    if (
        asset.version < 1 ||
        !Number.isInteger(
            asset.version
        )
    ) {

        issues.push(
            issue(
                "record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`,
                "error"
            )
        );

    }


    if (
        asset.schemaVersion !==
        ASSIMILATION_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "schema.version.unsupported",
                `Expected schema version ${ASSIMILATION_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`,
                "error"
            )
        );

    }


    return result(
        issues
    );

}