import type {
    ExtractionEngineResult
} from "./types";

export interface ExtractionValidationIssue {

    readonly code: string;

    readonly message: string;

}

export interface ExtractionValidationResult {

    readonly valid: boolean;

    readonly issues:
        readonly ExtractionValidationIssue[];

}

export function validateExtractionResult(
    result: ExtractionEngineResult
): ExtractionValidationResult {

    const issues:
        ExtractionValidationIssue[] =
        [];

    if (
        result.results.length === 0
    ) {

        issues.push({

            code:
                "extraction.empty",

            message:
                "Extraction produced no results."

        });

    }

    return {

        valid:
            issues.length === 0,

        issues

    };

}
