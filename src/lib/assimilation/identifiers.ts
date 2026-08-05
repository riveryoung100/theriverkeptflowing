import type {
    AssetId,
    AssimilationRecordId,
    ClassificationId,
    DerivativeId,
    ExtractionId,
    ReviewId,
    SegmentId,
    TransformationId
} from "./types";


export type AssimilationIdPrefix =
    | "asset"
    | "extraction"
    | "segment"
    | "classification"
    | "transformation"
    | "derivative"
    | "review";


const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const ASSIMILATION_ID_PATTERN =
    /^(asset|extraction|segment|classification|transformation|derivative|review):([0-9a-f-]+)$/i;


function createUuid(): string {

    if (
        typeof globalThis.crypto ===
            "undefined" ||
        typeof globalThis.crypto.randomUUID !==
            "function"
    ) {

        throw new Error(
            "A runtime with crypto.randomUUID() is required to create assimilation identifiers."
        );

    }


    return globalThis.crypto.randomUUID();

}


export function createAssimilationId(
    prefix: AssimilationIdPrefix
): AssimilationRecordId {

    return `${prefix}:${createUuid()}` as
        AssimilationRecordId;

}


export function createAssetId(): AssetId {

    return createAssimilationId(
        "asset"
    ) as AssetId;

}


export function createExtractionId():
ExtractionId {

    return createAssimilationId(
        "extraction"
    ) as ExtractionId;

}


export function createSegmentId(): SegmentId {

    return createAssimilationId(
        "segment"
    ) as SegmentId;

}


export function createClassificationId():
ClassificationId {

    return createAssimilationId(
        "classification"
    ) as ClassificationId;

}


export function createTransformationId():
TransformationId {

    return createAssimilationId(
        "transformation"
    ) as TransformationId;

}


export function createDerivativeId():
DerivativeId {

    return createAssimilationId(
        "derivative"
    ) as DerivativeId;

}


export function createReviewId(): ReviewId {

    return createAssimilationId(
        "review"
    ) as ReviewId;

}


export function getAssimilationIdPrefix(
    value: string
): AssimilationIdPrefix | null {

    const match =
        ASSIMILATION_ID_PATTERN.exec(
            value.trim()
        );


    if (!match) {

        return null;

    }


    return match[1].toLowerCase() as
        AssimilationIdPrefix;

}


export function getAssimilationUuid(
    value: string
): string | null {

    const match =
        ASSIMILATION_ID_PATTERN.exec(
            value.trim()
        );


    if (
        !match ||
        !UUID_PATTERN.test(
            match[2]
        )
    ) {

        return null;

    }


    return match[2].toLowerCase();

}


export function isAssimilationRecordId(
    value: unknown
): value is AssimilationRecordId {

    if (
        typeof value !==
        "string"
    ) {

        return false;

    }


    const match =
        ASSIMILATION_ID_PATTERN.exec(
            value.trim()
        );


    return (
        Boolean(match) &&
        UUID_PATTERN.test(
            match?.[2] ?? ""
        )
    );

}


export function hasAssimilationIdPrefix(
    value: unknown,
    prefix: AssimilationIdPrefix
): boolean {

    return (
        isAssimilationRecordId(
            value
        ) &&
        getAssimilationIdPrefix(
            value
        ) ===
            prefix
    );

}


export function isAssetId(
    value: unknown
): value is AssetId {

    return hasAssimilationIdPrefix(
        value,
        "asset"
    );

}


export function isExtractionId(
    value: unknown
): value is ExtractionId {

    return hasAssimilationIdPrefix(
        value,
        "extraction"
    );

}


export function isSegmentId(
    value: unknown
): value is SegmentId {

    return hasAssimilationIdPrefix(
        value,
        "segment"
    );

}


export function isClassificationId(
    value: unknown
): value is ClassificationId {

    return hasAssimilationIdPrefix(
        value,
        "classification"
    );

}


export function isTransformationId(
    value: unknown
): value is TransformationId {

    return hasAssimilationIdPrefix(
        value,
        "transformation"
    );

}


export function isDerivativeId(
    value: unknown
): value is DerivativeId {

    return hasAssimilationIdPrefix(
        value,
        "derivative"
    );

}


export function isReviewId(
    value: unknown
): value is ReviewId {

    return hasAssimilationIdPrefix(
        value,
        "review"
    );

}


export function assertAssimilationRecordId(
    value: unknown
): asserts value is AssimilationRecordId {

    if (
        !isAssimilationRecordId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid assimilation record identifier."
        );

    }

}


export function assertAssetId(
    value: unknown
): asserts value is AssetId {

    if (
        !isAssetId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid asset identifier."
        );

    }

}


export function assertExtractionId(
    value: unknown
): asserts value is ExtractionId {

    if (
        !isExtractionId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid extraction identifier."
        );

    }

}


export function assertSegmentId(
    value: unknown
): asserts value is SegmentId {

    if (
        !isSegmentId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid segment identifier."
        );

    }

}


export function assertClassificationId(
    value: unknown
): asserts value is ClassificationId {

    if (
        !isClassificationId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid classification identifier."
        );

    }

}


export function assertTransformationId(
    value: unknown
): asserts value is TransformationId {

    if (
        !isTransformationId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid transformation identifier."
        );

    }

}


export function assertDerivativeId(
    value: unknown
): asserts value is DerivativeId {

    if (
        !isDerivativeId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid derivative identifier."
        );

    }

}


export function assertReviewId(
    value: unknown
): asserts value is ReviewId {

    if (
        !isReviewId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid review identifier."
        );

    }

}