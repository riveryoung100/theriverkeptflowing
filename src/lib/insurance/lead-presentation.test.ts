import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmAcquisitionAttribution,
    createRiverCrmContactConsent,
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

import {
    createInsuranceLeadPresentation,
    INSURANCE_PRESENTATION_EVENT_LIMIT
} from "./lead-presentation";


const relationshipId =
    "relationship:insurance-presentation-1";

function profile(){
    return createInsuranceLeadProfile({
        relationshipId,
        state:
            "tx",
        postalCode:
            "79720",
        productInterest:
            "home",
        quoteStatus:
            "requested",
        assignedProducer:
            " River ",
        createdAt:
            "2026-09-28T12:00:00.000Z",
        updatedAt:
            "2026-09-28T12:00:00.000Z"
    });
}

function acquisition(){
    return createRiverCrmAcquisitionAttribution({
        relationshipId,
        source:
            " website ",
        sourceVendor:
            " Meta ",
        campaign:
            " West Texas Home ",
        capturedAt:
            "2026-09-28T12:00:00.000Z",
        updatedAt:
            "2026-09-28T12:00:00.000Z"
    });
}

function consent(
    channel:
        "phone" |
        "sms" |
        "email",
    status:
        "granted" |
        "denied" |
        "revoked" |
        "unknown",
    doNotContact:
        boolean,
    suffix:
        string
){
    return createRiverCrmContactConsent({
        consentId:
            `consent:${suffix}`,
        relationshipId,
        channel,
        status,
        consentSource:
            "website",
        capturedAt:
            "2026-09-28T12:00:00.000Z",
        ...(status === "revoked"
            ? {
                revokedAt:
                    "2026-09-28T13:00:00.000Z"
            }
            : {}),
        doNotContact,
        createdAt:
            "2026-09-28T12:00:00.000Z",
        updatedAt:
            status === "revoked"
                ? "2026-09-28T13:00:00.000Z"
                : "2026-09-28T12:00:00.000Z"
    });
}

function event(
    suffix:
        string,
    eventType:
        | "lead-created"
        | "quote-requested"
        | "consent-captured"
        | "consent-revoked"
        | "stage-changed"
        | "appointment-set"
        | "callback-requested",
    occurredAt:
        string
){
    return createRiverCrmRelationshipEvent({
        eventId:
            `crm-event:${suffix}`,
        relationshipId,
        eventType,
        occurredAt,
        source:
            "website",
        metadata: {
            shouldNotAppearInPresentation:
                true
        }
    });
}

test(
    "insurance presentation combines canonical profile and growth context",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                acquisition:
                    acquisition(),
                consents: [
                    consent(
                        "phone",
                        "granted",
                        false,
                        "phone"
                    ),
                    consent(
                        "email",
                        "denied",
                        false,
                        "email"
                    )
                ],
                events: [
                    event(
                        "lead",
                        "lead-created",
                        "2026-09-28T12:00:00.000Z"
                    ),
                    event(
                        "quote",
                        "quote-requested",
                        "2026-09-28T12:05:00.000Z"
                    )
                ]
            });

        assert.equal(
            presentation.relationshipId,
            relationshipId
        );

        assert.equal(
            presentation.state,
            "TX"
        );

        assert.equal(
            presentation.postalCode,
            "79720"
        );

        assert.equal(
            presentation.productInterest,
            "home"
        );

        assert.equal(
            presentation.quoteStatus,
            "requested"
        );

        assert.equal(
            presentation.assignedProducer,
            "River"
        );

        assert.equal(
            presentation.acquisitionSource,
            "website"
        );

        assert.equal(
            presentation.sourceVendor,
            "Meta"
        );

        assert.equal(
            presentation.campaign,
            "West Texas Home"
        );

        assert.equal(
            presentation.consentChannels.length,
            2
        );

        assert.equal(
            presentation.recentEvents.length,
            2
        );
    }
);

test(
    "insurance presentation does not duplicate generic CRM contact or pipeline fields",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile()
            });

        const keys =
            Object.keys(
                presentation
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
    "insurance presentation represents missing acquisition without invented values",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                acquisition:
                    null
            });

        assert.equal(
            "acquisitionSource" in presentation,
            false
        );

        assert.equal(
            "sourceVendor" in presentation,
            false
        );

        assert.equal(
            "campaign" in presentation,
            false
        );
    }
);

test(
    "insurance presentation preserves consent channel and status",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                consents: [
                    consent(
                        "phone",
                        "granted",
                        false,
                        "phone"
                    ),
                    consent(
                        "sms",
                        "unknown",
                        false,
                        "sms"
                    ),
                    consent(
                        "email",
                        "revoked",
                        true,
                        "email"
                    )
                ]
            });

        assert.deepEqual(
            presentation.consentChannels.map(
                value => [
                    value.channel,
                    value.status
                ]
            ),
            [
                [
                    "phone",
                    "granted"
                ],
                [
                    "sms",
                    "unknown"
                ],
                [
                    "email",
                    "revoked"
                ]
            ]
        );
    }
);

test(
    "insurance presentation exposes consent channels and suppression state",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                consents: [
                    consent(
                        "phone",
                        "granted",
                        false,
                        "phone"
                    ),
                    consent(
                        "email",
                        "revoked",
                        true,
                        "email"
                    )
                ]
            });

        assert.deepEqual(
            presentation.consentChannels,
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

        assert.equal(
            presentation.doNotContact,
            true
        );
    }
);

test(
    "insurance presentation does not infer suppression from denied consent",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                consents: [
                    consent(
                        "email",
                        "denied",
                        false,
                        "email"
                    )
                ]
            });

        assert.equal(
            presentation.doNotContact,
            false
        );
    }
);

test(
    "insurance presentation bounds recent events to newest five",
    () => {
        const events =
            Array.from(
                {
                    length:
                        INSURANCE_PRESENTATION_EVENT_LIMIT +
                        2
                },
                (
                    _,
                    index
                ) =>
                    event(
                        `event-${index}`,
                        index % 2 === 0
                            ? "lead-created"
                            : "quote-requested",
                        `2026-09-28T12:0${index}:00.000Z`
                    )
            );

        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                events
            });

        assert.equal(
            presentation.recentEvents.length,
            5
        );

        assert.equal(
            presentation.recentEvents[0]
                ?.occurredAt,
            "2026-09-28T12:06:00.000Z"
        );

        assert.equal(
            presentation.recentEvents[4]
                ?.occurredAt,
            "2026-09-28T12:02:00.000Z"
        );
    }
);

test(
    "insurance presentation sorts recent events newest first",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                events: [
                    event(
                        "middle",
                        "quote-requested",
                        "2026-09-28T12:05:00.000Z"
                    ),
                    event(
                        "oldest",
                        "lead-created",
                        "2026-09-28T12:00:00.000Z"
                    ),
                    event(
                        "newest",
                        "appointment-set",
                        "2026-09-28T12:10:00.000Z"
                    )
                ]
            });

        assert.deepEqual(
            presentation.recentEvents.map(
                value =>
                    value.occurredAt
            ),
            [
                "2026-09-28T12:10:00.000Z",
                "2026-09-28T12:05:00.000Z",
                "2026-09-28T12:00:00.000Z"
            ]
        );
    }
);

test(
    "insurance presentation does not expose raw event metadata",
    () => {
        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    profile(),
                events: [
                    event(
                        "quote",
                        "quote-requested",
                        "2026-09-28T12:05:00.000Z"
                    )
                ]
            });

        assert.equal(
            "metadata" in
                presentation.recentEvents[0]!,
            false
        );
    }
);

test(
    "insurance presentation rejects acquisition for another relationship",
    () => {
        const wrong =
            createRiverCrmAcquisitionAttribution({
                relationshipId:
                    "relationship:other",
                source:
                    "website",
                capturedAt:
                    "2026-09-28T12:00:00.000Z",
                updatedAt:
                    "2026-09-28T12:00:00.000Z"
            });

        assert.throws(
            () =>
                createInsuranceLeadPresentation({
                    profile:
                        profile(),
                    acquisition:
                        wrong
                }),
            /acquisition relationship does not match/
        );
    }
);

test(
    "insurance presentation rejects consent for another relationship",
    () => {
        const wrong =
            createRiverCrmContactConsent({
                consentId:
                    "consent:wrong",
                relationshipId:
                    "relationship:other",
                channel:
                    "email",
                status:
                    "granted",
                consentSource:
                    "website",
                capturedAt:
                    "2026-09-28T12:00:00.000Z",
                doNotContact:
                    false,
                createdAt:
                    "2026-09-28T12:00:00.000Z",
                updatedAt:
                    "2026-09-28T12:00:00.000Z"
            });

        assert.throws(
            () =>
                createInsuranceLeadPresentation({
                    profile:
                        profile(),
                    consents: [
                        wrong
                    ]
                }),
            /consent relationship does not match/
        );
    }
);

test(
    "insurance presentation rejects event for another relationship",
    () => {
        const wrong =
            createRiverCrmRelationshipEvent({
                eventId:
                    "crm-event:wrong",
                relationshipId:
                    "relationship:other",
                eventType:
                    "quote-requested",
                occurredAt:
                    "2026-09-28T12:00:00.000Z",
                source:
                    "website"
            });

        assert.throws(
            () =>
                createInsuranceLeadPresentation({
                    profile:
                        profile(),
                    events: [
                        wrong
                    ]
                }),
            /event relationship does not match/
        );
    }
);

