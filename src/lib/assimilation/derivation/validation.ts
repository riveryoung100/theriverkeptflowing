import {
    isAssetId,
    isClassificationId,
    isDerivativeId,
    isSegmentId,
    isTransformationId
} from "../identifiers";

import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import {
    isIsoUtcTimestamp
} from "../validation";

import type {
    DerivationEngineResult,
    DerivationRequest
} from "./types";


export interface DerivationValidationIssue {

    readonly code:
        string;

    readonly message:
        string;

    readonly path:
        string;

}


export interface DerivationValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly DerivationValidationIssue[];

}


function issue(
    code: string,
    message: string,
    path: string
): DerivationValidationIssue {

    return {
        code,
        message,
        path
    };

}


function hasDuplicates(
    values: readonly string[]
): boolean {

    return (
        new Set(
            values
        ).size !==
        values.length
    );

}


export function validateDerivationRequest(
    request: DerivationRequest
): DerivationValidationResult {

    const issues:
        DerivationValidationIssue[] =
        [];

    if (
        !isAssetId(
            request.assetId
        )
    ) {

        issues.push(
            issue(
                "derivation.request.asset-id.invalid",
                "assetId must be a valid asset identifier.",
                "request.assetId"
            )
        );

    }

    if (
        request.objectId.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "derivation.request.object-id.empty",
                "objectId cannot be empty.",
                "request.objectId"
            )
        );

    }

    if (
        request.sourceSegmentIds.length ===
        0
    ) {

        issues.push(
            issue(
                "derivation.request.segments.empty",
                "At least one source segment is required.",
                "request.sourceSegmentIds"
            )
        );

    }

    for (
        const segmentId of
        request.sourceSegmentIds
    ) {

        if (
            !isSegmentId(
                segmentId
            )
        ) {

            issues.push(
                issue(
                    "derivation.request.segment-id.invalid",
                    `Invalid source segment identifier: ${segmentId}`,
                    "request.sourceSegmentIds"
                )
            );

        }

    }

    if (
        hasDuplicates(
            request.sourceSegmentIds
        )
    ) {

        issues.push(
            issue(
                "derivation.request.segments.duplicate",
                "sourceSegmentIds cannot contain duplicates.",
                "request.sourceSegmentIds"
            )
        );

    }

    for (
        const classificationId of
        request.sourceClassificationIds
    ) {

        if (
            !isClassificationId(
                classificationId
            )
        ) {

            issues.push(
                issue(
                    "derivation.request.classification-id.invalid",
                    `Invalid source classification identifier: ${classificationId}`,
                    "request.sourceClassificationIds"
                )
            );

        }

    }

    if (
        hasDuplicates(
            request.sourceClassificationIds
        )
    ) {

        issues.push(
            issue(
                "derivation.request.classifications.duplicate",
                "sourceClassificationIds cannot contain duplicates.",
                "request.sourceClassificationIds"
            )
        );

    }

    if (
        !isTransformationId(
            request.transformationId
        )
    ) {

        issues.push(
            issue(
                "derivation.request.transformation-id.invalid",
                "transformationId must be a valid transformation identifier.",
                "request.transformationId"
            )
        );

    }

    if (
        !isIsoUtcTimestamp(
            request.requestedAt
        )
    ) {

        issues.push(
            issue(
                "derivation.request.timestamp.invalid",
                "requestedAt must be a UTC ISO 8601 timestamp.",
                "request.requestedAt"
            )
        );

    }

    return {

        valid:
            issues.length === 0,

        issues

    };

}


export function validateDerivationResult(
    result: DerivationEngineResult
): DerivationValidationResult {

    const issues:
        DerivationValidationIssue[] =
        [];

    if (
        !isDerivativeId(
            result.derivationId
        )
    ) {

        issues.push(
            issue(
                "derivation.result.id.invalid",
                "derivationId must be a valid derivative identifier.",
                "result.derivationId"
            )
        );

    }

    if (
        !isAssetId(
            result.assetId
        )
    ) {

        issues.push(
            issue(
                "derivation.result.asset-id.invalid",
                "assetId must be a valid asset identifier.",
                "result.assetId"
            )
        );

    }

    if (
        result.status ===
            "completed" &&
        result.results.length ===
            0
    ) {

        issues.push(
            issue(
                "derivation.result.empty",
                "A completed derivation must contain at least one result.",
                "result.results"
            )
        );

    }

    for (
        const item of
        result.results
    ) {

        const derivative =
            item.derivative;

        if (
            !isDerivativeId(
                derivative.id
            )
        ) {

            issues.push(
                issue(
                    "derivation.derivative.id.invalid",
                    "Derived object ID must be a valid derivative identifier.",
                    "result.results.derivative.id"
                )
            );

        }

        if (
            derivative.id !==
            result.derivationId
        ) {

            issues.push(
                issue(
                    "derivation.derivative.id-mismatch",
                    "Derived object ID must match the derivation result ID.",
                    "result.results.derivative.id"
                )
            );

        }

        if (
            derivative.assetId !==
            result.assetId
        ) {

            issues.push(
                issue(
                    "derivation.derivative.asset-mismatch",
                    "Derived object assetId must match the result assetId.",
                    "result.results.derivative.assetId"
                )
            );

        }

        if (
            derivative.objectId.trim().length ===
            0
        ) {

            issues.push(
                issue(
                    "derivation.derivative.object-id.empty",
                    "Derived object objectId cannot be empty.",
                    "result.results.derivative.objectId"
                )
            );

        }

        if (
            derivative.sourceSegmentIds.length ===
            0
        ) {

            issues.push(
                issue(
                    "derivation.derivative.segments.empty",
                    "Derived objects must reference at least one source segment.",
                    "result.results.derivative.sourceSegmentIds"
                )
            );

        }

        for (
            const segmentId of
            derivative.sourceSegmentIds
        ) {

            if (
                !isSegmentId(
                    segmentId
                )
            ) {

                issues.push(
                    issue(
                        "derivation.derivative.segment-id.invalid",
                        `Invalid derivative source segment: ${segmentId}`,
                        "result.results.derivative.sourceSegmentIds"
                    )
                );

            }

        }

        if (
            !isTransformationId(
                derivative.transformationId
            )
        ) {

            issues.push(
                issue(
                    "derivation.derivative.transformation-id.invalid",
                    "Derived objects must reference a valid transformation.",
                    "result.results.derivative.transformationId"
                )
            );

        }

        if (
            !isIsoUtcTimestamp(
                derivative.createdAt
            )
        ) {

            issues.push(
                issue(
                    "derivation.derivative.timestamp.invalid",
                    "Derived object createdAt must be a UTC ISO 8601 timestamp.",
                    "result.results.derivative.createdAt"
                )
            );

        }

        if (
            derivative.version < 1 ||
            !Number.isInteger(
                derivative.version
            )
        ) {

            issues.push(
                issue(
                    "derivation.derivative.version.invalid",
                    "Derived object version must be a positive integer.",
                    "result.results.derivative.version"
                )
            );

        }

        if (
            derivative.schemaVersion !==
            ASSIMILATION_SCHEMA_VERSION
        ) {

            issues.push(
                issue(
                    "derivation.derivative.schema-version.invalid",
                    `Expected schema version ${ASSIMILATION_SCHEMA_VERSION}.`,
                    "result.results.derivative.schemaVersion"
                )
            );

        }

    }

    return {

        valid:
            issues.length === 0,

        issues

    };

}
