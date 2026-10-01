import {
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

import type {
    RiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmPipelineStage,
    RiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    InsuranceLeadProfile,
    InsuranceQuoteStatus
} from "./lead-profile";


export interface InsuranceLeadOperatingStateTarget {
    readonly stage:
        RiverCrmPipelineStage;

    readonly quoteStatus:
        InsuranceQuoteStatus;

    /*
     * This is a complete target state rather than a patch.
     * null or omission means the target state is unassigned.
     */
    readonly assignedProducer?:
        string |
        null;
}


export interface PlanInsuranceLeadOperatingStateInput
    extends InsuranceLeadOperatingStateTarget {

    readonly relationship:
        RiverCrmRelationship;

    readonly profile:
        InsuranceLeadProfile;

    readonly occurredAt:
        string;

    /*
     * Required only when the CRM pipeline stage actually changes.
     * The domain does not manufacture durable identities.
     */
    readonly eventId?:
        string;

    readonly eventSource?:
        string;
}


export interface InsuranceLeadOperatingStateChanges {
    readonly stage:
        boolean;

    readonly quoteStatus:
        boolean;

    readonly assignedProducer:
        boolean;
}


export interface InsuranceLeadOperatingStatePlan {
    readonly relationship:
        RiverCrmRelationship;

    readonly profile:
        InsuranceLeadProfile;

    readonly changes:
        InsuranceLeadOperatingStateChanges;

    readonly hasChanges:
        boolean;

    readonly stageEvent?:
        RiverCrmRelationshipEvent;
}


function timestamp(
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
        Number.isNaN(
            Date.parse(
                value
            )
        )
    ){
        throw new TypeError(
            `Insurance lead operating state requires valid ${label}.`
        );
    }

    return value;
}


function requireNotEarlier(
    occurredAt:
        string,
    currentUpdatedAt:
        string,
    label:
        string
):
    void {

    if(
        Date.parse(
            occurredAt
        ) <
        Date.parse(
            currentUpdatedAt
        )
    ){
        throw new TypeError(
            `Insurance lead operating state requires occurredAt not to precede ${label}.`
        );
    }
}


function targetProfile(
    current:
        InsuranceLeadProfile,
    input:
        InsuranceLeadOperatingStateTarget
):
    InsuranceLeadProfile {

    return createInsuranceLeadProfile({
        relationshipId:
            current.relationshipId,

        state:
            current.state,

        postalCode:
            current.postalCode,

        productInterest:
            current.productInterest,

        quoteStatus:
            input.quoteStatus,

        ...(
            input.assignedProducer ===
                null ||
            input.assignedProducer ===
                undefined
                ? {}
                : {
                    assignedProducer:
                        input.assignedProducer
                }
        ),

        createdAt:
            current.createdAt,

        updatedAt:
            current.updatedAt
    });
}


export function planInsuranceLeadOperatingState(
    input:
        PlanInsuranceLeadOperatingStateInput
):
    InsuranceLeadOperatingStatePlan {

    const currentRelationship =
        createRiverCrmRelationship(
            input.relationship
        );

    const currentProfile =
        createInsuranceLeadProfile(
            input.profile
        );

    if(
        currentRelationship.relationshipId !==
        currentProfile.relationshipId
    ){
        throw new TypeError(
            "Insurance lead operating state requires relationship and profile identity to match."
        );
    }

    /*
     * Re-run the canonical CRM constructor with the requested stage.
     * This deliberately reuses the existing runtime stage authority.
     */
    const validatedRelationshipTarget =
        createRiverCrmRelationship({
            ...currentRelationship,

            stage:
                input.stage
        });

    /*
     * Re-run the canonical insurance constructor with the requested
     * quote status and complete producer-assignment target.
     */
    const validatedProfileTarget =
        targetProfile(
            currentProfile,
            input
        );

    const changes:
        InsuranceLeadOperatingStateChanges = {

            stage:
                currentRelationship.stage !==
                validatedRelationshipTarget.stage,

            quoteStatus:
                currentProfile.quoteStatus !==
                validatedProfileTarget.quoteStatus,

            assignedProducer:
                currentProfile.assignedProducer !==
                validatedProfileTarget.assignedProducer
        };

    const hasChanges =
        changes.stage ||
        changes.quoteStatus ||
        changes.assignedProducer;

    if(!hasChanges){
        return {
            relationship:
                currentRelationship,

            profile:
                currentProfile,

            changes,

            hasChanges:
                false
        };
    }

    const occurredAt =
        timestamp(
            input.occurredAt,
            "occurredAt"
        );

    if(changes.stage){
        requireNotEarlier(
            occurredAt,
            currentRelationship.updatedAt,
            "relationship updatedAt"
        );
    }

    if(
        changes.quoteStatus ||
        changes.assignedProducer
    ){
        requireNotEarlier(
            occurredAt,
            currentProfile.updatedAt,
            "insurance profile updatedAt"
        );
    }

    const relationship =
        changes.stage
            ? createRiverCrmRelationship({
                ...currentRelationship,

                stage:
                    validatedRelationshipTarget.stage,

                updatedAt:
                    occurredAt
            })
            : currentRelationship;

    const profile =
        (
            changes.quoteStatus ||
            changes.assignedProducer
        )
            ? createInsuranceLeadProfile({
                relationshipId:
                    currentProfile.relationshipId,

                state:
                    currentProfile.state,

                postalCode:
                    currentProfile.postalCode,

                productInterest:
                    currentProfile.productInterest,

                quoteStatus:
                    validatedProfileTarget.quoteStatus,

                ...(
                    validatedProfileTarget.assignedProducer ===
                        undefined
                        ? {}
                        : {
                            assignedProducer:
                                validatedProfileTarget.assignedProducer
                        }
                ),

                createdAt:
                    currentProfile.createdAt,

                updatedAt:
                    occurredAt
            })
            : currentProfile;

    if(!changes.stage){
        return {
            relationship,
            profile,
            changes,
            hasChanges:
                true
        };
    }

    const stageEvent =
        createRiverCrmRelationshipEvent({
            eventId:
                input.eventId,

            relationshipId:
                currentRelationship.relationshipId,

            eventType:
                "stage-changed",

            occurredAt,

            source:
                input.eventSource,

            metadata: {
                fromStage:
                    currentRelationship.stage,

                toStage:
                    relationship.stage,

                quoteStatusBefore:
                    currentProfile.quoteStatus,

                quoteStatusAfter:
                    profile.quoteStatus,

                assignedProducerBefore:
                    currentProfile.assignedProducer ??
                    null,

                assignedProducerAfter:
                    profile.assignedProducer ??
                    null
            }
        });

    return {
        relationship,
        profile,
        changes,
        hasChanges:
            true,
        stageEvent
    };
}
