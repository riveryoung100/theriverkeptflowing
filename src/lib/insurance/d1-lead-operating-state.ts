import {
    planInsuranceLeadOperatingState
} from "./lead-operating-state";

import type {
    InsuranceLeadOperatingStatePlan,
    PlanInsuranceLeadOperatingStateInput
} from "./lead-operating-state";

import type {
    InsuranceLeadProfile
} from "./lead-profile";

import type {
    RiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";


export interface InsuranceLeadOperatingStateD1RunResult {
    readonly success?:
        boolean;

    readonly meta?: {
        readonly changes?:
            number;
    };
}


export interface InsuranceLeadOperatingStateD1Statement {
    bind(
        ...values:
            unknown[]
    ):
        InsuranceLeadOperatingStateD1Statement;
}


export interface InsuranceLeadOperatingStateD1Database {
    prepare(
        sql:
            string
    ):
        InsuranceLeadOperatingStateD1Statement;

    batch(
        statements:
            readonly InsuranceLeadOperatingStateD1Statement[]
    ):
        Promise<
            readonly InsuranceLeadOperatingStateD1RunResult[]
        >;
}


export type ExecuteInsuranceLeadOperatingStateResult =
    | {
        readonly outcome:
            "no-op";

        readonly plan:
            InsuranceLeadOperatingStatePlan;

        readonly writes:
            0;
    }
    | {
        readonly outcome:
            "updated";

        readonly plan:
            InsuranceLeadOperatingStatePlan;

        readonly writes:
            number;
    };


export interface D1InsuranceLeadOperatingStateExecutor {
    execute(
        input:
            PlanInsuranceLeadOperatingStateInput
    ):
        Promise<
            ExecuteInsuranceLeadOperatingStateResult
        >;
}


function nullableText(
    value:
        string |
        undefined
):
    string |
    null {

    return value ===
        undefined
        ? null
        : value;
}


function relationshipStatement(
    database:
        InsuranceLeadOperatingStateD1Database,
    value:
        RiverCrmRelationship
):
    InsuranceLeadOperatingStateD1Statement {

    return database
        .prepare(`
            INSERT INTO river_crm_relationships (
                relationship_id,
                display_name,
                kind,
                stage,
                source,
                email,
                phone,
                owner,
                next_follow_up_at,
                appointment_at,
                created_at,
                updated_at
            )
            VALUES (
                ?1,
                ?2,
                ?3,
                ?4,
                ?5,
                ?6,
                ?7,
                ?8,
                ?9,
                ?10,
                ?11,
                ?12
            )
            ON CONFLICT (relationship_id)
            DO UPDATE SET
                display_name = excluded.display_name,
                kind = excluded.kind,
                stage = excluded.stage,
                source = excluded.source,
                email = excluded.email,
                phone = excluded.phone,
                owner = excluded.owner,
                next_follow_up_at = excluded.next_follow_up_at,
                appointment_at = excluded.appointment_at,
                updated_at = excluded.updated_at
        `)
        .bind(
            value.relationshipId,
            value.displayName,
            value.kind,
            value.stage,
            value.source,
            nullableText(
                value.email
            ),
            nullableText(
                value.phone
            ),
            nullableText(
                value.owner
            ),
            nullableText(
                value.nextFollowUpAt
            ),
            nullableText(
                value.appointmentAt
            ),
            value.createdAt,
            value.updatedAt
        );
}


function profileStatement(
    database:
        InsuranceLeadOperatingStateD1Database,
    value:
        InsuranceLeadProfile
):
    InsuranceLeadOperatingStateD1Statement {

    return database
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
            VALUES (
                ?1,
                ?2,
                ?3,
                ?4,
                ?5,
                ?6,
                ?7,
                ?8
            )
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
        );
}


function eventStatement(
    database:
        InsuranceLeadOperatingStateD1Database,
    value:
        RiverCrmRelationshipEvent
):
    InsuranceLeadOperatingStateD1Statement {

    const metadataJson =
        value.metadata ===
            undefined
            ? null
            : JSON.stringify(
                value.metadata
            );

    return database
        .prepare(`
            INSERT INTO river_crm_relationship_events (
                event_id,
                relationship_id,
                event_type,
                occurred_at,
                source,
                external_reference,
                metadata_json
            )
            VALUES (
                ?1,
                ?2,
                ?3,
                ?4,
                ?5,
                ?6,
                ?7
            )
        `)
        .bind(
            value.eventId,
            value.relationshipId,
            value.eventType,
            value.occurredAt,
            value.source,
            nullableText(
                value.externalReference
            ),
            metadataJson
        );
}


function assertBatchSucceeded(
    results:
        readonly InsuranceLeadOperatingStateD1RunResult[],
    expected:
        number
):
    void {

    if(
        results.length !==
        expected
    ){
        throw new Error(
            "Insurance lead operating-state D1 batch returned an unexpected result count."
        );
    }

    for(
        let index = 0;
        index < results.length;
        index++
    ){
        const result =
            results[index];

        if(
            result ===
                undefined ||
            result.success ===
                false
        ){
            throw new Error(
                `Insurance lead operating-state D1 batch member ${index + 1} failed.`
            );
        }
    }
}


export function createD1InsuranceLeadOperatingStateExecutor(
    database:
        InsuranceLeadOperatingStateD1Database
):
    D1InsuranceLeadOperatingStateExecutor {

    return {
        async execute(
            input
        ){
            /*
             * Persistence owns no transition policy.
             * Every write shape comes from the canonical pure planner.
             */
            const plan =
                planInsuranceLeadOperatingState(
                    input
                );

            if(!plan.hasChanges){
                return {
                    outcome:
                        "no-op",

                    plan,

                    writes:
                        0
                };
            }

            const statements:
                InsuranceLeadOperatingStateD1Statement[] = [];

            if(plan.changes.stage){
                statements.push(
                    relationshipStatement(
                        database,
                        plan.relationship
                    )
                );
            }

            if(
                plan.changes.quoteStatus ||
                plan.changes.assignedProducer
            ){
                statements.push(
                    profileStatement(
                        database,
                        plan.profile
                    )
                );
            }

            if(plan.stageEvent !== undefined){
                statements.push(
                    eventStatement(
                        database,
                        plan.stageEvent
                    )
                );
            }

            if(statements.length === 0){
                throw new Error(
                    "Insurance lead operating-state plan reported changes without a persistence write."
                );
            }

            if(
                plan.changes.stage &&
                plan.stageEvent ===
                    undefined
            ){
                throw new Error(
                    "Insurance lead operating-state stage mutation requires its audit event."
                );
            }

            const results =
                await database.batch(
                    statements
                );

            assertBatchSucceeded(
                results,
                statements.length
            );

            return {
                outcome:
                    "updated",

                plan,

                writes:
                    statements.length
            };
        }
    };
}
