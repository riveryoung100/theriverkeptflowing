import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import type {
    InsuranceQuoteStatus
} from "./lead-profile";


export const INSURANCE_LEAD_TRIAGE_FILTERS = [
    "all",
    "new",
    "not-started",
    "requested",
    "in-progress",
    "quoted",
    "bound",
    "declined",
    "lost",
    "unassigned",
    "follow-up-due",
    "appointments",
    "suppressed"
] as const;


export type InsuranceLeadTriageFilter =
    typeof INSURANCE_LEAD_TRIAGE_FILTERS[number];


export interface InsuranceLeadTriageFlags {
    readonly newInboundQuote:
        boolean;

    readonly unassigned:
        boolean;

    readonly followUpDue:
        boolean;

    readonly suppressed:
        boolean;

    readonly hasContactMethod:
        boolean;
}


export interface InsuranceLeadTriageItem {
    readonly relationship:
        RiverCrmRelationship;

    readonly insurance:
        InsuranceLeadPresentation;

    readonly flags:
        InsuranceLeadTriageFlags;
}


export interface InsuranceLeadTriageSummary {
    readonly totalInsurance:
        number;

    readonly newInbound:
        number;

    readonly notStarted:
        number;

    readonly requested:
        number;

    readonly inProgress:
        number;

    readonly quoted:
        number;

    readonly bound:
        number;

    readonly declined:
        number;

    readonly lost:
        number;

    readonly unassigned:
        number;

    readonly followUpDue:
        number;

    readonly appointments:
        number;

    readonly suppressed:
        number;
}


export interface InsuranceLeadTriageSnapshot {
    readonly generatedAt:
        string;

    readonly items:
        readonly InsuranceLeadTriageItem[];

    readonly summary:
        InsuranceLeadTriageSummary;
}


export interface CreateInsuranceLeadTriageSnapshotInput {
    readonly relationships:
        readonly RiverCrmRelationship[];

    readonly insurancePresentations:
        readonly InsuranceLeadPresentation[];

    readonly now:
        string;
}


const TERMINAL_QUOTE_STATUSES =
    new Set<InsuranceQuoteStatus>([
        "bound",
        "declined",
        "lost"
    ]);


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
            `Insurance lead triage requires valid ${label}.`
        );
    }

    return value;
}


function compareItems(
    left:
        InsuranceLeadTriageItem,
    right:
        InsuranceLeadTriageItem
):
    number {

    if(
        left.relationship.updatedAt >
        right.relationship.updatedAt
    ){
        return -1;
    }

    if(
        left.relationship.updatedAt <
        right.relationship.updatedAt
    ){
        return 1;
    }

    if(
        left.relationship.relationshipId <
        right.relationship.relationshipId
    ){
        return -1;
    }

    if(
        left.relationship.relationshipId >
        right.relationship.relationshipId
    ){
        return 1;
    }

    return 0;
}


function isNewInboundQuote(
    relationship:
        RiverCrmRelationship,
    insurance:
        InsuranceLeadPresentation
):
    boolean {

    return (
        relationship.kind ===
            "lead" &&
        relationship.stage ===
            "new" &&
        relationship.source ===
            "website" &&
        insurance.acquisitionSource ===
            "website" &&
        insurance.quoteStatus ===
            "requested"
    );
}


function isFollowUpDue(
    relationship:
        RiverCrmRelationship,
    insurance:
        InsuranceLeadPresentation,
    now:
        string
):
    boolean {

    if(
        relationship.nextFollowUpAt ===
            undefined
    ){
        return false;
    }

    if(
        TERMINAL_QUOTE_STATUSES.has(
            insurance.quoteStatus
        )
    ){
        return false;
    }

    return (
        Date.parse(
            relationship.nextFollowUpAt
        ) <=
        Date.parse(
            now
        )
    );
}


function matchesFilter(
    item:
        InsuranceLeadTriageItem,
    filter:
        InsuranceLeadTriageFilter
):
    boolean {

    switch(filter){
        case "all":
            return true;

        case "new":
            return item.flags
                .newInboundQuote;

        case "not-started":
            return item.insurance
                .quoteStatus ===
                "not-started";

        case "requested":
            return item.insurance
                .quoteStatus ===
                "requested";

        case "in-progress":
            return item.insurance
                .quoteStatus ===
                "in-progress";

        case "quoted":
            return item.insurance
                .quoteStatus ===
                "quoted";

        case "bound":
            return item.insurance
                .quoteStatus ===
                "bound";

        case "declined":
            return item.insurance
                .quoteStatus ===
                "declined";

        case "lost":
            return item.insurance
                .quoteStatus ===
                "lost";

        case "unassigned":
            return item.flags
                .unassigned;

        case "follow-up-due":
            return item.flags
                .followUpDue;

        case "appointments":
            return item.relationship
                .appointmentAt !==
                undefined;

        case "suppressed":
            return item.flags
                .suppressed;
    }
}


export function selectInsuranceLeadTriageItems(
    snapshot:
        InsuranceLeadTriageSnapshot,
    filter:
        InsuranceLeadTriageFilter
):
    readonly InsuranceLeadTriageItem[] {

    if(
        !(
            INSURANCE_LEAD_TRIAGE_FILTERS as
                readonly string[]
        ).includes(
            filter
        )
    ){
        throw new TypeError(
            "Insurance lead triage filter is not supported."
        );
    }

    return snapshot.items.filter(
        item =>
            matchesFilter(
                item,
                filter
            )
    );
}


export function createInsuranceLeadTriageSnapshot(
    input:
        CreateInsuranceLeadTriageSnapshotInput
):
    InsuranceLeadTriageSnapshot {

    const generatedAt =
        timestamp(
            input.now,
            "now"
        );

    const relationshipById =
        new Map<
            string,
            RiverCrmRelationship
        >();

    for(
        const candidate of
        input.relationships
    ){
        const relationship =
            createRiverCrmRelationship(
                candidate
            );

        if(
            relationshipById.has(
                relationship.relationshipId
            )
        ){
            throw new TypeError(
                "Insurance lead triage does not allow duplicate relationship identity."
            );
        }

        relationshipById.set(
            relationship.relationshipId,
            relationship
        );
    }

    const presentationById =
        new Map<
            string,
            InsuranceLeadPresentation
        >();

    for(
        const presentation of
        input.insurancePresentations
    ){
        if(
            presentationById.has(
                presentation.relationshipId
            )
        ){
            throw new TypeError(
                "Insurance lead triage does not allow duplicate insurance presentation identity."
            );
        }

        if(
            !relationshipById.has(
                presentation.relationshipId
            )
        ){
            throw new TypeError(
                "Insurance lead triage requires every insurance presentation to match the relationship cohort."
            );
        }

        presentationById.set(
            presentation.relationshipId,
            presentation
        );
    }

    const items:
        InsuranceLeadTriageItem[] = [];

    for(
        const relationship of
        relationshipById.values()
    ){
        const insurance =
            presentationById.get(
                relationship.relationshipId
            );

        if(insurance === undefined){
            continue;
        }

        items.push({
            relationship,

            insurance,

            flags: {
                newInboundQuote:
                    isNewInboundQuote(
                        relationship,
                        insurance
                    ),

                unassigned:
                    insurance.assignedProducer ===
                    undefined,

                followUpDue:
                    isFollowUpDue(
                        relationship,
                        insurance,
                        generatedAt
                    ),

                suppressed:
                    insurance.doNotContact,

                hasContactMethod:
                    relationship.email !==
                        undefined ||
                    relationship.phone !==
                        undefined
            }
        });
    }

    items.sort(
        compareItems
    );

    const summary:
        InsuranceLeadTriageSummary = {

        totalInsurance:
            items.length,

        newInbound:
            items.filter(
                item =>
                    item.flags
                        .newInboundQuote
            ).length,

        notStarted:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "not-started"
            ).length,

        requested:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "requested"
            ).length,

        inProgress:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "in-progress"
            ).length,

        quoted:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "quoted"
            ).length,

        bound:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "bound"
            ).length,

        declined:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "declined"
            ).length,

        lost:
            items.filter(
                item =>
                    item.insurance
                        .quoteStatus ===
                        "lost"
            ).length,

        unassigned:
            items.filter(
                item =>
                    item.flags
                        .unassigned
            ).length,

        followUpDue:
            items.filter(
                item =>
                    item.flags
                        .followUpDue
            ).length,

        appointments:
            items.filter(
                item =>
                    item.relationship
                        .appointmentAt !==
                    undefined
            ).length,

        suppressed:
            items.filter(
                item =>
                    item.flags
                        .suppressed
            ).length
    };

    return {
        generatedAt,
        items,
        summary
    };
}
