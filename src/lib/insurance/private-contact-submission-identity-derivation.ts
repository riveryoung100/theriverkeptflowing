import {
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey
} from "./contact-attempt";
import type {
    InsuranceContactAttemptId,
    InsuranceContactIdempotencyKey
} from "./contact-attempt";

export function deriveInsurancePrivateContactSubmissionIdentities(
    submissionToken: unknown
): {
    attemptId: InsuranceContactAttemptId;
    idempotencyKey: InsuranceContactIdempotencyKey;
} {
    if (
        typeof submissionToken !== "string" ||
        submissionToken.length === 0 ||
        submissionToken.trim() !== submissionToken
    ) {
        throw new TypeError("Private contact submission token must be canonical nonempty text.");
    }

    return {
        attemptId: createInsuranceContactAttemptId(`contact-attempt:${submissionToken}`),
        idempotencyKey: createInsuranceContactIdempotencyKey(`private-contact:${submissionToken}`)
    };
}
