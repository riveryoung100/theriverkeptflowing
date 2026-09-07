import {
    CONTENT_SOURCE_PLATFORMS,
    type ContentSourcePlatform
} from "./canonical-content-source";


export interface ContentSourceDiscoveryProvenanceRecord {

    /**
     * River-owned immutable provenance identity.
     */
    readonly provenanceId:
        string;

    /**
     * River canonical source identity this provenance belongs to.
     */
    readonly sourceId:
        string;

    readonly platform:
        ContentSourcePlatform;

    /**
     * Provider-native discovery record identity.
     */
    readonly providerRecordId:
        string;

    /**
     * Timestamp reported by the discovery boundary.
     */
    readonly discoveredAt:
        string;

    /**
     * Timestamp when River captured this immutable provenance sidecar.
     */
    readonly capturedAt:
        string;

    /**
     * Raw provider-native metadata captured at discovery time.
     * This remains outside the canonical source record.
     */
    readonly providerMetadata?:
        Readonly<Record<string, unknown>>;

    /**
     * Explicit invariant: provenance never replaces or mutates
     * the originally published source.
     */
    readonly originalSourcePreserved:
        true;

}


export interface ContentSourceDiscoveryProvenanceValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly string[];

}


export interface CreateContentSourceDiscoveryProvenanceInput {

    readonly sourceId:
        string;

    readonly platform:
        ContentSourcePlatform;

    readonly providerRecordId:
        string;

    readonly discoveredAt:
        string;

    readonly providerMetadata?:
        Readonly<Record<string, unknown>>;

}


export interface CreateContentSourceDiscoveryProvenanceOptions {

    readonly now?:
        string;

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


function isPlainRecord(
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


function isJsonCompatible(
    value:
        unknown,
    seen:
        Set<object> = new Set()
): boolean {

    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    ) {

        return true;

    }

    if (
        typeof value === "number"
    ) {

        return Number.isFinite(
            value
        );

    }

    if (
        typeof value !== "object"
    ) {

        return false;

    }

    if (
        seen.has(
            value
        )
    ) {

        return false;

    }

    seen.add(
        value
    );

    if (
        Array.isArray(
            value
        )
    ) {

        return value.every(
            (item) =>
                isJsonCompatible(
                    item,
                    seen
                )
        );

    }

    const record =
        value as
            Record<string, unknown>;

    return Object.values(
        record
    )
        .every(
            (item) =>
                isJsonCompatible(
                    item,
                    seen
                )
        );

}


function createProvenanceId(
    sourceId:
        string,
    providerRecordId:
        string
): string {

    return (
        `discovery-provenance:${sourceId}:${providerRecordId}`
    );

}


export function createContentSourceDiscoveryProvenanceRecord(
    input:
        CreateContentSourceDiscoveryProvenanceInput,
    options:
        CreateContentSourceDiscoveryProvenanceOptions = {}
): ContentSourceDiscoveryProvenanceRecord {

    const record:
        ContentSourceDiscoveryProvenanceRecord =
        {
            provenanceId:
                createProvenanceId(
                    input.sourceId,
                    input.providerRecordId
                ),

            sourceId:
                input.sourceId,

            platform:
                input.platform,

            providerRecordId:
                input.providerRecordId,

            discoveredAt:
                input.discoveredAt,

            capturedAt:
                options.now ??
                new Date()
                    .toISOString(),

            ...(
                input.providerMetadata === undefined
                    ? {}
                    : {
                        providerMetadata:
                            input.providerMetadata
                    }
            ),

            originalSourcePreserved:
                true
        };

    assertContentSourceDiscoveryProvenanceRecord(
        record
    );

    return record;

}


export function validateContentSourceDiscoveryProvenanceRecord(
    value:
        unknown
): ContentSourceDiscoveryProvenanceValidationResult {

    const issues:
        string[] = [];

    if (
        !isPlainRecord(
            value
        )
    ) {

        return {
            valid:
                false,

            issues: [
                "Content source discovery provenance record must be an object."
            ]
        };

    }

    const record =
        value;

    if (
        !isNonEmptyString(
            record.provenanceId
        ) ||
        !record.provenanceId.startsWith(
            "discovery-provenance:source:"
        )
    ) {

        issues.push(
            "provenanceId must be a valid River discovery provenance identifier."
        );

    }

    if (
        !isNonEmptyString(
            record.sourceId
        ) ||
        !record.sourceId.startsWith(
            "source:"
        )
    ) {

        issues.push(
            "sourceId must be a valid River source identifier."
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

    if (
        !isNonEmptyString(
            record.providerRecordId
        )
    ) {

        issues.push(
            "providerRecordId must be a non-empty string."
        );

    }

    if (
        !isTimestamp(
            record.discoveredAt
        )
    ) {

        issues.push(
            "discoveredAt must be a valid timestamp."
        );

    }

    if (
        !isTimestamp(
            record.capturedAt
        )
    ) {

        issues.push(
            "capturedAt must be a valid timestamp."
        );

    }

    if (
        record.providerMetadata !== undefined &&
        (
            !isPlainRecord(
                record.providerMetadata
            ) ||
            !isJsonCompatible(
                record.providerMetadata
            )
        )
    ) {

        issues.push(
            "providerMetadata must be a JSON-compatible object when provided."
        );

    }

    if (
        record.originalSourcePreserved !==
        true
    ) {

        issues.push(
            "originalSourcePreserved must be true."
        );

    }

    if (
        isNonEmptyString(
            record.sourceId
        ) &&
        isNonEmptyString(
            record.providerRecordId
        )
    ) {

        const expected =
            createProvenanceId(
                record.sourceId,
                record.providerRecordId
            );

        if (
            record.provenanceId !==
            expected
        ) {

            issues.push(
                "provenanceId must deterministically match sourceId and providerRecordId."
            );

        }

    }

    return {
        valid:
            issues.length === 0,

        issues
    };

}


export function assertContentSourceDiscoveryProvenanceRecord(
    value:
        unknown
): asserts value is ContentSourceDiscoveryProvenanceRecord {

    const validation =
        validateContentSourceDiscoveryProvenanceRecord(
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
