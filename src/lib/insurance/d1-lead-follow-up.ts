import {
    planInsuranceLeadFollowUp
} from "./lead-follow-up";

import type {
    PlanInsuranceLeadFollowUpInput,
    InsuranceLeadFollowUpOutcome
} from "./lead-follow-up";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";


export interface InsuranceLeadFollowUpD1RunResult {
    readonly success?:
        boolean;

    readonly meta?:
        {
            readonly changes?:
                number;
        };
}


export interface InsuranceLeadFollowUpD1Statement {
    bind(
        ...values:
            unknown[]
    ):
        InsuranceLeadFollowUpD1Statement;

    run():
        Promise<
            InsuranceLeadFollowUpD1RunResult
        >;
}


export interface InsuranceLeadFollowUpD1Database {
    prepare(
        sql:
            string
    ):
        InsuranceLeadFollowUpD1Statement;
}


export interface InsuranceLeadFollowUpExecutionResult {
    readonly outcome:
        InsuranceLeadFollowUpOutcome;

    readonly relationship:
        RiverCrmRelationship;

    readonly writes:
        0 |
        1;
}


export interface InsuranceLeadFollowUpExecutor {
    execute(
        input:
            PlanInsuranceLeadFollowUpInput
    ):
        Promise<
            InsuranceLeadFollowUpExecutionResult
        >;
}


export class InsuranceLeadFollowUpConflictError
extends Error {

    public constructor(){
        super(
            "Insurance lead follow-up changed concurrently."
        );

        this.name =
            "InsuranceLeadFollowUpConflictError";
    }
}


function changedRows(
    result:
        InsuranceLeadFollowUpD1RunResult
):
    number {

    if(result.success === false){
        throw new Error(
            "Insurance lead follow-up D1 update failed."
        );
    }

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
            "Insurance lead follow-up D1 update returned invalid change metadata."
        );
    }

    return changes;
}


export function createD1InsuranceLeadFollowUpExecutor(
    database:
        InsuranceLeadFollowUpD1Database
):
    InsuranceLeadFollowUpExecutor {

    return {
        async execute(
            input
        ){
            const plan =
                planInsuranceLeadFollowUp(
                    input
                );

            if(!plan.changed){
                return {
                    outcome:
                        plan.outcome,

                    relationship:
                        plan.relationship,

                    writes:
                        0
                };
            }

            const result =
                await database
                    .prepare(`
                        UPDATE river_crm_relationships
                        SET
                            next_follow_up_at = ?1,
                            updated_at = ?2
                        WHERE
                            relationship_id = ?3
                            AND updated_at = ?4
                    `)
                    .bind(
                        plan.nextFollowUpAt ??
                            null,
                        plan.relationship
                            .updatedAt,
                        plan.relationship
                            .relationshipId,
                        input.relationship
                            .updatedAt
                    )
                    .run();

            const changes =
                changedRows(
                    result
                );

            if(changes === 0){
                throw new InsuranceLeadFollowUpConflictError();
            }

            if(changes !== 1){
                throw new Error(
                    "Insurance lead follow-up D1 update changed an unexpected number of rows."
                );
            }

            return {
                outcome:
                    plan.outcome,

                relationship:
                    plan.relationship,

                writes:
                    1
            };
        }
    };
}
