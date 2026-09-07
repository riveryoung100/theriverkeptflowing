export const CONTENT_SOURCE_PLATFORMS = [
    "youtube",
    "instagram",
    "tiktok",
    "facebook",
    "linkedin",
    "other"
] as const;

export type ContentSourcePlatform =
    typeof CONTENT_SOURCE_PLATFORMS[number];


export const CONTENT_SOURCE_STATUSES = [
    "discovered",
    "metadata-captured",
    "transcript-pending",
    "transcript-ready",
    "ingested",
    "rejected"
] as const;

export type ContentSourceStatus =
    typeof CONTENT_SOURCE_STATUSES[number];


export const TRANSCRIPT_PROVENANCE_TYPES = [
    "platform",
    "manual",
    "generated",
    "unavailable"
] as const;

export type TranscriptProvenanceType =
    typeof TRANSCRIPT_PROVENANCE_TYPES[number];


export interface CanonicalTranscriptProvenance {

    readonly type:
        TranscriptProvenanceType;

    readonly provider?:
        string;

    readonly language?:
        string;

    readonly capturedAt?:
        string;

}


export interface CanonicalContentTranscript {

    readonly text:
        string;

    readonly provenance:
        CanonicalTranscriptProvenance;

}


export interface CanonicalContentSourceRecord {

    /**
     * River-owned stable identity.
     * This identity must remain stable even when platform metadata changes.
     */
    readonly sourceId:
        string;

    /**
     * Platform on which the source was originally published.
     */
    readonly platform:
        ContentSourcePlatform;

    /**
     * Canonical public location of the published source.
     */
    readonly canonicalUrl:
        string;

    /**
     * Platform-owned identity such as a YouTube video ID.
     */
    readonly externalPlatformId:
        string;

    readonly title:
        string;

    readonly description?:
        string;

    /**
     * Original platform publication timestamp.
     */
    readonly publishedAt:
        string;

    /**
     * Duration in whole seconds.
     */
    readonly durationSeconds?:
        number;

    /**
     * Transcript is optional until transcript acquisition succeeds.
     */
    readonly transcript?:
        CanonicalContentTranscript;

    readonly sourceStatus:
        ContentSourceStatus;

    /**
     * River taxonomy. A source may be uncategorized at initial ingestion.
     */
    readonly pillar?:
        string;

    readonly tags:
        readonly string[];

    /**
     * Timestamp when River first accepted the source into ingestion.
     */
    readonly ingestedAt:
        string;

    /**
     * Timestamp of the most recent canonical record update.
     */
    readonly updatedAt:
        string;

    /**
     * Explicit preservation invariant. The canonical source record never
     * replaces or mutates the originally published source.
     */
    readonly originalSourcePreserved:
        true;

}


export interface CanonicalContentSourceValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly string[];

}


function isNonEmptyString(
    value: unknown
): value is string {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );

}


function isIsoTimestamp(
    value: unknown
): value is string {

    return (
        typeof value === "string" &&
        value.length > 0 &&
        Number.isFinite(
            Date.parse(
                value
            )
        )
    );

}


function isHttpUrl(
    value: unknown
): value is string {

    if (!isNonEmptyString(value)) {
        return false;
    }

    try {

        const url =
            new URL(
                value
            );

        return (
            url.protocol === "https:" ||
            url.protocol === "http:"
        );

    } catch {

        return false;

    }

}


export function validateCanonicalContentSourceRecord(
    value: unknown
): CanonicalContentSourceValidationResult {

    const issues:
        string[] = [];

    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value
        )
    ) {

        return {
            valid:
                false,
            issues: [
                "Canonical content source record must be an object."
            ]
        };

    }

    const record =
        value as
            Record<string, unknown>;

    if (!isNonEmptyString(record.sourceId)) {
        issues.push(
            "sourceId must be a non-empty string."
        );
    }

    if (
        !CONTENT_SOURCE_PLATFORMS.includes(
            record.platform as ContentSourcePlatform
        )
    ) {

        issues.push(
            "platform must be a supported content source platform."
        );

    }

    if (!isHttpUrl(record.canonicalUrl)) {
        issues.push(
            "canonicalUrl must be an absolute HTTP or HTTPS URL."
        );
    }

    if (!isNonEmptyString(record.externalPlatformId)) {
        issues.push(
            "externalPlatformId must be a non-empty string."
        );
    }

    if (!isNonEmptyString(record.title)) {
        issues.push(
            "title must be a non-empty string."
        );
    }

    if (!isIsoTimestamp(record.publishedAt)) {
        issues.push(
            "publishedAt must be a valid timestamp."
        );
    }

    if (
        record.durationSeconds !== undefined &&
        (
            typeof record.durationSeconds !== "number" ||
            !Number.isInteger(record.durationSeconds) ||
            record.durationSeconds < 0
        )
    ) {

        issues.push(
            "durationSeconds must be a non-negative integer when provided."
        );

    }

    if (
        !CONTENT_SOURCE_STATUSES.includes(
            record.sourceStatus as ContentSourceStatus
        )
    ) {

        issues.push(
            "sourceStatus must be a supported content source status."
        );

    }

    if (
        !Array.isArray(record.tags) ||
        !record.tags.every(
            (tag) =>
                isNonEmptyString(tag)
        )
    ) {

        issues.push(
            "tags must be an array of non-empty strings."
        );

    }

    if (!isIsoTimestamp(record.ingestedAt)) {
        issues.push(
            "ingestedAt must be a valid timestamp."
        );
    }

    if (!isIsoTimestamp(record.updatedAt)) {
        issues.push(
            "updatedAt must be a valid timestamp."
        );
    }

    if (record.originalSourcePreserved !== true) {
        issues.push(
            "originalSourcePreserved must be true."
        );
    }

    if (record.transcript !== undefined) {

        if (
            typeof record.transcript !== "object" ||
            record.transcript === null ||
            Array.isArray(
                record.transcript
            )
        ) {

            issues.push(
                "transcript must be an object when provided."
            );

        } else {

            const transcript =
                record.transcript as
                    Record<string, unknown>;

            if (!isNonEmptyString(transcript.text)) {
                issues.push(
                    "transcript.text must be a non-empty string."
                );
            }

            if (
                typeof transcript.provenance !== "object" ||
                transcript.provenance === null ||
                Array.isArray(
                    transcript.provenance
                )
            ) {

                issues.push(
                    "transcript.provenance must be an object."
                );

            } else {

                const provenance =
                    transcript.provenance as
                        Record<string, unknown>;

                if (
                    !TRANSCRIPT_PROVENANCE_TYPES.includes(
                        provenance.type as TranscriptProvenanceType
                    )
                ) {

                    issues.push(
                        "transcript.provenance.type must be supported."
                    );

                }

            }

        }

    }

    return {
        valid:
            issues.length === 0,
        issues
    };

}


export function assertCanonicalContentSourceRecord(
    value: unknown
): asserts value is CanonicalContentSourceRecord {

    const validation =
        validateCanonicalContentSourceRecord(
            value
        );

    if (!validation.valid) {

        throw new TypeError(
            validation.issues.join(
                " "
            )
        );

    }

}
