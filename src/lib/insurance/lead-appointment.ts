import {
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    RiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";


export type InsuranceLeadAppointmentOutcome =
    | "no-op"
    | "scheduled"
    | "rescheduled"
    | "cleared";


export interface PlanInsuranceLeadAppointmentInput {
    readonly relationship:
        RiverCrmRelationship;

    readonly appointmentAt:
        string |
        null;

    readonly occurredAt:
        string;

    /*
     * Required only for changed schedule/reschedule operations.
     * The domain does not manufacture durable audit identities.
     */
    readonly eventId?:
        string;

    readonly eventSource?:
        string;
}


export interface InsuranceLeadAppointmentPlan {
    readonly outcome:
        InsuranceLeadAppointmentOutcome;

    readonly changed:
        boolean;

    readonly relationship:
        RiverCrmRelationship;

    readonly previousAppointmentAt:
        string |
        undefined;

    readonly appointmentAt:
        string |
        undefined;

    readonly appointmentEvent?:
        RiverCrmRelationshipEvent;
}


const ABSOLUTE_TIMESTAMP_SUFFIX =
    /(?:Z|[+-]\d{2}:\d{2})$/;


function normalizedAbsoluteTimestamp(
    value:
        unknown,
    label:
        string
):
    string {

    if(
        typeof value !==
            "string" ||
        value.length ===
            0 ||
        value.trim() !==
            value ||
        !ABSOLUTE_TIMESTAMP_SUFFIX.test(
            value
        )
    ){
        throw new TypeError(
            `Insurance lead appointment requires ${label} to be an absolute timestamp.`
        );
    }

    const milliseconds =
        Date.parse(
            value
        );

    if(
        Number.isNaN(
            milliseconds
        )
    ){
        throw new TypeError(
            `Insurance lead appointment requires valid ${label}.`
        );
    }

    return new Date(
        milliseconds
    ).toISOString();
}


function normalizedTarget(
    value:
        PlanInsuranceLeadAppointmentInput[
            "appointmentAt"
        ]
):
    string |
    undefined {

    if(value === null){
        return undefined;
    }

    return normalizedAbsoluteTimestamp(
        value,
        "appointmentAt"
    );
}


export function planInsuranceLeadAppointment(
    input:
        PlanInsuranceLeadAppointmentInput
):
    InsuranceLeadAppointmentPlan {

    const relationship =
        createRiverCrmRelationship(
            input.relationship
        );

    const occurredAt =
        normalizedAbsoluteTimestamp(
            input.occurredAt,
            "occurredAt"
        );

    const target =
        normalizedTarget(
            input.appointmentAt
        );

    const previous =
        relationship.appointmentAt;

    if(previous === target){
        return {
            outcome:
                "no-op",

            changed:
                false,

            relationship,

            previousAppointmentAt:
                previous,

            appointmentAt:
                target
        };
    }

    if(
        Date.parse(
            occurredAt
        ) <=
        Date.parse(
            relationship.updatedAt
        )
    ){
        throw new TypeError(
            "Insurance lead appointment changed state requires occurredAt to be later than the current relationship update."
        );
    }

    const {
        appointmentAt:
            discardedPreviousAppointment,
        ...relationshipWithoutAppointment
    } =
        relationship;

    void discardedPreviousAppointment;

    const nextRelationship =
        createRiverCrmRelationship({
            ...relationshipWithoutAppointment,

            ...(target ===
                undefined
                ? {}
                : {
                    appointmentAt:
                        target
                }),

            updatedAt:
                occurredAt
        });

    if(target === undefined){
        return {
            outcome:
                "cleared",

            changed:
                true,

            relationship:
                nextRelationship,

            previousAppointmentAt:
                previous,

            appointmentAt:
                undefined
        };
    }

    const appointmentEvent =
        createRiverCrmRelationshipEvent({
            eventId:
                input.eventId,

            relationshipId:
                relationship.relationshipId,

            eventType:
                "appointment-set",

            occurredAt,

            source:
                input.eventSource,

            metadata: {
                previousAppointmentAt:
                    previous ??
                    null,

                appointmentAt:
                    target
            }
        });

    return {
        outcome:
            previous ===
                undefined
                ? "scheduled"
                : "rescheduled",

        changed:
            true,

        relationship:
            nextRelationship,

        previousAppointmentAt:
            previous,

        appointmentAt:
            target,

        appointmentEvent
    };
}
