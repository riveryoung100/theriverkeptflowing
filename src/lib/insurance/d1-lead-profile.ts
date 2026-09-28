import {
    createInsuranceLeadProfile
} from "./lead-profile";

import type {
    CreateInsuranceLeadProfileInput,
    InsuranceLeadProfile,
    InsuranceLeadRelationshipId
} from "./lead-profile";

import type {
    RiverCrmD1Database,
    RiverCrmD1RunResult
} from "../river-os/d1-crm-growth";


interface InsuranceLeadRow {
    readonly relationship_id:
        unknown;
    readonly state:
        unknown;
    readonly postal_code:
        unknown;
    readonly product_interest:
        unknown;
    readonly quote_status:
        unknown;
    readonly assigned_producer:
        unknown;
    readonly created_at:
        unknown;
    readonly updated_at:
        unknown;
}

function nullableText(
    value: string | undefined
): string | null {
    return value === undefined
        ? null
        : value;
}

function profileFromRow(
    row: InsuranceLeadRow
): InsuranceLeadProfile {
    return createInsuranceLeadProfile({
        relationshipId:
            row.relationship_id,
        state:
            row.state,
        postalCode:
            row.postal_code,
        productInterest:
            row.product_interest,
        quoteStatus:
            row.quote_status,
        assignedProducer:
            row.assigned_producer,
        createdAt:
            row.created_at,
        updatedAt:
            row.updated_at
    });
}

function assertRunSucceeded(
    result: RiverCrmD1RunResult
): void {
    if(result.success === false){
        throw new Error(
            "Insurance lead D1 upsert failed."
        );
    }
}

export interface D1InsuranceLeadProfilePersistence {
    get(
        relationshipId:
            InsuranceLeadRelationshipId
    ): Promise<
        InsuranceLeadProfile |
        null
    >;

    upsert(
        input:
            CreateInsuranceLeadProfileInput
    ): Promise<
        InsuranceLeadProfile
    >;
}

export function createD1InsuranceLeadProfilePersistence(
    database:
        RiverCrmD1Database
): D1InsuranceLeadProfilePersistence {
    return {
        async get(
            relationshipId
        ){
            const row =
                await database
                    .prepare(`
                        SELECT
                            relationship_id,
                            state,
                            postal_code,
                            product_interest,
                            quote_status,
                            assigned_producer,
                            created_at,
                            updated_at
                        FROM river_crm_insurance_lead_profiles
                        WHERE relationship_id = ?
                        LIMIT 1
                    `)
                    .bind(
                        relationshipId
                    )
                    .first<InsuranceLeadRow>();

            return row === null
                ? null
                : profileFromRow(row);
        },

        async upsert(
            input
        ){
            const value =
                createInsuranceLeadProfile(
                    input
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_insurance_lead_profiles (
                            relationship_id,
                            state,
                            postal_code,
                            product_interest,
                            quote_status,
                            assigned_producer,
                            created_at,
                            updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (relationship_id)
                        DO UPDATE SET
                            state = excluded.state,
                            postal_code = excluded.postal_code,
                            product_interest = excluded.product_interest,
                            quote_status = excluded.quote_status,
                            assigned_producer = excluded.assigned_producer,
                            updated_at = excluded.updated_at
                    `)
                    .bind(
                        value.relationshipId,
                        value.state,
                        value.postalCode,
                        value.productInterest,
                        value.quoteStatus,
                        nullableText(
                            value.assignedProducer
                        ),
                        value.createdAt,
                        value.updatedAt
                    )
                    .run();

            assertRunSucceeded(
                result
            );

            return value;
        }
    };
}
