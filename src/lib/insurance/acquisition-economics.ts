import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


export const INSURANCE_ACQUISITION_COST_CATEGORIES = [
    "lead",
    "advertising",
    "setter",
    "platform",
    "data",
    "creative",
    "other"
] as const;

export type InsuranceAcquisitionCostCategory =
    typeof INSURANCE_ACQUISITION_COST_CATEGORIES[number];


export const INSURANCE_PREMIUM_KINDS = [
    "quoted",
    "written",
    "renewal"
] as const;

export type InsurancePremiumKind =
    typeof INSURANCE_PREMIUM_KINDS[number];


export const INSURANCE_COMMISSION_KINDS = [
    "earned",
    "paid",
    "chargeback",
    "adjustment"
] as const;

export type InsuranceCommissionKind =
    typeof INSURANCE_COMMISSION_KINDS[number];


export const INSURANCE_RENEWAL_KINDS = [
    "due",
    "quoted",
    "renewed",
    "lost"
] as const;

export type InsuranceRenewalKind =
    typeof INSURANCE_RENEWAL_KINDS[number];


export type InsuranceAcquisitionCostFactId =
    string & {
        readonly __insuranceAcquisitionCostFactId:
            unique symbol;
    };

export type InsurancePremiumFactId =
    string & {
        readonly __insurancePremiumFactId:
            unique symbol;
    };

export type InsuranceCommissionFactId =
    string & {
        readonly __insuranceCommissionFactId:
            unique symbol;
    };

export type InsuranceRenewalFactId =
    string & {
        readonly __insuranceRenewalFactId:
            unique symbol;
    };


export interface InsuranceMoney {
    readonly amountMinorUnits:
        number;
    readonly currency:
        string;
}


export interface InsuranceAcquisitionCostFact {
    readonly costId:
        InsuranceAcquisitionCostFactId;
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly category:
        InsuranceAcquisitionCostCategory;
    readonly money:
        InsuranceMoney;
    readonly occurredAt:
        string;
    readonly source?:
        string;
    readonly vendor?:
        string;
    readonly campaign?:
        string;
    readonly externalReference?:
        string;
    readonly note?:
        string;
}


export interface InsurancePremiumFact {
    readonly premiumFactId:
        InsurancePremiumFactId;
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly kind:
        InsurancePremiumKind;
    readonly money:
        InsuranceMoney;
    readonly occurredAt:
        string;
    readonly providerReference?:
        string;
    readonly policyReference?:
        string;
    readonly effectiveAt?:
        string;
    readonly externalReference?:
        string;
}


export interface InsuranceCommissionFact {
    readonly commissionFactId:
        InsuranceCommissionFactId;
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly kind:
        InsuranceCommissionKind;
    readonly money:
        InsuranceMoney;
    readonly occurredAt:
        string;
    readonly providerReference?:
        string;
    readonly policyReference?:
        string;
    readonly externalReference?:
        string;
    readonly note?:
        string;
}


export interface InsuranceRenewalFact {
    readonly renewalFactId:
        InsuranceRenewalFactId;
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly kind:
        InsuranceRenewalKind;
    readonly occurredAt:
        string;
    readonly providerReference?:
        string;
    readonly policyReference?:
        string;
    readonly effectiveAt?:
        string;
    readonly externalReference?:
        string;
    readonly note?:
        string;
}


export interface CreateInsuranceMoneyInput {
    readonly amountMinorUnits:
        unknown;
    readonly currency:
        unknown;
}


export interface CreateInsuranceAcquisitionCostFactInput {
    readonly costId:
        unknown;
    readonly relationshipId:
        unknown;
    readonly category:
        unknown;
    readonly money:
        CreateInsuranceMoneyInput;
    readonly occurredAt:
        unknown;
    readonly source?:
        unknown;
    readonly vendor?:
        unknown;
    readonly campaign?:
        unknown;
    readonly externalReference?:
        unknown;
    readonly note?:
        unknown;
}


export interface CreateInsurancePremiumFactInput {
    readonly premiumFactId:
        unknown;
    readonly relationshipId:
        unknown;
    readonly kind:
        unknown;
    readonly money:
        CreateInsuranceMoneyInput;
    readonly occurredAt:
        unknown;
    readonly providerReference?:
        unknown;
    readonly policyReference?:
        unknown;
    readonly effectiveAt?:
        unknown;
    readonly externalReference?:
        unknown;
}


export interface CreateInsuranceCommissionFactInput {
    readonly commissionFactId:
        unknown;
    readonly relationshipId:
        unknown;
    readonly kind:
        unknown;
    readonly money:
        CreateInsuranceMoneyInput;
    readonly occurredAt:
        unknown;
    readonly providerReference?:
        unknown;
    readonly policyReference?:
        unknown;
    readonly externalReference?:
        unknown;
    readonly note?:
        unknown;
}


export interface CreateInsuranceRenewalFactInput {
    readonly renewalFactId:
        unknown;
    readonly relationshipId:
        unknown;
    readonly kind:
        unknown;
    readonly occurredAt:
        unknown;
    readonly providerReference?:
        unknown;
    readonly policyReference?:
        unknown;
    readonly effectiveAt?:
        unknown;
    readonly externalReference?:
        unknown;
    readonly note?:
        unknown;
}


function requiredText(
    value: unknown,
    field: string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance economics requires ${field} to be text.`
        );
    }

    const normalized =
        value.trim();

    if(normalized.length === 0){
        throw new TypeError(
            `Insurance economics requires ${field}.`
        );
    }

    return normalized;
}


function optionalText(
    value: unknown,
    field: string
): string | undefined {
    if(
        value === undefined ||
        value === null ||
        value === ""
    ){
        return undefined;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance economics requires ${field} to be text when provided.`
        );
    }

    const normalized =
        value.trim();

    if(normalized.length === 0){
        return undefined;
    }

    return normalized;
}


function requiredTimestamp(
    value: unknown,
    field: string
): string {
    const normalized =
        requiredText(
            value,
            field
        );

    if(
        !Number.isFinite(
            Date.parse(normalized)
        )
    ){
        throw new TypeError(
            `Insurance economics requires ${field} to be a valid timestamp.`
        );
    }

    return normalized;
}


function optionalTimestamp(
    value: unknown,
    field: string
): string | undefined {
    const normalized =
        optionalText(
            value,
            field
        );

    if(normalized === undefined){
        return undefined;
    }

    if(
        !Number.isFinite(
            Date.parse(normalized)
        )
    ){
        throw new TypeError(
            `Insurance economics requires ${field} to be a valid timestamp when provided.`
        );
    }

    return normalized;
}


function requiredPrefixedId(
    value: unknown,
    field: string,
    prefix: string
): string {
    const normalized =
        requiredText(
            value,
            field
        );

    if(
        !normalized.startsWith(prefix) ||
        normalized.length <= prefix.length
    ){
        throw new TypeError(
            `Insurance economics requires ${field} to use ${prefix}<value>.`
        );
    }

    return normalized;
}


function requiredMember<
    T extends string
>(
    value: unknown,
    field: string,
    allowed: readonly T[]
): T {
    const normalized =
        requiredText(
            value,
            field
        );

    if(
        !allowed.includes(
            normalized as T
        )
    ){
        throw new TypeError(
            `Insurance economics requires supported ${field}.`
        );
    }

    return normalized as T;
}


function optionalFields<
    T extends Record<string, unknown>
>(
    input: T
): Partial<T> {
    const output:
        Record<string, unknown> = {};

    for(const [
        key,
        value
    ] of Object.entries(input)){
        if(value !== undefined){
            output[key] = value;
        }
    }

    return output as Partial<T>;
}


export function createInsuranceMoney(
    input: CreateInsuranceMoneyInput,
    options: {
        readonly allowNegative?: boolean;
    } = {}
): InsuranceMoney {
    if(
        typeof input.amountMinorUnits !== "number" ||
        !Number.isFinite(input.amountMinorUnits) ||
        !Number.isInteger(input.amountMinorUnits)
    ){
        throw new TypeError(
            "Insurance economics requires amountMinorUnits to be a finite integer."
        );
    }

    if(
        options.allowNegative !== true &&
        input.amountMinorUnits < 0
    ){
        throw new TypeError(
            "Insurance economics requires amountMinorUnits to be non-negative."
        );
    }

    const currency =
        requiredText(
            input.currency,
            "currency"
        ).toUpperCase();

    if(!/^[A-Z]{3}$/.test(currency)){
        throw new TypeError(
            "Insurance economics requires currency to be a three-letter uppercase code."
        );
    }

    return {
        amountMinorUnits:
            input.amountMinorUnits,
        currency
    };
}


export function createInsuranceAcquisitionCostFactId(
    value: unknown
): InsuranceAcquisitionCostFactId {
    return requiredPrefixedId(
        value,
        "costId",
        "acquisition-cost:"
    ) as InsuranceAcquisitionCostFactId;
}


export function createInsurancePremiumFactId(
    value: unknown
): InsurancePremiumFactId {
    return requiredPrefixedId(
        value,
        "premiumFactId",
        "premium-fact:"
    ) as InsurancePremiumFactId;
}


export function createInsuranceCommissionFactId(
    value: unknown
): InsuranceCommissionFactId {
    return requiredPrefixedId(
        value,
        "commissionFactId",
        "commission-fact:"
    ) as InsuranceCommissionFactId;
}


export function createInsuranceRenewalFactId(
    value: unknown
): InsuranceRenewalFactId {
    return requiredPrefixedId(
        value,
        "renewalFactId",
        "renewal-fact:"
    ) as InsuranceRenewalFactId;
}


export function createInsuranceAcquisitionCostFact(
    input: CreateInsuranceAcquisitionCostFactInput
): InsuranceAcquisitionCostFact {
    const source =
        optionalText(
            input.source,
            "source"
        );

    const vendor =
        optionalText(
            input.vendor,
            "vendor"
        );

    const campaign =
        optionalText(
            input.campaign,
            "campaign"
        );

    const externalReference =
        optionalText(
            input.externalReference,
            "externalReference"
        );

    const note =
        optionalText(
            input.note,
            "note"
        );

    return {
        costId:
            createInsuranceAcquisitionCostFactId(
                input.costId
            ),
        relationshipId:
            requireRiverCrmRelationshipId(
                input.relationshipId
            ),
        category:
            requiredMember(
                input.category,
                "acquisition cost category",
                INSURANCE_ACQUISITION_COST_CATEGORIES
            ),
        money:
            createInsuranceMoney(
                input.money
            ),
        occurredAt:
            requiredTimestamp(
                input.occurredAt,
                "occurredAt"
            ),
        ...optionalFields({
            source,
            vendor,
            campaign,
            externalReference,
            note
        })
    };
}


export function createInsurancePremiumFact(
    input: CreateInsurancePremiumFactInput
): InsurancePremiumFact {
    const providerReference =
        optionalText(
            input.providerReference,
            "providerReference"
        );

    const policyReference =
        optionalText(
            input.policyReference,
            "policyReference"
        );

    const effectiveAt =
        optionalTimestamp(
            input.effectiveAt,
            "effectiveAt"
        );

    const externalReference =
        optionalText(
            input.externalReference,
            "externalReference"
        );

    return {
        premiumFactId:
            createInsurancePremiumFactId(
                input.premiumFactId
            ),
        relationshipId:
            requireRiverCrmRelationshipId(
                input.relationshipId
            ),
        kind:
            requiredMember(
                input.kind,
                "premium kind",
                INSURANCE_PREMIUM_KINDS
            ),
        money:
            createInsuranceMoney(
                input.money
            ),
        occurredAt:
            requiredTimestamp(
                input.occurredAt,
                "occurredAt"
            ),
        ...optionalFields({
            providerReference,
            policyReference,
            effectiveAt,
            externalReference
        })
    };
}


export function createInsuranceCommissionFact(
    input: CreateInsuranceCommissionFactInput
): InsuranceCommissionFact {
    const providerReference =
        optionalText(
            input.providerReference,
            "providerReference"
        );

    const policyReference =
        optionalText(
            input.policyReference,
            "policyReference"
        );

    const externalReference =
        optionalText(
            input.externalReference,
            "externalReference"
        );

    const note =
        optionalText(
            input.note,
            "note"
        );

    return {
        commissionFactId:
            createInsuranceCommissionFactId(
                input.commissionFactId
            ),
        relationshipId:
            requireRiverCrmRelationshipId(
                input.relationshipId
            ),
        kind:
            requiredMember(
                input.kind,
                "commission kind",
                INSURANCE_COMMISSION_KINDS
            ),
        money:
            createInsuranceMoney(
                input.money,
                {
                    allowNegative:
                        true
                }
            ),
        occurredAt:
            requiredTimestamp(
                input.occurredAt,
                "occurredAt"
            ),
        ...optionalFields({
            providerReference,
            policyReference,
            externalReference,
            note
        })
    };
}


export function createInsuranceRenewalFact(
    input: CreateInsuranceRenewalFactInput
): InsuranceRenewalFact {
    const providerReference =
        optionalText(
            input.providerReference,
            "providerReference"
        );

    const policyReference =
        optionalText(
            input.policyReference,
            "policyReference"
        );

    const effectiveAt =
        optionalTimestamp(
            input.effectiveAt,
            "effectiveAt"
        );

    const externalReference =
        optionalText(
            input.externalReference,
            "externalReference"
        );

    const note =
        optionalText(
            input.note,
            "note"
        );

    return {
        renewalFactId:
            createInsuranceRenewalFactId(
                input.renewalFactId
            ),
        relationshipId:
            requireRiverCrmRelationshipId(
                input.relationshipId
            ),
        kind:
            requiredMember(
                input.kind,
                "renewal kind",
                INSURANCE_RENEWAL_KINDS
            ),
        occurredAt:
            requiredTimestamp(
                input.occurredAt,
                "occurredAt"
            ),
        ...optionalFields({
            providerReference,
            policyReference,
            effectiveAt,
            externalReference,
            note
        })
    };
}
