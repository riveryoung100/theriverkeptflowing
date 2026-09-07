import {
    assertCanonicalContentSourceRecord,
    TRANSCRIPT_PROVENANCE_TYPES,
    type CanonicalContentSourceRecord,
    type CanonicalContentTranscript,
    type CanonicalTranscriptProvenance,
    type ContentSourcePlatform
} from "./canonical-content-source";


export interface ContentTranscriptAcquisitionRequest {

    readonly source:
        CanonicalContentSourceRecord;

    readonly preferredLanguage?:
        string;

}


export interface ContentTranscriptAcquisitionResult {

    readonly sourceId:
        string;

    readonly platform:
        ContentSourcePlatform;

    readonly transcript:
        CanonicalContentTranscript;

}


export interface ContentTranscriptAcquisitionProvider {

    readonly platform:
        ContentSourcePlatform;

    acquire(
        request:
            ContentTranscriptAcquisitionRequest
    ): Promise<ContentTranscriptAcquisitionResult>;

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


function assertTranscriptProvenance(
    value:
        unknown
): asserts value is CanonicalTranscriptProvenance {

    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            "Transcript acquisition provenance must be an object."
        );

    }

    const provenance =
        value as
            Record<string, unknown>;

    if (
        !TRANSCRIPT_PROVENANCE_TYPES.includes(
            provenance.type as
                CanonicalTranscriptProvenance["type"]
        )
    ) {

        throw new TypeError(
            "Transcript acquisition provenance type is unsupported."
        );

    }

    if (
        provenance.provider !== undefined &&
        !isNonEmptyString(
            provenance.provider
        )
    ) {

        throw new TypeError(
            "Transcript acquisition provenance provider must be a non-empty string when provided."
        );

    }

    if (
        provenance.language !== undefined &&
        !isNonEmptyString(
            provenance.language
        )
    ) {

        throw new TypeError(
            "Transcript acquisition provenance language must be a non-empty string when provided."
        );

    }

    if (
        provenance.capturedAt !== undefined &&
        !isTimestamp(
            provenance.capturedAt
        )
    ) {

        throw new TypeError(
            "Transcript acquisition provenance capturedAt must be a valid timestamp when provided."
        );

    }

}


function assertTranscript(
    value:
        unknown
): asserts value is CanonicalContentTranscript {

    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            "Transcript acquisition result transcript must be an object."
        );

    }

    const transcript =
        value as
            Record<string, unknown>;

    if (
        !isNonEmptyString(
            transcript.text
        )
    ) {

        throw new TypeError(
            "Transcript acquisition result text must be a non-empty string."
        );

    }

    assertTranscriptProvenance(
        transcript.provenance
    );

}


function assertRequest(
    request:
        ContentTranscriptAcquisitionRequest
): void {

    if (
        !request ||
        typeof request !== "object"
    ) {

        throw new TypeError(
            "Transcript acquisition request must be an object."
        );

    }

    assertCanonicalContentSourceRecord(
        request.source
    );

    if (
        request.preferredLanguage !== undefined &&
        !isNonEmptyString(
            request.preferredLanguage
        )
    ) {

        throw new TypeError(
            "Transcript acquisition preferredLanguage must be a non-empty string when provided."
        );

    }

}


function assertProvider(
    provider:
        ContentTranscriptAcquisitionProvider
): void {

    if (
        !provider ||
        typeof provider !== "object" ||
        !isNonEmptyString(
            provider.platform
        ) ||
        typeof provider.acquire !== "function"
    ) {

        throw new TypeError(
            "Transcript acquisition requires a valid provider."
        );

    }

}


export async function acquireContentTranscript(
    provider:
        ContentTranscriptAcquisitionProvider,
    request:
        ContentTranscriptAcquisitionRequest
): Promise<ContentTranscriptAcquisitionResult> {

    assertProvider(
        provider
    );

    assertRequest(
        request
    );

    if (
        provider.platform !==
        request.source.platform
    ) {

        throw new TypeError(
            "Transcript acquisition provider platform does not match the canonical source platform."
        );

    }

    const result =
        await provider.acquire(
            request
        );

    if (
        !result ||
        typeof result !== "object"
    ) {

        throw new TypeError(
            "Transcript acquisition provider returned an invalid result."
        );

    }

    if (
        result.sourceId !==
        request.source.sourceId
    ) {

        throw new TypeError(
            "Transcript acquisition result source identity does not match the requested canonical source."
        );

    }

    if (
        result.platform !==
        request.source.platform ||
        result.platform !==
        provider.platform
    ) {

        throw new TypeError(
            "Transcript acquisition result platform does not match the provider and canonical source."
        );

    }

    assertTranscript(
        result.transcript
    );

    if (
        result.transcript.provenance.type ===
            "unavailable"
    ) {

        throw new TypeError(
            "Unavailable transcript provenance cannot contain transcript text."
        );

    }

    return result;

}
