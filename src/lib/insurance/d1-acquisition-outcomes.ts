import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    CreateInsuranceAcquisitionOutcomeFactInput,
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";


interface OutcomeFactRow {
    readonly outcome_fact_id:
        string;

    readonly relationship_id:
        string;

    readonly kind:
        string;

    readonly occurred_at:
        string;

    readonly provider_reference:
        string | null;

    readonly policy_reference:
        string | null;

    readonly external_reference:
        string | null;

    readonly note:
        string | null;
}


export interface InsuranceAcquisitionOutcomePersistence {
    append(
        fact:
            CreateInsuranceAcquisitionOutcomeFactInput
    ): Promise<
        InsuranceAcquisitionOutcomeFact
    >;

    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


function nullableText(
    value:
        string | undefined
): string | null {
    return value ??
        null;
}


function fromRow(
    row:
        OutcomeFactRow
): InsuranceAcquisitionOutcomeFact {
    return createInsuranceAcquisitionOutcomeFact({
        outcomeFactId:
            row.outcome_fact_id,

        relationshipId:
            row.relationship_id,

        kind:
            row.kind,

        occurredAt:
            row.occurred_at,

        ...(row.provider_reference !== null
            ? {
                providerReference:
                    row.provider_reference
            }
            : {}),

        ...(row.policy_reference !== null
            ? {
                policyReference:
                    row.policy_reference
            }
            : {}),

        ...(row.external_reference !== null
            ? {
                externalReference:
                    row.external_reference
            }
            : {}),

        ...(row.note !== null
            ? {
                note:
                    row.note
            }
            : {})
    });
}


function canonicalRelationshipIds(
    relationshipIds:
        readonly RiverCrmRelationshipId[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const rawId of relationshipIds){
        const relationshipId =
            requireRiverCrmRelationshipId(
                rawId
            );

        if(!seen.has(relationshipId)){
            seen.add(
                relationshipId
            );

            result.push(
                relationshipId
            );
        }
    }

    return result;
}


function placeholders(
    count:
        number
): string {
    return Array.from(
        {
            length:
                count
        },
        (
            _,
            index
        ) =>
            `?${index + 1}`
    ).join(
        ", "
    );
}


export function createD1InsuranceAcquisitionOutcomePersistence(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionOutcomePersistence {
    return {
        async append(
            rawFact
        ){
            const fact =
                createInsuranceAcquisitionOutcomeFact(
                    rawFact
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_insurance_acquisition_outcome_facts (
                            outcome_fact_id,
                            relationship_id,
                            kind,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            external_reference,
                            note
                        )
                        VALUES (
                            ?1, ?2, ?3, ?4,
                            ?5, ?6, ?7, ?8
                        )
                    `)
                    .bind(
                        fact.outcomeFactId,
                        fact.relationshipId,
                        fact.kind,
                        fact.occurredAt,
                        nullableText(
                            fact.providerReference
                        ),
                        nullableText(
                            fact.policyReference
                        ),
                        nullableText(
                            fact.externalReference
                        ),
                        nullableText(
                            fact.note
                        )
                    )
                    .run();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition outcome D1 append failed."
                );
            }

            return fact;
        },


        async listForRelationships(
            rawRelationshipIds
        ){
            const relationshipIds =
                canonicalRelationshipIds(
                    rawRelationshipIds
                );

            if(relationshipIds.length === 0){
                return [];
            }

            const parameterList =
                placeholders(
                    relationshipIds.length
                );

            const result =
                await database
                    .prepare(`
                        SELECT
                            outcome_fact_id,
                            relationship_id,
                            kind,
                            occurred_at,
                            provider_reference,
                            policy_reference,
                            external_reference,
                            note
                        FROM river_crm_insurance_acquisition_outcome_facts
                        WHERE relationship_id IN (${parameterList})
                        ORDER BY
                            relationship_id ASC,
                            occurred_at ASC,
                            outcome_fact_id ASC
                    `)
                    .bind(
                        ...relationshipIds
                    )
                    .all<OutcomeFactRow>();

            if(result.success === false){
                throw new Error(
                    "Insurance acquisition outcome D1 batch list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(
                fromRow
            );
        }
    };
}
