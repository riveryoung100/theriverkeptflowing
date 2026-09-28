import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceCallbackRequestedEvent,
    createInsuranceGrowthIntegrationContext,
    createInsuranceGrowthIntegrationHandoff,
    INSURANCE_CALLBACK_NOTE_MAX_LENGTH
} from "./integration-boundary";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";


const relationshipId=
    "relationship:insurance-integration-1";

function presentation(
    overrides:
        Partial<InsuranceLeadPresentation> =
            {}
): InsuranceLeadPresentation {
    return {
        relationshipId,
        state:
            "TX",
        postalCode:
            "79720",
        productInterest:
            "home",
        quoteStatus:
            "requested",
        acquisitionSource:
            "website",
        campaign:
            "West Texas Home",
        consentChannels: [
            {
                channel:
                    "phone",
                status:
                    "granted",
                doNotContact:
                    false
            },
            {
                channel:
                    "email",
                status:
                    "revoked",
                doNotContact:
                    true
            }
        ],
        doNotContact:
            true,
        recentEvents:
            [],
        ...overrides
    };
}


test(
    "integration context preserves canonical insurance presentation facts",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation()
            );

        assert.equal(
            context.relationshipId,
            relationshipId
        );

        assert.equal(
            context.productInterest,
            "home"
        );

        assert.equal(
            context.quoteStatus,
            "requested"
        );

        assert.equal(
            context.state,
            "TX"
        );

        assert.equal(
            context.postalCode,
            "79720"
        );

        assert.equal(
            context.acquisitionSource,
            "website"
        );

        assert.equal(
            context.campaign,
            "West Texas Home"
        );

        assert.equal(
            context.doNotContact,
            true
        );
    }
);


test(
    "integration context preserves consent channel status and suppression",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation()
            );

        assert.deepEqual(
            context.contactChannels,
            [
                {
                    channel:
                        "phone",
                    status:
                        "granted",
                    doNotContact:
                        false
                },
                {
                    channel:
                        "email",
                    status:
                        "revoked",
                    doNotContact:
                        true
                }
            ]
        );
    }
);


test(
    "integration context does not invent missing acquisition context",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation({
                    acquisitionSource:
                        undefined,
                    campaign:
                        undefined
                })
            );

        assert.equal(
            "acquisitionSource" in context,
            false
        );

        assert.equal(
            "campaign" in context,
            false
        );
    }
);


test(
    "integration context does not duplicate generic CRM fields",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation()
            );

        const keys=
            Object.keys(
                context
            );

        for(const forbidden of [
            "displayName",
            "email",
            "phone",
            "kind",
            "stage",
            "owner",
            "nextFollowUpAt",
            "appointmentAt"
        ]){
            assert.equal(
                keys.includes(
                    forbidden
                ),
                false
            );
        }
    }
);


test(
    "callback request builds canonical callback-requested event",
    () => {
        const event=
            createInsuranceCallbackRequestedEvent({
                eventId:
                    "crm-event:callback-1",
                relationshipId,
                occurredAt:
                    "2026-09-28T18:00:00.000Z",
                source:
                    "river-os",
                requestedChannel:
                    "phone",
                requestedAt:
                    "2026-09-28T18:30:00.000Z",
                notes:
                    "Call after work."
            });

        assert.equal(
            event.eventId,
            "crm-event:callback-1"
        );

        assert.equal(
            event.relationshipId,
            relationshipId
        );

        assert.equal(
            event.eventType,
            "callback-requested"
        );

        assert.equal(
            event.source,
            "river-os"
        );

        assert.deepEqual(
            event.metadata,
            {
                requestedChannel:
                    "phone",
                requestedAt:
                    "2026-09-28T18:30:00.000Z",
                notes:
                    "Call after work."
            }
        );
    }
);


test(
    "callback request preserves optional provider external reference without replacing canonical identity",
    () => {
        const event=
            createInsuranceCallbackRequestedEvent({
                eventId:
                    "crm-event:callback-2",
                relationshipId,
                occurredAt:
                    "2026-09-28T18:00:00.000Z",
                source:
                    "provider-adapter",
                externalReference:
                    " provider-event-123 "
            });

        assert.equal(
            event.relationshipId,
            relationshipId
        );

        assert.equal(
            event.externalReference,
            "provider-event-123"
        );

        assert.notEqual(
            event.externalReference,
            event.relationshipId
        );
    }
);


test(
    "callback request rejects blank external reference",
    () => {
        assert.throws(
            () =>
                createInsuranceCallbackRequestedEvent({
                    eventId:
                        "crm-event:callback-3",
                    relationshipId,
                    occurredAt:
                        "2026-09-28T18:00:00.000Z",
                    source:
                        "provider-adapter",
                    externalReference:
                        "   "
                }),
            /external reference must be non-empty text/
        );
    }
);


test(
    "callback request rejects unsupported requested channel",
    () => {
        assert.throws(
            () =>
                createInsuranceCallbackRequestedEvent({
                    eventId:
                        "crm-event:callback-4",
                    relationshipId,
                    occurredAt:
                        "2026-09-28T18:00:00.000Z",
                    source:
                        "river-os",
                    requestedChannel:
                        "whatsapp"
                }),
            /requestedChannel must be phone, sms, or email/
        );
    }
);


test(
    "callback request rejects malformed requestedAt",
    () => {
        assert.throws(
            () =>
                createInsuranceCallbackRequestedEvent({
                    eventId:
                        "crm-event:callback-5",
                    relationshipId,
                    occurredAt:
                        "2026-09-28T18:00:00.000Z",
                    source:
                        "river-os",
                    requestedAt:
                        "tomorrow-ish"
                }),
            /requestedAt must be a valid timestamp/
        );
    }
);


test(
    "callback request rejects oversized notes",
    () => {
        assert.throws(
            () =>
                createInsuranceCallbackRequestedEvent({
                    eventId:
                        "crm-event:callback-6",
                    relationshipId,
                    occurredAt:
                        "2026-09-28T18:00:00.000Z",
                    source:
                        "river-os",
                    notes:
                        "x".repeat(
                            INSURANCE_CALLBACK_NOTE_MAX_LENGTH +
                            1
                        )
                }),
            /must not exceed/
        );
    }
);


test(
    "callback request omits metadata when no optional callback details exist",
    () => {
        const event=
            createInsuranceCallbackRequestedEvent({
                eventId:
                    "crm-event:callback-7",
                relationshipId,
                occurredAt:
                    "2026-09-28T18:00:00.000Z",
                source:
                    "river-os"
            });

        assert.equal(
            "metadata" in event,
            false
        );

        assert.equal(
            "externalReference" in event,
            false
        );
    }
);


test(
    "integration handoff binds matching context and canonical trigger event",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation()
            );

        const event=
            createInsuranceCallbackRequestedEvent({
                eventId:
                    "crm-event:callback-8",
                relationshipId,
                occurredAt:
                    "2026-09-28T18:00:00.000Z",
                source:
                    "river-os"
            });

        const handoff=
            createInsuranceGrowthIntegrationHandoff(
                context,
                event
            );

        assert.equal(
            handoff.context,
            context
        );

        assert.equal(
            handoff.triggerEvent,
            event
        );
    }
);


test(
    "integration handoff rejects relationship mismatch",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation()
            );

        const event=
            createRiverCrmRelationshipEvent({
                eventId:
                    "crm-event:other",
                relationshipId:
                    "relationship:other",
                eventType:
                    "callback-requested",
                occurredAt:
                    "2026-09-28T18:00:00.000Z",
                source:
                    "river-os"
            });

        assert.throws(
            () =>
                createInsuranceGrowthIntegrationHandoff(
                    context,
                    event
                ),
            /relationship mismatch/
        );
    }
);


test(
    "integration boundary exports immutable data only and no transport result",
    () => {
        const context=
            createInsuranceGrowthIntegrationContext(
                presentation()
            );

        assert.equal(
            "provider" in context,
            false
        );

        assert.equal(
            "credentials" in context,
            false
        );

        assert.equal(
            "webhook" in context,
            false
        );

        assert.equal(
            "sent" in context,
            false
        );

        assert.equal(
            "dialed" in context,
            false
        );
    }
);
