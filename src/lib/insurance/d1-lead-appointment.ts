import {
    planInsuranceLeadAppointment
} from "./lead-appointment";

import type {
    InsuranceLeadAppointmentOutcome,
    InsuranceLeadAppointmentPlan,
    PlanInsuranceLeadAppointmentInput
} from "./lead-appointment";


export interface InsuranceLeadAppointmentD1RunResult {
    readonly success?:
        boolean;

    readonly meta?: {
        readonly changes?:
            number;
    };
}


export interface InsuranceLeadAppointmentD1Statement {
    bind(
        ...values:
            unknown[]
    ):
        InsuranceLeadAppointmentD1Statement;
}


export interface InsuranceLeadAppointmentD1Database {
    prepare(
        sql:
            string
    ):
        InsuranceLeadAppointmentD1Statement;

    batch(
        statements:
            readonly InsuranceLeadAppointmentD1Statement[]
    ):
        Promise<
            readonly InsuranceLeadAppointmentD1RunResult[]
        >;
}


export interface InsuranceLeadAppointmentExecutionResult {
    readonly outcome:
        InsuranceLeadAppointmentOutcome;

    readonly plan:
        InsuranceLeadAppointmentPlan;

    readonly writes:
        0 |
        1 |
        2;
}


export interface InsuranceLeadAppointmentExecutor {
    execute(
        input:
            PlanInsuranceLeadAppointmentInput
    ):
        Promise<
            InsuranceLeadAppointmentExecutionResult
        >;
}


export class InsuranceLeadAppointmentConflictError
extends Error {

    public constructor(){
        super(
            "Insurance lead appointment changed concurrently."
        );

        this.name =
            "InsuranceLeadAppointmentConflictError";
    }
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
        InsuranceLeadAppointmentD1Database,
    plan:
        InsuranceLeadAppointmentPlan,
    previousUpdatedAt:
        string
):
    InsuranceLeadAppointmentD1Statement {

    return database
        .prepare(`
            UPDATE river_crm_relationships
            SET
                appointment_at = ?1,
                updated_at = ?2
            WHERE
                relationship_id = ?3
                AND updated_at = ?4
        `)
        .bind(
            plan.appointmentAt ??
                null,
            plan.relationship
                .updatedAt,
            plan.relationship
                .relationshipId,
            previousUpdatedAt
        );
}


function eventStatement(
    database:
        InsuranceLeadAppointmentD1Database,
    plan:
        InsuranceLeadAppointmentPlan,
    previousUpdatedAt:
        string
):
    InsuranceLeadAppointmentD1Statement {

    const event =
        plan.appointmentEvent;

    if(event === undefined){
        throw new Error(
            "Insurance lead appointment schedule/reschedule requires its audit event."
        );
    }

    const metadataJson =
        event.metadata ===
            undefined
            ? null
            : JSON.stringify(
                event.metadata
            );

    /*
     * Guard immutable audit evidence with the same pre-mutation
     * concurrency token used by the relationship compare-and-set.
     * The event is inserted first inside the atomic D1 batch, so a
     * stale relationship cannot produce appointment-set evidence.
     */
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
            SELECT
                ?1,
                ?2,
                ?3,
                ?4,
                ?5,
                ?6,
                ?7
            WHERE EXISTS (
                SELECT 1
                FROM river_crm_relationships
                WHERE relationship_id = ?2
                    AND updated_at = ?8
            )
        `)
        .bind(
            event.eventId,
            event.relationshipId,
            event.eventType,
            event.occurredAt,
            event.source,
            nullableText(
                event.externalReference
            ),
            metadataJson,
            previousUpdatedAt
        );
}


function assertBatchShape(
    results:
        readonly InsuranceLeadAppointmentD1RunResult[],
    expected:
        number
):
    void {

    if(results.length !== expected){
        throw new Error(
            "Insurance lead appointment D1 batch returned an unexpected result count."
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
                `Insurance lead appointment D1 batch member ${index + 1} failed.`
            );
        }
    }
}


function changedRows(
    result:
        InsuranceLeadAppointmentD1RunResult,
    label:
        string
):
    number {

    const changes =
        result.meta
            ?.changes;

    if(
        typeof changes !==
            "number" ||
        !Number.isInteger(
            changes
        ) ||
        changes <
            0
    ){
        throw new Error(
            `Insurance lead appointment D1 ${label} returned invalid change metadata.`
        );
    }

    return changes;
}


export function createD1InsuranceLeadAppointmentExecutor(
    database:
        InsuranceLeadAppointmentD1Database
):
    InsuranceLeadAppointmentExecutor {

    return {
        async execute(
            input
        ){
            const plan =
                planInsuranceLeadAppointment(
                    input
                );

            if(!plan.changed){
                return {
                    outcome:
                        plan.outcome,

                    plan,

                    writes:
                        0
                };
            }

            const previousUpdatedAt =
                input.relationship
                    .updatedAt;

            const relationshipWrite =
                relationshipStatement(
                    database,
                    plan,
                    previousUpdatedAt
                );

            /*
             * Insert audit evidence first, guarded by the old token.
             * The following relationship CAS uses that same token in
             * the same atomic D1 batch.
             */
            const statements:
                InsuranceLeadAppointmentD1Statement[] =
                    plan.appointmentEvent ===
                        undefined
                        ? [
                            relationshipWrite
                        ]
                        : [
                            eventStatement(
                                database,
                                plan,
                                previousUpdatedAt
                            ),
                            relationshipWrite
                        ];

            const results =
                await database.batch(
                    statements
                );

            assertBatchShape(
                results,
                statements.length
            );

            if(plan.appointmentEvent === undefined){
                const relationshipChanges =
                    changedRows(
                        results[0]!,
                        "relationship update"
                    );

                if(relationshipChanges === 0){
                    throw new InsuranceLeadAppointmentConflictError();
                }

                if(relationshipChanges !== 1){
                    throw new Error(
                        "Insurance lead appointment D1 update changed an unexpected number of rows."
                    );
                }
            }else{
                const eventChanges =
                    changedRows(
                        results[0]!,
                        "event insert"
                    );

                const relationshipChanges =
                    changedRows(
                        results[1]!,
                        "relationship update"
                    );

                if(
                    eventChanges === 0 &&
                    relationshipChanges === 0
                ){
                    throw new InsuranceLeadAppointmentConflictError();
                }

                if(
                    eventChanges !== 1 ||
                    relationshipChanges !== 1
                ){
                    throw new Error(
                        "Insurance lead appointment D1 atomic schedule/reschedule returned inconsistent change counts."
                    );
                }
            }
            return {
                outcome:
                    plan.outcome,

                plan,

                writes:
                    statements.length as
                        1 |
                        2
            };
        }
    };
}
