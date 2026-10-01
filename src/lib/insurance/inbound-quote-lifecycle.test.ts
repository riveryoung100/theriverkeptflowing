import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsuranceQuoteRequestRecords
} from "./quote-request";

import {
    createInsuranceLeadPresentation
} from "./lead-presentation";

import {
    createInsuranceLeadTriageSnapshot,
    selectInsuranceLeadTriageItems
} from "./lead-triage";

import {
    planInsuranceLeadOperatingState
} from "./lead-operating-state";


const ingressAt =
    "2026-10-01T12:00:00.000Z";

const firstTransitionAt =
    "2026-10-01T13:00:00.000Z";

const secondTransitionAt =
    "2026-10-01T14:00:00.000Z";


function quoteRecords(){
    let sequence =
        0;

    return buildInsuranceQuoteRequestRecords(
        {
            firstName:
                "River",

            lastName:
                "Lifecycle",

            email:
                "lifecycle@example.com",

            phone:
                "4325550100",

            state:
                "TX",

            postalCode:
                "79720",

            productInterest:
                "home",

            campaign:
                "inbound-lifecycle",

            consent: {
                phone:
                    true,

                sms:
                    true,

                email:
                    true,

                textVersion:
                    "insurance-quote-v1"
            }
        },
        {
            now(){
                return ingressAt;
            },

            createUuid(){
                sequence +=
                    1;

                return `lifecycle-${sequence}`;
            }
        }
    );
}


test(
    "website quote request becomes one insurance presentation without identity translation",
    () => {
        const records =
            quoteRecords();

        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    records.insuranceProfile,

                acquisition:
                    records.acquisition,

                consents:
                    records.consents,

                events:
                    records.events
            });

        const relationshipId =
            records.relationship
                .relationshipId;

        assert.equal(
            relationshipId,
            "relationship:lifecycle-1"
        );

        assert.equal(
            records.insuranceProfile
                .relationshipId,
            relationshipId
        );

        assert.equal(
            records.acquisition
                .relationshipId,
            relationshipId
        );

        assert.ok(
            records.consents.every(
                consent =>
                    consent.relationshipId ===
                    relationshipId
            )
        );

        assert.ok(
            records.events.every(
                event =>
                    event.relationshipId ===
                    relationshipId
            )
        );

        assert.equal(
            presentation.relationshipId,
            relationshipId
        );

        assert.equal(
            records.relationship.kind,
            "lead"
        );

        assert.equal(
            records.relationship.stage,
            "new"
        );

        assert.equal(
            records.relationship.source,
            "website"
        );

        assert.equal(
            presentation.acquisitionSource,
            "website"
        );

        assert.equal(
            presentation.quoteStatus,
            "requested"
        );

        assert.deepEqual(
            records.events.map(
                event =>
                    event.eventType
            ),
            [
                "lead-created",
                "quote-requested"
            ]
        );
    }
);


test(
    "canonical website quote presentation enters new and requested inbound triage cohorts",
    () => {
        const records =
            quoteRecords();

        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    records.insuranceProfile,

                acquisition:
                    records.acquisition,

                consents:
                    records.consents,

                events:
                    records.events
            });

        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    records.relationship
                ],

                insurancePresentations: [
                    presentation
                ],

                now:
                    firstTransitionAt
            });

        assert.equal(
            snapshot.items.length,
            1
        );

        assert.equal(
            snapshot.items[0]!
                .relationship
                .relationshipId,
            records.relationship
                .relationshipId
        );

        assert.equal(
            snapshot.items[0]!
                .flags
                .newInboundQuote,
            true
        );

        assert.equal(
            snapshot.summary
                .newInbound,
            1
        );

        assert.equal(
            snapshot.summary
                .requested,
            1
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "new"
            ).length,
            1
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "requested"
            ).length,
            1
        );
    }
);


test(
    "manual operating-state transition preserves identity creates stage event and advances triage",
    () => {
        const records =
            quoteRecords();

        const relationshipId =
            records.relationship
                .relationshipId;

        const plan =
            planInsuranceLeadOperatingState({
                relationship:
                    records.relationship,

                profile:
                    records.insuranceProfile,

                stage:
                    "contacted",

                quoteStatus:
                    "in-progress",

                assignedProducer:
                    "River",

                occurredAt:
                    firstTransitionAt,

                eventId:
                    "crm-event:lifecycle-stage",

                eventSource:
                    "river-os"
            });

        assert.equal(
            plan.hasChanges,
            true
        );

        assert.equal(
            plan.changes.stage,
            true
        );

        assert.equal(
            plan.changes.quoteStatus,
            true
        );

        assert.equal(
            plan.changes.assignedProducer,
            true
        );

        assert.equal(
            plan.relationship
                .relationshipId,
            relationshipId
        );

        assert.equal(
            plan.profile
                .relationshipId,
            relationshipId
        );

        assert.equal(
            plan.relationship.stage,
            "contacted"
        );

        assert.equal(
            plan.profile.quoteStatus,
            "in-progress"
        );

        assert.equal(
            plan.profile.assignedProducer,
            "River"
        );

        assert.ok(
            plan.stageEvent
        );

        assert.equal(
            plan.stageEvent
                .relationshipId,
            relationshipId
        );

        assert.equal(
            plan.stageEvent
                .eventId,
            "crm-event:lifecycle-stage"
        );

        assert.equal(
            plan.stageEvent
                .eventType,
            "stage-changed"
        );

        assert.equal(
            plan.stageEvent
                .source,
            "river-os"
        );

        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    plan.profile,

                acquisition:
                    records.acquisition,

                consents:
                    records.consents,

                events: [
                    ...records.events,
                    plan.stageEvent
                ]
            });

        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    plan.relationship
                ],

                insurancePresentations: [
                    presentation
                ],

                now:
                    secondTransitionAt
            });

        assert.equal(
            snapshot.items[0]!
                .relationship
                .relationshipId,
            relationshipId
        );

        assert.equal(
            snapshot.items[0]!
                .flags
                .newInboundQuote,
            false
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "new"
            ).length,
            0
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "requested"
            ).length,
            0
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "in-progress"
            ).length,
            1
        );

        assert.equal(
            presentation.recentEvents[0]!
                .eventType,
            "stage-changed"
        );
    }
);


test(
    "quote-status-only transition keeps relationship identity and does not manufacture stage event",
    () => {
        const records =
            quoteRecords();

        const stagePlan =
            planInsuranceLeadOperatingState({
                relationship:
                    records.relationship,

                profile:
                    records.insuranceProfile,

                stage:
                    "contacted",

                quoteStatus:
                    "in-progress",

                assignedProducer:
                    "River",

                occurredAt:
                    firstTransitionAt,

                eventId:
                    "crm-event:lifecycle-stage",

                eventSource:
                    "river-os"
            });

        const quoteOnlyPlan =
            planInsuranceLeadOperatingState({
                relationship:
                    stagePlan.relationship,

                profile:
                    stagePlan.profile,

                stage:
                    "contacted",

                quoteStatus:
                    "quoted",

                assignedProducer:
                    "River",

                occurredAt:
                    secondTransitionAt
            });

        assert.equal(
            quoteOnlyPlan.hasChanges,
            true
        );

        assert.equal(
            quoteOnlyPlan.changes.stage,
            false
        );

        assert.equal(
            quoteOnlyPlan.changes.quoteStatus,
            true
        );

        assert.equal(
            quoteOnlyPlan.changes.assignedProducer,
            false
        );

        assert.equal(
            quoteOnlyPlan.relationship
                .relationshipId,
            records.relationship
                .relationshipId
        );

        assert.equal(
            quoteOnlyPlan.profile
                .relationshipId,
            records.relationship
                .relationshipId
        );

        assert.deepEqual(
            quoteOnlyPlan.relationship,
            stagePlan.relationship
        );

        assert.equal(
            quoteOnlyPlan.profile.quoteStatus,
            "quoted"
        );

        assert.equal(
            quoteOnlyPlan.stageEvent,
            undefined
        );

        const presentation =
            createInsuranceLeadPresentation({
                profile:
                    quoteOnlyPlan.profile,

                acquisition:
                    records.acquisition,

                consents:
                    records.consents,

                events: [
                    ...records.events,
                    stagePlan.stageEvent!
                ]
            });

        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    quoteOnlyPlan.relationship
                ],

                insurancePresentations: [
                    presentation
                ],

                now:
                    secondTransitionAt
            });

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "quoted"
            ).length,
            1
        );

        assert.equal(
            snapshot.items[0]!
                .relationship
                .relationshipId,
            records.relationship
                .relationshipId
        );
    }
);
