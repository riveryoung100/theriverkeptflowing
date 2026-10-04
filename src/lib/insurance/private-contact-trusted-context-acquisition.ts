import { requireRiverCrmRelationshipId } from "../river-os/crm-actions";
import { RIVER_CRM_CONTACT_CHANNELS, RIVER_CRM_CONSENT_STATUSES } from "../river-os/crm-growth-contracts";
import type { RiverCrmRelationshipId } from "../river-os/crm-growth-contracts";
import type { D1InsuranceLeadPresentationPersistence } from "./d1-lead-presentation";
import { createInsuranceGrowthIntegrationContext } from "./integration-boundary";
import type { InsuranceGrowthIntegrationContext } from "./integration-boundary";
import { INSURANCE_PRODUCT_INTERESTS, INSURANCE_QUOTE_STATUSES } from "./lead-profile";
import type { InsuranceLeadPresentation } from "./lead-presentation";
import type { InsurancePrivateContactRequest } from "./private-contact-request";

const stateCodes = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
]);

function record(value: unknown): Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Insurance context evidence must be an object.");
    }
    return value as Record<string, unknown>;
}

function canonicalText(value: unknown): string {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
        throw new TypeError("Insurance context evidence requires canonical nonempty text.");
    }
    return value;
}

function enumEvidence(value: unknown, allowed: readonly string[]): void {
    if (!allowed.includes(canonicalText(value))) {
        throw new TypeError("Insurance context evidence contains an unsupported enum value.");
    }
}

function booleanEvidence(value: unknown): void {
    if (typeof value !== "boolean") {
        throw new TypeError("Insurance context suppression evidence must be boolean.");
    }
}

export async function acquireInsurancePrivateContactTrustedContext(
    request: InsurancePrivateContactRequest,
    reader: D1InsuranceLeadPresentationPersistence
): Promise<InsuranceGrowthIntegrationContext> {
    const relationshipId = requireRiverCrmRelationshipId(request.relationshipId);
    const results = await reader.listForRelationships([relationshipId as RiverCrmRelationshipId]);
    if (!Array.isArray(results) || results.length !== 1) {
        throw new TypeError("Insurance context acquisition requires exactly one presentation.");
    }
    const presentation = record(results[0]);
    const presentationId = canonicalText(presentation.relationshipId);
    if (requireRiverCrmRelationshipId(presentationId) !== presentationId || presentationId !== relationshipId) {
        throw new TypeError("Insurance context presentation relationship identity must match the request.");
    }
    enumEvidence(presentation.productInterest, INSURANCE_PRODUCT_INTERESTS);
    enumEvidence(presentation.quoteStatus, INSURANCE_QUOTE_STATUSES);
    if (!stateCodes.has(canonicalText(presentation.state))) {
        throw new TypeError("Insurance context evidence requires a canonical US state code.");
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(canonicalText(presentation.postalCode))) {
        throw new TypeError("Insurance context evidence requires a canonical ZIP or ZIP+4.");
    }
    for (const field of ["acquisitionSource", "campaign"] as const) {
        if (presentation[field] !== undefined) canonicalText(presentation[field]);
    }
    booleanEvidence(presentation.doNotContact);
    if (!Array.isArray(presentation.consentChannels)) {
        throw new TypeError("Insurance context evidence requires consent channels.");
    }
    for (const value of presentation.consentChannels) {
        const consent = record(value);
        enumEvidence(consent.channel, RIVER_CRM_CONTACT_CHANNELS);
        enumEvidence(consent.status, RIVER_CRM_CONSENT_STATUSES);
        booleanEvidence(consent.doNotContact);
    }
    return createInsuranceGrowthIntegrationContext(presentation as unknown as InsuranceLeadPresentation);
}
