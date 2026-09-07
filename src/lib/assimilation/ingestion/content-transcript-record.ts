import {
    TRANSCRIPT_PROVENANCE_TYPES,
    type CanonicalContentTranscript,
    type CanonicalTranscriptProvenance,
    type ContentSourcePlatform
} from "./canonical-content-source";

import type {
    ContentTranscriptAcquisitionResult
} from "./content-transcript-acquisition-provider";


export interface ContentTranscriptRecord {

    readonly transcriptId:
        string;

    readonly sourceId:
        string;

    readonly platform:
        ContentSourcePlatform;

    readonly transcript:
        CanonicalContentTranscript;

    readonly persistedAt:
        string;

    readonly originalSourcePreserved:
        true;

}


export interface CreateContentTranscriptRecordOptions {

    readonly now?:
        string;

}


export interface ContentTranscriptRecordValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly string[];

}


function isNonEmptyString(
    value:
        unknown
): value is string {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );

}


function isTimestamp(
    value:
        unknown
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


function isRecord(
    value:
        unknown
): value is Record<string, unknown> {

    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(
            value
        )
    );

}


function validateProvenance(
    value:
        unknown,
    issues:
        string[]
): void {

    if (
        !isRecord(
            value
        )
    ) {

        issues.push(
            "transcript provenance must be an object."
        );

        return;

    }

    if (
        !TRANSCRIPT_PROVENANCE_TYPES.includes(
            value.type as
                CanonicalTranscriptProvenance["type"]
        )
    ) {

        issues.push(
            "transcript provenance type must be supported."
        );

    }

    if (
        value.type ===
            "unavailable"
    ) {

        issues.push(
            "persisted transcript provenance cannot be unavailable when transcript text exists."
        );

    }

    if (
        value.provider !== undefined &&
        !isNonEmptyString(
            value.provider
        )
    ) {

        issues.push(
            "transcript provenance provider must be a non-empty string when provided."
        );

    }

    if (
        value.language !== undefined &&
        !isNonEmptyString(
            value.language
        )
    ) {

        issues.push(
            "transcript provenance language must be a non-empty string when provided."
        );

    }

    if (
        value.capturedAt !== undefined &&
        !isTimestamp(
            value.capturedAt
        )
    ) {

        issues.push(
            "transcript provenance capturedAt must be a valid timestamp when provided."
        );

    }

}


function createTranscriptId(
    sourceId:
        string
): string {

    return (
        `transcript:${sourceId}`
    );

}


export function createContentTranscriptRecord(
    acquisition:
        ContentTranscriptAcquisitionResult,
    options:
        CreateContentTranscriptRecordOptions = {}
): ContentTranscriptRecord {

    if (
        !acquisition ||
        typeof acquisition !== "object"
    ) {

        throw new TypeError(
            "Transcript record creation requires an acquisition result."
        );

    }

    const record:
        ContentTranscriptRecord =
        {
            transcriptId:
                createTranscriptId(
                    acquisition.sourceId
                ),

            sourceId:
                acquisition.sourceId,

            platform:
                acquisition.platform,

            transcript:
                acquisition.transcript,

            persistedAt:
                options.now ??
                new Date()
                    .toISOString(),

            originalSourcePreserved:
                true
        };

    assertContentTranscriptRecord(
        record
    );

    return record;

}


export function validateContentTranscriptRecord(
    value:
        unknown
): ContentTranscriptRecordValidationResult {

    const issues:
        string[] = [];

    if (
        !isRecord(
            value
        )
    ) {

        return {
            valid:
                false,

            issues: [
                "Content transcript record must be an object."
            ]
        };

    }

    if (
        !isNonEmptyString(
            value.transcriptId
        ) ||
        !value.transcriptId.startsWith(
            "transcript:source:"
        )
    ) {

        issues.push(
            "transcriptId must be a valid River transcript identifier."
        );

    }

    if (
        !isNonEmptyString(
            value.sourceId
        ) ||
        !value.sourceId.startsWith(
            "source:"
        )
    ) {

        issues.push(
            "sourceId must be a valid River source identifier."
        );

    }

    const platforms:
        readonly ContentSourcePlatform[] =
        [
            "youtube",
            "instagram",
            "tiktok",
            "facebook",
            "linkedin",
            "other"
        ];

    if (
        !platforms.includes(
            value.platform as
                ContentSourcePlatform
        )
    ) {

        issues.push(
            "platform must be a supported content source platform."
        );

    }

    if (
        !isRecord(
            value.transcript
        )
    ) {

        issues.push(
            "transcript must be an object."
        );

    } else {

        if (
            !isNonEmptyString(
                value.transcript.text
            )
        ) {

            issues.push(
                "transcript text must be a non-empty string."
            );

        }

        validateProvenance(
            value.transcript.provenance,
            issues
        );

    }

    if (
        !isTimestamp(
            value.persistedAt
        )
    ) {

        issues.push(
            "persistedAt must be a valid timestamp."
        );

    }

    if (
        value.originalSourcePreserved !==
        true
    ) {

        issues.push(
            "originalSourcePreserved must be true."
        );

    }

    if (
        isNonEmptyString(
            value.sourceId
        ) &&
        isNonEmptyString(
            value.transcriptId
        ) &&
        value.transcriptId !==
            createTranscriptId(
                value.sourceId
            )
    ) {

        issues.push(
            "transcriptId must deterministically match sourceId."
        );

    }

    return {
        valid:
            issues.length === 0,

        issues
    };

}


export function assertContentTranscriptRecord(
    value:
        unknown
): asserts value is ContentTranscriptRecord {

    const validation =
        validateContentTranscriptRecord(
            value
        );

    if (
        !validation.valid
    ) {

        throw new TypeError(
            validation.issues.join(
                " "
            )
        );

    }

}
