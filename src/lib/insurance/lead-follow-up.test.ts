import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    planInsuranceLeadFollowUp
} from "./lead-follow-up";


function relationship(
    nextFollowUpAt?:
        string
){
    return createRiverCrmRelationship({
        relationshipId:
            "relationship:follow-up-1",

        displayName:
            "Follow Up Lead",

        kind:
            "lead",

        stage:
            "contacted",

        source:
            "website",

        email:
            "follow-up@example.com",

        owner:
            "River",

        ...(nextFollowUpAt ===
            undefined
            ? {}
            : {
                nextFollowUpAt
            }),

        appointmentAt:
            "2026-10-04T18:00:00.000Z",

        createdAt:
            "2026-10-01T14:00:00.000Z",

        updatedAt:
            "2026-10-01T15:00:00.000Z"
    });
}


test(
    "follow-up planner schedules one canonical absolute reminder while preserving unrelated relationship state",
    () => {
        const current =
            relationship();

        const plan =
            planInsuranceLeadFollowUp({
                relationship:
                    current,

                nextFollowUpAt:
                    "2026-10-02T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T15:15:00-05:00"
            });

        assert.equal(
            plan.outcome,
            "scheduled"
        );

        assert.equal(
            plan.changed,
            true
        );

        assert.equal(
            plan.previousNextFollowUpAt,
            undefined
        );

        assert.equal(
            plan.nextFollowUpAt,
            "2026-10-02T14:30:00.000Z"
        );

        assert.equal(
            plan.relationship.nextFollowUpAt,
            "2026-10-02T14:30:00.000Z"
        );

        assert.equal(
            plan.relationship.updatedAt,
            "2026-10-01T20:15:00.000Z"
        );

        assert.equal(
            plan.relationship.relationshipId,
            current.relationshipId
        );

        assert.equal(
            plan.relationship.stage,
            current.stage
        );

        assert.equal(
            plan.relationship.owner,
            current.owner
        );

        assert.equal(
            plan.relationship.appointmentAt,
            current.appointmentAt
        );

        assert.equal(
            plan.relationship.email,
            current.email
        );
    }
);


test(
    "follow-up planner explicitly clears an existing reminder without a sentinel date",
    () => {
        const current =
            relationship(
                "2026-10-02T14:30:00.000Z"
            );

        const plan =
            planInsuranceLeadFollowUp({
                relationship:
                    current,

                nextFollowUpAt:
                    null,

                occurredAt:
                    "2026-10-01T21:00:00Z"
            });

        assert.equal(
            plan.outcome,
            "cleared"
        );

        assert.equal(
            plan.changed,
            true
        );

        assert.equal(
            plan.previousNextFollowUpAt,
            "2026-10-02T14:30:00.000Z"
        );

        assert.equal(
            plan.nextFollowUpAt,
            undefined
        );

        assert.equal(
            plan.relationship.nextFollowUpAt,
            undefined
        );

        assert.equal(
            plan.relationship.updatedAt,
            "2026-10-01T21:00:00.000Z"
        );
    }
);


test(
    "follow-up planner returns no-op for an equivalent absolute reminder",
    () => {
        const current =
            relationship(
                "2026-10-02T14:30:00.000Z"
            );

        const plan =
            planInsuranceLeadFollowUp({
                relationship:
                    current,

                nextFollowUpAt:
                    "2026-10-02T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T21:00:00Z"
            });

        assert.equal(
            plan.outcome,
            "no-op"
        );

        assert.equal(
            plan.changed,
            false
        );

        assert.equal(
            plan.relationship.updatedAt,
            current.updatedAt
        );

        assert.equal(
            plan.relationship.nextFollowUpAt,
            current.nextFollowUpAt
        );
    }
);


test(
    "follow-up planner returns no-op when clearing an already empty reminder",
    () => {
        const current =
            relationship();

        const plan =
            planInsuranceLeadFollowUp({
                relationship:
                    current,

                nextFollowUpAt:
                    null,

                occurredAt:
                    "2026-10-01T21:00:00Z"
            });

        assert.equal(
            plan.outcome,
            "no-op"
        );

        assert.equal(
            plan.changed,
            false
        );

        assert.equal(
            plan.relationship.nextFollowUpAt,
            undefined
        );

        assert.equal(
            plan.relationship.updatedAt,
            current.updatedAt
        );
    }
);


test(
    "follow-up planner rejects local timestamps without an absolute offset",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadFollowUp({
                    relationship:
                        relationship(),

                    nextFollowUpAt:
                        "2026-10-02T09:30:00",

                    occurredAt:
                        "2026-10-01T21:00:00Z"
                }),
            /absolute timestamp/
        );
    }
);


test(
    "follow-up planner rejects invalid absolute timestamps",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadFollowUp({
                    relationship:
                        relationship(),

                    nextFollowUpAt:
                        "not-a-dateZ",

                    occurredAt:
                        "2026-10-01T21:00:00Z"
                }),
            /valid nextFollowUpAt/
        );
    }
);


test(
    "follow-up planner rejects stale changed-state mutation time",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadFollowUp({
                    relationship:
                        relationship(),

                    nextFollowUpAt:
                        "2026-10-02T15:00:00Z",

                    occurredAt:
                        "2026-10-01T14:59:59Z"
                }),
            /to be later than/
        );
    }
);


test(
    "follow-up planner rejects equal updatedAt for a changed-state write so the concurrency token advances",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadFollowUp({
                    relationship:
                        relationship(),

                    nextFollowUpAt:
                        "2026-10-02T15:00:00Z",

                    occurredAt:
                        "2026-10-01T15:00:00Z"
                }),
            /to be later than/
        );
    }
);


test(
    "follow-up planner allows stale no-op because no persistence token changes",
    () => {
        const current =
            relationship(
                "2026-10-02T14:30:00.000Z"
            );

        const plan =
            planInsuranceLeadFollowUp({
                relationship:
                    current,

                nextFollowUpAt:
                    "2026-10-02T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T14:00:00Z"
            });

        assert.equal(
            plan.outcome,
            "no-op"
        );

        assert.equal(
            plan.changed,
            false
        );

        assert.equal(
            plan.relationship.updatedAt,
            current.updatedAt
        );
    }
);


test(
    "follow-up planner requires occurredAt itself to be absolute",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadFollowUp({
                    relationship:
                        relationship(),

                    nextFollowUpAt:
                        "2026-10-02T15:00:00Z",

                    occurredAt:
                        "2026-10-01T21:00:00"
                }),
            /occurredAt to be an absolute timestamp/
        );
    }
);
