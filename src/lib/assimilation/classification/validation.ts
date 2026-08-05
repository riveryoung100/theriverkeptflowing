import type {
    ClassificationEngineResult
} from "./types";

export interface ClassificationValidationIssue {

    readonly code: string;

    readonly message: string;

}

export interface ClassificationValidationResult {

    readonly valid: boolean;

    readonly issues:
        readonly ClassificationValidationIssue[];

}

export function validateClassificationResult(
    result: ClassificationEngineResult
): ClassificationValidationResult {

    const issues:
        ClassificationValidationIssue[] =
        [];

    if (
        result.results.length === 0
    ) {

        issues.push({

            code:
                "classification.empty",

            message:
                "Classification produced no classifications."

        });

    }

    return {

        valid:
            issues.length === 0,

        issues

    };

}
