import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    planInsuranceLeadAppointment
} from "./lead-appointment";


function relationship(
    appointmentAt?:
        string
){
    return createRiverCrmRelationship({
        relationshipId:
            "relationship:appointment-1",

        displayName:
            "Appointment Lead",

        kind:
            "lead",

        stage:
            "contacted",

        source:
            "website",

        email:
            "appointment@example.com",

        owner:
            "River",

        nextFollowUpAt:
            "2026-10-03T16:00:00.000Z",

        ...(appointmentAt ===
            undefined
            ? {}
            : {
                appointmentAt
            }),

        createdAt:
            "2026-10-01T14:00:00.000Z",

        updatedAt:
            "2026-10-01T15:00:00.000Z"
    });
}


test(
    "appointment planner schedules a canonical absolute appointment with immutable audit evidence",
    () => {
        const current =
            relationship();

        const plan =
            planInsuranceLeadAppointment({
                relationship:
                    current,

                appointmentAt:
                    "2026-10-04T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T15:15:00-05:00",

                eventId:
                    "crm-event:appointment-schedule",

                eventSource:
                    "river-os"
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
            plan.appointmentAt,
            "2026-10-04T14:30:00.000Z"
        );

        assert.equal(
            plan.relationship.appointmentAt,
            "2026-10-04T14:30:00.000Z"
        );

        assert.equal(
            plan.relationship.updatedAt,
            "2026-10-01T20:15:00.000Z"
        );

        assert.equal(
            plan.relationship.stage,
            current.stage
        );

        assert.equal(
            plan.relationship.nextFollowUpAt,
            current.nextFollowUpAt
        );

        assert.equal(
            plan.relationship.owner,
            current.owner
        );

        assert.equal(
            plan.appointmentEvent?.eventType,
            "appointment-set"
        );

        assert.equal(
            plan.appointmentEvent?.source,
            "river-os"
        );

        assert.deepEqual(
            plan.appointmentEvent?.metadata,
            {
                previousAppointmentAt:
                    null,

                appointmentAt:
                    "2026-10-04T14:30:00.000Z"
            }
        );
    }
);


test(
    "appointment planner distinguishes reschedule and records the previous canonical appointment",
    () => {
        const plan =
            planInsuranceLeadAppointment({
                relationship:
                    relationship(
                        "2026-10-04T14:30:00.000Z"
                    ),

                appointmentAt:
                    "2026-10-05T10:00:00-05:00",

                occurredAt:
                    "2026-10-01T21:00:00Z",

                eventId:
                    "crm-event:appointment-reschedule",

                eventSource:
                    "river-os"
            });

        assert.equal(
            plan.outcome,
            "rescheduled"
        );

        assert.equal(
            plan.previousAppointmentAt,
            "2026-10-04T14:30:00.000Z"
        );

        assert.equal(
            plan.appointmentAt,
            "2026-10-05T15:00:00.000Z"
        );

        assert.deepEqual(
            plan.appointmentEvent?.metadata,
            {
                previousAppointmentAt:
                    "2026-10-04T14:30:00.000Z",

                appointmentAt:
                    "2026-10-05T15:00:00.000Z"
            }
        );
    }
);


test(
    "appointment planner clears without fabricating appointment-set evidence",
    () => {
        const current =
            relationship(
                "2026-10-04T14:30:00.000Z"
            );

        const plan =
            planInsuranceLeadAppointment({
                relationship:
                    current,

                appointmentAt:
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
            plan.relationship.appointmentAt,
            undefined
        );

        assert.equal(
            plan.appointmentEvent,
            undefined
        );

        assert.equal(
            plan.relationship.stage,
            current.stage
        );

        assert.equal(
            plan.relationship.nextFollowUpAt,
            current.nextFollowUpAt
        );
    }
);


test(
    "appointment planner returns no-op for an equivalent absolute appointment without requiring audit identity",
    () => {
        const current =
            relationship(
                "2026-10-04T14:30:00.000Z"
            );

        const plan =
            planInsuranceLeadAppointment({
                relationship:
                    current,

                appointmentAt:
                    "2026-10-04T09:30:00-05:00",

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

        assert.equal(
            plan.appointmentEvent,
            undefined
        );
    }
);


test(
    "appointment planner returns no-op when clearing an already empty appointment",
    () => {
        const current =
            relationship();

        const plan =
            planInsuranceLeadAppointment({
                relationship:
                    current,

                appointmentAt:
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
            plan.relationship.updatedAt,
            current.updatedAt
        );
    }
);


test(
    "appointment planner rejects local appointment timestamps without an absolute offset",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadAppointment({
                    relationship:
                        relationship(),

                    appointmentAt:
                        "2026-10-04T09:30:00",

                    occurredAt:
                        "2026-10-01T21:00:00Z",

                    eventId:
                        "crm-event:appointment-local",

                    eventSource:
                        "river-os"
                }),
            /appointmentAt to be an absolute timestamp/
        );
    }
);


test(
    "appointment planner rejects stale or equal changed-state occurredAt",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadAppointment({
                    relationship:
                        relationship(),

                    appointmentAt:
                        "2026-10-04T15:00:00Z",

                    occurredAt:
                        "2026-10-01T15:00:00Z",

                    eventId:
                        "crm-event:appointment-stale",

                    eventSource:
                        "river-os"
                }),
            /to be later than/
        );
    }
);


test(
    "appointment planner requires audit identity and source only when setting a changed appointment",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadAppointment({
                    relationship:
                        relationship(),

                    appointmentAt:
                        "2026-10-04T15:00:00Z",

                    occurredAt:
                        "2026-10-01T21:00:00Z"
                }),
            /event identity|event source/
        );
    }
);


test(
    "appointment planner requires occurredAt itself to be absolute",
    () => {
        assert.throws(
            () =>
                planInsuranceLeadAppointment({
                    relationship:
                        relationship(),

                    appointmentAt:
                        null,

                    occurredAt:
                        "2026-10-01T21:00:00"
                }),
            /occurredAt to be an absolute timestamp/
        );
    }
);
