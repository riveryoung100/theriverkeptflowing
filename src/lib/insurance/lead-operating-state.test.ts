import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

import {
    planInsuranceLeadOperatingState
} from "./lead-operating-state";

import type {
    RiverCrmPipelineStage
} from "../river-os/crm-workspace";

import type {
    InsuranceQuoteStatus
} from "./lead-profile";


const relationshipId =
    "relationship:operating-state-1";


function relationship(){
    return createRiverCrmRelationship({
        relationshipId,

        displayName:
            "River Test",

        kind:
            "lead",

        stage:
            "new",

        source:
            "website",

        email:
            "river@example.com",

        createdAt:
            "2026-10-01T12:00:00.000Z",

        updatedAt:
            "2026-10-01T12:00:00.000Z"
    });
}


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
            "River",

        createdAt:
            "2026-10-01T12:00:00.000Z",

        updatedAt:
            "2026-10-01T12:00:00.000Z"
    });
}


test(
    "plans a combined stage quote-status and manual producer change",
    () => {
        const plan =
            planInsuranceLeadOperatingState({
                relationship:
                    relationship(),

                profile:
                    profile(),

                stage:
                    "contacted",

                quoteStatus:
                    "in-progress",

                assignedProducer:
                    " Nathan ",

                occurredAt:
                    "2026-10-01T13:00:00.000Z",

                eventId:
                    "crm-event:operating-state-1",

                eventSource:
                    "river-os"
            });

        assert.equal(
            plan.hasChanges,
            true
        );

        assert.deepEqual(
            plan.changes,
            {
                stage:
                    true,

                quoteStatus:
                    true,

                assignedProducer:
                    true
            }
        );

        assert.equal(
            plan.relationship.stage,
            "contacted"
        );

        assert.equal(
            plan.relationship.updatedAt,
            "2026-10-01T13:00:00.000Z"
        );

        assert.equal(
            plan.profile.quoteStatus,
            "in-progress"
        );

        assert.equal(
            plan.profile.assignedProducer,
            "Nathan"
        );

        assert.equal(
            plan.profile.updatedAt,
            "2026-10-01T13:00:00.000Z"
        );

        assert.equal(
            plan.stageEvent?.eventType,
            "stage-changed"
        );

        assert.equal(
            plan.stageEvent?.relationshipId,
            relationshipId
        );

        assert.equal(
            plan.stageEvent?.source,
            "river-os"
        );

        assert.deepEqual(
            plan.stageEvent?.metadata,
            {
                fromStage:
                    "new",

                toStage:
                    "contacted",

                quoteStatusBefore:
                    "requested",

                quoteStatusAfter:
                    "in-progress",

                assignedProducerBefore:
                    "River",

                assignedProducerAfter:
                    "Nathan"
            }
        );
    }
);


test(
    "returns a no-op plan without manufacturing an event or timestamp change",
    () => {
        const currentRelationship =
            relationship();

        const currentProfile =
            profile();

        const plan =
            planInsuranceLeadOperatingState({
                relationship:
                    currentRelationship,

                profile:
                    currentProfile,

                stage:
                    "new",

                quoteStatus:
                    "requested",

                assignedProducer:
                    "River",

                occurredAt:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            plan.hasChanges,
            false
        );

        assert.deepEqual(
            plan.changes,
            {
                stage:
                    false,

                quoteStatus:
                    false,

                assignedProducer:
                    false
            }
        );

        assert.equal(
            plan.stageEvent,
            undefined
        );

        assert.equal(
            plan.relationship.updatedAt,
            currentRelationship.updatedAt
        );

        assert.equal(
            plan.profile.updatedAt,
            currentProfile.updatedAt
        );
    }
);


test(
    "allows a quote-status-only change without misusing stage-changed event",
    () => {
        const plan =
            planInsuranceLeadOperatingState({
                relationship:
                    relationship(),

                profile:
                    profile(),

                stage:
                    "new",

                quoteStatus:
                    "quoted",

                assignedProducer:
                    "River",

                occurredAt:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            plan.hasChanges,
            true
        );

        assert.deepEqual(
            plan.changes,
            {
                stage:
                    false,

                quoteStatus:
                    true,

                assignedProducer:
                    false
            }
        );

        assert.equal(
            plan.relationship.updatedAt,
            "2026-10-01T12:00:00.000Z"
        );

        assert.equal(
            plan.profile.quoteStatus,
            "quoted"
        );

        assert.equal(
            plan.profile.updatedAt,
            "2026-10-01T13:00:00.000Z"
        );

        assert.equal(
            plan.stageEvent,
            undefined
        );
    }
);


test(
    "supports explicit manual producer unassignment",
    () => {
        const plan =
            planInsuranceLeadOperatingState({
                relationship:
                    relationship(),

                profile:
                    profile(),

                stage:
                    "new",

                quoteStatus:
                    "requested",

                assignedProducer:
                    null,

                occurredAt:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            plan.changes.assignedProducer,
            true
        );

        assert.equal(
            plan.profile.assignedProducer,
            undefined
        );

        assert.equal(
            plan.stageEvent,
            undefined
        );
    }
);


test(
    "rejects relationship and insurance-profile identity mismatch",
    () => {
        const mismatchedProfile =
            createInsuranceLeadProfile({
                ...profile(),

                relationshipId:
                    "relationship:different"
            });

        assert.throws(
            () =>
                planInsuranceLeadOperatingState({
                    relationship:
                        relationship(),

                    profile:
                        mismatchedProfile,

                    stage:
                        "new",

                    quoteStatus:
                        "requested",

                    assignedProducer:
                        "River",

                    occurredAt:
                        "2026-10-01T13:00:00.000Z"
                }),
            /identity to match/
        );
    }
);


test(
    "reuses canonical CRM validation for unsupported pipeline stage",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadOperatingState({
                    relationship:
                        relationship(),

                    profile:
                        profile(),

                    stage:
                        "unsupported" as
                            RiverCrmPipelineStage,

                    quoteStatus:
                        "requested",

                    assignedProducer:
                        "River",

                    occurredAt:
                        "2026-10-01T13:00:00.000Z"
                }),
            /stage/i
        );
    }
);


test(
    "reuses canonical insurance validation for unsupported quote status",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadOperatingState({
                    relationship:
                        relationship(),

                    profile:
                        profile(),

                    stage:
                        "new",

                    quoteStatus:
                        "unsupported" as
                            InsuranceQuoteStatus,

                    assignedProducer:
                        "River",

                    occurredAt:
                        "2026-10-01T13:00:00.000Z"
                }),
            /quote/i
        );
    }
);


test(
    "rejects a stale stage-change timestamp",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadOperatingState({
                    relationship:
                        relationship(),

                    profile:
                        profile(),

                    stage:
                        "contacted",

                    quoteStatus:
                        "requested",

                    assignedProducer:
                        "River",

                    occurredAt:
                        "2026-10-01T11:59:59.000Z",

                    eventId:
                        "crm-event:stale-stage",

                    eventSource:
                        "river-os"
                }),
            /relationship updatedAt/
        );
    }
);


test(
    "rejects a stale profile-change timestamp",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadOperatingState({
                    relationship:
                        relationship(),

                    profile:
                        profile(),

                    stage:
                        "new",

                    quoteStatus:
                        "quoted",

                    assignedProducer:
                        "River",

                    occurredAt:
                        "2026-10-01T11:59:59.000Z"
                }),
            /insurance profile updatedAt/
        );
    }
);


test(
    "requires event identity and source when the CRM stage changes",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadOperatingState({
                    relationship:
                        relationship(),

                    profile:
                        profile(),

                    stage:
                        "contacted",

                    quoteStatus:
                        "requested",

                    assignedProducer:
                        "River",

                    occurredAt:
                        "2026-10-01T13:00:00.000Z"
                }),
            /event identity|event source/
        );
    }
);
