import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";


export type InsuranceLeadFollowUpOutcome =
    | "no-op"
    | "scheduled"
    | "cleared";


export interface PlanInsuranceLeadFollowUpInput {
    readonly relationship:
        RiverCrmRelationship;

    readonly nextFollowUpAt:
        string |
        null;

    readonly occurredAt:
        string;
}


export interface InsuranceLeadFollowUpPlan {
    readonly outcome:
        InsuranceLeadFollowUpOutcome;

    readonly changed:
        boolean;

    readonly relationship:
        RiverCrmRelationship;

    readonly previousNextFollowUpAt:
        string |
        undefined;

    readonly nextFollowUpAt:
        string |
        undefined;
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
            `Insurance lead follow-up requires ${label} to be an absolute timestamp.`
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
            `Insurance lead follow-up requires valid ${label}.`
        );
    }

    return new Date(
        milliseconds
    ).toISOString();
}


function normalizedTarget(
    value:
        PlanInsuranceLeadFollowUpInput[
            "nextFollowUpAt"
        ]
):
    string |
    undefined {

    if(value === null){
        return undefined;
    }

    return normalizedAbsoluteTimestamp(
        value,
        "nextFollowUpAt"
    );
}


export function planInsuranceLeadFollowUp(
    input:
        PlanInsuranceLeadFollowUpInput
):
    InsuranceLeadFollowUpPlan {

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
            input.nextFollowUpAt
        );

    const previous =
        relationship.nextFollowUpAt;

    if(previous === target){
        return {
            outcome:
                "no-op",

            changed:
                false,

            relationship,

            previousNextFollowUpAt:
                previous,

            nextFollowUpAt:
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
            "Insurance lead follow-up changed state requires occurredAt to be later than the current relationship update."
        );
    }

    const {
        nextFollowUpAt:
            discardedPreviousFollowUp,
        ...relationshipWithoutFollowUp
    } =
        relationship;

    void discardedPreviousFollowUp;

    const nextRelationship =
        createRiverCrmRelationship({
            ...relationshipWithoutFollowUp,

            ...(target ===
                undefined
                ? {}
                : {
                    nextFollowUpAt:
                        target
                }),

            updatedAt:
                occurredAt
        });

    return {
        outcome:
            target ===
                undefined
                ? "cleared"
                : "scheduled",

        changed:
            true,

        relationship:
            nextRelationship,

        previousNextFollowUpAt:
            previous,

        nextFollowUpAt:
            target
    };
}
