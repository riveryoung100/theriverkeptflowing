import type {
    SegmentationEngineResult
} from "./types";

export interface SegmentationValidationIssue {

    readonly code: string;

    readonly message: string;

}

export interface SegmentationValidationResult {

    readonly valid: boolean;

    readonly issues:
        readonly SegmentationValidationIssue[];

}

export function validateSegmentationResult(
    result: SegmentationEngineResult
): SegmentationValidationResult {

    const issues:
        SegmentationValidationIssue[] =
        [];

    if (
        result.results.length === 0
    ) {

        issues.push({

            code:
                "segmentation.empty",

            message:
                "Segmentation produced no segments."

        });

    }

    return {

        valid:
            issues.length === 0,

        issues

    };

}
