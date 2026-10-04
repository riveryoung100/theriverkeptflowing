import { requireRiverCrmRelationshipId } from "../river-os/crm-actions";
import {
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey
} from "./contact-attempt";
import type { InsurancePrivateContactRequest } from "./private-contact-request";
import type { InsuranceGrowthIntegrationContext } from "./integration-boundary";
import type { InsuranceContactOrchestrationRequest } from "./contact-orchestration";

export function prepareInsurancePrivateContactOrchestrationRequest(
    request: InsurancePrivateContactRequest,
    context: InsuranceGrowthIntegrationContext,
    attemptId: unknown,
    idempotencyKey: unknown
): InsuranceContactOrchestrationRequest {
    const requestRelationshipId = requireRiverCrmRelationshipId(request.relationshipId);
    const contextRelationshipId = requireRiverCrmRelationshipId(context.relationshipId);

    if (contextRelationshipId !== context.relationshipId) {
        throw new TypeError("Trusted insurance contact context requires a canonical relationship identity.");
    }

    if (requestRelationshipId !== contextRelationshipId) {
        throw new TypeError("Private contact request relationship identity does not match trusted context.");
    }

    return {
        context,
        attemptId: createInsuranceContactAttemptId(attemptId),
        idempotencyKey: createInsuranceContactIdempotencyKey(idempotencyKey),
        channel: request.channel,
        intent: request.intent
    };
}
