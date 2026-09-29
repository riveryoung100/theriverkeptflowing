import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmD1Database,
    RiverCrmD1RunResult
} from "../river-os/d1-crm-growth";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";


interface AcquisitionCostRow {
    readonly cost_id:
        unknown;
    readonly relationship_id:
        unknown;
    readonly category:
        unknown;
    readonly amount_minor_units:
        unknown;
    readonly currency:
        unknown;
    readonly occurred_at:
        unknown;
    readonly source:
        unknown;
    readonly vendor:
        unknown;
    readonly campaign:
        unknown;
    readonly external_reference:
        unknown;
    readonly note:
        unknown;
}


interface PremiumFactRow {
    readonly premium_fact_id:
        unknown;
    readonly relationship_id:
        unknown;
    readonly kind:
        unknown;
    readonly amount_minor_units:
        unknown;
    readonly currency:
        unknown;
    readonly occurred_at:
        unknown;
    readonly provider_reference:
        unknown;
    readonly policy_reference:
        unknown;
    readonly effective_at:
        unknown;
    readonly external_reference:
        unknown;
}


interface CommissionFactRow {
    readonly commission_fact_id:
        unknown;
    readonly relationship_id:
        unknown;
    readonly kind:
        unknown;
    readonly amount_minor_units:
        unknown;
    readonly currency:
        unknown;
    readonly occurred_at:
        unknown;
    readonly provider_reference:
        unknown;
    readonly policy_reference:
        unknown;
    readonly external_reference:
        unknown;
    readonly note:
        unknown;
}


interface RenewalFactRow {
    readonly renewal_fact_id:
        unknown;
    readonly relationship_id:
        unknown;
    readonly kind:
        unknown;
    readonly occurred_at:
        unknown;
    readonly provider_reference:
        unknown;
    readonly policy_reference:
        unknown;
    readonly effective_at:
        unknown;
    readonly external_reference:
        unknown;
    readonly note:
        unknown;
}


export interface D1InsuranceAcquisitionEconomicsPersistence {
    insertAcquisitionCost(
        fact:
            InsuranceAcquisitionCostFact
    ): Promise<
        InsuranceAcquisitionCostFact
    >;

    listAcquisitionCostsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        readonly InsuranceAcquisitionCostFact[]
    >;

    insertPremiumFact(
        fact:
            InsurancePremiumFact
    ): Promise<
        InsurancePremiumFact
    >;

    listPremiumFactsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        readonly InsurancePremiumFact[]
    >;

    insertCommissionFact(
        fact:
            InsuranceCommissionFact
    ): Promise<
        InsuranceCommissionFact
    >;

    listCommissionFactsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        readonly InsuranceCommissionFact[]
    >;

    insertRenewalFact(
        fact:
            InsuranceRenewalFact
    ): Promise<
        InsuranceRenewalFact
    >;

    listRenewalFactsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        readonly InsuranceRenewalFact[]
    >;

    listAcquisitionCostsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionCostFact[]
    >;

    listPremiumFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsurancePremiumFact[]
    >;

    listCommissionFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceCommissionFact[]
    >;

    listRenewalFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceRenewalFact[]
    >;
}


function nullableValue(
    value: unknown
): unknown {
    return value === undefined
        ? null
        : value;
}


function rowOptional(
    value: unknown
): unknown {
    return value === null
        ? undefined
        : value;
}


function requireExactlyOneChange(
    result:
        RiverCrmD1RunResult,
    operation:
        string
): void {
    if(result.success === false){
        throw new Error(
            `Insurance acquisition economics D1 ${operation} failed.`
        );
    }

    if(result.meta?.changes !== 1){
        throw new Error(
            `Insurance acquisition economics D1 ${operation} requires exactly one changed row.`
        );
    }
}


function acquisitionCostFromRow(
    row:
        AcquisitionCostRow
): InsuranceAcquisitionCostFact {
    return createInsuranceAcquisitionCostFact({
        costId:
            row.cost_id,
        relationshipId:
            row.relationship_id,
        category:
            row.category,
        money: {
            amountMinorUnits:
                row.amount_minor_units,
            currency:
                row.currency
        },
        occurredAt:
            row.occurred_at,
        source:
            rowOptional(
                row.source
            ),
        vendor:
            rowOptional(
                row.vendor
            ),
        campaign:
            rowOptional(
                row.campaign
            ),
        externalReference:
            rowOptional(
                row.external_reference
            ),
        note:
            rowOptional(
                row.note
            )
    });
}


function premiumFromRow(
    row:
        PremiumFactRow
): InsurancePremiumFact {
    return createInsurancePremiumFact({
        premiumFactId:
            row.premium_fact_id,
        relationshipId:
            row.relationship_id,
        kind:
            row.kind,
        money: {
            amountMinorUnits:
                row.amount_minor_units,
            currency:
                row.currency
        },
        occurredAt:
            row.occurred_at,
        providerReference:
            rowOptional(
                row.provider_reference
            ),
        policyReference:
            rowOptional(
                row.policy_reference
            ),
        effectiveAt:
            rowOptional(
                row.effective_at
            ),
        externalReference:
            rowOptional(
                row.external_reference
            )
    });
}


function commissionFromRow(
    row:
        CommissionFactRow
): InsuranceCommissionFact {
    return createInsuranceCommissionFact({
        commissionFactId:
            row.commission_fact_id,
        relationshipId:
            row.relationship_id,
        kind:
            row.kind,
        money: {
            amountMinorUnits:
                row.amount_minor_units,
            currency:
                row.currency
        },
        occurredAt:
            row.occurred_at,
        providerReference:
            rowOptional(
                row.provider_reference
            ),
        policyReference:
            rowOptional(
                row.policy_reference
            ),
        externalReference:
            rowOptional(
                row.external_reference
            ),
        note:
            rowOptional(
                row.note
            )
    });
}


function renewalFromRow(
    row:
        RenewalFactRow
): InsuranceRenewalFact {
    return createInsuranceRenewalFact({
        renewalFactId:
            row.renewal_fact_id,
        relationshipId:
            row.relationship_id,
        kind:
            row.kind,
        occurredAt:
            row.occurred_at,
        providerReference:
            rowOptional(
                row.provider_reference
            ),
        policyReference:
            rowOptional(
                row.policy_reference
            ),
        effectiveAt:
            rowOptional(
                row.effective_at
            ),
        externalReference:
            rowOptional(
                row.external_reference
            ),
        note:
            rowOptional(
                row.note
            )
    });
}


function canonicalEconomicRelationshipIds(
    relationshipIds:
        readonly RiverCrmRelationshipId[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const relationshipId of relationshipIds){
        const canonical =
            requireRiverCrmRelationshipId(
                relationshipId
            );

        if(!seen.has(canonical)){
            seen.add(
                canonical
            );

            result.push(
                canonical
            );
        }
    }

    return result;
}


function economicPlaceholders(
    count:
        number
): string {
    return new Array(
        count
    )
        .fill("?")
        .join(", ");
}

export function createD1InsuranceAcquisitionEconomicsPersistence(
    database:
        RiverCrmD1Database
): D1InsuranceAcquisitionEconomicsPersistence {
    return {
        async insertAcquisitionCost(
            fact
        ){
            const canonical =
                createInsuranceAcquisitionCostFact(
                    fact
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_insurance_acquisition_costs (
                            cost_id,
                            relationship_id,
                            category,
                            amount_minor_units,
                            currency,
                            occurred_at,
                            source,
                            vendor,
                            campaign,
                            external_reference,
                            note
                        )
                        VALUES (
                            ?1, ?2, ?3, ?4, ?5, ?6,
                            ?7, ?8, ?9, ?10, ?11
                        )
                    `)
                    .bind(
                        canonical.costId,
                        canonical.relationshipId,
                        canonical.category,
                        canonical.money.amountMinorUnits,
                        canonical.money.currency,
                        canonical.occurredAt,
                        nullableValue(
                            canonical.source
                        ),
                        nullableValue(
                            canonical.vendor
                        ),
                        nullableValue(
                            canonical.campaign
                        ),
                        nullableValue(
                            canonical.externalReference
                        ),
                        nullableValue(
                            canonical.note
                        )
                    )
                    .run();

            requireExactlyOneChange(
                result,
                "acquisition-cost insert"
            );

            return canonical;
        },

        async listAcquisitionCostsForRelationship(
            relationshipId
        ){
            const canonicalRelationshipId =
                requireRiverCrmRelationshipId(
                    relationshipId
                );

            const result =
                await database
                    .prepare(`
                        SELECT
                            cost_id,
                            relationship_id,
                            category,
                            amount_minor_units,
                            currency,
                            occurred_at,
                            source,
                            vendor,
                            campaign,
                            external_reference,
                            note
                        FROM river_crm_insurance_acquisition_costs
                        WHERE relationship_id = ?1
                        ORDER BY
                            occurred_at DESC,
                            cost_id DESC
                    `)
                    .bind(
                        canonicalRelationshipId
                    )
                    .all<AcquisitionCostRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 acquisition-cost list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                acquisitionCostFromRow
            );
        },

        async insertPremiumFact(
            fact
        ){
            const canonical =
                createInsurancePremiumFact(
                    fact
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_insurance_premium_facts (
                            premium_fact_id,
                            relationship_id,
                            kind,
                            amount_minor_units,
                            currency,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            effective_at,
                            external_reference
                        )
                        VALUES (
                            ?1, ?2, ?3, ?4, ?5,
                            ?6, ?7, ?8, ?9, ?10
                        )
                    `)
                    .bind(
                        canonical.premiumFactId,
                        canonical.relationshipId,
                        canonical.kind,
                        canonical.money.amountMinorUnits,
                        canonical.money.currency,
                        canonical.occurredAt,
                        nullableValue(
                            canonical.providerReference
                        ),
                        nullableValue(
                            canonical.policyReference
                        ),
                        nullableValue(
                            canonical.effectiveAt
                        ),
                        nullableValue(
                            canonical.externalReference
                        )
                    )
                    .run();

            requireExactlyOneChange(
                result,
                "premium insert"
            );

            return canonical;
        },

        async listPremiumFactsForRelationship(
            relationshipId
        ){
            const canonicalRelationshipId =
                requireRiverCrmRelationshipId(
                    relationshipId
                );

            const result =
                await database
                    .prepare(`
                        SELECT
                            premium_fact_id,
                            relationship_id,
                            kind,
                            amount_minor_units,
                            currency,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            effective_at,
                            external_reference
                        FROM river_crm_insurance_premium_facts
                        WHERE relationship_id = ?1
                        ORDER BY
                            occurred_at DESC,
                            premium_fact_id DESC
                    `)
                    .bind(
                        canonicalRelationshipId
                    )
                    .all<PremiumFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 premium list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                premiumFromRow
            );
        },

        async insertCommissionFact(
            fact
        ){
            const canonical =
                createInsuranceCommissionFact(
                    fact
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_insurance_commission_facts (
                            commission_fact_id,
                            relationship_id,
                            kind,
                            amount_minor_units,
                            currency,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            external_reference,
                            note
                        )
                        VALUES (
                            ?1, ?2, ?3, ?4, ?5,
                            ?6, ?7, ?8, ?9, ?10
                        )
                    `)
                    .bind(
                        canonical.commissionFactId,
                        canonical.relationshipId,
                        canonical.kind,
                        canonical.money.amountMinorUnits,
                        canonical.money.currency,
                        canonical.occurredAt,
                        nullableValue(
                            canonical.providerReference
                        ),
                        nullableValue(
                            canonical.policyReference
                        ),
                        nullableValue(
                            canonical.externalReference
                        ),
                        nullableValue(
                            canonical.note
                        )
                    )
                    .run();

            requireExactlyOneChange(
                result,
                "commission insert"
            );

            return canonical;
        },

        async listCommissionFactsForRelationship(
            relationshipId
        ){
            const canonicalRelationshipId =
                requireRiverCrmRelationshipId(
                    relationshipId
                );

            const result =
                await database
                    .prepare(`
                        SELECT
                            commission_fact_id,
                            relationship_id,
                            kind,
                            amount_minor_units,
                            currency,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            external_reference,
                            note
                        FROM river_crm_insurance_commission_facts
                        WHERE relationship_id = ?1
                        ORDER BY
                            occurred_at DESC,
                            commission_fact_id DESC
                    `)
                    .bind(
                        canonicalRelationshipId
                    )
                    .all<CommissionFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 commission list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                commissionFromRow
            );
        },

        async insertRenewalFact(
            fact
        ){
            const canonical =
                createInsuranceRenewalFact(
                    fact
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_insurance_renewal_facts (
                            renewal_fact_id,
                            relationship_id,
                            kind,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            effective_at,
                            external_reference,
                            note
                        )
                        VALUES (
                            ?1, ?2, ?3, ?4, ?5,
                            ?6, ?7, ?8, ?9
                        )
                    `)
                    .bind(
                        canonical.renewalFactId,
                        canonical.relationshipId,
                        canonical.kind,
                        canonical.occurredAt,
                        nullableValue(
                            canonical.providerReference
                        ),
                        nullableValue(
                            canonical.policyReference
                        ),
                        nullableValue(
                            canonical.effectiveAt
                        ),
                        nullableValue(
                            canonical.externalReference
                        ),
                        nullableValue(
                            canonical.note
                        )
                    )
                    .run();

            requireExactlyOneChange(
                result,
                "renewal insert"
            );

            return canonical;
        },

        async listRenewalFactsForRelationship(
            relationshipId
        ){
            const canonicalRelationshipId =
                requireRiverCrmRelationshipId(
                    relationshipId
                );

            const result =
                await database
                    .prepare(`
                        SELECT
                            renewal_fact_id,
                            relationship_id,
                            kind,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            effective_at,
                            external_reference,
                            note
                        FROM river_crm_insurance_renewal_facts
                        WHERE relationship_id = ?1
                        ORDER BY
                            occurred_at DESC,
                            renewal_fact_id DESC
                    `)
                    .bind(
                        canonicalRelationshipId
                    )
                    .all<RenewalFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 renewal list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                renewalFromRow
            );
        },

        async listAcquisitionCostsForRelationships(
            relationshipIds
        ){
            const ids =
                canonicalEconomicRelationshipIds(
                    relationshipIds
                );

            if(ids.length === 0){
                return [];
            }

            const parameterList =
                economicPlaceholders(
                    ids.length
                );

            const result =
                await database
                    .prepare(`
SELECT
    cost_id,
    relationship_id,
    category,
    amount_minor_units,
    currency,
    occurred_at,
    source,
    vendor,
    campaign,
    external_reference,
    note
FROM river_crm_insurance_acquisition_costs
WHERE relationship_id IN (${parameterList})
ORDER BY
    relationship_id ASC,
    occurred_at DESC,
    cost_id DESC
                    `)
                    .bind(
                        ...ids
                    )
                    .all<AcquisitionCostRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 acquisition-cost batch list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                acquisitionCostFromRow
            );
        },

        async listPremiumFactsForRelationships(
            relationshipIds
        ){
            const ids =
                canonicalEconomicRelationshipIds(
                    relationshipIds
                );

            if(ids.length === 0){
                return [];
            }

            const parameterList =
                economicPlaceholders(
                    ids.length
                );

            const result =
                await database
                    .prepare(`
SELECT
    premium_fact_id,
    relationship_id,
    kind,
    amount_minor_units,
    currency,
    occurred_at,
    provider_reference,
    policy_reference,
    effective_at,
    external_reference
FROM river_crm_insurance_premium_facts
WHERE relationship_id IN (${parameterList})
ORDER BY
    relationship_id ASC,
    occurred_at DESC,
    premium_fact_id DESC
                    `)
                    .bind(
                        ...ids
                    )
                    .all<PremiumFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 premium batch list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                premiumFromRow
            );
        },

        async listCommissionFactsForRelationships(
            relationshipIds
        ){
            const ids =
                canonicalEconomicRelationshipIds(
                    relationshipIds
                );

            if(ids.length === 0){
                return [];
            }

            const parameterList =
                economicPlaceholders(
                    ids.length
                );

            const result =
                await database
                    .prepare(`
SELECT
    commission_fact_id,
    relationship_id,
    kind,
    amount_minor_units,
    currency,
    occurred_at,
    provider_reference,
    policy_reference,
    external_reference,
    note
FROM river_crm_insurance_commission_facts
WHERE relationship_id IN (${parameterList})
ORDER BY
    relationship_id ASC,
    occurred_at DESC,
    commission_fact_id DESC
                    `)
                    .bind(
                        ...ids
                    )
                    .all<CommissionFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 commission batch list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                commissionFromRow
            );
        },

        async listRenewalFactsForRelationships(
            relationshipIds
        ){
            const ids =
                canonicalEconomicRelationshipIds(
                    relationshipIds
                );

            if(ids.length === 0){
                return [];
            }

            const parameterList =
                economicPlaceholders(
                    ids.length
                );

            const result =
                await database
                    .prepare(`
SELECT
    renewal_fact_id,
    relationship_id,
    kind,
    occurred_at,
    provider_reference,
    policy_reference,
    effective_at,
    external_reference,
    note
FROM river_crm_insurance_renewal_facts
WHERE relationship_id IN (${parameterList})
ORDER BY
    relationship_id ASC,
    occurred_at DESC,
    renewal_fact_id DESC
                    `)
                    .bind(
                        ...ids
                    )
                    .all<RenewalFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition economics D1 renewal batch list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                renewalFromRow
            );
        }
    };
}
