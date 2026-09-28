import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmAcquisitionAttribution,
    createRiverCrmContactConsent,
    createRiverCrmRelationshipEvent
} from "./crm-growth-contracts";

test(
    "River CRM accepts and normalizes acquisition attribution",
    () => {
        const attribution =
            createRiverCrmAcquisitionAttribution({
                relationshipId:
                    "relationship:lead:insurance-001",
                source:
                    "  google-search  ",
                campaign:
                    "  west-texas-auto  ",
                utmSource:
                    "  google  ",
                capturedAt:
                    "2026-09-28T12:00:00-05:00",
                updatedAt:
                    "2026-09-28T17:00:00.000Z"
            });

        assert.equal(
            attribution.relationshipId,
            "relationship:lead:insurance-001"
        );

        assert.equal(
            attribution.source,
            "google-search"
        );

        assert.equal(
            attribution.campaign,
            "west-texas-auto"
        );

        assert.equal(
            attribution.utmSource,
            "google"
        );

        assert.equal(
            attribution.capturedAt,
            "2026-09-28T17:00:00.000Z"
        );
    }
);

test(
    "River CRM rejects invalid canonical relationship identity",
    () => {
        assert.throws(
            () =>
                createRiverCrmAcquisitionAttribution({
                    relationshipId:
                        "lead:insurance-001",
                    source:
                        "website",
                    capturedAt:
                        "2026-09-28T17:00:00.000Z",
                    updatedAt:
                        "2026-09-28T17:00:00.000Z"
                }),
            /relationship identity/
        );
    }
);

test(
    "River CRM omits blank optional acquisition text",
    () => {
        const attribution =
            createRiverCrmAcquisitionAttribution({
                relationshipId:
                    "relationship:lead:insurance-002",
                source:
                    "website",
                campaign:
                    "   ",
                capturedAt:
                    "2026-09-28T17:00:00.000Z",
                updatedAt:
                    "2026-09-28T17:00:00.000Z"
            });

        assert.equal(
            "campaign" in attribution,
            false
        );
    }
);

test(
    "River CRM rejects invalid or reversed acquisition timestamps",
    () => {
        assert.throws(
            () =>
                createRiverCrmAcquisitionAttribution({
                    relationshipId:
                        "relationship:lead:insurance-003",
                    source:
                        "website",
                    capturedAt:
                        "not-a-date",
                    updatedAt:
                        "2026-09-28T17:00:00.000Z"
                }),
            /valid timestamp/
        );

        assert.throws(
            () =>
                createRiverCrmAcquisitionAttribution({
                    relationshipId:
                        "relationship:lead:insurance-003",
                    source:
                        "website",
                    capturedAt:
                        "2026-09-28T18:00:00.000Z",
                    updatedAt:
                        "2026-09-28T17:00:00.000Z"
                }),
            /not to precede/
        );
    }
);

test(
    "River CRM accepts granted channel-specific consent and explicit suppression",
    () => {
        const consent =
            createRiverCrmContactConsent({
                consentId:
                    "consent:insurance-001",
                relationshipId:
                    "relationship:lead:insurance-001",
                channel:
                    "phone",
                status:
                    "granted",
                consentTextVersion:
                    " quote-form-v1 ",
                consentSource:
                    " website-quote-form ",
                capturedAt:
                    "2026-09-28T17:00:00.000Z",
                doNotContact:
                    true,
                createdAt:
                    "2026-09-28T17:00:00.000Z",
                updatedAt:
                    "2026-09-28T17:00:00.000Z"
            });

        assert.equal(
            consent.channel,
            "phone"
        );

        assert.equal(
            consent.status,
            "granted"
        );

        assert.equal(
            consent.doNotContact,
            true
        );

        assert.equal(
            consent.consentTextVersion,
            "quote-form-v1"
        );
    }
);

test(
    "River CRM enforces revoked consent timestamp rules",
    () => {
        const base = {
            consentId:
                "consent:insurance-002",
            relationshipId:
                "relationship:lead:insurance-002",
            channel:
                "sms",
            consentSource:
                "website",
            capturedAt:
                "2026-09-28T17:00:00.000Z",
            doNotContact:
                true,
            createdAt:
                "2026-09-28T17:00:00.000Z",
            updatedAt:
                "2026-09-28T18:00:00.000Z"
        };

        assert.throws(
            () =>
                createRiverCrmContactConsent({
                    ...base,
                    status:
                        "revoked"
                }),
            /requires revokedAt/
        );

        assert.throws(
            () =>
                createRiverCrmContactConsent({
                    ...base,
                    status:
                        "granted",
                    revokedAt:
                        "2026-09-28T18:00:00.000Z"
                }),
            /must not include revokedAt/
        );

        assert.throws(
            () =>
                createRiverCrmContactConsent({
                    ...base,
                    status:
                        "revoked",
                    revokedAt:
                        "2026-09-28T16:00:00.000Z"
                }),
            /not to precede capturedAt/
        );
    }
);

test(
    "River CRM rejects consent update timestamps before creation",
    () => {
        assert.throws(
            () =>
                createRiverCrmContactConsent({
                    consentId:
                        "consent:insurance-003",
                    relationshipId:
                        "relationship:lead:insurance-003",
                    channel:
                        "email",
                    status:
                        "unknown",
                    consentSource:
                        "manual",
                    capturedAt:
                        "2026-09-28T17:00:00.000Z",
                    doNotContact:
                        false,
                    createdAt:
                        "2026-09-28T18:00:00.000Z",
                    updatedAt:
                        "2026-09-28T17:00:00.000Z"
                }),
            /not to precede createdAt/
        );
    }
);

test(
    "River CRM accepts a valid immutable relationship event contract",
    () => {
        const event =
            createRiverCrmRelationshipEvent({
                eventId:
                    "crm-event:insurance-001",
                relationshipId:
                    "relationship:lead:insurance-001",
                eventType:
                    "quote-requested",
                occurredAt:
                    "2026-09-28T17:00:00.000Z",
                source:
                    " website ",
                externalReference:
                    " vendor-123 ",
                metadata: {
                    productInterest:
                        "auto",
                    attempt:
                        1
                }
            });

        assert.equal(
            event.eventType,
            "quote-requested"
        );

        assert.equal(
            event.source,
            "website"
        );

        assert.equal(
            event.externalReference,
            "vendor-123"
        );
    }
);

test(
    "River CRM rejects unsupported event types",
    () => {
        assert.throws(
            () =>
                createRiverCrmRelationshipEvent({
                    eventId:
                        "crm-event:insurance-002",
                    relationshipId:
                        "relationship:lead:insurance-002",
                    eventType:
                        "random-event",
                    occurredAt:
                        "2026-09-28T17:00:00.000Z",
                    source:
                        "website"
                }),
            /event type is not supported/
        );
    }
);

test(
    "River CRM rejects non JSON-compatible event metadata",
    () => {
        assert.throws(
            () =>
                createRiverCrmRelationshipEvent({
                    eventId:
                        "crm-event:insurance-003",
                    relationshipId:
                        "relationship:lead:insurance-003",
                    eventType:
                        "lead-created",
                    occurredAt:
                        "2026-09-28T17:00:00.000Z",
                    source:
                        "website",
                    metadata: {
                        invalid:
                            1n
                    }
                }),
            /JSON-compatible/
        );
    }
);
